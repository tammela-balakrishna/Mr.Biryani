import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import chatRoutes from './routes/chatRoutes.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '16kb' }));
app.use(pinoHttp());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mr-biryani-api' }));
app.use('/api/v1/chat', chatRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.statusCode ?? 500;
  res.status(status).json({
    error: status >= 500 ? 'The assistant is temporarily unavailable. Please try again later.' : error.message,
  });
});
