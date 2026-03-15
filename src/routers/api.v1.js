import express from "express";
import canvas from "../utils/canvas.js";
import { getDb } from "../utils/mongo.js";
import pipelineHelper from "../utils/pipeline.js";
import { getOrRefreshGamesData } from "../utils/vps/cache.js";
import {
  enrichItemsWithVpsData,
  getVpsLookup,
} from "../utils/vps/enrichment.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("VPC API v1 Endpoint is available, try /api/v1/tables.");
});

router.get("/vpsLookup", async (req, res) => {
  try {
    const vpsLookup = await getVpsLookup();
    res.json(vpsLookup);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/tables", async (req, res) => {
  const db = await getDb();
  const tables = await db.collection("tables").find({}).toArray();
  res.send(tables);
});

router.get("/tablesWithAuthorVersion", async (req, res) => {
  const pipeline = pipelineHelper.getTablesWithAuthorVersion();
  const db = await getDb();
  const tables = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(tables);
});

router.get("/scoresByTable", async (req, res) => {
  const tableName = req.query.tableName;
  const pipeline = pipelineHelper.getScoresByTable(tableName);
  const db = await getDb();
  const table = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(table);
});

router.get("/scoresByTableAndAuthor", async (req, res) => {
  const tableName = req.query.tableName;
  const authorName = req.query.authorName;
  const pipeline = pipelineHelper.getScoresByTableAndAuthor(
    tableName,
    authorName,
  );
  const db = await getDb();
  const table = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(table);
});

router.get("/scoresByVpsId", async (req, res) => {
  const vpsId = req.query.vpsId;
  const pipeline = pipelineHelper.getScoresByVpsId(vpsId);
  const db = await getDb();
  const table = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(table);
});

router.get("/scoresByTableAndAuthorUsingFuzzyTableSearch", async (req, res) => {
  const tableSearchTerm = req.query.tableSearchTerm;
  const pipeline = pipelineHelper.getFuzzyTableSearch(tableSearchTerm);
  const db = await getDb();
  const table = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(table);
});

router.get("/scoresByTableAndAuthorAndVersion", async (req, res) => {
  const tableName = req.query.tableName;
  const authorName = req.query.authorName;
  const versionNumber = req.query.versionNumber;
  const pipeline = pipelineHelper.getScoresByTableAndAuthorAndVersion(
    tableName,
    authorName,
    versionNumber,
  );
  const db = await getDb();
  const table = await db.collection("tables").aggregate(pipeline).toArray();
  res.send(table);
});

router.get("/scoresByPlayer", async (req, res) => {
  const username = req.query.username;
  const pipeline = pipelineHelper.getScoresByPlayer(username);
  const db = await getDb();
  const scores = await db.collection("tables").aggregate(pipeline).toArray();
  const enriched = await enrichItemsWithVpsData(scores);
  res.send(enriched);
});

router.get("/weeks", async (req, res) => {
  const db = await getDb();
  const weeks = await db.collection("weeks").find({}).toArray();
  res.send(weeks);
});

router.get("/weeksByChannelName", async (req, res) => {
  const pipeline = [
    {
      $group: {
        _id: {
          channelName: "$channelName",
        },
        weeks: {
          $addToSet: "$$ROOT",
        },
      },
    },
    {
      $project: {
        _id: 0,
        channelName: "$_id.channelName",
        weeks: "$weeks",
      },
    },
    { $sort: { channelName: 1 } },
  ];
  const db = await getDb();
  const weeks = await db.collection("weeks").aggregate(pipeline).toArray();
  res.send(weeks);
});

router.get("/currentWeek", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const db = await getDb();
  const week = await db
    .collection("weeks")
    .findOne({ isArchived: false, channelName });
  if (week) {
    const [enriched] = await enrichItemsWithVpsData([week]);
    return res.send(enriched);
  }
  res.send(week);
});

router.get("/recentWeeks", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const limit = parseInt(req.query.limit) || 13;
  const offset = parseInt(req.query.offset) || 0;
  const searchTerm = req.query.searchTerm ?? "";
  const filter = searchTerm
    ? { channelName, table: { $regex: `.*${searchTerm}.*`, $options: "i" } }
    : { channelName };

  const db = await getDb();
  const weeks = await db
    .collection("weeks")
    .find(filter)
    .sort({ weekNumber: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();
  const enriched = await enrichItemsWithVpsData(weeks);
  res.send(enriched);
});

router.get("/recentTablesByHighscores", async (req, res) => {
  const pipeline = pipelineHelper.getTablesByHighscores(
    parseInt(req.query.limit || 4),
    parseInt(req.query.offset || 0),
    req.query.searchTerm,
    req.query.vpsId,
  );
  const db = await getDb();
  const tables = await db.collection("tables").aggregate(pipeline).toArray();
  if (tables.length > 0 && tables[0].results) {
    tables[0].results = await enrichItemsWithVpsData(tables[0].results);
  }
  res.send(tables);
});

router.get("/competitionWeeks", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const pipeline = pipelineHelper.getCompetitionWeeks(
    parseInt(req.query.limit || 4),
    parseInt(req.query.offset || 0),
    req.query.searchTerm,
    parseInt(req.query.week),
    channelName,
  );
  const db = await getDb();
  const weeks = await db.collection("weeks").aggregate(pipeline).toArray();
  if (weeks.length > 0 && weeks[0].results) {
    weeks[0].results = await enrichItemsWithVpsData(weeks[0].results);
  }
  res.send(weeks);
});

router.get("/seasons", async (req, res) => {
  const db = await getDb();
  const seasons = await db.collection("seasons").find({}).toArray();
  res.send(seasons);
});

