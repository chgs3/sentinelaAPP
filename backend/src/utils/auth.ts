import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type TokenPayload = {
  userId: number;
};

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}
