# Fase 1 — Back-end e Dados

> Especificação original dirigida ao Lovable. Fonte: `docs/original/prompt-lovable-painel-financeiro.docx`.
>
> Escopo: modelo de dados, autenticação, regras de negócio e comportamento. **Não** investir em aparência nesta fase.

## 1. Objetivo do produto

Aplicação web de gestão financeira que consolida as finanças **PESSOAIS** e de uma **EMPRESA** em uma única base de dados, com dois escopos separados (pessoal e empresa) e um terceiro escopo consolidado, sempre calculado em tempo de consulta.

Aplicação multi-usuário, com login obrigatório. Cada usuário tem seu próprio espaço de dados, isolado dos demais — um usuário jamais pode ler ou escrever dados de outro usuário.

## 2. Stack e infraestrutura

- React com TypeScript, Vite e Tailwind.
- Supabase como banco de dados (Postgres), provedor de autenticação e API. **RLS habilitada em TODAS as tabelas.**
- Autenticação por e-mail e senha, com confirmação de e-mail.
- **NÃO** usar dados mockados em produção. **NÃO** usar `localStorage` como fonte de verdade. Todo estado do servidor vem do Supabase.
- Gerenciamento de estado de servidor com React Query (ou TanStack Query).
- Validação de formulários com Zod, compartilhando o mesmo schema entre cliente e servidor.
- Toda moeda armazenada como inteiro em **CENTAVOS** (bigint). Nunca float. A conversão para exibição acontece apenas na camada de apresentação.
- Datas de competência como **DATE** (sem hora); datas de auditoria como **TIMESTAMPTZ**.
- Fuso horário de referência: **America/Sao_Paulo**.

## 3. Modelo de dados

Schema no Supabase, com **migrations versionadas**. Todas as tabelas possuem RLS.

### 3.1 `profiles`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | Referência a `auth.users` |
| `nome_completo` | text | Obrigatório |
| `moeda` | text | Default `'BRL'` |
| `meses_reserva_desejados` | int | Default `6` |
| `criado_em`, `atualizado_em` | timestamptz | Preenchidos automaticamente |

### 3.2 `contas` (contas financeiras)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | Escopo de isolamento |
| `nome` | text | Ex.: "Conta corrente", "Cartão PJ", "Caixa" |
| `tipo` | enum: `corrente`, `poupanca`, `cartao_credito`, `dinheiro`, `investimento`, `outro` | Obrigatório |
| `escopo` | enum: `pessoal`, `empresa` | Obrigatório |
| `saldo_inicial_centavos` | bigint | Default `0` |
| `ativa` | boolean | Default `true` |
| `criado_em` | timestamptz | Preenchido automaticamente |

### 3.3 `categorias`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | — |
| `nome` | text | Obrigatório |
| `escopo` | enum: `pessoal`, `empresa` | Obrigatório |
| `tipo` | enum: `receita`, `despesa` | Uma categoria só pode ser usada em lançamentos do mesmo tipo |
| `cor` | text | Opcional; sem impacto funcional nesta fase |
| `arquivada` | boolean | Default `false` |

**Unique:** `(user_id, escopo, tipo, nome)`.

**Categorias padrão no onboarding:**

- Pessoal/despesa: Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Outros.
- Pessoal/receita: Salário, Freelance, Rendimentos, Outros.
- Empresa/despesa: Folha de pagamento, Fornecedores, Impostos, Marketing, Software e assinaturas, Logística, Outros.
- Empresa/receita: Vendas, Serviços, Outros.

### 3.4 `lancamentos` (tabela central)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | — |
| `descricao` | text | Obrigatório, 1 a 160 caracteres |
| `tipo` | enum: `receita`, `despesa` | Obrigatório |
| `escopo` | enum: `pessoal`, `empresa` | Obrigatório |
| `categoria_id` | uuid, FK `categorias` | Deve pertencer ao mesmo escopo e tipo do lançamento |
| `conta_id` | uuid, FK `contas` | Opcional |
| `valor_centavos` | bigint | **SEMPRE positivo** — o sinal vem do campo `tipo`, nunca do valor |
| `data_competencia` | date | Obrigatório; mês ao qual o lançamento pertence |
| `data_pagamento` | date | Opcional |
| `pago` | boolean | Default `false` |
| `recorrente` | boolean | Default `false` |
| `recorrencia_id` | uuid | Opcional; agrupa lançamentos gerados por uma mesma recorrência |
| `observacoes` | text | Opcional |
| `criado_em`, `atualizado_em` | timestamptz | Preenchidos automaticamente |

**CHECK:** `valor_centavos > 0`.

> A categoria deve pertencer ao mesmo escopo e ao mesmo tipo do lançamento — validar no servidor com trigger ou policy, **não apenas no cliente**.

