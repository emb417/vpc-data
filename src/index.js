import "dotenv/config";
import express from "express";
import apiRouter from "./routers/api.v1.js";
import { httpLogger, logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3080;

const app = express();

app.use(httpLogger);
app.use(express.json());

app.use("/api/v1", apiRouter);

app.get("/api", (req, res) => {
  res.send("VPC API Endpoint is available, try /api/v1/tables.");
});

app.get("/", (req, res) => {
  res.send("VPC Data Service is up and running...");
});

app.listen(PORT, () => {
  logger.info(`listening on port ${PORT}`);
});
