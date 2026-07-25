import { Router } from 'express';
import transactionController from '../controllers/transactionController';
import validateIdParamMiddleware from '../middlewares/validateIdParamMiddleware';

const transactionRoutes = Router();

transactionRoutes.post('/', transactionController.create);
transactionRoutes.get('/', transactionController.list);
transactionRoutes.put(
  '/:id',
  validateIdParamMiddleware,
  transactionController.update
);
transactionRoutes.delete(
  '/:id',
  validateIdParamMiddleware,
  transactionController.delete
);

export default transactionRoutes;
