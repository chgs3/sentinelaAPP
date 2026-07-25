import { Router } from 'express';
import debtController from '../controllers/debtController';
import validateIdParamMiddleware from '../middlewares/validateIdParamMiddleware';

const debtRoutes = Router();

debtRoutes.post('/', debtController.create);
debtRoutes.post('/message', debtController.handleMessage);
debtRoutes.post('/parse-message', debtController.createFromMessage);
debtRoutes.post('/settle-message', debtController.settleFromMessage);

debtRoutes.get('/', debtController.list);

debtRoutes.put('/:id', validateIdParamMiddleware, debtController.update);
debtRoutes.patch(
  '/:id/status',
  validateIdParamMiddleware,
  debtController.updateStatus
);

debtRoutes.delete('/:id', validateIdParamMiddleware, debtController.delete);

export default debtRoutes;
