import { Router } from 'express';
import messageController from '../controllers/messageController';

const messageRoutes = Router();

messageRoutes.get('/test', (_req, res) => {
  return res.json({ message: 'message route ok' });
});

messageRoutes.post('/parse', messageController.parseAndCreate);

export default messageRoutes;