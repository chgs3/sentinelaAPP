import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true,
  })
);

// Loga todas as requisições que entram na aplicação
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[APP] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(routes);

// Middleware global para capturar erros não tratados no pipeline
app.use(
  (err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('[APP] erro global:', err);

    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        message: 'Arquivo enviado é muito grande.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
);

export default app;