router.get("/seasonWeeks", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const season = parseInt(req.query.season) ?? 1;
  const db = await getDb();
  const weeks = await db
    .collection("weeks")
    .find({ channelName, season })
    .sort({ weekNumber: -1 })
    .toArray();
  res.send(weeks);
});

router.get("/iscored", async (req, res) => {
  const roomId = req.query.roomId;

  if (!roomId) {
    return res.status(400).json({ error: "Missing roomId" });
  }

  const targetUrl = `https://iscored.info/roomCommands.php?c=getAllGamesAndScores&roomID=${encodeURIComponent(roomId)}`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "vpc-proxy/1.0",
      },
    });

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: "Upstream error", status: response.status });
    }

    const json = await response.json();

    res.setHeader("Content-Type", "application/json");
    return res.json(json);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Proxy request failed", details: err.message });
  }
});

router.post("/generateWeeklyLeaderboard", async (req, res) => {
  try {
    const {
      channelName = "competition-corner",
      layout = "portrait",
      numRows = 20,
      allowMultipleImages = false,
    } = req.body;

    const db = await getDb();
    const currentWeek = await db
      .collection("weeks")
      .findOne({ isArchived: false, channelName });

    if (!currentWeek)
      return res
        .status(404)
        .json({ error: "No active week found for channel" });

    let vpsEntry = null;
    let manufacturer = null;
    let year = null;
    let name = null;
    if (layout === "landscape" && currentWeek.vpsId) {
      try {
        const vpsData = await getOrRefreshGamesData();
        const game = vpsData.find((g) =>
          g.tableFiles?.some((t) => t.id === currentWeek.vpsId),
        );
        const tableFile = game?.tableFiles?.find(
          (t) => t.id === currentWeek.vpsId,
        );
        vpsEntry = {
          tableImageUrl: tableFile?.imgUrl,
          b2sImageUrl: game?.b2sFiles?.[0]?.imgUrl,
        };
        manufacturer = game?.manufacturer ?? null;
        year = game?.year ?? null;
        name = game?.name ?? null;
      } catch (vpsErr) {
        console.error("Failed to fetch VPS data:", vpsErr.message);
      }
    }

    const result = await canvas.generateLeaderboardImage(
      currentWeek,
      layout,
      vpsEntry,
      { manufacturer, year, name },
      numRows,
      allowMultipleImages,
    );

    if (Array.isArray(result)) {
      const images = result.map(
        (buf) => `data:image/png;base64,${buf.toString("base64")}`,
      );
      return res.json({ images });
    }

    res.setHeader("Content-Type", "image/png");
    res.end(result);
  } catch (err) {
    console.error("generateLeaderboardImage error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

const handleGenerateHighScoresLeaderboard = async (req, res) => {
  try {
    const { vpsId, numRows = 20, layout = "landscape" } = req.body;
    if (!vpsId) return res.status(400).json({ error: "vpsId is required" });

    const pipeline = pipelineHelper.getScoresByVpsId(vpsId);
    const db = await getDb();
    const results = await db.collection("tables").aggregate(pipeline).toArray();

    // Pick highest version using segment-aware semver sort
    const parseVersion = (versionNumber) =>
      (versionNumber ?? "0").split(".").flatMap((p) => {
        const clean = p.replace(/[^0-9]/g, "");
        if (clean.length > 1 && clean.startsWith("0")) {
          return clean.split("").map(Number);
        }
        return [parseInt(clean, 10) || 0];
      });

    let game = null;
    let tableFile = null;
    let vpsEntry = null;
    try {
      const vpsData = await getOrRefreshGamesData();
      game =
        vpsData.find(
          (g) => g.tableFiles && g.tableFiles.some((t) => t.id === vpsId),
        ) ?? null;
      if (game) {
        tableFile = game.tableFiles.find((t) => t.id === vpsId) ?? null;
        vpsEntry = {
          tableImageUrl: tableFile?.imgUrl,
          b2sImageUrl: game.b2sFiles?.[0]?.imgUrl,
        };
      }
    } catch (vpsErr) {
      console.error("Failed to fetch VPS data:", vpsErr.message);
    }

    let tableData;
    if (!results.length) {
      tableData = {
        tableName: game?.name ?? vpsId,
        authorName: tableFile?.authors?.join(", ") ?? "",
        versionNumber: tableFile?.version ?? "",
        manufacturer: game?.manufacturer,
        year: game?.year,
        vpsId,
        scores: [],
      };
    } else {
      const sortedResults = [...results].sort((a, b) => {
        const aParts = parseVersion(a.versionNumber);
        const bParts = parseVersion(b.versionNumber);
        const len = Math.max(aParts.length, bParts.length);
        for (let i = 0; i < len; i++) {
          const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0);
          if (diff !== 0) return diff;
        }
        return 0;
      });

      tableData = {
        ...sortedResults[0],
        tableName: game?.name ?? sortedResults[0].tableName,
        manufacturer: game?.manufacturer,
        year: game?.year,
      };
    }

    if (!tableData.scores?.length) {
      tableData = {
        ...tableData,
        scores: [
          { userName: "Be the first to post a score!", score: null, user: {} },
        ],
      };
    }

    const buf = await canvas.generateHighScoresImage(
      tableData,
      numRows,
      vpsEntry,
      layout,
    );
    res.setHeader("Content-Type", "image/png");
    res.end(buf);
  } catch (err) {
    console.error("generateHighScoresImage error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

router.post(
  "/generateHighScoresLeaderboard",
  handleGenerateHighScoresLeaderboard,
);
router.post("/convert", handleGenerateHighScoresLeaderboard);

export default router;
