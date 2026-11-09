# Fase 2 — Front-end e Interação

> Especificação original dirigida ao Lovable. Fonte: `docs/original/prompt-lovable-frontend.docx`.
>
> **Pré-requisito:** Fase 1 implementada (Supabase com auth, RLS e as oito tabelas, valores em centavos, endpoints de agregação publicados).

## 0. Limite desta fase

- **NÃO** alterar o schema, **NÃO** criar tabelas, **NÃO** mudar regras de negócio.
- Construir apenas a interface e a camada de interação sobre o que já existe.
- Qualquer número exibido deve vir dos endpoints de agregação da Fase 1.

## 1. Princípio geral

- Não mover regra de negócio para o cliente: nenhum cálculo de saldo, totais, variações ou percentuais no front-end.
- Todo cálculo exibido vem dos endpoints de agregação. Se faltar um dado na API, criar o endpoint e consumi-lo — **nunca** calcular no front.
- Valores monetários trafegam em centavos e são formatados apenas na apresentação.
- A interface exibe, edita e navega; não decide nada que o servidor deva decidir.

## 2. Sistema visual (tokens, não valores soltos)

Todo o sistema visual em **tokens**: CSS variables e tokens do Tailwind. Nunca escrever cor, raio, sombra ou espaçamento inline.

| Token | Uso | Valor de referência |
|---|---|---|
| `--color-bg` | Fundo da aplicação | cinza muito claro (ex.: `#F7F7F9`) |
| `--color-surface` | Superfície dos cards | branco (`#FFFFFF`) |
| `--color-text` | Texto principal | cinza-escuro (ex.: `#1F2430`) |
| `--color-text-muted` | Texto secundário | cinza-médio (ex.: `#6B7280`) |
| `--color-border` | Bordas sutis | cinza-claro (ex.: `#E5E7EB`) |
| `--color-brand` | Marca: botões primários, item ativo, destaques | roxo royal (ex.: `#5B4FE9`) |
| `--color-positive` | Valores positivos, receitas | verde |
| `--color-negative` | Valores negativos, despesas | vermelho |
| `--color-warning` | Alerta intermediário | âmbar |

- Centralizar todos os tokens em **um único arquivo de tema**. Trocar a cor de marca deve ser uma edição de uma linha.
- Tipografia sans-serif moderna, com escala de tamanho em tokens: título de página, título de card, valor monetário grande, corpo e legenda.
- Valores monetários sempre em **peso forte (bold)** e `font-variant-numeric: tabular-nums`, para alinhar dígitos em tabelas e KPIs.
- Cards: superfície branca, cantos arredondados médios, sombra muito sutil, padding interno consistente e espaçamento uniforme — tudo vindo de tokens.
- **Modo escuro:** via tokens (par claro/escuro por token), com toggle na topbar e preferência persistida. Se faltar token para algo, criar o token.

## 3. Layout estrutural

- **Sidebar fixa à esquerda:** logo, menu principal (Dashboard, Lançamentos, Receitas, Custos, Pessoal, Empresa, Relatórios, Metas, Configurações) e, no rodapé, bloco compacto com o saldo consolidado da competência ativa.
- **Topbar:** seletor de competência, seletor de escopo, busca global, toggle de tema e avatar.
- **Conteúdo:** grid de 12 colunas, largura máxima e gutters consistentes definidos como tokens.
- **Responsivo:** em telas médias a sidebar colapsa para ícones; no mobile vira **barra inferior fixa** com ícones e rótulos curtos, e o conteúdo recebe `padding-bottom`.
- No mobile, tabelas viram **cards empilhados** (uma linha = um card com os campos principais).

## 4. Componentes reutilizáveis

Construir cada componente **uma única vez** e reutilizar em todas as telas.

