# MOSAIC ETC — Notas para o TCC

Este documento reúne decisões arquiteturais, *tradeoffs* e padrões implementados na construção do **MOSAIC ETC** (Exposure Time Calculator para o espectrógrafo MOSAIC do *Extremely Large Telescope*). O conteúdo aqui serve como matéria-prima para o capítulo de arquitetura do TCC: cada seção registra **o que foi feito**, **as alternativas consideradas** e **o porquê** da escolha.

---

## 1. Contexto e premissas iniciais

A primeira versão da aplicação era *frontend-only*: um app Next.js (App Router) que carregava arquivos estáticos (`/public/data/`) e executava todos os cálculos científicos (SNR 1D e 2D) no navegador do usuário. Não havia banco de dados, autenticação real, nem API de servidor.

A camada de backend introduzida nesta fase preserva essa decisão central — **a computação científica continua no cliente** — mas adiciona:

- Banco de dados relacional (PostgreSQL + Prisma) para metadados, usuários e histórico
- Autenticação por e-mail/senha (Auth.js v5, *credentials provider*)
- Gerenciamento administrativo de arquivos (filtros, objetos, tabelas) com histórico de versões
- Parametrização do instrumento via banco, com *audit trail* e reversão
- Invalidação de cache do cliente (IndexedDB) baseada em *hash* SHA-256

Manter o cálculo no cliente é uma decisão deliberada: além de eliminar custo de servidor para a operação principal, preserva a capacidade da aplicação de funcionar *offline-after-first-load* e simplifica o modelo de escalabilidade — o servidor entrega metadados e bytes; o cliente faz física.

---

## 2. Escolha de stack

### 2.1. Prisma como ORM

Prisma foi escolhido frente a alternativas como TypeORM, Drizzle e *raw SQL* por:

- **Tipagem ponta-a-ponta**: o cliente gerado reflete o *schema*, eliminando a classe de erros em que o tipo TypeScript diverge da tabela real.
- **Migrações declarativas**: `prisma migrate` mantém o histórico de mudanças do *schema* em arquivos versionados, facilitando *deploy* reprodutível em servidor universitário sem CI/CD elaborado.
- **Maturidade do ecossistema Next.js**: integração documentada com App Router e padrões consolidados de singleton de cliente (evitando *connection leaks* em *hot reload*).

Drizzle foi descartado por ainda exigir mais *boilerplate* em projetos pequenos; *raw SQL* por dispensar segurança de tipos no momento em que a equipe é unipessoal.

**Nota sobre Prisma 7 (versão usada: 7.8):** a partir da versão 7, a Prisma deixou de aceitar a propriedade `url` dentro do bloco `datasource` em `schema.prisma`. A conexão com o banco passou a ser configurada em dois lugares distintos:

- [prisma.config.ts](prisma.config.ts) — usado pelo `prisma migrate` e `prisma generate` no momento de aplicar e gerar artefatos
- O *constructor* do `PrismaClient` — passa-se um *driver adapter* (`@prisma/adapter-pg` para PostgreSQL) explicitamente

Esta mudança reflete um movimento arquitetural maior do Prisma: separar o **gerador de tipos / motor de migração** (que continua escrito em Rust) da **camada de conexão runtime**, agora delegada a *drivers* JavaScript nativos. O benefício é portabilidade — o mesmo cliente roda em ambientes serverless, *edge runtimes* e Node tradicional sem precisar empacotar o binário Rust de *query engine*. O custo, neste projeto, é uma camada extra de configuração e a necessidade de instalar `@prisma/adapter-pg` + `pg` como dependências explícitas. Documentação do projeto deve registrar essa duplicidade para evitar confusão.

### 2.2. Auth.js v5 (não NextAuth v4)

A versão original do plano apontava NextAuth v4. Optou-se por **Auth.js v5** (`next-auth@beta` em maio/2026), apesar de estar em *beta*, pelos seguintes motivos:

