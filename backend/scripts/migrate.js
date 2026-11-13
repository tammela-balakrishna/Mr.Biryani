import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

try {
  const sql = await readFile(new URL('../migrations/001_rag_knowledge.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('RAG migration applied.');
} finally {
  await pool.end();
}