| Componente | Estados / comportamento | Observações |
|---|---|---|
| Card de KPI | Rótulo, valor grande em `tabular-nums`, variação percentual com seta (↑/↓) e cor semântica, linha de contexto ("vs. setembro") | Skeleton no carregamento; nunca exibir "R$ 0" carregado por engano |
| Badge de escopo | Pessoal e Empresa, cores distintas | Mesma cor em tabela, card e gráfico |
| Badge de tipo | Receita (verde) e Despesa (vermelho) | Reutiliza tokens semânticos |
| Barra de progresso de orçamento | Até 80% neutro/verde; 80–100% âmbar; acima de 100% vermelho com selo "Estourado" | Limite zero não quebra: percentual nulo, barra vazia, sem selo |
| Seletor de competência | Setas anterior/próximo, nome do mês clicável, selo "Mês atual" | Componente único, usado na topbar e na tela inicial |
| Seletor de escopo | Pessoal, Empresa, Consolidado | Estado ativo evidente |
| Tabela de dados | Cabeçalho fixo, ordenação por coluna, paginação, estado vazio, carregamento, ação "excluir" com confirmação | Ordenação/paginação client-side sobre dados paginados da API; nunca ocultar linhas sem informar |
| Campo monetário | Máscara brasileira, formatação ao sair, valor sem formatação ao focar, aceita zero | Nunca readonly quando editável; grava em centavos |
| Estado vazio | Ícone, texto explicativo e ação primária | Nunca tela em branco nem tabela sem mensagem |
| Toast | Confirmação (verde/neutro) e erro (vermelho) | `aria-live`; desaparece sozinho |
| Modal de confirmação | Ações destrutivas | Exige confirmação explícita; cancelar é a ação padrão |

> Não criar variações visuais por tela: um Card de KPI, uma Tabela e um Estado vazio servem a todo o app, diferenciando-se só pelos dados recebidos por props.

## 5. Telas

### 5.1 Autenticação

Login, cadastro e recuperação de senha usando a auth da Fase 1. Validação por campo com mensagens em português (ex.: "E-mail ou senha inválidos"). Após autenticar, redirecionar conforme a regra de 5.2.

### 5.2 Seleção de competência (tela inicial)

Seletor de mês/ano (reutilizar o componente) e prévia "N lançamentos neste mês" vinda da API. Botão primário "Entrar no painel" e atalho "Ir para o mês atual". Só aparece quando **não** houver competência salva; caso contrário, o app abre direto no painel na última competência usada.

### 5.3 Dashboard

- Linha de KPIs (receita, despesa, resultado, saldo) com Card de KPI.
- Card grande de performance com gráfico receita vs. despesa e seletor 3M/6M/12M/Tudo, ancorado na competência ativa.
- Card de distribuição por categoria e card de orçamento por escopo (Barra de progresso).
- Formulário rápido de lançamento (tipo, valor, categoria, descrição) e tabela dos últimos lançamentos.

### 5.4 Lançamentos

Formulário completo (Campo monetário, categoria, conta, escopo, data). Filtros de período, tipo, escopo e busca; tabela paginada. Rodapé com totais de entradas, saídas e resultado — **todos dos endpoints de agregação**.

### 5.5 Receitas

KPIs: total, ticket médio, quantidade e principal fonte. Gráfico de barras de receita por mês; participação por categoria.

### 5.6 Custos

KPIs: total, maior categoria, média mensal, fixos vs. variáveis. Ranking de categorias de custo; tabela com alerta de orçamento estourado (selo do componente de orçamento).

### 5.7 Pessoal

Reserva de emergência **editável** (aceita zero e persiste), receitas, despesas e taxa de poupança. Evolução do saldo (gráfico), orçamento pessoal e metas pessoais.

### 5.8 Empresa

Faturamento, custos operacionais, resultado, margem e ponto de equilíbrio. Fluxo de caixa projetado (gráfico).

### 5.9 Relatórios

Comparativo mês atual vs. mês anterior vs. mesmo mês do ano anterior. Resultado mensal consolidado; top 5 categorias e top 5 receitas. Botões "Exportar CSV" e "Imprimir".

