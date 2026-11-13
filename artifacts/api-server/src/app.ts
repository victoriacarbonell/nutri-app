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
// Con el proxy de Vite el front y el API comparten origen y no hace falta
// CORS. Si el front se sirve desde otro dominio, se indica en CORS_ORIGIN
// (varios separados por comas) y se permiten las cookies de sesión.
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (corsOrigin?.length) {
  app.use(cors({ origin: corsOrigin, credentials: true }));
}
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);
app.use("/api", notFoundHandler);

// Siempre el último: convierte cualquier error en una respuesta JSON.
app.use(errorHandler);

export default app;
