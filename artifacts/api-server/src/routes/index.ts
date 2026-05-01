import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import servicesRouter from "./services";
import expensesRouter from "./expenses";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import monthlyWebsiteRouter from "./monthly-website";
import monthlyDigitalRouter from "./monthly-digital";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(customersRouter);
router.use(servicesRouter);
router.use(expensesRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(monthlyWebsiteRouter);
router.use(monthlyDigitalRouter);

export default router;