### 3.5 `orcamentos`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | — |
| `escopo` | enum: `pessoal`, `empresa` | — |
| `categoria_id` | uuid, FK `categorias` | — |
| `competencia_mes` | smallint | 1 a 12 |
| `competencia_ano` | smallint | — |
| `limite_centavos` | bigint | — |

**Unique:** `(user_id, escopo, categoria_id, competencia_mes, competencia_ano)`.

> O valor **consolidado NÃO é armazenado** — é sempre calculado somando pessoal + empresa em tempo de consulta.

### 3.6 `metas`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | — |
| `nome` | text | Obrigatório |
| `escopo` | enum: `pessoal`, `empresa` | — |
| `valor_alvo_centavos` | bigint | CHECK `> 0` |
| `valor_atual_centavos` | bigint | Default `0`, CHECK `>= 0` |
| `prazo` | date | Opcional |
| `concluida` | boolean | Default `false` |
| `criado_em` | timestamptz | Preenchido automaticamente |

### 3.7 `reserva_emergencia`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | **UNIQUE** — um registro por usuário |
| `meta_centavos` | bigint | Default `0`, CHECK `>= 0` |
| `saldo_centavos` | bigint | Default `0`, CHECK `>= 0` |
| `origem` | enum: `manual`, `calculado` | Default `'manual'` |
| `atualizado_em` | timestamptz | Preenchido automaticamente |

> **Regra crítica:** quando `origem = 'manual'`, ele tem precedência absoluta — nenhum cálculo automático pode sobrescrever `saldo_centavos`. **Zero é um valor válido e persistente**; nunca trate `0` como "não definido".

### 3.8 `configuracoes_usuario`

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `profiles` | UNIQUE |
| `competencia_ativa_mes` | smallint | 1 a 12 |
| `competencia_ativa_ano` | smallint | — |
| `ultima_tela` | text | — |
| `criado_em`, `atualizado_em` | timestamptz | Preenchidos automaticamente |

## 4. Regras de negócio (implementar no servidor)

Não confiar na camada cliente para nenhuma delas.

- **R1** — Todo cálculo financeiro é filtrado por `(user_id × escopo × competência mês/ano)`. Consolidado = união de pessoal + empresa.
- **R2** — Receita e despesa têm valor sempre positivo; o efeito no saldo é derivado do tipo. `Saldo = receitas − despesas`.
- **R3** — Orçamento: gasto da categoria = soma dos lançamentos do tipo despesa daquela categoria e competência. `Percentual = gasto / limite`. Faixas de alerta: até 80% ok; 80–100% atenção; acima de 100% estourado. **Limite zero retorna percentual nulo**, nunca divisão por zero.
- **R4** — Herança de orçamento: ao abrir uma competência sem orçamento definido, buscar o registro da competência anterior mais próxima do mesmo escopo e exibir com flag **"herdado"**, **sem gravar automaticamente**. Só grava quando o usuário salvar.
- **R5** — Metas: `percentual = valor_atual / valor_alvo`, **limitado a 100% na exibição**, com flag "meta atingida" quando `>= 100%`.
- **R6** — Reserva de emergência: se `origem = 'manual'`, retornar `saldo_centavos` como está. Se `origem = 'calculado'`, calcular como meses de despesa média cobertos. O endpoint de cálculo deve ser explícito e separado, **nunca** rodando em background sobrescrevendo dados.
- **R7** — Lançamentos recorrentes: criar a recorrência como entidade lógica que gera lançamentos por competência; **nunca duplicar registros para o mesmo mês**.
- **R8** — Exclusão de categoria com lançamentos vinculados deve ser bloqueada — arquivar em vez de excluir.
- **R9** — Toda operação de escrita deve registrar `atualizado_em` automaticamente.

## 5. API / endpoints

Implementar como funções RPC no Supabase ou Edge Functions.

| Método / rota | Descrição |
|---|---|
| `POST /lancamentos` | Cria lançamento. Corpo: `descricao`, `tipo`, `escopo`, `categoria_id`, `conta_id?`, `valor_centavos`, `data_competencia`, `data_pagamento?`, `pago`, `recorrente?`, `observacoes?`. Retorna o registro criado. |
| `PATCH /lancamentos/:id` | Atualiza campos informados. Valida categoria × escopo × tipo. Retorna o registro atualizado. |
| `DELETE /lancamentos/:id` | Exclui o lançamento. |
| `GET /lancamentos?escopo&mes&ano&tipo&categoria&busca&pagina` | Lista paginada filtrada por escopo, competência, tipo, categoria e busca textual na descrição. Retorna itens e metadados de paginação. |
| `GET /resumo?escopo&mes&ano` | Receita, despesa, saldo, margem, variação vs. mês anterior e vs. mesmo mês do ano anterior. |
| `GET /serie-historica?escopo&meses=3\|6\|12` | Série mensal de receita e despesa para gráfico. |
| `GET /por-categoria?escopo&mes&ano` | Agregação por categoria com valor e percentual. |
| `CRUD /orcamentos` | Com parâmetro de competência; o `GET` aplica o fallback de herança (R4) sem gravar. |
| `CRUD /metas` | Criar, listar, atualizar, concluir e excluir metas. |
| `GET` e `PUT /reserva-emergencia` | Ler e definir manualmente; mais `POST /reserva-emergencia/calcular` para recalcular explicitamente quando `origem = 'calculado'`. |
| `CRUD /categorias` | Criar, listar, atualizar e **arquivar** (exclusão bloqueada conforme R8). |
| `CRUD /contas` | Criar, listar, atualizar e desativar contas. |
| `GET/PUT /configuracoes` | Competência ativa, última tela e preferências. |
| `GET /export.csv?escopo&mes&ano` | CSV com separador ponto e vírgula e valores em formato brasileiro. |

