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

---

## Principais componentes e funcionalidades

### Web Client-Side
#### Tela de login
Permite que o usuário preencha um simples formulário com email e senha. Em uma resposta positiva, o usuário deve receber um cookie com um determinado tempo de expiração para identificação posterior (sessão). Caso o usuário tente acessar qualquer outra página html do site sem possuir uma sessão ativa, ele deve ser redirecionado para a tela de login.

#### Seletor de tema
Permite que o usuário alterne entre modo claro e modo escuro, e não deve ser implementado com React, e idealmente como um web component. Como padrão, deve definir o tema de sistema do usuário, sem nenhum FOUC (flash of unstyled content). A preferência de tema deve ser persistida a nível de dispositivo.

#### Feed de posts
Tela inicial de recepção do usuário, caso possua login. Deve mostrar uma visualização centralizada e vertical dos posts por ordem decrescente de publicação.

#### Posts
Conta com um subcomponente publicação de posts e outro de visualização e interação dos posts. A publicação deve permitir incluir um título, uma descrição, um local, uma categoria e um conjunto de tags, e a visualização do post deve contar com métricas de quantidade de likes e permitir marcar um post como curtido.

### Server-Side
Gerenciamento de usuário
Esse componente permite a criação, gerência, login e logout de usuários via comandos RPC transmitidos como requisições HTTP.
Todas essas funcionalidades devem garantir filtragens de entrada para evitar nomes de usuário duplicados, senhas de baixa qualidade ou requisições inválidas. A validação da senha acontece via blowfish, com a biblioteca Bcrypt, e o sistema somente armazena senhas criptografadas.

#### Gerenciamento de posts
Permite requisitar os posts mais recentes paginados a partir de um cursor, criar um novo post, curtir um post preexistente e remover um post via comandos RPC. Deve validar que o usuário possui uma sessão válida e bloquear a ação caso contrário. Deve garantir que somente o autor ou um administrador possa remover um determinado post, e deve prevenir curtidas duplas ou duplas remoções de curtida, mantendo a contagem atualizada de forma eficiente.

#### Sessão
O servidor é responsável por definir um token de sessão persistente em um banco de dados KV e sua chave como um cookie no cliente. Isso permite logins prolongados e uma melhor experiência de usuário. A sessão deve ter um tempo de expiração e conter informações relevantes do usuário relacionado.

#### Upload de arquivos
Permite que usuários façam upload de imagens para um bucket em nuvem. Aqui foram utilizados 2 design patterns Factory e Ports and Adapters.

## Estilos Arquiteturais

O principal estilo arquitetural utilizado foi Remote Procedure Call, que é a base de toda comunicação entre cliente e servidor após a geração do HTML em servidor.


## Diagrama C4

Feito via *draw.io*, disponível em https://drive.google.com/file/d/1LjH6G9zbl5jYB7nLvL1kzntCUHE3bzAf/view?usp=sharing

<img width="3001" height="1116" alt="Diagrama C4 drawio" src="https://github.com/user-attachments/assets/ba2b8576-624e-4acf-88ec-45fe896a6330" />
