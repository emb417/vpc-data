import "dotenv/config";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

const connect = async () => {
  const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.blwxx.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;
  const client = new MongoClient(uri);
  return await client.connect();
};

const getCollection = async (client, collectionName) => {
  const collections = await client.db(DB_NAME).collections();
  if (
    !collections.some(
      (collection) => collection.collectionName === collectionName
    )
  ) {
    /**
     * Given a MongoClient and collection name, returns the collection.
     * If the collection does not exist, creates the collection.
     * @param {MongoClient} client A MongoClient instance
     * @param {string} collectionName The collection name
     * @returns {MongoDB.Collection} The collection
     */
    client.db(DB_NAME).createCollection(collectionName);
  }

  return client.db(DB_NAME).collection(collectionName);
};

const getAll = async (collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  const findResult = await collection.find({}).toArray();
  client.close();

  return findResult;
};

const insertMany = async (docs, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  await collection.insertMany(docs);
  client.close();
};

const insertOne = async (doc, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  await collection.insertOne(doc);
  client.close();
};

const updateOne = async (filter, update, options, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  await collection.updateOne(filter, update, options);
  client.close();
};

const deleteAll = async (collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  await collection.deleteMany({});
  client.close();
};

const find = async (filter, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  const docs = await collection.find(filter).toArray();
  client.close();

  return docs;
};

const findOne = async (filter, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  const doc = await collection.findOne(filter);
  client.close();

  return doc;
};

const aggregate = async (pipeline, collectionName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  const docs = await collection.aggregate(pipeline).toArray();
  client.close();

  return docs;
};

const findCurrentWeek = async (collectionName, channelName) => {
  const client = await connect();
  const collection = await getCollection(client, collectionName);
  const doc = await collection.findOne({ isArchived: false, channelName });
  client.close();

  return doc;
};

export default {
  connect,
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
};
