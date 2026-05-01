import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import foodsRouter from "./foods";
import recipesRouter from "./recipes";
import logsRouter from "./logs";
import exercisesRouter from "./exercises";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/foods", foodsRouter);
router.use("/recipes", recipesRouter);
router.use("/logs", logsRouter);
router.use("/exercises", exercisesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/ai", aiRouter);
router.use("/weight", profileRouter);

export default router;
