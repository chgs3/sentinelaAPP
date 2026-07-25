import { Router } from 'express';
import summaryController from '../controllers/summaryController';

const summaryRoutes = Router();

summaryRoutes.get('/period', summaryController.getPeriodSummary);
summaryRoutes.get('/categories', summaryController.getCategoriesSummary);
summaryRoutes.get('/comparison', summaryController.getMonthComparison);
summaryRoutes.get('/daily', summaryController.getDailySummary);

export default summaryRoutes;
