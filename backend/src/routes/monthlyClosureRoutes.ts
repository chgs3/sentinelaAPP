import { Router } from 'express';
import monthlyClosureController from '../controllers/monthlyClosureController';
import validateIdParamMiddleware from '../middlewares/validateIdParamMiddleware';

const monthlyClosureRoutes = Router();

monthlyClosureRoutes.post('/', monthlyClosureController.create);
monthlyClosureRoutes.get('/', monthlyClosureController.list);
monthlyClosureRoutes.delete(
  '/:id',
  validateIdParamMiddleware,
  monthlyClosureController.delete
);

export default monthlyClosureRoutes;
