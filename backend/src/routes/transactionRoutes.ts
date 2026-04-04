import { Router } from 'express';
import transactionController from '../controllers/transactionController';
import authMiddleware from '../middlewares/authMiddleware';

const transactionRoutes = Router();

transactionRoutes.use(authMiddleware);

transactionRoutes.post('/', transactionController.create);
transactionRoutes.get('/', transactionController.list);
transactionRoutes.put('/:id', transactionController.update);
transactionRoutes.delete('/:id', transactionController.delete);

export default transactionRoutes;