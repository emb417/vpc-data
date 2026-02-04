import fs from "fs";
import path from "path";
import { logger } from "../logger.js";

import fetchExternalGamesData from "./fetch.js";

const CACHE_DIR = process.env.CACHE_DIR || "/cache";
const CACHE_FILENAME = "vpsdb.json";
const CACHE_FILE_PATH = path.join(CACHE_DIR, CACHE_FILENAME);
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

let inMemoryCache = { data: null, timestamp: null };
let diskCacheExists = false;
let refreshPromise = null;

/**
 * Atomically writes JSON data to a file.
 * Writes to a temporary file first, then renames it to the target path.
 * @param {string} filePath - The target file path.
 * @param {any} data - The data to write as JSON.
 */
async function atomicWrite(filePath, data) {
  const tempFilePath = `${filePath}.tmp`;
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(tempFilePath, JSON.stringify(data, null, 2));
    await fs.promises.rename(tempFilePath, filePath);
    logger.info(`Successfully wrote to cache file: ${filePath}`);
    diskCacheExists = true;
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to atomically write to cache file: ${filePath}`,
    );
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (cleanupError) {
      logger.error(
        { err: cleanupError },
        `Failed to cleanup temp cache file: ${tempFilePath}`,
      );
    }
    throw error;
  }
}

/**
 * Loads JSON data from a file safely.
 * Handles file not found and JSON parsing errors.
 * @param {string} filePath - The path to the cache file.
 * @returns {Promise<any|null>} The loaded data or null if an error occurs or file not found.
 */
async function loadDiskCache(filePath) {
  try {
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    const data = JSON.parse(fileContent);
    if (Array.isArray(data)) {
      logger.info(`Successfully loaded disk cache from: ${filePath}`);
      diskCacheExists = true;
      return data;
    } else {
      logger.warn(
        `Disk cache file ${filePath} has unexpected format. Treating as empty.`,
      );
      diskCacheExists = false;
      return null;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.info(`Disk cache file not found: ${filePath}`);
      diskCacheExists = false;
    } else {
      logger.error(
        { err: error },
        `Failed to load disk cache from: ${filePath}`,
      );
      diskCacheExists = false;
    }
    return null;
  }
}

/**
 * Manages the cache retrieval and refresh process.
 * Implements stale-on-failure and shared refresh promise.
 * @returns {Promise<Array<any>>} A promise that resolves with the cached or fetched game data.
 * @throws {Error} If data cannot be retrieved from any cache tier.
 */
async function getOrRefreshGamesData() {
  const now = Date.now();

  if (
    inMemoryCache.data &&
    inMemoryCache.timestamp &&
    now - inMemoryCache.timestamp < CACHE_TTL_MS
  ) {
    logger.debug("Serving data from fresh in-memory cache.");
    return inMemoryCache.data;
  }

  if (!refreshPromise) {
    logger.info(
      "In-memory cache stale or missing. Initiating background data refresh.",
    );
    refreshPromise = (async () => {
      let fetchedData = null;
      try {
        const upstreamData = await fetchExternalGamesData(); // This will be imported from fetch.js
        fetchedData = upstreamData;

        inMemoryCache = { data: fetchedData, timestamp: Date.now() };
        await atomicWrite(CACHE_FILE_PATH, fetchedData);

        logger.debug("Successfully refreshed and updated caches.");
      } catch (error) {
        logger.error(
          { err: error },
          "Upstream data fetch failed. Stale cache will be used if available.",
        );
      } finally {
        refreshPromise = null;
      }
      return fetchedData;
    })();
  }

  const dataFromRefresh = await refreshPromise;

  if (dataFromRefresh !== null) {
    logger.debug("Serving data from ongoing/completed upstream refresh.");
    return dataFromRefresh;
  }

  if (
    !diskCacheExists ||
    (inMemoryCache.data && now - inMemoryCache.timestamp >= CACHE_TTL_MS)
  ) {
    const diskData = await loadDiskCache(CACHE_FILE_PATH);
    if (diskData) {
      logger.info("Serving data from disk cache (upstream refresh failed).");
      inMemoryCache = { data: diskData, timestamp: now };
      return diskData;
    }
  }

  logger.error(
    "No valid cache data available (in-memory, disk, or upstream fetch failed).",
  );
  throw new Error("Service Unavailable: Could not fetch or load cache data.");
}

/**
 * Initializes the cache by creating the directory and loading the initial disk cache.
 * This should be called once when the application starts.
 */
async function initializeCache() {
  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    const diskData = await loadDiskCache(CACHE_FILE_PATH);
    if (diskData) {
      inMemoryCache = { data: diskData, timestamp: Date.now() };
    } else {
      logger.info(
        "No valid disk cache found. Triggering initial background fetch.",
      );
      getOrRefreshGamesData().catch((err) => {
        logger.error({ err: err }, "Background initial fetch failed.");
      });
    }
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to initialize cache directory or load initial cache.`,
    );
  }
}

export { initializeCache, getOrRefreshGamesData };
