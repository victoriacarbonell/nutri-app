import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import foodsRouter from "./foods";
import recipesRouter from "./recipes";
import logsRouter from "./logs";
import exercisesRouter from "./exercises";
import weightRouter from "./weight";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import authRouter from "./auth";
import { requireUser } from "../middlewares/current-user";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

// Todo lo que sigue exige sesión iniciada.
router.use(requireUser);
router.use("/profile", profileRouter);
router.use("/foods", foodsRouter);
router.use("/recipes", recipesRouter);
router.use("/logs", logsRouter);
router.use("/exercises", exercisesRouter);
router.use("/weight", weightRouter);
router.use("/dashboard", dashboardRouter);
router.use("/ai", aiRouter);

export default router;
