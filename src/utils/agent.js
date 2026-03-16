import { generateObjectId } from "../utils/mongo.js";
import { getOrRefreshGamesData } from "../utils/vps/cache.js";
import { processScore } from "../utils/scoring.js";
import pipelineHelper from "../utils/pipeline.js";
import { logger } from "../utils/logger.js";

/**
 * Format a date as MM/DD/YYYY HH:mm:ss — used by pocSaveHighScore for createdAt.
 */
const formatDateTime = (date = new Date()) => {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const POC_ACTIVE_SESSIONS_COLLECTION = "poc_active_sessions";
const POC_TABLES_COLLECTION = "poc_tables";
const POC_WEEKS_COLLECTION = "poc_weeks";
const STALE_SESSION_MINUTES = 30;

// ---------------------------------------------------------------------------
// poc_tables helpers
// ---------------------------------------------------------------------------

const buildTableRecord = (vpsGame, tableFile, vpsId) => ({
  _id: generateObjectId(),
  tableName: `${vpsGame.name} (${vpsGame.manufacturer} ${vpsGame.year})`,
  authors: [
    {
      _id: generateObjectId(),
      authorName: tableFile.authors?.join(", ") ?? "",
      versions: [
        {
          _id: generateObjectId(),
          versionNumber: tableFile.version ?? "",
          versionUrl: tableFile.urls?.[0]?.url ?? "",
          romName: vpsGame?.romFiles?.[0]?.version ?? "",
          scores: [],
        },
      ],
      vpsId: vpsId ?? tableFile.id,
      comment: tableFile.comment ?? "",
    },
  ],
});

/**
 * Finds or creates a table document in poc_tables by vpsId.
 * Mirrors the production findOrCreateByVpsId logic, targeting poc_tables.
 * Returns { table, error } in the same shape as the production findTable().
 */
const pocFindOrCreateByVpsId = async (db, vpsGame, tableFile, vpsId) => {
  const tablesCollection = db.collection(POC_TABLES_COLLECTION);
  const authorName = tableFile.authors?.join(", ") ?? "";
  const versionNumber = tableFile.version ?? "";
  const versionUrl = tableFile.urls?.[0]?.url ?? "";
  const romUrl = vpsGame.romFiles?.[0]?.urls?.[0]?.url ?? null;
  const romName = vpsGame?.romFiles?.[0]?.version ?? "";
  const tableName = `${vpsGame.name} (${vpsGame.manufacturer} ${vpsGame.year})`;

  const buildTableResult = (doc, authorObj, versionObj, status) => ({
    table: {
      vpsId: authorObj.vpsId,
      url: versionObj.versionUrl,
      name: doc.tableName,
      romUrl,
      metadata: {
        authorName: authorObj.authorName,
        versionNumber: versionObj.versionNumber,
      },
    },
    status,
    error: null,
  });

  // 1. Find by vpsId
  const existingByVpsId = await tablesCollection.findOne({
    "authors.vpsId": vpsId,
  });

  if (existingByVpsId) {
    if (existingByVpsId.tableName !== tableName) {
      await tablesCollection.updateOne(
        { _id: existingByVpsId._id },
        { $set: { tableName } },
      );
      existingByVpsId.tableName = tableName;
    }

    const authorWithVersion = existingByVpsId.authors.find(
      (a) =>
        a.vpsId === vpsId &&
        a.versions.some((v) => v.versionNumber === versionNumber),
    );

    if (authorWithVersion) {
      const existingVersion = authorWithVersion.versions.find(
        (v) => v.versionNumber === versionNumber,
      );
      if (authorWithVersion.authorName !== authorName) {
        await tablesCollection.updateOne(
          { _id: existingByVpsId._id, "authors._id": authorWithVersion._id },
          { $set: { "authors.$.authorName": authorName } },
        );
      }
      return buildTableResult(
        existingByVpsId,
        { ...authorWithVersion, authorName },
        existingVersion,
        "existing",
      );
    }

    // vpsId exists but versionNumber is new
    const firstMatchingAuthor = existingByVpsId.authors.find(
      (a) => a.vpsId === vpsId,
    );
    await tablesCollection.updateOne(
      { _id: existingByVpsId._id, "authors._id": firstMatchingAuthor._id },
      {
        $push: {
          "authors.$.versions": {
            _id: generateObjectId(),
            versionNumber,
            versionUrl,
            romName,
            scores: [],
          },
        },
      },
    );
    return buildTableResult(
      existingByVpsId,
      { ...firstMatchingAuthor, authorName },
      { versionUrl, versionNumber },
      "new_version",
    );
  }

  // 2. Find by sibling vpsId
  const siblingVpsIds =
    vpsGame.tableFiles?.map((t) => t.id).filter((id) => id && id !== vpsId) ??
    [];

  const existingBySibling = siblingVpsIds.length
    ? await tablesCollection.findOne({
        "authors.vpsId": { $in: siblingVpsIds },
      })
    : null;

  if (existingBySibling) {
    await tablesCollection.updateOne(
      { _id: existingBySibling._id },
      {
        $push: {
          authors: {
            _id: generateObjectId(),
            authorName,
            versions: [
              {
                _id: generateObjectId(),
                versionNumber,
                versionUrl,
                romName,
                scores: [],
              },
            ],
            vpsId,
            comment: tableFile.comment ?? "",
          },
        },
      },
    );
    if (existingBySibling.tableName !== tableName) {
      await tablesCollection.updateOne(
        { _id: existingBySibling._id },
        { $set: { tableName } },
      );
      existingBySibling.tableName = tableName;
    }
    return buildTableResult(
      existingBySibling,
      { vpsId, authorName },
      { versionUrl, versionNumber },
      "new_author",
    );
  }

  // 3. Brand new table
  const record = buildTableRecord(vpsGame, tableFile, vpsId);
  await tablesCollection.insertOne(record);
  logger.info(
    `poc_tables: new table '${record.tableName}' added via vpsId '${vpsId}'`,
  );

  const author = record.authors[0];
  const version = author.versions[0];
  return buildTableResult(record, author, version, "new_table");
};

/**
 * Resolves a vpsId against the VPS cache then finds or creates in poc_tables.
 * Returns { table, error } — same shape as the production findTable().
 */
export const pocFindTable = async (db, vpsId) => {
  try {
    const gamesData = await getOrRefreshGamesData();
    const vpsGame = gamesData.find((game) =>
      game.tableFiles?.some((t) => String(t?.id) === vpsId),
    );
    if (!vpsGame)
      return { table: null, error: `No VPS game found for vpsId ${vpsId}` };

    const tableFile = vpsGame.tableFiles?.find((t) => String(t.id) === vpsId);
    if (!tableFile)
      return {
        table: null,
        error: `No tableFile found in VPS game for vpsId ${vpsId}`,
      };

    return await pocFindOrCreateByVpsId(db, vpsGame, tableFile, vpsId);
  } catch (err) {
    logger.error({ err }, `pocFindTable failed for vpsId=${vpsId}`);
    return { table: null, error: err.message };
  }
};

/**
 * Saves a score to poc_tables.
 * Mirrors the production saveHighScore, adding source/rom/gameDuration fields.
 */
export const pocSaveHighScore = async (db, data, userObj) => {
  const username = userObj?.username ?? data.username;
  const versionNumber = data.versionNumber;
  const scoreValue = data.score;

  return db.collection(POC_TABLES_COLLECTION).findOneAndUpdate(
    { tableName: data.tableName },
    {
      $push: {
        "authors.$[a].versions.$[v].scores": {
          _id: generateObjectId(),
          user: userObj,
          username,
          score: scoreValue,
          source: "vpc-score-agent",
          rom: data.rom ?? null,
          gameDuration: data.gameDuration ?? null,
          postUrl: "",
          createdAt: new Date(),
        },
      },
    },
    {
      returnDocument: "after",
      arrayFilters: [
        { "a.vpsId": data.vpsId },
        { "v.versionNumber": versionNumber },
      ],
    },
  );
};

// ---------------------------------------------------------------------------
// Active session helpers
// ---------------------------------------------------------------------------

/**
 * Upserts the active session document for a given username.
 * One document per username — updated on every event.
 */
export const upsertActiveSession = async (
  db,
  { userId, username, vpsId, versionNumber, rom, event, payload, receivedAt },
) => {
  const isFinished = event === "game_end";
  const currentScore =
    (event === "current_scores" || event === "game_end") &&
    payload?.scores?.length
      ? (payload.scores[0]?.score ?? null)
      : null;

  await db.collection(POC_ACTIVE_SESSIONS_COLLECTION).updateOne(
    { username },
    {
      $set: {
        userId: userId ?? null,
        username,
        vpsId: vpsId ?? null,
        versionNumber: versionNumber ?? null,
        rom: rom ?? null,
        lastEventAt: receivedAt,
        status: isFinished ? "finished" : "playing",
        ...(currentScore !== null && { currentScore }),
        ...(event === "game_start" && {
          startedAt: receivedAt,
          currentScore: null,
        }),
        ...(isFinished && { finishedAt: receivedAt }),
      },
    },
    { upsert: true },
  );
};

/**
 * Marks sessions as expired if no event has been received within
 * STALE_SESSION_MINUTES and they are still in "playing" status.
 */
export const expireStateSessions = async (db) => {
  const cutoff = new Date(Date.now() - STALE_SESSION_MINUTES * 60 * 1000);

  await db
    .collection(POC_ACTIVE_SESSIONS_COLLECTION)
    .updateMany(
      { status: "playing", lastEventAt: { $lt: cutoff } },
      { $set: { status: "expired" } },
    );
};

// ---------------------------------------------------------------------------
// game_end processing
// ---------------------------------------------------------------------------

/**
 * Processes a game_end event:
 * - Discards multiplayer sessions
 * - Discards if vpsId is missing
 * - Finds or creates the table in poc_tables
 * - Saves the score to poc_tables
 * - Saves the score to poc_weeks if the table matches the current active week
 */
export const processGameEnd = async (
  db,
  { userId, username, vpsId, versionNumber, rom, payload },
) => {
  const players = payload?.players ?? 1;
  const scores = payload?.scores ?? [];
  const gameDuration = payload?.game_duration ?? null;

  if (players > 1) {
    logger.info(
      `poc game_end discarded: multiplayer session (${players} players) for ${username}`,
    );
    return;
  }

  if (!vpsId) {
    logger.info(
      `poc game_end discarded: missing vpsId for ${username} rom=${rom}`,
    );
    return;
  }

  const rawScore = scores[0]?.score;
  if (!rawScore) {
    logger.info(`poc game_end discarded: no score in payload for ${username}`);
    return;
  }

  const scoreValue = parseInt(rawScore.replace(/,/g, ""), 10);
  if (isNaN(scoreValue) || scoreValue <= 0) {
    logger.info(
      `poc game_end discarded: invalid score "${rawScore}" for ${username}`,
    );
    return;
  }

  const { table, error: tableError } = await pocFindTable(db, vpsId);
  if (tableError || !table) {
    logger.error(
      `poc game_end: could not resolve table for vpsId=${vpsId}: ${tableError}`,
    );
    return;
  }

  const resolvedVersion = versionNumber || table.metadata.versionNumber;
  const userObj = { userId, username };

  await pocSaveHighScore(
    db,
    {
      tableName: table.name,
      authorName: table.metadata.authorName,
      vpsId: table.vpsId,
      versionNumber: resolvedVersion,
      score: scoreValue,
      rom: rom ?? null,
      gameDuration,
    },
    userObj,
  );

  logger.info(
    `poc score saved to poc_tables: ${username} scored ${scoreValue} on ${table.name} (${resolvedVersion})`,
  );

  await maybeSaveToWeeks(db, {
    userId,
    username,
    userObj,
    vpsId: table.vpsId,
    resolvedVersion,
    tableName: table.name,
    scoreValue,
    rom,
    gameDuration,
  });
};

/**
 * Saves the score to poc_weeks if the vpsId matches the current active week.
 * Uses processScore from utils/scoring.js to ensure consistent score entry
 * shape — diff, mode, posted, points — matching Discord submissions.
 */
const maybeSaveToWeeks = async (
  db,
  { userId, username, vpsId, tableName, scoreValue, rom, gameDuration },
) => {
  const currentWeek = await db.collection(POC_WEEKS_COLLECTION).findOne({
    isArchived: false,
    vpsId,
  });

  if (!currentWeek) return;

  const existingEntry = (currentWeek.scores ?? []).find(
    (s) => s.username === username,
  );
  const isImprovement =
    !existingEntry || scoreValue > (existingEntry.score ?? 0);

  if (!isImprovement) {
    logger.info(
      `poc weeks: ${username} score ${scoreValue} does not improve existing ${existingEntry?.score} — not saving`,
    );
    return;
  }

  const { scores: updatedScores } = processScore(
    { userId, username },
    scoreValue,
    currentWeek,
    { source: "vpc-score-agent", rom, gameDuration },
  );

  await db
    .collection(POC_WEEKS_COLLECTION)
    .updateOne({ _id: currentWeek._id }, { $set: { scores: updatedScores } });

  logger.info(
    `poc score saved to poc_weeks: ${username} scored ${scoreValue} on ${tableName} (week ${currentWeek.weekNumber ?? currentWeek._id})`,
  );
};

// ---------------------------------------------------------------------------
// Response shaping
// ---------------------------------------------------------------------------

/**
 * Fetches flattened past scores from poc_tables for each vpsId using the
 * production pipeline, keeping only the best score per username.
 */
export const buildPastScoresByVpsId = async (db, vpsIds) => {
  const pastScoresByVpsId = new Map();

  for (const vpsId of vpsIds) {
    const pipeline = pipelineHelper.getScoresByVpsId(vpsId);
    const rows = await db
      .collection(POC_TABLES_COLLECTION)
      .aggregate(pipeline)
      .toArray();

    const tableName = rows[0]?.tableName ?? null;
    const flatScores = rows.flatMap((row) =>
      (row.scores ?? []).map((s) => ({
        username: s.userName,
        score: s.score,
        source: "vpc-score-agent",
        createdAt: s.posted,
        isLive: false,
      })),
    );

    const bestByUser = new Map();
    for (const s of flatScores) {
      if (
        !bestByUser.has(s.username) ||
        s.score > bestByUser.get(s.username).score
      ) {
        bestByUser.set(s.username, s);
      }
    }

    pastScoresByVpsId.set(vpsId, {
      tableName,
      scores: [...bestByUser.values()],
    });
  }

  return pastScoresByVpsId;
};

/**
 * Merges active sessions with pre-flattened past scores (keyed by vpsId).
 * Returns an array of table objects ready for the live leaderboard page.
 */
export const groupSessionsByVpsId = (sessions, pastScoresByVpsId) => {
  const tableMap = new Map();

  for (const session of sessions) {
    const { vpsId } = session;
    if (!vpsId) continue;

    if (!tableMap.has(vpsId)) {
      const past = pastScoresByVpsId.get(vpsId) ?? {
        tableName: null,
        scores: [],
      };
      tableMap.set(vpsId, {
        vpsId,
        tableName: past.tableName,
        scores: [...past.scores],
        activeSessions: [],
      });
    }

    const entry = tableMap.get(vpsId);
    entry.activeSessions.push({
      username: session.username,
      status: session.status,
      currentScore: session.currentScore ?? null,
      startedAt: session.startedAt ?? null,
      lastEventAt: session.lastEventAt,
    });

    if (session.status === "playing" && session.currentScore !== null) {
      const liveScore = parseInt(session.currentScore, 10);
      if (!isNaN(liveScore)) {
        entry.scores = entry.scores.filter(
          (s) => !(s.username === session.username && s.isLive),
        );
        entry.scores.push({
          username: session.username,
          score: liveScore,
          source: "vpc-score-agent",
          isLive: true,
        });
      }
    }
  }

  for (const entry of tableMap.values()) {
    entry.scores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  return [...tableMap.values()];
};
