import { Router } from 'express';
import transactionController from '../controllers/transactionController';

const transactionRoutes = Router();

transactionRoutes.post('/', transactionController.create);
transactionRoutes.get('/', transactionController.list);
transactionRoutes.put('/:id', transactionController.update);
transactionRoutes.delete('/:id', transactionController.delete);

export default transactionRoutes;