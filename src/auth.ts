import pool from "./index"; // Importa o Pool do seu index.ts
import bcrypt from "bcrypt";

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

/**
 * Cria um novo usuário no banco com senha criptografada
 * @param username Nome do usuário
 * @param email Email do usuário (único)
 * @param senha Senha em texto puro
 * @param role Tipo de usuário: "common" ou "admin"
 * @returns Usuário criado (sem senha)
 */
export async function criarUsuario(
  username: string,
  email: string,
  senha: string,
  role: UserRole = "common"
): Promise<User> {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(senha, saltRounds);

    const query = `
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, created_at;
    `;

    const result = await pool.query(query, [username, email, hash, role]);
    return result.rows[0];
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error.message);
    throw new Error(`Falha ao criar usuário: ${error.message}`);
  }
}

/**
 * Autentica um usuário pelo email e senha
 * @param email Email do usuário
 * @param senha Senha em texto puro
 * @returns Usuário autenticado (sem senha)
 */
export async function autenticarUsuario(
  email: string,
  senha: string
): Promise<User> {
  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const user = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, user.password);

    if (!senhaCorreta) {
      throw new Error("Senha incorreta");
    }

    // Retorna os dados do usuário sem a senha
    const { password, ...userData } = user;
    return userData as User;
  } catch (error: any) {
    console.error("Erro ao autenticar usuário:", error.message);
    throw new Error(`Falha na autenticação: ${error.message}`);
  }
}
