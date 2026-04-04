import { Router } from 'express';
import summaryController from '../controllers/summaryController';
import authMiddleware from '../middlewares/authMiddleware';

const summaryRoutes = Router();

summaryRoutes.use(authMiddleware);

summaryRoutes.get('/period', summaryController.getPeriodSummary);
summaryRoutes.get('/categories', summaryController.getCategoriesSummary);
summaryRoutes.get('/comparison', summaryController.getMonthComparison);
summaryRoutes.get('/daily', summaryController.getDailySummary);

export default summaryRoutes;