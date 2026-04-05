import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json({
    limit: '10mb',
}));
app.use(express.urlencoded({
    limit: '10mb',
    extended: true,
}));

app.use(routes);

export default app;