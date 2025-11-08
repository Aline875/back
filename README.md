# 🧩 Documentação Completa do Projeto

---

## 🧠 README do Back-end (`/back/README.md`)

### 📘 Sobre o Projeto

Este back-end foi desenvolvido **com o objetivo de estudos**, para praticar a criação de **APIs RESTful** utilizando **Node.js**, **Express**, **TypeScript** e **PostgreSQL**.

O sistema realiza operações de **autenticação**, **cadastro de usuários** e **comunicação com o banco de dados** hospedado em um container **Docker**.

> 🚧 Este projeto é apenas para fins educacionais, sem objetivos comerciais.

---

### ⚙️ Tecnologias Utilizadas

- **Node.js** — Runtime JavaScript
- **Express** — Framework web minimalista
- **TypeScript** — Tipagem estática para JavaScript
- **PostgreSQL** — Banco de dados relacional
- **bcrypt** — Criptografia de senhas
- **pg** — Driver PostgreSQL para Node.js
- **Docker** — Containerização do banco de dados

---

### 📁 Estrutura do Projeto

```
back/
├── src/
│   ├── controllers/       # Lógica das requisições HTTP
│   ├── routes/           # Definição de rotas
│   ├── database/         # Conexão e configuração do banco
│   ├── services/         # Lógica de negócio
│   ├── middleware/       # Autenticação, validação, etc
│   ├── types/            # Definições de tipos TypeScript
│   ├── index.ts          # Arquivo principal
│   └── ...
├── .env                  # Variáveis de ambiente
├── .env.example          # Exemplo de .env
├── package.json
├── tsconfig.json
├── docker-compose.yml
└── README.md
```

---

### 🚀 Como Executar o Projeto

#### Pré-requisitos

- **Node.js** v18 ou superior
- **Docker** e **Docker Compose**
- **PostgreSQL** (se não usar Docker)

#### Passos de Instalação

1. **Clonar o repositório e navegar até a pasta**
   ```bash
   cd back
   npm install
   ```

2. **Configurar variáveis de ambiente**
   
   Crie um arquivo `.env` na pasta `/back`:
   ```env
   # Banco de Dados
   DB_USER=aline
   DB_PASSWORD=sua_senha_aqui
   DB_HOST=172.20.0.2
   DB_PORT=5432
   DB_NAME=nome_do_banco

   # Servidor
   PORT=4000
   NODE_ENV=development

   # JWT (opcional)
   JWT_SECRET=sua_chave_secreta_aqui
   ```

3. **Subir o container do PostgreSQL**
   ```bash
   docker-compose up -d
   ```

4. **Executar o servidor em modo desenvolvimento**
   ```bash
   npm run dev
   ```

   O servidor será iniciado em: **http://localhost:4000**

5. **Para compilar para produção**
   ```bash
   npm run build
   npm start
   ```

---

### 🔐 Autenticação e Segurança

#### Criptografia de Senhas com bcrypt

Todas as senhas são criptografadas usando **bcrypt** antes de serem armazenadas:

```typescript
import bcrypt from 'bcrypt';

// Ao cadastrar
const hashedPassword = await bcrypt.hash(password, 10);

// Ao fazer login
const isPasswordValid = await bcrypt.compare(password, hashedPassword);
```

#### Login e JWT (se implementado)

- O usuário fornece **email** e **senha**
- O sistema valida as credenciais
- Um token **JWT** é gerado e retornado
- O token é necessário para acessar rotas protegidas

---

### 📡 Endpoints Principais

| Método | Rota | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/auth/register` | Cadastrar novo usuário | ❌ Não |
| POST | `/auth/login` | Fazer login | ❌ Não |
| GET | `/users/profile` | Obter perfil do usuário | ✅ Sim |
| PUT | `/users/profile` | Atualizar perfil | ✅ Sim |

---

### 🎯 Objetivos de Aprendizado

- ✅ Implementar API REST com Express e TypeScript
- ✅ Conectar Node.js a um banco PostgreSQL
- ✅ Aprender Docker para containerização
- ✅ Trabalhar com criptografia (bcrypt)
- ✅ Implementar autenticação segura
- ✅ Estruturar projeto de forma modular e escalável

---

### 🧾 Licença

Este projeto é de uso livre para estudos e aprendizado. Sinta-se à vontade para explorar, modificar e adaptar conforme sua necessidade.

---

---