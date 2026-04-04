import { Router } from 'express';
import authRoutes from './authRoutes';
import transactionRoutes from './transactionRoutes';
import messageRoutes from './messageRoutes';
import summaryRoutes from './summaryRoutes';
import debtRoutes from './debtRoutes';
import monthlyClosureRoutes from './monthlyClosureRoutes';
import authMiddleware from '../middlewares/authMiddleware';

const routes = Router();

routes.get('/health', (_req, res) => {
  return res.status(200).json({
    message: 'API funcionando corretamente',
  });
});

routes.use('/auth', authRoutes);

routes.use(authMiddleware);
routes.use('/transactions', transactionRoutes);
routes.use('/messages', messageRoutes);
routes.use('/summary', summaryRoutes);
routes.use('/debts', debtRoutes);
routes.use('/monthly-closures', monthlyClosureRoutes);

export default routes;