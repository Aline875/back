# Imagem base
FROM node:22

# Diretório de trabalho
WORKDIR /usr/src/app

# Copiar package.json e tsconfig.json
COPY package*.json tsconfig.json ./

# Instalar dependências
RUN npm install

# Copiar o código
COPY src ./src

# Expor a porta
EXPOSE 3001

# Rodar backend em TypeScript
CMD ["npx", "ts-node", "src/index.ts"]
