import { Router } from 'express';
import debtController from '../controllers/debtController';
import authMiddleware from '../middlewares/authMiddleware';

const debtRoutes = Router();

debtRoutes.use(authMiddleware);

debtRoutes.post('/', debtController.create);
debtRoutes.post('/message', debtController.handleMessage);
debtRoutes.post('/parse-message', debtController.createFromMessage);
debtRoutes.post('/settle-message', debtController.settleFromMessage);

debtRoutes.get('/', debtController.list);

debtRoutes.put('/:id', debtController.update);
debtRoutes.patch('/:id/status', debtController.updateStatus);

debtRoutes.delete('/:id', debtController.delete);

export default debtRoutes;