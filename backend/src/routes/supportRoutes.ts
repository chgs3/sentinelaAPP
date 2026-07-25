import { Router } from 'express';
import supportController from '../controllers/supportController';
import validateIdParamMiddleware from '../middlewares/validateIdParamMiddleware';

const supportRoutes = Router();

supportRoutes.post('/', supportController.create);
supportRoutes.get('/', supportController.list);
supportRoutes.get(
  '/:id',
  validateIdParamMiddleware,
  supportController.getById
);

export default supportRoutes;
