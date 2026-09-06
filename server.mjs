import express from 'express';
import pg from 'pg';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 10000);
const appPassword = process.env.APP_PASSWORD;
const sessionToken = crypto.createHash('sha256').update(`${appPassword || ''}:${process.env.SESSION_SECRET || 'change-me'}`).digest('hex');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!appPassword || token !== sessionToken) return res.status(401).json({ error: 'Não autorizado' });
  next();
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (error) { res.status(503).json({ ok: false, database: 'disconnected', error: error.message }); }
});

app.post('/api/login', (req, res) => {
  if (!appPassword || req.body?.password !== appPassword) return res.status(401).json({ error: 'Senha inválida' });
  res.json({ token: sessionToken });
});

app.get('/api/state', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query('SELECT state FROM app_state WHERE id = 1');
    res.json({ state: result.rows[0]?.state || {} });
  } catch (error) { res.status(500).json({ error: 'Falha ao carregar dados' }); }
});

app.put('/api/state', requireAuth, async (req, res) => {
  if (!req.body || typeof req.body.state !== 'object' || Array.isArray(req.body.state)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await pool.query(`INSERT INTO app_state (id, state, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`, [JSON.stringify(req.body.state)]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: 'Falha ao salvar dados' }); }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`Sistema Financeiro ouvindo na porta ${port}`));
