import { logger } from "../logger.js";

/**
 * Fetches data from the external upstream API.
 * This is the authoritative source but may be unreliable.
 * @returns {Promise<Array<any>>} A promise that resolves with the fetched data (assumed array of games) or rejects on failure.
 */
async function fetchExternalGamesData() {
  const upstreamUrl = process.env.VPS_URL;
  logger.info(`Fetching data from upstream: ${upstreamUrl}`);
  try {
    const response = await fetch(upstreamUrl);
    if (!response.ok) {
      throw new Error(`Upstream fetch failed with status: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      logger.warn(`Upstream fetch did not return an array. Data: %o`, data);
      throw new Error("Upstream fetch returned non-array data.");
    }
    logger.info(`Successfully fetched ${data.length} games from upstream.`);
    return data;
  } catch (error) {
    logger.error({ err: error }, `Upstream fetch failed.`);
    throw error;
  }
}

export default fetchExternalGamesData;
