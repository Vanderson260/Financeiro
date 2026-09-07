# Sistema Financeiro — Neon + Render

## O que foi preparado

O sistema original foi mantido como frontend HTML e recebeu uma API Express. Os dados continuam funcionando localmente no navegador para evitar perda durante a conexão e são sincronizados com uma tabela PostgreSQL no Neon. O acesso à API é protegido por uma senha única definida no Render.

## 1. Criar o banco no Neon

1. Abra o **Neon Console** e crie ou selecione um projeto PostgreSQL.
2. Abra o SQL Editor.
3. Cole o conteúdo do arquivo `schema.sql` e execute.
4. No botão **Connect**, copie a connection string PostgreSQL. Ela normalmente começa com `postgresql://`.

Não publique essa string em repositório público nem a coloque dentro do HTML.

## 2. Publicar no Render

Crie um **Web Service** conectado ao repositório que contém esta pasta.

- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** `NODE_ENV=production`

Adicione estas variáveis em **Environment Variables**:

- `DATABASE_URL` = connection string copiada do Neon
- `APP_PASSWORD` = uma senha forte para acessar o sistema
- `SESSION_SECRET` = uma sequência aleatória longa, diferente da senha

O Render fornece automaticamente `PORT`; não é necessário criar essa variável.

Depois clique em **Deploy latest commit**. Quando terminar, abra:

`https://SEU-SERVICO.onrender.com/api/health`

O resultado esperado é:

```json
{"ok":true,"database":"connected"}
```

Ao abrir o endereço principal pela primeira vez, o sistema pedirá a senha definida em `APP_PASSWORD`. A sessão fica válida até fechar o navegador.

## 3. Importar dados antigos

Antes de publicar, no sistema antigo use **Configurações → Exportar Backup**. Depois de abrir a versão publicada, use **Configurações → Carregar Arquivo**. O backup será carregado localmente e sincronizado com o Neon após a importação.

## Observações importantes

A versão atual usa uma tabela JSONB única para preservar integralmente a estrutura já existente do sistema sem alterar as regras de parcelamento, transferências, relatórios e backups. Para uso individual isso é simples e adequado. Se futuramente houver vários usuários, será necessário criar contas de usuário, sessões individuais e separar os registros por usuário.

O banco Neon deve estar com a suspensão automática esperada do plano escolhido. O primeiro acesso após um período parado pode levar alguns segundos.
