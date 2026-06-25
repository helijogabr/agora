# Agora: Comunicação e solução para Cidades

Uma plataforma de comunicação e integração entre os cidadãos e a prefeitura.

## Instruções de execução

Este projeto usa `pnpm` como gerenciador de pacotes. Não envie pull requests com arquivos relacionados a outros gerenciadores de pacotes.

```bash
# instalação do pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# instalação de dependências
pnpm install

# ambiente de desenvolvimento com hot reload
pnpm dev
```

Os comandos anteriores são suficientes para executar um servidor de desenvolvimento com hot reload, mockup do banco de dados e KV de sessões.

## Principais tecnologias utilizadas

- TypeScript
- Node.js
- Astro
- React
- TanStack Query
- Tailwind CSS
- Drizzle ORM
- SQLite

## Deploy

- Vercel Serverless
- Turso DB

Para credenciais, variáveis de ambiente são utilizadas. Localmente, um arquivo `.env` deve ser criado na raiz do projeto, com as seguintes variáveis:

```env
ASTRO_DB_REMOTE_URL=[...url]
ASTRO_DB_APP_TOKEN=[...token]
```

### Imagens em publicações

A criação de publicações aceita imagens por meio da Astro Action `createPost`. O cliente React envia apenas um `FormData` para a action e não conhece bucket, endpoint, credenciais, chaves internas, URLs ou detalhes do provedor.

A persistência de imagens segue uma porta neutra de armazenamento de objetos:

- `ObjectStoragePort`, em `src/modules/storage/application/ports/`.
- Adapter atual: Cloudflare R2 via API S3, em `src/modules/storage/infrastructure/cloudflare-r2/`.
- Composição server-side: `src/modules/posts/infrastructure/create-post.composition.ts`.

Para trocar Cloudflare R2 por outro provedor, crie outro adapter que implemente `ObjectStoragePort` e altere somente a composição e a configuração server-side.

Variáveis server-side necessárias para imagens:

```env
OBJECT_STORAGE_DRIVER=cloudflare-r2
CLOUDFLARE_R2_ENDPOINT=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
```

Use credenciais S3 do Cloudflare R2, com Access Key ID e Secret Access Key. Não use Global API Key nem token Bearer genérico como credencial do cliente S3. As mesmas variáveis devem ser configuradas no ambiente de deploy. Nenhuma delas deve usar prefixo público.

Se `CLOUDFLARE_R2_ENDPOINT` não for informado, a aplicação monta o endpoint a partir de `CLOUDFLARE_R2_ACCOUNT_ID`. O nome do bucket deve ser informado em `CLOUDFLARE_R2_BUCKET_NAME`.

Política de imagens:

- até 5 arquivos por publicação;
- até 4 MiB por arquivo;
- até 4 MiB no total da requisição de anexos;
- tipos permitidos: JPEG, PNG, WebP e GIF;
- arquivos vazios, PDF, texto, HTML, SVG, JavaScript, executáveis e MIME desconhecido são rejeitados;
- nome original limitado a 255 caracteres;
- chaves internas são geradas com UUID e não usam nome do arquivo, título, usuário ou outro dado pessoal.

O limite total fica abaixo do limite de request body das Vercel Functions. O Astro também foi configurado com `security.actionBodySizeLimit` para aceitar a mesma faixa de upload via Actions.

A aplicação grava a imagem no R2, persiste os metadados no banco e exibe as imagens no card do post. O cliente recebe apenas metadados seguros e usa um endpoint local do app (`/api/post-images/:attachmentId`) para carregar a imagem. Bucket, endpoint do provedor, storage key e credenciais não são enviados ao cliente. Ainda não há download, URL pré-assinada, bucket público ou `ListObjects`.

## Estrutura

```text
db/ - arquivos relacionados ao banco de dados, como migrações e seeds
public/ - arquivos estáticos servidos automaticamente
src/
  actions/ - ações do backend, implementadas via Astro Actions
  components/ - componentes React e Astro
  pages/ - páginas do Astro
  styles/ - arquivos de estilo Tailwind CSS
  assets/ - arquivos estáticos a serem incluídos, como imagens e fontes
```

## Informações

Todo o backend é implementado via RPC, usando **Astro Actions**, com entrada e saída fortemente tipada e validada via Zod.

O frontend é misto entre componentes React e Astro, conforme interação client-side e geração de HTML no servidor for necessária.

Chamadas RPC devem sempre ser realizadas diretamente no servidor ou via TanStack Query no cliente.

Toda a estilização deve ser feita com Tailwind CSS.

O banco de dados é definido via **Astro DB**, com suporte via Drizzle ORM. É possível que o banco de dados seja alterado futuramente, mas Drizzle será mantido mesmo com uma alteração para PostgreSQL.
