import express from "express";
import mongoHelper from "../utils/mongo.js";
import { generateImage } from "../utils/canvas.js";
import {
  getScoresByTablePipeline,
  getScoresByVpsIdPipeline,
  getFuzzyTableSearchPipeline,
  getTablesWithAuthorVersionPipeline,
  getScoresByTableAndAuthorPipeline,
  getScoresByTableAndAuthorAndVersionPipeline,
  getWeeksByChannelNamePipeline,
} from "../utils/pipeline.js";

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
  const dataUri = await generateImage(textToConvert, imageOptions);
  res.send(dataUri);
});

router.get("/tables", async (req, res) => {
  const tables = await mongoHelper.getAll("tables");
  res.send(tables);
});

router.get("/tablesWithAuthorVersion", async (req, res) => {
  const pipeline = getTablesWithAuthorVersionPipeline();
  const tables = await mongoHelper.aggregate(pipeline, "tables");
  res.send(tables);
});

router.get("/scoresByTable", async (req, res) => {
  const tableName = req.query.tableName;
  const pipeline = getScoresByTablePipeline(tableName);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByTableAndAuthor", async (req, res) => {
  const tableName = req.query.tableName;
  const authorName = req.query.authorName;
  const pipeline = getScoresByTableAndAuthorPipeline(tableName, authorName);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByVpsId", async (req, res) => {
  const vpsId = req.query.vpsId;
  const pipeline = getScoresByVpsIdPipeline(vpsId);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByTableAndAuthorUsingFuzzyTableSearch", async (req, res) => {
  const tableSearchTerm = req.query.tableSearchTerm;
  const pipeline = getFuzzyTableSearchPipeline(tableSearchTerm);
  const table = await mongoHelper.aggregate(pipeline, "tables");
  res.send(table);
});

router.get("/scoresByTableAndAuthorAndVersion", async (req, res) => {
  const tableName = req.query.tableName;
  const authorName = req.query.authorName;
  const versionNumber = req.query.versionNumber;
  const pipeline = getScoresByTableAndAuthorAndVersionPipeline(
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
  const pipeline = getWeeksByChannelNamePipeline();
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
  const weeks = await mongoHelper.getRecentWeeks(channelName, limit);
  res.send(weeks);
});

export default router;
