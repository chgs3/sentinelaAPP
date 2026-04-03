import { Router } from 'express';
import messageController from '../controllers/messageController';

const messageRoutes = Router();

messageRoutes.post('/parse', messageController.parseAndCreate);
messageRoutes.post('/confirm', messageController.confirmParsedTransaction);

export default messageRoutes;