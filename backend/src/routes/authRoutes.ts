import { Router } from 'express';
import authController from '../controllers/authController';
import authMiddleware from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiters';

const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.get('/me', authMiddleware, authController.me);
authRoutes.put('/profile', authMiddleware, authController.updateProfile);

export default authRoutes;
