import { Router } from 'express';
import summaryController from '../controllers/summaryController';
import authMiddleware from '../middlewares/authMiddleware';

const summaryRoutes = Router();

summaryRoutes.use(authMiddleware);

summaryRoutes.get('/period', summaryController.getPeriodSummary);

export default summaryRoutes;