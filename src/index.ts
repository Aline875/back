import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import {
  criarUsuario,
  autenticarUsuario,
  obterUsuarioById,
  atualizarUsuario,
  alterarSenha,
  deletarUsuario,
  listarUsuarios,
} from "./auth";

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_super_segura";

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || "aline",
  password: process.env.DB_PASSWORD || "Beatrizaline0808@",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "portifolio",
});

// ============================================
// CRIAR TABELAS
// ============================================

async function criarTabelaUsers() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'common',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log("✓ Tabela 'users' pronta!");
  } catch (error: any) {
    console.error("Erro ao criar tabela 'users':", error.message);
  }
}

async function criarTabelaMessages() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);

    const check = await pool.query("SELECT COUNT(*) FROM messages;");
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query("INSERT INTO messages (message) VALUES ($1);", ["Olá do banco!"]);
    }

    console.log("✓ Tabela 'messages' pronta!");
  } catch (error: any) {
    console.error("Erro ao criar tabela 'messages':", error.message);
  }
}

// Inicializar tabelas
criarTabelaUsers();
criarTabelaMessages();

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================

const verificarToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.id;
    next();
  } catch (error: any) {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

// ============================================
// ROTAS DE TESTE
// ============================================

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "API Study Project rodando! 🚀",
    version: "1.0.0",
    endpoints: {
      auth: [
        { method: "POST", path: "/auth/register", desc: "Criar novo usuário" },
        { method: "POST", path: "/auth/login", desc: "Fazer login" },
      ],
      users: [
        { method: "GET", path: "/users/profile", desc: "Obter perfil (protegido)" },
        { method: "PUT", path: "/users/profile", desc: "Atualizar perfil (protegido)" },
        { method: "PUT", path: "/users/password", desc: "Alterar senha (protegido)" },
        { method: "DELETE", path: "/users/account", desc: "Deletar conta (protegido)" },
        { method: "GET", path: "/users/list", desc: "Listar todos os usuários" },
      ],
      test: [
        { method: "GET", path: "/test-db", desc: "Testar conexão com banco" },
        { method: "GET", path: "/hello", desc: "Buscar mensagem do banco" },
      ],
    },
  });
});

app.get("/test-db", async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.json({ message: "✓ Conexão com o banco OK!" });
  } catch (error: any) {
    console.error("Erro na conexão:", error.message);
    res.status(500).json({ message: "Erro na conexão com o banco" });
  }
});

app.get("/hello", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT message FROM messages LIMIT 1");
    const message = result.rows[0]?.message || "Nenhuma mensagem encontrada";
    res.json({ message });
  } catch (error: any) {
    console.error("Erro ao buscar mensagem:", error.message);
    res.status(500).json({ message: "Erro ao buscar mensagem" });
  }
});

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

/**
 * POST /auth/register
 * Cria um novo usuário
 * Body: { username, email, password }
 */
app.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email e password são obrigatórios",
      });
    }

    const { user, token } = await criarUsuario(username, email, password);
    res.status(201).json({ user, token });
  } catch (error: any) {
    console.error("Erro no registro:", error.message);
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /auth/login
 * Autentica um usuário
 * Body: { email, password }
 */
app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email e password são obrigatórios",
      });
    }

    const { user, token } = await autenticarUsuario(email, password);
    res.json({ user, token });
  } catch (error: any) {
    console.error("Erro no login:", error.message);
    res.status(401).json({ message: error.message });
  }
});

// ============================================
// ROTAS DE USUÁRIO (Protegidas)
// ============================================

/**
 * GET /users/profile
 * Obter perfil do usuário autenticado
 */
app.get("/users/profile", verificarToken, async (req: any, res: Response) => {
  try {
    const user = await obterUsuarioById(req.userId);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * PUT /users/profile
 * Atualizar perfil do usuário autenticado
 * Body: { username?, email? }
 */
app.put("/users/profile", verificarToken, async (req: any, res: Response) => {
  try {
    const { username, email } = req.body;
    const user = await atualizarUsuario(req.userId, username, email);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /users/password
 * Alterar senha do usuário autenticado
 * Body: { senhaAtual, novaSenha }
 */
app.put("/users/password", verificarToken, async (req: any, res: Response) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        message: "Senha atual e nova senha são obrigatórias",
      });
    }

    const result = await alterarSenha(req.userId, senhaAtual, novaSenha);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /users/account
 * Deletar conta do usuário autenticado
 * Body: { password }
 */
app.delete("/users/account", verificarToken, async (req: any, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Senha é obrigatória para deletar conta",
      });
    }

    const result = await deletarUsuario(req.userId, password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * GET /users/list
 * Listar todos os usuários
 */
app.get("/users/list", async (req: Request, res: Response) => {
  try {
    const users = await listarUsuarios();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// TRATAMENTO DE ERRO 404
// ============================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Rota não encontrada",
    path: req.path,
    method: req.method,
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Backend rodando em:               ║
║  http://localhost:${PORT}              ║
║                                        ║
║  📝 Documentação:                      ║
║  GET  http://localhost:${PORT}/        ║
║                                        ║
║  🧪 Testes:                            ║
║  GET  http://localhost:${PORT}/test-db ║
║  GET  http://localhost:${PORT}/hello   ║
║                                        ║
║  🔐 Auth:                              ║
║  POST http://localhost:${PORT}/auth/register ║
║  POST http://localhost:${PORT}/auth/login    ║
╚════════════════════════════════════════╝
  `);
});

export default pool;