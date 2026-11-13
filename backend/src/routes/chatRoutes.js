import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import { answerWithRag } from '../services/ragService.js';

const router = Router();
const bodySchema = z.object({
  message: z.string().trim().min(2).max(1000),
});

const limiter = rateLimit({
  windowMs: config.chatRateLimitWindowMs,
  limit: config.chatRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please wait and try again.' },
});

router.post('/', limiter, async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Message must contain between 2 and 1000 characters.' });
    }
    const result = await answerWithRag(parsed.data.message);
    return res.json({ ...result, requestId: req.id ?? null });
  } catch (error) {
    return next(error);
  }
});

export default router;
