# Como Rodar o MOSAIC ETC

Este guia foi escrito para quem não tem experiência com programação.
Basta copiar e colar os comandos na ordem em que aparecem.

> **Sistema operacional:** Ubuntu ou outra distribuição Linux baseada em Debian.  
> **Tempo estimado:** 15–30 minutos na primeira vez.

---

## Passo 1 — Instalar o Node.js (motor do aplicativo)

Abra o terminal e execute:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Feche o terminal, abra um novo e execute:

```bash
nvm install 20
```

Verifique se funcionou:

```bash
node --version
```

Deve aparecer algo como `v20.x.x`.

---

## Passo 2 — Instalar o Docker (banco de dados)

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

**Importante:** Após este passo, **feche e reabra o terminal** para que a permissão do Docker seja aplicada.

Verifique se funcionou:

```bash
docker --version
```

---

## Passo 3 — Instalar o Git LFS (arquivos grandes)

```bash
sudo apt-get install -y git-lfs
git lfs install
```

---

## Passo 4 — Baixar o projeto

```bash
git clone https://github.com/MOSAIC-ETC/website.git
cd website
```

---

## Passo 5 — Instalar as dependências do projeto

```bash
npm install
```

> Este comando pode demorar alguns minutos. Aguarde terminar.

---

## Passo 6 — Configurar o ambiente

Execute o bloco abaixo de uma vez (copie tudo e cole no terminal):

```bash
echo "DATABASE_URL=\"postgresql://mosaic:mosaic_dev@localhost:5433/mosaic_etc?schema=public\"" > .env.local
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env.local
echo "AUTH_URL=\"http://localhost:3000\"" >> .env.local
echo "STORAGE_PATH=\"./storage\"" >> .env.local
echo "ADMIN_EMAIL=\"admin@mosaic.local\"" >> .env.local
echo "ADMIN_PASSWORD=\"senha123\"" >> .env.local
```

Isso cria o arquivo de configuração com todos os valores necessários.
Você vai usar o e-mail `admin@mosaic.local` e a senha `senha123` para entrar no sistema.

---

## Passo 7 — Iniciar o banco de dados

```bash
docker compose up -d
```

> O Docker vai baixar a imagem do banco de dados na primeira vez. Pode demorar alguns minutos.

---

## Passo 8 — Preparar o banco de dados

```bash
npx prisma migrate dev
```

> Se aparecer uma pergunta no terminal, pressione **Enter** para confirmar.

---

## Passo 9 — Iniciar o aplicativo

```bash
npm run dev
```

---

## Passo 10 — Abrir no navegador

Abra o navegador e acesse:

**http://localhost:3000**

Para entrar no sistema, clique em **Login** e use:
- **E-mail:** `admin@mosaic.local`
- **Senha:** `senha123`

---

## Parar o aplicativo

No terminal onde o aplicativo está rodando, pressione **Ctrl + C**.

Para parar também o banco de dados:

```bash
docker compose down
```

---

## Rodar novamente (nas próximas vezes)

Depois que tudo já está instalado e configurado, basta executar:

```bash
cd website
docker compose up -d
npm run dev
```

E abrir http://localhost:3000 no navegador.

---

## Algo deu errado?

| Mensagem de erro | O que fazer |
|---|---|
| `command not found: nvm` | Feche e reabra o terminal, depois tente de novo |
| `permission denied` ao usar o Docker | Feche e reabra o terminal após o Passo 2 |
| `port 5433 already in use` | Execute `docker compose down` e tente novamente |
| `Cannot find module` | Execute `npm install` novamente |
