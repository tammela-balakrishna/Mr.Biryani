import 'dotenv/config';

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((x) => x.trim()),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  ragTopK: Number(process.env.RAG_TOP_K ?? 5),
  ragMinSimilarity: Number(process.env.RAG_MIN_SIMILARITY ?? 0.25),
  chatRateLimitWindowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60000),
  chatRateLimitMax: Number(process.env.CHAT_RATE_LIMIT_MAX ?? 20),
};