- Suporte nativo ao App Router (v4 ainda carrega vestígios do *Pages Router*)
- API `auth()` substitui o padrão `getServerSession(authOptions)` — mais ergonômico em *Server Components* e *route handlers*
- `middleware.ts` integra-se diretamente via *wrapper* — encadear com o *middleware* de i18n (`next-intl`) é mais direto
- v4 está em modo de manutenção; v5 será a linha ativa pelo restante da vida do projeto

O *tradeoff* é didático: parte da documentação ainda referencia v4, exigindo verificação contra o *changelog* da v5.

### 2.3. Bcrypt vs. argon2

Escolhido `bcryptjs` (implementação JS pura, sem *bindings* nativos) com fator de custo 12. `argon2` é tecnicamente superior (resistência a *side-channel* via *memory-hard*), mas exige compilação nativa, complicando *deploy* no servidor universitário. Para uma base de usuários pequena (admins + colaboradores indicados), bcrypt-12 é suficiente conforme recomendações OWASP 2024.

---

## 3. Decisões arquiteturais

### 3.1. RBAC com permissões embutidas no JWT

Adotou-se um modelo *Role-Based Access Control* (RBAC) com três tabelas centrais: `Role`, `User` e a relação direta `User.roleId → Role.id`. Cada `Role` carrega um vetor `permissions: String[]` com chaves do tipo `"files.upload"`, `"params.edit"`.

**Decisão crítica:** as permissões do usuário são **embutidas no JWT no momento do *sign-in***, não consultadas a cada requisição.

- **Vantagem:** zero *round-trip* ao banco em cada *request* — o *middleware* lê o *token* e decide. Para uma aplicação cujo *hot path* é estático (entrega de arquivos), isso é importante.
- **Custo:** mudanças em permissões de uma *role* não afetam sessões já emitidas. Se um administrador remove uma permissão de uma *role*, usuários daquela *role* só sentirão o efeito após o próximo *login* ou na expiração do *token*.
- **Mitigação:** TTL de sessão curto (8 horas) — aceita-se o atraso máximo de 8h para revogações, evitando o custo de uma tabela de sessões consultada por *request*.

Esta é uma escolha clássica de *stateless auth*: ganha-se desempenho e simplicidade operacional ao custo de revogação instantânea. Para um ETC universitário, com usuários administrativos contados em unidades, o *tradeoff* é favorável.

### 3.2. Cadastro por convite (não auto-cadastro)

A primeira versão do plano permitia auto-cadastro público (qualquer pessoa cria conta, recebe *role* `viewer`). Foi substituído por um modelo **invite-only**:

- Administrador cria um `Invite` com `token` aleatório, `roleId` e validade de 7 dias
- O convidado acessa `/accept-invite/[token]`, define nome e senha
- A conta é criada e o convite consumido

**Por quê:**
- O ETC é uma ferramenta de uso restrito (pesquisadores da colaboração MOSAIC). Cadastro aberto não corresponde ao caso de uso real.
- Elimina a necessidade de verificação de e-mail, *captcha* e *rate-limiting* de registro — superfície de ataque drasticamente menor.
- O administrador conserva controle explícito sobre quem entra.

### 3.3. Histórico de versões com ponteiro "current"

Cada arquivo (filtro, objeto, tabela) é modelado como dois registros:

- `File` — *slot* lógico (categoria + *slug* + papel do *asset*), permanente
- `FileVersion` — uma das múltiplas versões do conteúdo daquele *slot*

A coluna `File.currentVersionId` aponta para a versão atualmente servida. Promover uma versão é apenas atualizar esse ponteiro; reverter é fazer o mesmo. O histórico nunca é destruído.

Padrões alternativos considerados:
- **Sobrescrever o arquivo *in place*** — viola requisito de *audit trail* científico.
- **Versionar por *timestamp* na URL** — espalha lógica de "qual é o atual" pelos clientes; preferiu-se centralizar no servidor.
- **Sistema de arquivos versionado (Git LFS, DVC)** — *overhead* desproporcional para a escala do projeto.

