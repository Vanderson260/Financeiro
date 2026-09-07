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

// Libera o acesso para o celular e outros dispositivos se conectarem sem bloqueio de CORS
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota de diagnóstico para testar se o banco está respondendo
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, database: "connected" });
    } catch (error) {
        res.status(500).json({ ok: false, database: "disconnected", error: error.message });
    }
});

// Busca todas as transações cadastradas no banco de dados Neon
app.get('/api/transacoes', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM transacoes ORDER BY data_transacao DESC, id DESC');
        res.json(resultado.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Adiciona uma nova transação enviada pelo PC ou Celular
app.post('/api/transacoes', async (req, res) => {
    const { descricao, valor, tipo, categoria } = req.body;
    try {
        const query = 'INSERT INTO transacoes (descricao, valor, tipo, categoria) VALUES ($1, $2, $3, $4) RETURNING *';
        const resultado = await pool.query(query, [descricao, valor, tipo, categoria]);
        res.status(211).json(resultado.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exclui uma transação e atualiza em todas as telas
app.delete('/api/transacoes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM transacoes WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Garante que qualquer outra rota abra a tela do sistema
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
