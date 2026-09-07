import express from 'express';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const port = Number(process.env.PORT || 10000);

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined 
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check para conferir se está tudo ok
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, database: "connected" });
    } catch (error) {
        res.status(500).json({ ok: false, database: "disconnected", error: error.message });
    }
});

// Puxa o estado atualizado do banco de dados (Sincronização)
app.get('/api/state', async (req, res) => {
    try {
        const result = await pool.query('SELECT state FROM app_state WHERE id = 1');
        if (result.rows.length === 0) {
            return res.json({});
        }
        res.json(result.rows[0].state);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salva as alterações feitas no PC ou Celular de volta no Neon
app.post('/api/state', async (req, res) => {
    try {
        const { state } = req.body;
        await pool.query(
            'INSERT INTO app_state (id, state, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()',
            [typeof state === 'string' ? state : JSON.stringify(state)]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
