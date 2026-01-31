import pino from "pino";
import pinoHttp from "pino-http";

export const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  customSuccessMessage: (req, res) =>
    `${res.statusCode} ${req.method} ${req.url}`,
  customErrorMessage: (req, res, err) =>
    `${res.statusCode} ${req.method} ${req.url} ${err?.message ?? ""}`,
  customAttributeKeys: {
    req: "ignore",
    res: "ignore",
    err: "ignore",
    responseTime: "ignore",
  },
  serializers: { ignore: () => undefined },
  wrapSerializers: false,
});