### 3.4. Metadados de filtro por versão, não por *slot*

Cada filtro tem metadados científicos próprios: comprimento de onda efetivo (`effWavelengthNm`) e ponto-zero (`zeroPoint`). A primeira versão do plano associava esses metadados ao `File` (um por *slot*, compartilhado entre versões).

A versão final associa `FilterMetadata` à `FileVersion` (`@id fileVersionId`):

- **Motivo:** se uma versão corrigida da curva de transmissão vier com calibração revisada (ponto-zero diferente), o par (curva, metadados) precisa ser atômico. Reverter para uma versão antiga deve restaurar **também** os metadados antigos — não silenciosamente preservar os novos.
- **Custo:** o formulário de *upload* exige re-entrada dos metadados a cada nova versão (mitigado por pré-preenchimento com a versão anterior na UI).

Este é um exemplo de **correção sobre simplicidade**: a versão simples teria funcionado na maioria dos casos, mas introduzia um modo silencioso de *drift* científico — inaceitável em uma ferramenta de cálculo astronômico.

### 3.5. *Upload* atômico com *staging*

Operações de *upload* envolvem dois sistemas: o disco e o banco. Uma falha entre os dois pode deixar o estado inconsistente. O *pipeline* adotado:

1. Receber o *stream* do arquivo e escrever em `$STORAGE_PATH/_tmp/{uuid}`, calculando SHA-256 *on the fly* via `crypto.createHash('sha256')`
2. Validar o formato (parsing FITS/CSV/NM) — rejeitar com 400 antes de qualquer escrita persistente
3. Transação Prisma: criar `FileVersion`, atualizar `File.currentVersionId`
4. `fs.rename` do arquivo temporário para o caminho final (`{category}/{slug}/v{n}-{sha8}/...`)
5. Em qualquer falha antes do *rename*: `fs.unlink` do temporário

`fs.rename` em sistemas POSIX é atômico dentro do mesmo *filesystem* — o arquivo final ou existe completo ou não existe. Isto é a primitiva que torna o *pipeline* seguro.

### 3.6. *Race condition* em `versionNum`

A versão inicial do plano calculava o número de versão como `count() + 1`. Dois *uploads* concorrentes para o mesmo *slot* resultariam em colisão na *unique constraint* `(fileId, versionNum)`. A correção é envolver a transação inteira em um `SELECT … FOR UPDATE` do registro pai `File`, serializando *writes* por *slot*. A *unique constraint* permanece como *guard rail*.

### 3.7. Invalidação de cache do cliente via *manifest*

O cliente usa IndexedDB para *cache* persistente dos arquivos pesados (cubos FITS, tabelas CSV). Substituir um arquivo no servidor sem mecanismo de invalidação faria os clientes operarem sobre dados *stale* indefinidamente.

A solução é um *endpoint* `GET /api/manifest` que devolve, para cada *slot* atual, seu `fileHash` (SHA-256). Cada entrada do IndexedDB armazena `{ data, hash }`. Os *hooks* `useCSVTables` e `useFITSCube`, ao montar, comparam *hashes*: divergência → evicta + re-baixa.

**Por que não usar apenas *HTTP caching*?**
- *ETags* resolvem 304 em uma requisição direta, mas o cliente precisa **decidir não usar** o IndexedDB antes da requisição.
- O *manifest* é uma camada acima do *cache* HTTP: ele responde "o seu *cache local* ainda é válido?" sem precisar fazer a requisição pesada.

**Por que SHA-256 e não *timestamp*?**
- *Timestamps* mudam com re-uploads idênticos; *hashes* não. Re-subir o mesmo conteúdo não dispara *re-download* desnecessário em centenas de clientes.

### 3.8. Parâmetros do instrumento em JSON versionado

