import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { criarUsuario, autenticarUsuario } from "./auth";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

const PORT = 4000;

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || "aline",
  password: process.env.DB_PASSWORD || "Beatrizaline0808@",
  host: process.env.DB_HOST || "postgres", // nome do serviço Docker
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "portifolio",
});

// Função para criar tabela de mensagens caso não exista
async function criarTabelaMessages() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL
      );
    `;
    await pool.query(query);

    // Inserir uma mensagem de teste se a tabela estiver vazia
    const check = await pool.query("SELECT COUNT(*) FROM messages;");
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query("INSERT INTO messages (message) VALUES ($1);", ["Olá do banco!"]);
    }

    console.log("Tabela 'messages' pronta!");
  } catch (error: any) {
    console.error("Erro ao criar tabela 'messages':", error.message);
  }
}

// Inicializa a tabela
criarTabelaMessages();

// Endpoint para testar conexão com o banco
app.get("/test-db", async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.json({ message: "Conexão com o banco OK!" });
  } catch (error: any) {
    console.error("Erro na conexão:", error.message);
    res.status(500).json({ message: "Erro na conexão com o banco" });
  }
});

// Endpoint para buscar mensagem
app.get("/hello", async (req, res) => {
  try {
    const result = await pool.query("SELECT message FROM messages LIMIT 1");
    const message = result.rows[0]?.message || "Nenhuma mensagem encontrada";
    res.json({ message });
  } catch (error: any) {
    console.error("Erro ao buscar mensagem:", error.message);
    res.status(500).json({ message: "Erro ao buscar mensagem" });
  }
});

app.get("/create-test-user", async (req, res) => {
  try {
    const user = await criarUsuario("usuario1", "user1@email.com", "123456", "common");
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});

export default pool;
