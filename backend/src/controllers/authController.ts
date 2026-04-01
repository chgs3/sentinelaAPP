import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../utils/auth';
import { getZodErrorMessage } from '../utils/zodError';
import { loginSchema, registerSchema } from '../schemas/authSchemas';

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const parsedBody = registerSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { name, email, password } = parsedBody.data;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Já existe um usuário com este email.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });

      const token = generateToken({ userId: user.id });

      return res.status(201).json({
        message: 'Usuário criado com sucesso.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao cadastrar usuário.',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const parsedBody = loginSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { email, password } = parsedBody.data;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          message: 'Credenciais inválidas.',
        });
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
        return res.status(401).json({
          message: 'Credenciais inválidas.',
        });
      }

      const token = generateToken({ userId: user.id });

      return res.status(200).json({
        message: 'Login realizado com sucesso.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao realizar login.',
      });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          message: 'Usuário não encontrado.',
        });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao buscar dados do usuário.',
      });
    }
  }
}

export default new AuthController();