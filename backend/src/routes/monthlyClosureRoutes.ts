import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
import monthlyClosureController from '../controllers/monthlyClosureController';

const monthlyClosureRoutes = Router();

monthlyClosureRoutes.use(authMiddleware);

monthlyClosureRoutes.post('/', monthlyClosureController.create);
monthlyClosureRoutes.get('/', monthlyClosureController.list);
monthlyClosureRoutes.delete('/:id', monthlyClosureController.delete);

export default monthlyClosureRoutes;