### 5.10 Metas

Cards editáveis com nome, valor alvo, valor atual, prazo e Barra de progresso. Ações de adicionar e excluir (exclusão via Modal de confirmação).

### 5.11 Configurações

Nome do usuário e meses de reserva desejados. Gestão de categorias por escopo e de contas. Popular dados de exemplo e limpar dados — este último com Modal de confirmação.

## 6. Comportamentos transversais

- Competência e escopo são **estado global persistido** (URL + storage). Trocar qualquer um recarrega os dados de **todas** as telas sem perder a tela atual (sem navegação, sem reset de scroll).
- Toda escrita (criar, editar, excluir) invalida e refaz as queries afetadas (React Query), refletindo em todos os KPIs imediatamente, sem recarregar a página.
- Carregamento sempre com skeleton; nunca tela em branco nem flash de conteúdo.
- Erros de API exibem mensagem amigável e opção "Tentar novamente".
- Formulários validam com Zod, compartilhando schemas com o servidor quando possível; erros por campo, em português.
- Acessibilidade: navegação por teclado, foco visível, labels associados, contraste WCAG AA, `aria-live` nos toasts.
- Formatação de moeda e data em pt-BR centralizada em utilitários (`formatBRL`, `formatDate`); nunca espalhada pelos componentes.

## 7. Gráficos

Uma única biblioteca (Recharts ou equivalente) em todo o app:

- Cores sempre dos tokens do tema (verde/vermelho/roxo royal), nunca hex solto.
- Tooltip formatado em R$ (pt-BR).
- Eixo Y abreviado (mil/mi).
- Grid discreto e responsivo (100% da largura do card).
- Estado vazio quando não houver dados no período — nunca gráfico em branco.
- Nunca divisão por zero: proteger percentuais, médias e margens.

## 8. O que não fazer

- Não calcular saldo, totais ou variações no cliente.
- Não usar `localStorage` como fonte de dados (apenas preferências de UI).
- Não duplicar a regra de orçamento no front — percentuais vêm da API.
- Não usar cores hardcoded fora dos tokens.
- Não criar componentes de card diferentes por tela.
- Não deixar campos editáveis como readonly.
- Não tratar zero como vazio: zero é valor válido em valores monetários, reserva e limites.
- Não refinar polimento visual antes de todas as telas existirem.

## 9. Critérios de aceite visuais e de interação

- [ ] Trocar competência altera todos os números de todas as telas e mantém a tela atual.
- [ ] Trocar escopo tem o mesmo comportamento.
- [ ] Adicionar lançamento atualiza os KPIs sem recarregar a página.
- [ ] Orçamento com limite zero não quebra (barra vazia, sem selo).
- [ ] Reserva de emergência aceita zero e persiste.
- [ ] Tabela ordena e pagina corretamente.
- [ ] Mobile mostra menu inferior e tabelas em cards empilhados.
- [ ] Modo escuro legível em todas as telas.
- [ ] Nenhum texto cortado em valores grandes (ex.: "R$ 1.234.567,89" em KPI e tabela).

## 10. Ordem de execução

| # | Entrega | Escopo |
|---|---|---|
| 1 | Tokens e layout base com sidebar e topbar | Layout e tema |
| 2 | Componentes reutilizáveis (seção 4) | Biblioteca de UI |
| 3 | Autenticação e seleção de competência | Fluxo de entrada |
| 4 | Dashboard | Tela |
| 5 | Lançamentos | Tela |
| 6 | Receitas e Custos | Telas |
| 7 | Pessoal e Empresa | Telas |
| 8 | Relatórios | Tela |
| 9 | Metas e Configurações | Telas |
| 10 | Responsividade e modo escuro | Transversal |

> Não refinar polimento visual antes de todas as telas existirem. Primeiro todas as telas funcionando com os componentes reutilizáveis; só então ajustar detalhes.
