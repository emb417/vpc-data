import express from "express";
import { getDb, generateObjectId } from "../utils/mongo.js";
import {
  upsertActiveSession,
  processGameEnd,
  expireStateSessions,
  buildPastScoresByVpsId,
  groupSessionsByVpsId,
} from "../utils/agent.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const POC_EVENTS_COLLECTION = "poc_events";
const POC_ACTIVE_SESSIONS_COLLECTION = "poc_active_sessions";

// ---------------------------------------------------------------------------
// POST /api/v2/events
//
// Accepts a raw event from vpc-score-agent. Always writes to poc_events.
// On game_end: validates, then writes to poc_tables and poc_weeks.
// ---------------------------------------------------------------------------

router.post("/events", async (req, res) => {
  const {
    userId,
    username,
    vpsId,
    versionNumber,
    rom,
    event,
    timestamp,
    payload,
  } = req.body;

  if (!userId || !username || !event || !timestamp) {
    return res.status(400).json({
      error: "Missing required fields: userId, username, event, timestamp",
    });
  }

  const db = await getDb();
  const receivedAt = new Date();

  // Always log raw event to poc_events
  try {
    await db.collection(POC_EVENTS_COLLECTION).insertOne({
      _id: generateObjectId(),
      receivedAt,
      userId,
      username,
      vpsId: vpsId ?? null,
      versionNumber: versionNumber ?? null,
      rom: rom ?? null,
      event,
      timestamp,
      payload: payload ?? {},
    });
  } catch (err) {
    logger.error({ err }, "Failed to write to poc_events");
    return res.status(500).json({ error: "Failed to log event" });
  }

  // Update active session state — non-fatal
  try {
    await upsertActiveSession(db, {
      userId,
      username,
      vpsId,
      versionNumber,
      rom,
      event,
      payload,
      receivedAt,
    });
  } catch (err) {
    logger.error({ err }, "Failed to upsert active session");
  }

  // Process game_end — non-fatal, raw event already logged
  if (event === "game_end") {
    try {
      await processGameEnd(db, {
        userId,
        username,
        vpsId,
        versionNumber,
        rom,
        payload,
      });
    } catch (err) {
      logger.error({ err }, "Failed to process game_end");
    }
  }

  return res.status(200).json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/v2/active
//
// Returns all active and recently finished sessions grouped by vpsId,
// with past scores from poc_tables merged in. Used by the live leaderboard.
// ---------------------------------------------------------------------------

router.get("/active", async (req, res) => {
  try {
    const db = await getDb();

    await expireStateSessions(db);

    const sessions = await db
      .collection(POC_ACTIVE_SESSIONS_COLLECTION)
      .find({})
      .sort({ lastEventAt: -1 })
      .toArray();

    const vpsIds = [...new Set(sessions.map((s) => s.vpsId).filter(Boolean))];
    const pastScoresByVpsId = await buildPastScoresByVpsId(db, vpsIds);
    const grouped = groupSessionsByVpsId(sessions, pastScoresByVpsId);

    return res.json({ tables: grouped, fetchedAt: new Date() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch active sessions");
    return res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

export default router;
