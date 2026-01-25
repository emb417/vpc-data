import "dotenv/config";
import { logger } from "./logger.js";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.blwxx.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let dbInstance = null;

const getDb = async () => {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(DB_NAME);
  }
  return dbInstance;
};

const getCollection = async (collectionName) => {
  const db = await getDb();
  return db.collection(collectionName);
};

const getAll = async (collectionName) => {
  const collection = await getCollection(collectionName);
  const findResult = await collection.find({}).toArray();
  return findResult;
};

const insertMany = async (docs, collectionName) => {
  const collection = await getCollection(collectionName);
  await collection.insertMany(docs);
};

const insertOne = async (doc, collectionName) => {
  const collection = await getCollection(collectionName);
  await collection.insertOne(doc);
};

const updateOne = async (filter, update, options, collectionName) => {
  const collection = await getCollection(collectionName);
  await collection.updateOne(filter, update, options);
};

const deleteAll = async (collectionName) => {
  const collection = await getCollection(collectionName);
  await collection.deleteMany({});
};

const find = async (filter, collectionName) => {
  const collection = await getCollection(collectionName);
  const docs = await collection.find(filter).toArray();
  return docs;
};

const findOne = async (filter, collectionName) => {
  const collection = await getCollection(collectionName);
  const doc = await collection.findOne(filter);
  return doc;
};

const aggregate = async (pipeline, collectionName) => {
  const collection = await getCollection(collectionName);
  const docs = await collection.aggregate(pipeline).toArray();

  return docs;
};

const findCurrentWeek = async (collectionName, channelName) => {
  const collection = await getCollection(collectionName);
  const doc = await collection.findOne({ isArchived: false, channelName });
  return doc;
};

const getRecentWeeks = async (channelName, limit) => {
  const collection = await getCollection("weeks");
  const start = Date.now();
  const docs = await collection
    .find({ channelName })
    .sort({ weekNumber: -1 })
    .limit(limit)
    .toArray();
  const end = Date.now();
  logger.info(
    `[Mongo] getRecentWeeks(${channelName}, limit=${limit}) took ${end - start}ms`,
  );
  return docs;
};

const getRecentTables = async (pipeline) => {
  const collection = await getCollection("tables");
  const start = Date.now();
  const docs = await collection.aggregate(pipeline).toArray();
  const end = Date.now();
  logger.info(`[Mongo] getRecentTablesByHighscores took ${end - start}ms`);
  return docs;
};

export default {
  getCollection,
  getAll,
  insertMany,
  insertOne,
  updateOne,
  deleteAll,
  find,
  findOne,
  aggregate,
  findCurrentWeek,
  getRecentWeeks,
  getRecentTables,
};
