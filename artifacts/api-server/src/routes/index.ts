import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import servicesRouter from "./services";
import expensesRouter from "./expenses";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(servicesRouter);
router.use(expensesRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);

export default router;