`InstrumentParameter.params` é uma coluna `Json` contendo o *snapshot* completo dos parâmetros editáveis (diâmetro do ELT, escala de pixel, parâmetros por modo MOS-VIS/MOS-NIR/IFU). Cada edição cria uma nova linha; reverter é apenas marcar `isCurrent = true` em uma linha antiga.

A alternativa seria normalizar os parâmetros em múltiplas tabelas. Foi rejeitada porque:
- O conjunto evolui (novos modos, novos detectores) — *schema rigid* significa migração toda vez
- *Snapshot* JSON é trivialmente reversível e auditável (a linha antiga ainda contém a estrutura antiga)
- Validação na escrita via Zod garante consistência sem custo de migração

Inclui-se `schemaVersion` dentro do JSON para permitir adaptação na leitura quando o formato evoluir.

### 3.9. *Audit log* como tabela única

Em vez de tabelas de auditoria espalhadas (uma por entidade), há uma única tabela `AuditLog` com colunas genéricas (`action`, `resourceType`, `resourceId`, `description`, `metadata: Json`). Compromissa um pouco a tipagem em troca de:

- *Schema* estável conforme novas ações forem adicionadas (não exige migração para auditar uma nova entidade)
- Visualização unificada (uma única tela mostra atividade de todo o sistema)
- *Queries* simples para "o que o usuário X fez na semana passada"

---

## 4. Decisões sobre o domínio

### 4.1. Constantes físicas permanecem *hardcoded*

`PLANCK_CONSTANT`, `SPEED_OF_LIGHT` e `ZERO_POINT` vivem em [src/app/[locale]/(public)/etc/lib/physics.ts](src/app/[locale]/\(public\)/etc/lib/physics.ts). Apenas parâmetros **instrumentais** (que variam com calibração do MOSAIC) são editáveis via UI administrativa. Constantes da física não mudam, e expô-las à edição introduziria risco de erro sem benefício.

### 4.2. Tabelas CSV têm conjunto fixo

As 4 tabelas (`background`, `enclosedEnergy`, `hrThroughput`, `lrThroughput`) são referenciadas por nome no código do ETC. Permitir criação de novas tabelas via UI administrativa seria *dead code* — elas não seriam usadas pelo cálculo. A UI restringe a operação a "substituir versão" para essas 4.

### 4.3. *Upload* pareado de objetos

Cada objeto astronômico tem dois arquivos (`preview.fits` e `cube.fits`). São modelados como duas linhas `File` independentes, mas a API força *upload* pareado: `POST /api/admin/objects/[slug]/versions` exige ambos os arquivos no mesmo *form-data*. Cria as duas `FileVersion` em uma única transação, mantendo invariante `preview.versionNum === cube.versionNum`.

Isso elimina a possibilidade de servir um objeto com *preview* de uma calibração e cubo de outra — situação cientificamente incoerente.

---

## 5. *Tradeoffs* deliberadamente aceitos

| Decisão | Risco | Por que aceita |
|---|---|---|
| JWT *stateless* sem revogação imediata | Permissões revogadas levam até 8h para refletir | Carga operacional pequena; revogação imediata exige tabela de sessões consultada por *request* |
| Sem *rate limiting* no *login* | Brute-force teórico | Usuários são poucos e indicados; senhas hash com bcrypt-12; TODO para adicionar se houver abuso |
| Sem verificação de e-mail | Convite via *token* assume canal de entrega confiável (admin envia link) | O admin já confia no destinatário ao criar o convite |
| `params` como JSON não normalizado | Sem integridade referencial dentro do *blob* | Validação Zod na escrita; estrutura evolui com frequência |
| Computação no cliente | Usuário precisa de browser razoavelmente moderno | Já era o modelo da v1; *workers* mantêm a UI responsiva |

---

## 6. Padrões de implementação reutilizáveis

### 6.1. Singleton do `PrismaClient` em Next.js

