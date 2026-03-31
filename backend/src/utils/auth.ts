import jwt from 'jsonwebtoken';

type TokenPayload = {
  userId: number;
};

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
}