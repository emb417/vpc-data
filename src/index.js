import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./routers/api.v1.js";
import v2Router from "./routers/api.v2.js";
import vpsApiRouter from "./routers/vps.v1.js";
import { initDb, closeDb } from "./utils/mongo.js";
import { httpLogger, logger } from "./utils/logger.js";
import { initializeCache } from "./utils/vps/cache.js";

const PORT = process.env.PORT || 3080;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .filter(Boolean);

const app = express();
app.use(httpLogger);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/v1", apiRouter);
app.use("/api/v2", v2Router);
app.use("/vps/api/v1", vpsApiRouter);

app.get("/vps/api", (req, res) => {
  res.send("VPS API Endpoint is available, try /api/v1/games.");
});

app.get("/vps", (req, res) => {
  res.send("VPS Data Service is up and running...");
});

app.get("/api", (req, res) => {
  res.send("VPC API Endpoint is available, try /api/v1/tables.");
});

app.get("/", (req, res) => {
  res.send("VPC Data Service is up and running...");
});

app.listen(PORT, async () => {
  await initDb(); // Initialize database connection
  initializeCache(); // Initialize VPS cache
  logger.info(`listening on port ${PORT}`);
});

// Graceful shutdown handler
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  await closeDb();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
