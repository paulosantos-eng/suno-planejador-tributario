# Plano — Renda × Carteira, Memória de Cálculo e Resultado em 3 Visões

> Gerado em 2026-06-30 (modo `/plan`). Deliverable de planejamento — nada codado.
> App: `D:\PAULO\PROJETOS\suno-planejador-tributario` (no ar em suno-planejador-tributario.vercel.app).

## 1. Objetivo

Reorganizar o app em torno da ideia central do Paulo: **a renda é o principal, a carteira é secundária**. Duas trilhas/páginas distintas — **Renda** e **Carteira** — que **se juntam num resultado consolidado**, com a mensagem:

> *"Hoje você paga **R$ X** de imposto. Podemos gerar **R$ Y** de benefício fiscal respeitando o asset location."*

E entregar, no resultado: **memória de cálculo** (como chegou no número), **imposto total** (que hoje não aparece), **IRPFM devido visível**, e **3 visões** (Técnica / Comercial / Simplificada) com **exportação de arquivo**.

## 2. Contexto atual (o que já existe)

Funil linear único: Cliente → Carteira(import) → Enquadramento → Renda → Onde alocar → Resultado. Tudo numa tela de resultado só.

Já temos as peças de cálculo (em `lib/forecast`, `lib/asset-compare`, `lib/profile`):
- Gatilho dividendos 50k → 10% (`tempoAteGatilho`, `runForecast`), JCP 15% (`jcpIrrfAnual`), exterior 15% (`exteriorIrAnual`), pró-labore IRPF + INSS (`irpfProLaboreAnual`, `inssProLaboreAnual`), aluguel carnê-leão (`irpfAluguelAnual`), IRPFM (`irpfmEstimado`), comparador de isentos (`comparar`), GAP (`computeGap` + `GapBars`).
- `lib/tax-engine/audit.ts` define o **formato** de memória de cálculo (`CalculationStep` = label/fórmula/valor/isResult; `CalculationExplanation` = título/refLegal/steps/notes). **Não roda no app** (é do `runEngine`), mas serve de molde.

**Decisão-chave:** a memória de cálculo será montada a partir das **funções do app** (que conhecemos a fórmula), reusando o *formato* `CalculationStep`. Não vamos plugar o `runEngine`.

## 3. Arquitetura proposta — duas trilhas + consolidação

```
            ┌──────────────────────────────┐
            │  Início (cliente + escolha)  │
            └──────────────┬───────────────┘
            ┌──────────────┴───────────────┐
   TRILHA RENDA (principal)        TRILHA CARTEIRA (secundária)
   - Pró-labore (médico)           - Importar Gorila / % manual
   - Distribuição PJ (PF)          - Enquadramento (perfil Suno)
   - Dividendos (ação BR)          - GAP (atual × alvo) + gráfico
   - Dividendos exterior           - Asset location (isentos)
   - JCP / Aluguel
   → "Hoje você paga R$ X"         → "Onde mover p/ pagar menos"
            └──────────────┬───────────────┘
            ┌──────────────┴───────────────┐
            │   RESULTADO CONSOLIDADO       │
            │  X hoje · benefício Y         │
            │  3 visões + memória + export  │
            └──────────────────────────────┘
```

- **Renda** é a porta de entrada (principal). **Carteira** é secundária (pode até ser opcional/pulável).
- Rotas: `/renda`, `/carteira`, `/resultado` (consolidado). Um hub simples em `/` com as duas trilhas + status de preenchimento.
- O estado do wizard (já em `lib/wizard`) passa a ter dois blocos (`renda`, `carteira`) — o `WizardState` atual já tem quase tudo; só reorganizar a navegação.

## 4. Funcionalidades a entregar

### 4.1 Imposto total (hoje não aparece)
Somar todos os componentes anuais num **número único de "imposto hoje"**:
`IRRF dividendos (gatilho) + JCP 15% + exterior 15% + IRPF pró-labore + INSS + IRPF aluguel + IRPFM devido + (IR sobre RF da carteira, se modelado)`.
- Novo `lib/tax-total.ts`: `impostoTotalHoje(state) → { total, porComponente: {nome, valor}[] }`.
- Exibir no topo do resultado (e na trilha Renda como "hoje você paga X").

### 4.2 Benefício fiscal (asset location)
Cenário "otimizado": dentro das bandas do perfil Suno, **migrar o que é tributável para isento** (LCI/LCA, CRI/CRA, debênture, FII isento) e recalcular o imposto. Benefício = `imposto hoje − imposto otimizado`.
- `lib/benefit.ts`: `beneficioAssetLocation(state) → { impostoHoje, impostoOtimizado, economia, movimentos: [{de, para, valor, economia}] }`.
- Respeitar o perfil (não recomendar fora das bandas) e nunca recomendar resgate que gere imposto desnecessário.
- Exibir: "benefício fiscal R$ Y" + lista de movimentos.

### 4.3 Memória de cálculo
Por componente de imposto, montar `CalculationExplanation` (molde do `audit.ts`) a partir das funções do app:
- Dividendos/gatilho: `por fonte → por pagamento × 10% × meses`.
- JCP: `valor × 15%`. Exterior: `valor × 15% (Lei 14.754)`.
- Pró-labore: `base = bruto − simplificado; imposto = base×alíquota − parcela − redutor; × 12` + INSS.
- Aluguel: `base × alíquota − parcela; × 12` (carnê-leão).
- IRPFM: `base ampla × alíquota − créditos`.
- Comparador/benefício: `bruto × (1−IR) por produto`.
- Novo `lib/memoria-calculo.ts`: `memoria(state) → CalculationExplanation[]`. Renderizada na **Visão Técnica** (e em "ver como calculamos" das outras).

