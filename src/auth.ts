import pool from "./index"; // Importa o Pool do seu index.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Tipos de usuário
export type UserRole = "common" | "admin";

// Interface para o usuário retornado (sem senha)
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at?: Date;
}

// Interface para resposta de autenticação com token
export interface AuthResponse {
  user: User;
  token: string;
}

// Chave secreta para JWT (use variável de ambiente em produção)
const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_super_segura";
const JWT_EXPIRES_IN = "24h";

/**
 * Gera um token JWT para o usuário
 * @param user Dados do usuário
 * @returns Token JWT
 */
export function gerarToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica se um email já está registrado
 * @param email Email a verificar
 * @returns true se existe, false caso contrário
 */
export async function emailExiste(email: string): Promise<boolean> {
  try {
    const query = "SELECT id FROM users WHERE email = $1";
    const result = await pool.query(query, [email.toLowerCase()]);
    return result.rows.length > 0;
  } catch (error: any) {
    console.error("Erro ao verificar email:", error.message);
    throw new Error(`Erro ao verificar email: ${error.message}`);
  }
}

/**
 * Verifica se um username já está registrado
 * @param username Username a verificar
 * @returns true se existe, false caso contrário
 */
export async function usernameExiste(username: string): Promise<boolean> {
  try {
    const query = "SELECT id FROM users WHERE LOWER(username) = LOWER($1)";
    const result = await pool.query(query, [username]);
    return result.rows.length > 0;
  } catch (error: any) {
    console.error("Erro ao verificar username:", error.message);
    throw new Error(`Erro ao verificar username: ${error.message}`);
  }
}

/**
 * Cria um novo usuário no banco com senha criptografada
 * @param username Nome do usuário
 * @param email Email do usuário (único)
 * @param senha Senha em texto puro
 * @param role Tipo de usuário: "common" ou "admin"
 * @returns Resposta com usuário criado e token JWT
 */
export async function criarUsuario(
  username: string,
  email: string,
  senha: string,
  role: UserRole = "common"
): Promise<AuthResponse> {
  try {
    // Validações básicas
    if (!username || username.trim().length < 3) {
      throw new Error("Username deve ter pelo menos 3 caracteres");
    }

    if (!email || !email.includes("@")) {
      throw new Error("Email inválido");
    }

    if (!senha || senha.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    // Verificar se email já existe
    if (await emailExiste(email)) {
      throw new Error("Email já cadastrado");
    }

    // Verificar se username já existe
    if (await usernameExiste(username)) {
      throw new Error("Username já está em uso");
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(senha, saltRounds);

    const query = `
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, created_at;
    `;

    const result = await pool.query(query, [username, email.toLowerCase(), hash, role]);
    const user = result.rows[0] as User;
    const token = gerarToken(user);

    console.log(`✓ Usuário criado: ${username} (${email})`);

    return { user, token };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error.message);
    throw new Error(`Falha ao criar usuário: ${error.message}`);
  }
}

/**
 * Autentica um usuário pelo email e senha
 * @param email Email do usuário
 * @param senha Senha em texto puro
 * @returns Resposta com usuário autenticado e token JWT
 */
export async function autenticarUsuario(
  email: string,
  senha: string
): Promise<AuthResponse> {
  try {
    if (!email || !email.includes("@")) {
      throw new Error("Email inválido");
    }

    if (!senha || senha.length === 0) {
      throw new Error("Senha é obrigatória");
    }

    const query = "SELECT * FROM users WHERE LOWER(email) = LOWER($1)";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      throw new Error("Email ou senha inválidos");
    }

    const user = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, user.password);

    if (!senhaCorreta) {
      throw new Error("Email ou senha inválidos");
    }

    // Retorna os dados do usuário sem a senha
    const { password, ...userData } = user;
    const usuarioRetorno = userData as User;
    const token = gerarToken(usuarioRetorno);

    console.log(`✓ Login bem-sucedido: ${email}`);

    return { user: usuarioRetorno, token };
  } catch (error: any) {
    console.error("Erro ao autenticar usuário:", error.message);
    throw new Error(`Falha na autenticação: ${error.message}`);
  }
}

/**
 * Obtém um usuário pelo ID
 * @param id ID do usuário
 * @returns Usuário encontrado (sem senha)
 */
export async function obterUsuarioById(id: number): Promise<User> {
  try {
    const query = "SELECT id, username, email, role, created_at FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    return result.rows[0] as User;
  } catch (error: any) {
    console.error("Erro ao obter usuário:", error.message);
    throw new Error(`Falha ao obter usuário: ${error.message}`);
  }
}

