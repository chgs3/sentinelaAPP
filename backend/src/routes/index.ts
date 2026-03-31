import { Router } from 'express';
import transactionRoutes from './transactionRoutes';
import messageRoutes from './messageRoutes';
import summaryRoutes from './summaryRoutes';

const routes = Router();

routes.get('/health', (_req, res) => {
  return res.status(200).json({
    message: 'API funcionando corretamente',
  });
});

routes.use('/transactions', transactionRoutes);
routes.use('/messages', messageRoutes);
routes.use('/summary', summaryRoutes);

export default routes;