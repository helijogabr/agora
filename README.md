# Agora: Comunicação e solução para Cidades

Uma plataforma de comunicação e integração entre os cidadãos e a prefeitura.

## Instruções de execução:

Este projeto usa `pnpm` como gerenciador de pacotes. Não envie pull requests com arquivos relacionados a outros gerenciadores de pacotes.

```bash
# instalação do pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# instalação de dependências
pnpm install

# ambiente de dev com hot reload
pnpm dev
```

Os comandos anteriores são suficientes para executar um dev-server com hot reload, mockup do banco de dados e KV de sessões.

## Principais tecnologias utilizadas:

- Typescript
- Node.js
- Astro
- React
- @tanstack/query
- Tailwind CSS
- Drizzle ORM
- SQLite

## Deploy:

- Vercel Serverless
- Turso DB

Para credenciais, variáveis de ambiente são utilizadas. Localmente, um arquivo `.env` deve ser criado na raiz do projeto, com as seguintes variáveis:

```
# .env
ASTRO_DB_REMOTE_URL=[...url]
ASTRO_DB_APP_TOKEN=[...token]
```

## Estrutura:

```
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
O frontend é misto entre componentes React e Astro, conforme interação client-side e geração de html no servidor for necessária.

Chamadas `RPC` devem sempre ser realizadas diretamente no servidor ou via `@tanstack/query` no cliente.

Toda a estilização deve ser feita com Tailwind CSS.

O banco de dados é definido via **Astro DB**, com suporte via Drizzle ORM. Para aplicar as migrações, use o comando:
É possível que o banco de dados seja alterado futuramente, mas Drizzle será mantido mesmo com uma alteração para PostgreSQL.
