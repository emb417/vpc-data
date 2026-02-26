import express from "express";
import canvas from "../utils/canvas.js";
import { getDb } from "../utils/mongo.js";
import pipelineHelper from "../utils/pipeline.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("VPC API v1 Endpoint is available, try /api/v1/tables.");
});

router.post("/convert", async (req, res) => {
  const textToConvert = req.body.text;
  const imageOptions = {
    maxWidth: 1400,
    fontSize: 30,
    fontFamily: "monospace",
    fontPath: "../resources/ponde___.ttf",
    lineHeight: 40,
    margin: 60,
    bgColor: "black",
    textColor: "yellow",
    keepSpaces: true,
  };
  const dataUri = await canvas.generateImage(textToConvert, imageOptions);
  res.send(dataUri);
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
  res.send(weeks);
});

router.get("/recentTablesByHighscores", async (req, res) => {
  const pipeline = pipelineHelper.getTablesByHighscores(
    parseInt(req.query.limit || 4),
    parseInt(req.query.offset || 0),
    req.query.searchTerm,
  );
  const db = await getDb();
  const tables = await db.collection("tables").aggregate(pipeline).toArray();
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

    // iscored returns JSON, not text
    const json = await response.json();

    res.setHeader("Content-Type", "application/json");
    return res.json(json);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Proxy request failed", details: err.message });
  }
});

export default router;
