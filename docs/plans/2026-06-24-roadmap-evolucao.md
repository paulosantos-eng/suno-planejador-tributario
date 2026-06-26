# Roadmap de Evolução — Suno Planejador Tributário

> Spec consolidado (a partir da visão do Paulo em 24/06/2026). Cada módulo abaixo vira
> um plano de execução próprio (formato superpowers:writing-plans) quando for a vez dele.
> Ordem recomendada no fim. Nada aqui é placeholder de execução — é o mapa que precede
> os planos detalhados.

## Visão

Transformar o app de "previsor de imposto sobre dividendos" em um **otimizador tributário
com resultado prático**: o consultor monta a foto do cliente (perfil + carteira + rendas),
o app prevê a carga tributária, recomenda **mover para ativos isentos** onde compensa, e no
fim mostra o **benefício concreto** — quanto o cliente economiza fugindo do tributo e quanto
isso rende ao longo do tempo.

## Constraints globais (valem para todos os módulos)

- Stack: Next 16 + React 19 + Tailwind v4 + TS strict (projeto existente).
- Design: Suno vermelho `#D42126` / preto `#111111` / branco; Kanit + Inter.
- Funil linear obrigatório (sem navegação livre); estado em Context + localStorage.
- Engine fiscal reusado do TaxFlow (`lib/tax-engine`) — regras em `rules-config.json`, não duplicar.
- **Testes:** módulos de lógica (alocação, forecast, otimização, benefício) com **Vitest** (TDD onde paga); telas via `tsc` + `next build` + teste manual.
- **Legal:** tudo é estimativa de planejamento; rotular na UI; validar com área fiscal antes de uso real.
- **Confidencialidade:** dados de cliente são confidenciais; o modelo de alocação Suno é reusável, dados pessoais não.

## Modelo de alocação Suno (fonte de verdade do enquadramento)

5 classes: **Renda Fixa · Ações · FIIs · Internacional · Alternativo**.
5 perfis: Conservador · Moderado · Dinâmico · Arrojado · Sofisticado.
Alvo por perfil (consultoria "Completa" — confirmado dos prints; faltam 2 linhas):

| Classe | Conservador | Moderado | Dinâmico | Arrojado | Sofisticado |
|---|---|---|---|---|---|
| Renda Fixa | ❓ | ❓ | 78,1% | 63,2% | 36,8% |
| Ações | ❓ | ❓ | 8,1% | 13,3% | 22,1% |
| FIIs | ❓ | ❓ | 5,4% | 8,9% | 14,8% |
| Internacional | ❓ | ❓ | 5,6% | 10,3% | 18,9% |
| Alternativo | ❓ | ❓ | 2,7% | 4,4% | 7,4% |

❓ = pendente (Conservador/Moderado). Também a confirmar: o seletor **"Consultoria" (Completa…)**
altera os percentuais ou só o perfil manda?

---

## Módulos

### Módulo 1 — Modelo de alocação Suno + enquadramento real
**Entrega:** enquadramento com os 5 perfis e alocação-alvo vinda da tabela Suno (não mais bandas genéricas); GAP da carteira atual × recomendação Suno, nas 5 classes Suno.
**Muda:** `lib/profile` (matriz Suno em `suno-allocation.json`), etapa de Enquadramento (5 perfis + restrições/limitações + flag de desenquadramento p/ sofisticado), etapa de Alocação (5 classes Suno + donut + barras de GAP), Resultado (bloco de GAP).
**Depende de:** os 2 perfis faltantes + decisão do seletor Consultoria.
**Testável só:** sim — melhora o enquadramento de forma independente.

### Módulo 2 — Renda completa no forecast (Pró-labore + Distribuição PJ + JCP)
**Entrega:** além de dividendos de ações, o forecast considera distribuição de lucros da PJ própria (dispara gatilho 50k igual dividendo), pró-labore (IRPF progressivo) e JCP (15% IRRF). Engine já calcula os três.
**Muda:** `lib/wizard/types` (novos tipos de fonte de renda), etapa de Renda (substitui/expande a de Dividendos), `lib/forecast` (somar PJ ao gatilho; pró-labore e JCP nos seus regimes), Resultado (imposto total, não só de dividendos).
**Depende de:** nada (engine pronto).
**Testável só:** sim.

### Módulo 3 — Otimização tributária (cardápio de isentos + swaps recomendados)
**Entrega:** com base na carteira atual, o app aponta onde o cliente está em ativo **tributado** (CDB, fundo, RF trib.) e recomenda o **equivalente isento** (LCI/LCA, CRI/CRA, debênture incentivada, FII, NTN-B isenta…), com quanto de imposto deixa de pagar. Expande o comparador CDB×LCA para um cardápio.
**Muda:** `lib/asset-compare` → `lib/tax-optimizer` (cardápio de isentos + regra de equivalência por classe/prazo), etapa "Onde alocar" vira "Otimização", Resultado (lista de swaps sugeridos).
**Depende de:** Módulo 1 (classes) idealmente; carteira atual.
**Testável só:** sim.

### Módulo 4 — Benefício prático (o "resultado")
**Entrega:** a tela final mostra, em R$, **quanto o cliente economiza de imposto** com o plano (gatilho evitado + migração p/ isentos) e **quanto essa economia rende** projetada em N anos (juros compostos sobre o imposto não pago). É o payoff: "fugindo do tributo, você ganha R$ X."
**Muda:** `lib/benefit` (cálculo economia + projeção composta), Resultado (bloco-herói do benefício + linha do tempo), reusar ideia dos componentes `savings-projection`/`trajectory-timeline` do TaxFlow.
**Depende de:** Módulos 2 e 3 (a economia vem deles).
**Testável só:** sim (cálculo puro).

### Módulo 5 — Importação automática de portfólio
**Entrega:** consultor sobe o extrato/carteira (xlsx/csv da corretora) e o app preenche a alocação atual sozinho, mapeando para as 5 classes Suno.
**Muda:** `lib/portfolio-import` (parser + mapeamento p/ classe), etapa de Alocação (upload + revisão), reusar a lógica da skill `suno-portfolio2ma`.
**Depende de:** Módulo 1 (classes). É o mais complexo (formatos variam por corretora).
**Testável só:** sim, mas escopo de formatos precisa ser definido (começar com 1–2 corretoras ou um CSV padrão).

---

## Sequência recomendada

1. **Módulo 1** (modelo Suno) — foundational, baixo risco, melhora o ponto mais fraco hoje.
2. **Módulo 2** (renda completa) — onde o imposto realmente acontece.
3. **Módulo 3** (otimização isentos) — a recomendação que gera valor.
4. **Módulo 4** (benefício prático) — o payoff que fecha a história. Depende de 2 e 3.
5. **Módulo 5** (importação) — o mais complexo; entra quando o núcleo está sólido.

Cada um ganha seu plano detalhado (tarefa a tarefa, com testes Vitest) na hora de executar.

## Pendências para destravar o Módulo 1

1. Percentuais de **Conservador** e **Moderado** (5 classes cada).
2. O seletor **Consultoria ("Completa")** muda a alocação ou não?
3. Importação (Módulo 5): reusar `suno-portfolio2ma` e começar com qual(is) corretora(s) / formato?
