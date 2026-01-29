import "dotenv/config";
import { logger } from "./logger.js";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

const uri = `mongodb+srv://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@cluster0.blwxx.mongodb.net/${DB_NAME}?retryWrites=true&w=majority&connectTimeoutMS=10000`;

let client = null;
let db = null;

export const initDb = async () => {
  if (db) {
    return db;
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });

  let attempts = 0;
  const maxAttempts = 10;
  let delay = 1000;

  while (attempts < maxAttempts) {
    try {
      await client.connect();
      db = client.db(DB_NAME);
      logger.info("[Mongo] Connected successfully to database");
      return db;
    } catch (err) {
      attempts++;
      logger.error(
        `[Mongo] Connection failed (attempt ${attempts}/${maxAttempts}), retrying in ${delay / 1000}s: ${err.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30000);
    }
  }
  throw new Error(
    "[Mongo] Failed to connect to database after multiple retries.",
  );
};

export const getDb = () => {
  if (!db) {
    throw new Error("[Mongo] Database not initialized. Call initDb first.");
  }
  return db;
};

export const closeDb = async () => {
  if (client) {
    await client.close();
    logger.info("[Mongo] Database connection closed.");
    client = null;
    db = null;
  }
};

export default {
  initDb,
  getDb,
  closeDb,
};