## 6. Segurança e integridade

- **RLS obrigatória:** cada usuário só lê e escreve registros com seu próprio `user_id`. Policies explícitas para cada tabela (`USING` e `WITH CHECK` comparando `user_id` com `auth.uid()`).
- Validação server-side com Zod; não confiar no cliente.
- Trigger para garantir coerência entre categoria e lançamento (escopo e tipo iguais).
- Migrations versionadas; nunca alterar o schema manualmente no dashboard.
- Nenhuma chave sensível no front-end além da `anon key`.

## 7. Seed e dados de teste

Script de seed que, ao criar um usuário novo, insira:

- Contas padrão.
- Categorias padrão (seção 3.3).
- Opcionalmente, lançamentos de exemplo dos últimos 8 meses, via botão **"popular dados de exemplo"** nas configurações — sempre com confirmação do usuário e sempre gravando no Supabase, **nunca em localStorage**.

Apagar os dados de exemplo não pode afetar lançamentos reais: marcar os registros de exemplo com um identificador próprio e remover apenas o que foi criado pelo seed.

## 8. Telas (apenas funcional, sem design)

| Tela | O que exibe e edita | Endpoints |
|---|---|---|
| Login/Cadastro | Login e-mail/senha, criação de conta e confirmação de e-mail. Edita credenciais. | Auth Supabase; criação de `profiles` e seed inicial |
| Seleção de Competência | Exibe e altera o mês/ano ativo. | `GET/PUT /configuracoes` |
| Dashboard | Receita, despesa, saldo, margem, variações; alterna escopo. | `GET /resumo`, `GET /serie-historica`, `GET /por-categoria` |
| Lançamentos | Lista paginada com filtros e busca; CRUD e marcar pago. | `POST/PATCH/DELETE/GET /lancamentos` |
| Receitas | Lançamentos filtrados por tipo receita. | `GET/POST/PATCH/DELETE /lancamentos?tipo=receita` |
| Custos | Lançamentos filtrados por tipo despesa. | `GET/POST/PATCH/DELETE /lancamentos?tipo=despesa` |
| Pessoal | Lançamentos, orçamentos e metas pessoais. | `GET /resumo`, `/por-categoria`, `/orcamentos`, `/metas` (escopo=pessoal) |
| Empresa | Lançamentos, orçamentos e metas da empresa. | `GET /resumo`, `/por-categoria`, `/orcamentos`, `/metas` (escopo=empresa) |
| Relatórios | Série histórica, agregações e exportação CSV. | `GET /serie-historica`, `/por-categoria`, `/export.csv` |
| Metas | Lista com percentual e flag "meta atingida"; CRUD. | `CRUD /metas` |
| Configurações | Competência ativa, reserva, popular/apagar dados de exemplo. | `GET/PUT /configuracoes`, `GET/PUT /reserva-emergencia`, `POST /reserva-emergencia/calcular`, seed |

## 9. Critérios de aceite

- [ ] Criar conta, sair e entrar novamente mantém os dados.
- [ ] Usuário A não consegue ler nem escrever dados do usuário B (testar via RLS).
- [ ] Lançamento criado em outra competência não aparece no dashboard de outubro/2026.
- [ ] Valor zero é aceito e persistido na reserva de emergência.
- [ ] Alternar entre Pessoal, Empresa e Consolidado altera todos os números da tela.
- [ ] Orçamento de mês sem registro exibe o valor herdado com flag e não grava nada.
- [ ] Soma de receitas menos despesas confere com o saldo exibido.
- [ ] Exportação CSV abre corretamente no Excel com acentos.
- [ ] Categoria com lançamentos vinculados não pode ser excluída, apenas arquivada.
- [ ] Nenhum dado mockado ou em localStorage é usado em produção.

## 10. Ordem de execução sugerida

1. Auth + schema + RLS.
2. CRUD de categorias e contas.
3. CRUD de lançamentos.
4. Agregações do dashboard.
5. Orçamentos e metas.
6. Reserva de emergência.
7. Relatórios e CSV.
8. Configurações e seed.

> Refinamento visual (cores, tipografia, layout) é fase posterior. Nesta fase, usar o design system padrão do Lovable, sem customização visual.
