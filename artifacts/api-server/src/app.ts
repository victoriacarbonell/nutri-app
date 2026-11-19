import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// With the Vite proxy the front end and the API share an origin, so CORS is
// not needed. If the front end is served from another domain, set CORS_ORIGIN
// (comma-separated) and session cookies are allowed.
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (corsOrigin?.length) {
  app.use(cors({ origin: corsOrigin, credentials: true }));
}
app.use(cookieParser());
// 10 MB is enough for a photo already downscaled in the browser; 50 MB invited
// abuse of the AI route.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);
app.use("/api", notFoundHandler);

// Must be last: turns any error into a JSON response.
app.use(errorHandler);

export default app;
