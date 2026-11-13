import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
import { embedText } from '../src/services/ragService.js';

const root = fileURLToPath(new URL('../knowledge/', import.meta.url));
const vector = (values) => `[${values.join(',')}]`;
const chunkText = (text, size = 900, overlap = 120) => {
  const clean = text.replace(/\r/g, '').trim();
  const chunks = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    const part = clean.slice(start, start + size).trim();
    if (part.length >= 80) chunks.push(part);
  }
  return chunks;
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

try {
  const files = await walk(root);
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const title = text.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(file);
    for (const chunk of chunkText(text)) {
      const hash = createHash('sha256').update(`${file}\n${chunk}`).digest('hex');
      const embedding = await embedText(chunk);
      await pool.query(
        `INSERT INTO knowledge_chunks (title, source, content, content_hash, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT (content_hash) DO UPDATE SET
           title = EXCLUDED.title, content = EXCLUDED.content,
           embedding = EXCLUDED.embedding, updated_at = NOW()`,
        [title, path.relative(root, file), chunk, hash, vector(embedding)],
      );
    }
    console.log(`Indexed ${path.relative(root, file)}`);
  }
  console.log(`Ingestion complete: ${files.length} source files.`);
} finally {
  await pool.end();
}
