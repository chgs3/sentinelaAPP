import { Router } from 'express';
import summaryController from '../controllers/summaryController';

const summaryRoutes = Router();

summaryRoutes.get('/monthly', summaryController.monthly);

export default summaryRoutes;