O *hot reload* do Next.js em desenvolvimento recarrega módulos a cada edição, o que naturalmente cria múltiplas instâncias do `PrismaClient` — cada uma com seu próprio *pool* de conexões. Em poucos minutos, o número de conexões abertas ao Postgres excede o limite configurado e o servidor passa a recusar novas conexões.

A solução adotada (em [src/lib/prisma.ts](src/lib/prisma.ts)) é armazenar o cliente em uma propriedade do objeto global em desenvolvimento:

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

O objeto `globalThis` persiste através de recarregamentos de módulo, evitando a proliferação de clientes. Em produção, onde não há *hot reload*, a guarda do `NODE_ENV` evita "vazar" estado entre execuções.

### 6.2. Guarda de permissão em *route handlers*

Cada *route handler* administrativo segue o mesmo padrão:

```ts
export async function POST(req: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_UPLOAD);
    // … lógica do *handler*, com session.user.id disponível …
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
```

A função `requirePermission` (em [src/lib/api-helpers.ts](src/lib/api-helpers.ts)) lança uma `HttpError` se a sessão não existir ou não carregar a permissão exigida; `errorResponse` traduz a exceção em uma resposta HTTP apropriada (401 / 403 / 4xx / 500). Centralizar essa lógica evita repetição em ~20 *route handlers* e garante que mensagens de erro sigam o mesmo formato.

### 6.3. *Middleware* encadeado: i18n + autenticação

O *middleware* (`src/proxy.ts`, renomeado pelo Next.js 16) precisa fazer duas coisas independentes: rotear prefixos de localidade (`/en`, `/pt`, `/fr`) e bloquear rotas administrativas sem sessão. A composição é feita encadeando o `auth()` do Auth.js v5 (que decora o `req` com `req.auth`) por fora, e chamando o *middleware* de `next-intl` por dentro:

```ts
export default auth((req) => {
  if (isAdminPath(req) && !req.auth) return redirectToLogin(req);
  if (req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();
  return intl(req);
});
```

A ordem importa: o `auth()` precisa rodar primeiro para popular `req.auth`; rotas de API pulam o roteamento i18n (não têm prefixo de localidade); o restante segue para o `intl`.

### 6.4. *Stream-hash-and-write* atômico

A função `writeTempFile` em [src/lib/storage.ts](src/lib/storage.ts) é o coração do pipeline de *upload*:

```ts
const hash = createHash("sha256");
await pipeline(
  stream,
  async function* (src) {
    for await (const chunk of src) {
      hash.update(chunk);    // atualiza hash incrementalmente
      fileSize += chunk.length;
      yield chunk;            // passa o chunk adiante sem cópia
    }
  },
  createWriteStream(tmpPath),
);
return { tmpPath, fileHash: hash.digest("hex"), fileSize };
```

O *generator* intermediário atua como *passthrough* que calcula SHA-256 enquanto os bytes fluem para o disco. Importante: o `pipeline` do `stream/promises` propaga erros de qualquer um dos três estágios, garantindo que falhas no `fs` ou no upstream sejam capturadas com a *stack trace* completa. Não há buffer em memória — adequado para os cubos FITS, que tipicamente têm centenas de MB.

### 6.5. Guarda contra *last-admin lockout*

Permissões "auto-bloqueantes" (`users.manage`, `roles.manage`) precisam de uma guarda explícita: se um administrador removesse acidentalmente a última atribuição de uma delas, ninguém poderia restaurar o acesso pela própria UI. Em [src/lib/admin-guards.ts](src/lib/admin-guards.ts):

```ts
async function ensureUserRoleChangeIsSafe({ userId, newRoleId }) {
  for (const perm of SELF_LOCKING) {
    if (oldRoleHas(perm) && !newRoleHas(perm)) {
      const remaining = await countUsersWithPermission(perm, excludeUserId: userId);
      if (remaining === 0) throw lockoutError(perm);
    }
  }
}
```

