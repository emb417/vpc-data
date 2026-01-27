import express from "express";
import canvas from "../utils/canvas.js";
import mongoHelper from "../utils/mongo.js";
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
  const tables = await mongoHelper.getAll("tables");
  res.send(tables);
});

router.get("/tablesWithAuthorVersion", async (req, res) => {
  const pipeline = pipelineHelper.getTablesWithAuthorVersion();
  const tables = await mongoHelper.aggregate(pipeline, "tables");
  res.send(tables);
});

router.get("/scoresByTable", async (req, res) => {
  const tableName = req.query.tableName;
  const pipeline = pipelineHelper.getScoresByTable(tableName);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByTableAndAuthor", async (req, res) => {
  const tableName = req.query.tableName;
  const authorName = req.query.authorName;
  const pipeline = pipelineHelper.getScoresByTableAndAuthor(
    tableName,
    authorName,
  );
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByVpsId", async (req, res) => {
  const vpsId = req.query.vpsId;
  const pipeline = pipelineHelper.getScoresByVpsId(vpsId);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByTableAndAuthorUsingFuzzyTableSearch", async (req, res) => {
  const tableSearchTerm = req.query.tableSearchTerm;
  const pipeline = pipelineHelper.getFuzzyTableSearch(tableSearchTerm);
  const table = await mongoHelper.aggregate(pipeline, "tables");
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
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/weeks", async (req, res) => {
  const weeks = await mongoHelper.getAll("weeks");
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
  const weeks = await mongoHelper.aggregate(pipeline, "weeks");
  res.send(weeks);
});

router.get("/currentWeek", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const week = await mongoHelper.findCurrentWeek("weeks", channelName);
  res.send(week);
});

router.get("/recentWeeks", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const limit = parseInt(req.query.limit) || 13;
  const offset = parseInt(req.query.offset) || 0;
  const searchTerm = req.query.searchTerm ?? "";
  const weeks = await mongoHelper.getRecentWeeks(
    channelName,
    limit,
    offset,
    searchTerm,
  );
  res.send(weeks);
});

router.get("/recentTablesByHighscores", async (req, res) => {
  const tables = await mongoHelper.getTables(
    pipelineHelper.getTablesByHighscores(
      parseInt(req.query.limit || 4),
      parseInt(req.query.offset || 0),
      req.query.searchTerm,
    ),
  );
  res.send(tables);
});

router.get("/competitionWeeks", async (req, res) => {
  const weeks = await mongoHelper.getWeeks(
    pipelineHelper.getCompetitionWeeks(
      parseInt(req.query.limit || 4),
      parseInt(req.query.offset || 0),
      req.query.searchTerm,
      parseInt(req.query.week),
    ),
  );
  res.send(weeks);
});

router.get("/seasonWeeks", async (req, res) => {
  const channelName = req.query.channelName ?? "competition-corner";
  const season = parseInt(req.query.season) ?? 1;
  const weeks = await mongoHelper.getSeasonWeeks(channelName, season);
  res.send(weeks);
});

export default router;
