import express from "express";
import { getOrRefreshGamesData } from "../utils/vps/cache.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("VPS Data Service is up and running...");
});

router.get("/games", async (req, res) => {
  try {
    const gamesData = await getOrRefreshGamesData();
    res.json(gamesData);
  } catch (error) {
    if (
      error.message ===
      "Service Unavailable: Could not fetch or load cache data."
    ) {
      res.status(503).send("Service Unavailable");
    } else {
      logger.error({ err: error }, "Error retrieving games data.");
      res.status(500).send("Internal Server Error");
    }
  }
});

router.get("/games/:name", async (req, res) => {
  const gameName = req.params.name;
  try {
    const gamesData = await getOrRefreshGamesData();
    const regex = new RegExp(`.*${gameName?.toLowerCase()}.*`, "i");
    const filtered = gamesData.filter((g) =>
      g.name?.toLowerCase().match(regex),
    );
    res.json(filtered);
  } catch (error) {
    if (
      error.message ===
      "Service Unavailable: Could not fetch or load cache data."
    ) {
      res.status(503).send("Service Unavailable");
    } else {
      logger.error(
        { err: error },
        `Error retrieving games by name: ${gameName}`,
      );
      res.status(500).send("Internal Server Error");
    }
  }
});

router.get("/games/tables/by-url", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send("Missing required query parameter: url");
  }
  try {
    const gamesData = await getOrRefreshGamesData();
    const normalize = (u) => u?.replace(/\/$/, "").toLowerCase().trim();

    const foundGame = gamesData.find((game) =>
      game.tableFiles?.some((table) =>
        table?.urls?.some((u) => normalize(u?.url) === normalize(url)),
      ),
    );
    res.json(foundGame || {});
  } catch (error) {
    if (
      error.message ===
      "Service Unavailable: Could not fetch or load cache data."
    ) {
      res.status(503).send("Service Unavailable");
    } else {
      logger.error({ err: error }, `Error retrieving game by url: ${url}`);
      res.status(500).send("Internal Server Error");
    }
  }
});

router.get("/games/tables/:vpsId", async (req, res) => {
  const vpsId = req.params.vpsId;
  try {
    const gamesData = await getOrRefreshGamesData();
    const foundGame = gamesData.find(
      (game) =>
        game.tableFiles &&
        game.tableFiles.some((table) => String(table?.id) === vpsId),
    );
    res.json(foundGame || {});
  } catch (error) {
    if (
      error.message ===
      "Service Unavailable: Could not fetch or load cache data."
    ) {
      res.status(503).send("Service Unavailable");
    } else {
      logger.error({ err: error }, `Error retrieving game by vpsId: ${vpsId}`);
      res.status(500).send("Internal Server Error");
    }
  }
});

export default router;