A mesma estratégia é aplicada à exclusão de usuários, à edição de permissões de *roles* e à exclusão de *roles*. O custo é uma *query* a mais por operação administrativa; o benefício é a impossibilidade de bloquear o sistema por engano. Padrões de "*last-admin protection*" são comuns em sistemas RBAC sérios e merecem destaque na seção do TCC sobre confiabilidade.

### 6.6. Serialização de `BigInt` em respostas JSON

O Prisma representa colunas Postgres `int8` (usadas para `fileSize`) como `BigInt` em JavaScript. O `JSON.stringify` nativo lança erro ao encontrar um `BigInt`, o que quebra qualquer resposta de API que inclua uma `FileVersion`. A solução adotada é estender `BigInt.prototype.toJSON` no módulo do `PrismaClient`:

```ts
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this as unknown as bigint);
};
```

Como tamanhos de arquivo do ETC nunca se aproximam de `Number.MAX_SAFE_INTEGER` (2⁵³ ≈ 9 PB), a conversão para `Number` é segura e os clientes recebem números nativos. Esta é uma das pegadinhas conhecidas do Prisma + Next.js que vale documentar no TCC porque a mensagem de erro original (`Do not know how to serialize a BigInt`) não aponta para a causa óbvia.

### 6.7. Separação entre constantes de *seed* e parâmetros *runtime*

Originalmente, todo o cálculo do ETC (`calculate.ts`, `calculate-2d.ts`) importava de um único `etc/lib/constants.ts` que misturava três categorias distintas: constantes físicas (h, c, ZP_AB), parâmetros instrumentais (diâmetro do ELT, escalas de pixel, especificações MOS/IFU, detectores) e mapeamentos de colunas CSV. O resultado era que mesmo após introduzir o modelo `InstrumentParameter` versionado no banco e o endpoint `/api/manifest`, o cálculo continuava lendo valores *hardcoded* — quebrando o loop "admin edita → manifest atualiza → ETC usa novo valor".

A refatoração divide as três categorias por arquivo:

- [physics.ts](src/app/\[locale\]/\(public\)/etc/lib/physics.ts) — `PLANCK_CONSTANT`, `SPEED_OF_LIGHT`, `ZERO_POINT` (não variam, não vão para o DB)
- [csv-mappings.ts](src/app/\[locale\]/\(public\)/etc/lib/csv-mappings.ts) — `ENCLOSED_ENERGY_COLUMNS`, `BACKGROUND_COLUMNS`, `THROUGHPUT_COLUMNS` (metadados de estrutura de arquivo; não dependem de calibração)
- [instrument.ts](src/app/\[locale\]/\(public\)/etc/lib/instrument.ts) — `getInstrumentSettings(instrument, params)` agora parametrizado pelo `InstrumentParams` lido do *manifest*

`calculateSNR` e `calculate2DSNR` ganharam um parâmetro `instrumentParams: InstrumentParams` ao final de suas assinaturas. O *Web Worker* repassa o objeto recebido no `WorkerRequest`. A página `etc/page.tsx` lê via `useManifest()` (o mesmo *hook* já usado por `useFilters`/`useObjects`, com cache de módulo e deduplicação de *in-flight*), e o serializa para o *worker* a cada *dispatch*.

O antigo `constants.ts` foi removido. A fonte da verdade para os valores iniciais é `DEFAULT_INSTRUMENT_PARAMS` em [src/lib/schemas/instrument-params.ts](src/lib/schemas/instrument-params.ts), consumido apenas pelo *seed* do Prisma. Esta é a mesma disciplina aplicada aos arquivos de bootstrap em `prisma/seed-data/` (originalmente serviam o ETC diretamente em `/public/data/`, agora só alimentam o *seed*): valores iniciais ficam disponíveis em um local explicitamente marcado como "*seed-only*", e o *runtime* lê do banco através da API.