/**
 * Atualiza dados do usuário
 * @param id ID do usuário
 * @param username Novo username (opcional)
 * @param email Novo email (opcional)
 * @returns Usuário atualizado
 */
export async function atualizarUsuario(
  id: number,
  username?: string,
  email?: string
): Promise<User> {
  try {
    const usuarioAtual = await obterUsuarioById(id);
    const novoUsername = username || usuarioAtual.username;
    const novoEmail = email ? email.toLowerCase() : usuarioAtual.email;

    // Validações
    if (novoUsername && novoUsername.length < 3) {
      throw new Error("Username deve ter pelo menos 3 caracteres");
    }

    if (novoEmail && !novoEmail.includes("@")) {
      throw new Error("Email inválido");
    }

    // Verificar se novo email já existe (de outro usuário)
    if (novoEmail !== usuarioAtual.email && (await emailExiste(novoEmail))) {
      throw new Error("Este email já está cadastrado");
    }

    // Verificar se novo username já existe (de outro usuário)
    if (
      novoUsername !== usuarioAtual.username &&
      (await usernameExiste(novoUsername))
    ) {
      throw new Error("Este username já está em uso");
    }

    const query = `
      UPDATE users 
      SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, username, email, role, created_at;
    `;

    const result = await pool.query(query, [novoUsername, novoEmail, id]);
    console.log(`✓ Usuário atualizado: ID ${id}`);
    return result.rows[0] as User;
  } catch (error: any) {
    console.error("Erro ao atualizar usuário:", error.message);
    throw new Error(`Falha ao atualizar usuário: ${error.message}`);
  }
}

/**
 * Altera a senha do usuário
 * @param id ID do usuário
 * @param senhaAtual Senha atual para validação
 * @param novaSenha Nova senha
 * @returns Mensagem de sucesso
 */
export async function alterarSenha(
  id: number,
  senhaAtual: string,
  novaSenha: string
): Promise<{ message: string }> {
  try {
    if (!senhaAtual || senhaAtual.length === 0) {
      throw new Error("Senha atual é obrigatória");
    }

    if (!novaSenha || novaSenha.length < 6) {
      throw new Error("Nova senha deve ter pelo menos 6 caracteres");
    }

    if (senhaAtual === novaSenha) {
      throw new Error("Nova senha deve ser diferente da atual");
    }

    const query = "SELECT password FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, result.rows[0].password);

    if (!senhaCorreta) {
      throw new Error("Senha atual incorreta");
    }

    const saltRounds = 10;
    const novaHash = await bcrypt.hash(novaSenha, saltRounds);

    const updateQuery = "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2";
    await pool.query(updateQuery, [novaHash, id]);

    console.log(`✓ Senha alterada: ID ${id}`);
    return { message: "Senha alterada com sucesso" };
  } catch (error: any) {
    console.error("Erro ao alterar senha:", error.message);
    throw new Error(`Falha ao alterar senha: ${error.message}`);
  }
}

/**
 * Deleta um usuário
 * @param id ID do usuário
 * @param senha Senha para validação
 * @returns Mensagem de sucesso
 */
export async function deletarUsuario(
  id: number,
  senha: string
): Promise<{ message: string }> {
  try {
    if (!senha || senha.length === 0) {
      throw new Error("Senha é obrigatória para deletar conta");
    }

    const query = "SELECT password FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const senhaCorreta = await bcrypt.compare(senha, result.rows[0].password);

    if (!senhaCorreta) {
      throw new Error("Senha incorreta");
    }

    const deleteQuery = "DELETE FROM users WHERE id = $1";
    await pool.query(deleteQuery, [id]);

    console.log(`✓ Usuário deletado: ID ${id}`);
    return { message: "Usuário deletado com sucesso" };
  } catch (error: any) {
    console.error("Erro ao deletar usuário:", error.message);
    throw new Error(`Falha ao deletar usuário: ${error.message}`);
  }
}

/**
 * Lista todos os usuários (apenas para testes)
 * @returns Array de usuários (sem senhas)
 */
export async function listarUsuarios(): Promise<User[]> {
  try {
    const query = "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC";
    const result = await pool.query(query);
    return result.rows as User[];
  } catch (error: any) {
    console.error("Erro ao listar usuários:", error.message);
    throw new Error(`Falha ao listar usuários: ${error.message}`);
  }
}