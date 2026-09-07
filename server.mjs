import express from 'express';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 10000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (error) { res.status(503).json({ ok: false, database: 'disconnected', error: error.message }); }
});

app.get('/api/state', async (_req, res) => {
  try {
    const result = await pool.query('SELECT state, updated_at FROM app_state WHERE id = 1');
    res.set('Cache-Control', 'no-store');
    res.json({ state: result.rows[0]?.state || {}, updatedAt: result.rows[0]?.updated_at || null });
  } catch (error) { res.status(500).json({ error: 'Falha ao carregar dados' }); }
});

app.put('/api/state', async (req, res) => {
  if (!req.body || typeof req.body.state !== 'object' || Array.isArray(req.body.state)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    const result = await pool.query(`INSERT INTO app_state (id, state, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW() RETURNING updated_at`, [JSON.stringify(req.body.state)]);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, updatedAt: result.rows[0].updated_at });
  } catch (error) { res.status(500).json({ error: 'Falha ao salvar dados' }); }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`Sistema Financeiro ouvindo na porta ${port}`));