### 4.4 IRPFM devido visível
Garantir o card de IRPFM sempre presente quando há base (já implementado na última leva — **validar no deploy**), mostrando base/alíquota/**devido** com destaque. Hoje o "não apareceu" provavelmente é a versão anterior ao último deploy; confirmar.

### 4.5 Três visões do resultado + exportação
Mesmo dado, três formatos (um seletor no `/resultado`):
- **Técnica** — todos os números + **memória de cálculo** completa + referências legais + ressalvas. Para o consultor/área fiscal.
- **Comercial** — foco no benefício: "hoje X → com o plano Y", antes/depois, movimentos sugeridos. Para apresentar ao cliente.
- **Simplificada** — 1 número + frase clara + semáforo, zero jargão. Para o cliente.
- **Exportar:** MVP via **impressão→PDF** com CSS de impressão por visão (sem dependência externa). Evolução: gerar HTML/A4 baixável. (Confirmar formato com o Paulo.)

### 4.6 Modelagem da persona (médico)
Garantir que a trilha Renda capture, em campos claros e separados:
- **Pró-labore** (receita tributável PF) — IRPF progressivo + INSS.
- **Distribuição de lucros da PJ dele** recebida como PF — gatilho 50k.
- **Dividendos de ações** (BR) + **exterior**.
- **Aluguéis** — carnê-leão.
- (Tudo já existe como tipo/campo; o trabalho é a UI da trilha Renda deixar isso explícito e nomeado por situação.)

## 5. Arquivos que provavelmente mudam

```
app/renda/page.tsx            (novo — trilha Renda)
app/carteira/page.tsx         (novo — trilha Carteira: import + perfil + GAP)
app/resultado/page.tsx        (reescrever: consolidado + 3 visões + export)
app/page.tsx                  (hub: duas trilhas + status)
app/fluxo/[step]/...          (aposentar ou redirecionar p/ as novas rotas)
lib/tax-total.ts              (novo — imposto total)
lib/benefit.ts                (novo — benefício asset location)
lib/memoria-calculo.ts        (novo — CalculationExplanation[] a partir do app)
components/memoria-calculo.tsx, components/resultado-views/* (Técnica/Comercial/Simplificada)
components/steps/* + lib/wizard/* (reorganizar navegação em 2 trilhas)
styles: bloco @media print (export)
scripts/*-check.ts            (cobrir tax-total, benefit, memoria)
```

## 6. Passos (fases, baby steps)

1. **Imposto total** (`lib/tax-total.ts` + topo do resultado) — entrega "hoje você paga X". Pequeno, alto valor.
2. **Memória de cálculo** (`lib/memoria-calculo.ts` + componente) — drill-down por componente.
3. **Benefício asset location** (`lib/benefit.ts`) — "economia R$ Y" + movimentos.
4. **3 visões + export** no `/resultado` (Técnica/Comercial/Simplificada + print).
5. **Reestruturar navegação** em 2 trilhas (`/renda`, `/carteira`, hub) — maior mudança estrutural; fazer por último, com o conteúdo já pronto.
6. IRPFM: confirmar visível; persona médico: ajustar rótulos da trilha Renda.

Cada fase: `tsc` + `next build` + script de sanidade + commit; deploy ao fim de blocos revisáveis.

## 7. Validação

- Scripts de sanidade para `impostoTotalHoje`, `beneficioAssetLocation`, `memoria` (números batendo com as funções-fonte).
- Persona médico de teste: pró-labore alto + distribuição PJ → conferir total, IRPFM (créditos > mínimo ⇒ devido 0, como já vimos) e benefício.
- `tsc` + `build` limpos a cada fase. Teste manual das 3 visões + impressão.

## 8. Riscos, tradeoffs e questões abertas

**⚠️ Fiscal (prioritário):** IRPFM, exterior, INSS (teto), carnê-leão e o **benefício/asset location** são **estimativas** — manter rótulo e a orientação de validar com a área fiscal. O Paulo está validando em paralelo.

**Tradeoffs/decisões:**
- "Imposto total" deve incluir **IR sobre a renda fixa da carteira** (come-cotas/regressiva)? Hoje a carteira é só % por classe (sem lançar ativos tributáveis com prazo). Decidir: incluir uma estimativa ou deixar o total focado nas rendas (dividendos/PJ/pró-labore/aluguel/IRPFM). 
- Benefício "asset location": precisa de premissas (rentabilidade por classe, % isento alcançável). Deixar premissas explícitas e editáveis.
- Export: PDF via impressão (rápido) vs HTML baixável (mais controle). 

**Questões abertas para o Paulo:**
1. **Export** — basta "imprimir → PDF" (rápido) ou quer um arquivo PDF/A4 baixável de verdade?
2. As **3 visões** — o que cada uma mostra está ok como descrevi (Técnica = memória completa; Comercial = antes/depois + benefício; Simplificada = 1 número + frase)? Algo a incluir/tirar?
3. O **"imposto total"** entra IR da renda fixa da carteira, ou foca nas rendas (dividendos/PJ/pró-labore/aluguel/IRPFM)?
4. **Asset location/benefício** — a economia é só "tributado → isento" dentro do perfil, ou inclui também escalonar distribuição PJ pra não cruzar os 50k/mês?
5. Manter as rotas antigas (`/fluxo/...`) redirecionando, ou pode trocar de vez para `/renda` + `/carteira`?
