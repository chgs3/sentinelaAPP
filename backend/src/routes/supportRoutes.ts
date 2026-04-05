import { Router } from 'express';
import supportController from '../controllers/supportController';
import authMiddleware from '../middlewares/authMiddleware';

const supportRoutes = Router();

supportRoutes.use(authMiddleware);

supportRoutes.post('/', supportController.create);
supportRoutes.get('/', supportController.list);
supportRoutes.get('/:id', supportController.getById);

export default supportRoutes;