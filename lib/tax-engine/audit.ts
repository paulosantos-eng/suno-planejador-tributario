// Modulo de Auditoria - extrai explicacao detalhada de cada componente do IR
// Permite drill-down: dado um tipo de IR, retorna operacoes que o geraram + formula + referencia legal

import type { EngineResult } from "./engine";
import type { Operation } from "./types";
import { calcIrpfProLabore } from "./loader";

export type CalculationKind =
  | "darf_6015"
  | "ir_progressivo"
  | "rf_irrf"
  | "jcp_irrf"
  | "irrf_lei_15270"
  | "lei_14754_exterior"
  | "irpfm";

export interface CalculationStep {
  label: string;
  formula?: string;
  value?: number;
  isResult?: boolean;
}

export interface RelatedOperation {
  date: string;
  type: string;
  assetCode: string;
  value: number;
  contributionToTax: number;
}

export interface CalculationExplanation {
  kind: CalculationKind;
  title: string;
  totalValue: number;
  legalReference: string;
  ruleSummary: string;
  steps: CalculationStep[];
  relatedOperations: RelatedOperation[];
  notes: string[];
}

export function explainCalculation(
  kind: CalculationKind,
  result: EngineResult,
  allOps: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  const ops = allOps.filter((o) => o.vehicleId === vehicleId);
  switch (kind) {
    case "darf_6015":
      return explainDarf6015(result, ops, vehicleId, year);
    case "ir_progressivo":
      return explainIrProgressivo(result, ops, vehicleId, year);
    case "rf_irrf":
      return explainRfIrrf(result, ops, vehicleId, year);
    case "jcp_irrf":
      return explainJcpIrrf(result, ops, vehicleId, year);
    case "irrf_lei_15270":
      return explainIrrfLei15270(result, ops, vehicleId, year);
    case "lei_14754_exterior":
      return explainLei14754(result, ops, vehicleId, year);
    case "irpfm":
      return explainIrpfm(result, ops, vehicleId, year);
  }
}

// =============================================================================
// DARF 6015 (RV + FII + Day + ETF)
// =============================================================================

function explainDarf6015(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  let totalSwingAcao = 0;
  let totalDay = 0;
  let totalEtfRv = 0;
  let totalFii = 0;
  let totalFundoAbertoCC = 0;
  let totalFundoAbertoResg = 0;
  let totalFundoFechadoCC = 0;
  let totalFipQualif = 0;
  let total = 0;
  const monthlyBreakdown: { month: number; value: number; categories: string[] }[] = [];

  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    totalSwingAcao += m.irSwingShare;
    totalDay += m.irDay;
    totalEtfRv += m.irEtfRv;
    totalFii += m.irFiiGain;
    totalFundoAbertoCC += m.fundoAbertoComeCotasIr;
    totalFundoAbertoResg += m.fundoAbertoResgateIr;
    totalFundoFechadoCC += m.fundoFechadoComeCotasIr;
    totalFipQualif += m.fipQualificadoIr;
    total += m.totalDarf6015;

    if (m.totalDarf6015 > 0) {
      const cats: string[] = [];
      if (m.irSwingShare > 0) cats.push("Acoes");
      if (m.irDay > 0) cats.push("Day");
      if (m.irEtfRv > 0) cats.push("ETF");
      if (m.irFiiGain > 0) cats.push("FII");
      if (m.fundoAbertoComeCotasIr > 0) cats.push("Come-cotas aberto");
      if (m.fundoAbertoResgateIr > 0) cats.push("Resgate fundo");
      if (m.fundoFechadoComeCotasIr > 0) cats.push("Come-cotas fechado");
      monthlyBreakdown.push({ month: m.month, value: m.totalDarf6015, categories: cats });
    }
  }

  const relatedOps: RelatedOperation[] = ops
    .filter((o) =>
      ["venda_swing", "venda_day", "rendimento_fii", "come_cotas", "resgate_fundo"].includes(o.type)
    )
    .map((o) => ({
      date: o.date,
      type: humanizeType(o.type),
      assetCode: o.asset.code,
      value: o.totalValue,
      contributionToTax: estimateOpTaxContribution(o),
    }));

  const steps: CalculationStep[] = [
    { label: "Ganho swing acoes (apos isencao R$ 20k/mes)", formula: "ganho * 15%", value: totalSwingAcao },
    { label: "Ganho day trade", formula: "ganho * 20%", value: totalDay },
    { label: "Ganho ETF RV BR", formula: "ganho * 15% (sem isencao)", value: totalEtfRv },
    { label: "Ganho FII / Fiagro", formula: "ganho * 20% (sem isencao)", value: totalFii },
    { label: "Come-cotas fundos abertos (mai/nov)", formula: "rendimento * 15% (LP) ou 20% (CP)", value: totalFundoAbertoCC },
    { label: "Resgate de fundo aberto", formula: "ganho * regressiva pelo prazo", value: totalFundoAbertoResg },
    { label: "Come-cotas fundos fechados (pos-Lei 14.754)", formula: "rendimento * 15%/20%", value: totalFundoFechadoCC },
    { label: "FIP qualificado (distribuicao)", formula: "valor * 15%", value: totalFipQualif },
    { label: "TOTAL DARF 6015", value: total, isResult: true },
  ];

  return {
    kind: "darf_6015",
    title: "DARF 6015 — Apuracao mensal de Renda Variavel",
    totalValue: total,
    legalReference: "Lei 11.033/2004 + IN RFB 1.585/2015",
    ruleSummary:
      "Imposto apurado mensalmente pela PF sobre ganhos em RV (acoes, ETFs, FIIs, fundos com come-cotas). DARF codigo 6015, vencimento no ultimo dia util do mes seguinte. Inclui janela de isencao R$ 20k/mes para swing de acoes BR.",
    steps,
    relatedOperations: relatedOps,
    notes: [
      "Acoes swing tem janela R$ 20k/mes (volume) que isenta o ganho do mes",
      "Day trade, ETFs e FII NAO possuem essa isencao",
      "Come-cotas e calculado automaticamente em mai/nov pelo administrador do fundo",
      `${monthlyBreakdown.length} mes(es) com DARF devida no ano`,
    ],
  };
}

// =============================================================================
// IR Progressivo (pró-labore)
// =============================================================================

function explainIrProgressivo(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  let total = 0;
  let totalProLabore = 0;
  const detalheMensal: { month: number; bruto: number; ir: number }[] = [];

  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    if (m.proLabore > 0) {
      total += m.irProgressive;
      totalProLabore += m.proLabore;
      detalheMensal.push({ month: m.month, bruto: m.proLabore, ir: m.irProgressive });
    }
  }

  const relatedOps: RelatedOperation[] = ops
    .filter((o) => o.type === "pro_labore")
    .map((o) => ({
      date: o.date,
      type: "Pro-labore",
      assetCode: "-",
      value: o.totalValue,
      contributionToTax: estimateProgressiveIr(o.totalValue),
    }));

  const steps: CalculationStep[] = [
    { label: "Total pro-labore recebido no ano", value: totalProLabore },
    { label: "Tabela progressiva mensal 2026 aplicada", formula: "renda * aliquota - deducao" },
    ...detalheMensal.map((m) => ({
      label: `${monthName(m.month)}: ${formatBrl(m.bruto)} -> IR ${formatBrl(m.ir)}`,
      value: m.ir,
    })),
    { label: "TOTAL IR PROGRESSIVO", value: total, isResult: true },
  ];

  return {
    kind: "ir_progressivo",
    title: "IR Progressivo — Tabela mensal sobre Pro-labore",
    totalValue: total,
    legalReference: "Lei 9.250/1995 (alterada pela Lei 15.270/2025)",
    ruleSummary:
      "Pro-labore recebido pela PF segue tabela progressiva mensal. Em 2026 (Lei 15.270), nova faixa de isencao ate R$ 5.000. Acima disso, aliquotas escalonadas ate 27,5%.",
    steps,
    relatedOperations: relatedOps,
    notes: [
      "Cada mes apurado isoladamente pela tabela progressiva",
      "Empresa empregadora retem na fonte no momento do pagamento",
      "Ajuste anual ocorre na DAA (Declaracao de Ajuste Anual)",
      "13o salario e PLR tem tabela propria (exclusiva na fonte)",
    ],
  };
}

// =============================================================================
// RF IRRF — Renda fixa tributada
// =============================================================================

function explainRfIrrf(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  let total = 0;
  let totalBrutoTributado = 0;
  let totalIsento = 0;

  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    total += m.rfIrrf;
    totalBrutoTributado += m.rendRfTrib;
    totalIsento += m.rendRfIsento;
  }

  const relatedOps: RelatedOperation[] = ops
    .filter((o) => o.type === "cupom_rf" || o.type === "vencimento_rf")
    .map((o) => ({
      date: o.date,
      type: humanizeType(o.type),
      assetCode: o.asset.code,
      value: o.totalValue,
      contributionToTax: isRfIsentaOp(o) ? 0 : Math.max(0, o.totalValue) * 0.15,
    }));

  return {
    kind: "rf_irrf",
    title: "IRRF Renda Fixa — Cupons e vencimentos",
    totalValue: total,
    legalReference: "Lei 11.033/2004 + IN RFB 1.585/2015",
    ruleSummary:
      "Rendimentos de renda fixa tributada sofrem IRRF na fonte. LCI, LCA, LIG, CRI, CRA e debentures incentivadas seguem como rendimentos isentos para PF, mas entram na base ampla do IRPFM.",
    steps: [
      { label: "Rendimento bruto RF tributada", value: totalBrutoTributado },
      { label: "Alíquota usada", formula: "tabela regressiva RF: 22,5% / 20% / 17,5% / 15%" },
      { label: "Rendimento RF isenta identificado", value: totalIsento },
      { label: "TOTAL IRRF RF", value: total, isResult: true },
    ],
    relatedOperations: relatedOps,
    notes: [
      "O MVP ainda simplifica a tabela regressiva por prazo; producao deve usar dias desde a aplicacao.",
      "RF isenta nao gera IRRF, mas deve aparecer na base ampla do IRPFM.",
      "Prejuizo em RF normalmente nao vira saldo compensavel como em renda variavel.",
    ],
  };
}

// =============================================================================
// JCP — Juros sobre Capital Proprio
// =============================================================================

function explainJcpIrrf(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  let total = 0;
  let totalBruto = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    total += m.jcpIrrf;
    totalBruto += m.jcpGross;
  }

  const relatedOps: RelatedOperation[] = ops
    .filter((o) => o.type === "jcp")
    .map((o) => ({
      date: o.date,
      type: "JCP recebido",
      assetCode: o.asset.code,
      value: o.totalValue,
      contributionToTax: o.totalValue * 0.15,
    }));

  return {
    kind: "jcp_irrf",
    title: "JCP IRRF — Juros sobre Capital Proprio",
    totalValue: total,
    legalReference: "Lei 9.249/1995, art. 9",
    ruleSummary:
      "Empresas podem distribuir parte do lucro como JCP em vez de dividendo. Para a PF, IRRF de 15% retido na fonte, com carater definitivo. Para a PJ pagadora, JCP e dedutivel do IRPJ/CSLL (vantagem fiscal).",
    steps: [
      { label: "JCP bruto recebido no ano", value: totalBruto },
      { label: "Aliquota IRRF (definitivo)", formula: "15%" },
      { label: "TOTAL IRRF retido", value: total, isResult: true },
    ],
    relatedOperations: relatedOps,
    notes: [
      "IRRF de 15% e DEFINITIVO — nao entra na DAA progressiva",
      "Mas ENTRA na base do IRPFM (Lei 15.270/2025)",
      "Holding patrimonial que recebe JCP tributa como receita financeira da PJ",
    ],
  };
}

// =============================================================================
// IRRF Lei 15.270 (dividendos > R$ 50k/mes mesma fonte)
// =============================================================================

function explainIrrfLei15270(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  let total = 0;
  const mesesDisparadas: { month: number; ir: number }[] = [];
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    total += m.irrf15270;
    if (m.irrf15270 > 0) mesesDisparadas.push({ month: m.month, ir: m.irrf15270 });
  }

  const relatedOps: RelatedOperation[] = ops
    .filter((o) => o.type === "dividendo" || o.type === "distribuicao_pj_propria")
    .map((o) => ({
      date: o.date,
      type: o.type === "distribuicao_pj_propria" ? "Distribuicao PJ propria" : "Dividendo",
      assetCode: o.asset.code,
      value: o.totalValue,
      contributionToTax: o.totalValue > 50000 ? o.totalValue * 0.10 : 0,
    }));

  return {
    kind: "irrf_lei_15270",
    title: "IRRF Lei 15.270 — Dividendos acima de R$ 50k/mes",
    totalValue: total,
    legalReference: "Lei 15.270/2025 (em vigor desde 01/01/2026)",
    ruleSummary:
      "Quando uma mesma PJ paga mais de R$ 50.000 em dividendos para a mesma PF em um unico mes, IRRF de 10% e retido sobre o TOTAL do mes (nao so o excedente). E creditavel contra o IRPFM no ajuste anual.",
    steps: [
      { label: "Gatilho mensal", formula: "soma dividendos mesma fonte > R$ 50.000" },
      { label: "Aliquota aplicada", formula: "10% sobre TODO o valor distribuido no mes" },
      ...mesesDisparadas.map((m) => ({
        label: `${monthName(m.month)}: gatilho disparado`,
        value: m.ir,
      })),
      { label: "TOTAL IRRF Lei 15.270", value: total, isResult: true },
    ],
    relatedOperations: relatedOps,
    notes: [
      "ATENCAO: incide sobre TODO o valor distribuido no mes, nao apenas o excedente",
      "Multiplos pagamentos da mesma PJ no mesmo mes sao agregados",
      "Distribuicao via holding intermediaria NAO escapa do gatilho",
      "Estrategia: escalonar distribuicoes em parcelas mensais abaixo de R$ 50k",
    ],
  };
}

// =============================================================================
// Lei 14.754 — Exterior
// =============================================================================

function explainLei14754(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  const an = [...result.annual.values()].find((a) => a.vehicleId === vehicleId && a.year === year);
  const ganho = an?.exteriorGainBrl ?? 0;
  const dividendos = an?.exteriorDividendBrl ?? 0;
  const impostoPagoExterior = an?.foreignTaxPaidBrl ?? 0;
  const irBruto = an?.exteriorIrGrossBrl ?? 0;
  const creditoExterior = an?.exteriorTaxCreditBrl ?? 0;
  const ir = an?.exteriorIrBrl ?? 0;

  const relatedOps: RelatedOperation[] = ops
    .filter((o) =>
      ["stock_exterior", "etf_exterior_acumulacao", "etf_exterior_distribuicao", "reit_exterior"].includes(
        o.asset.class
      )
    )
    .map((o) => ({
      date: o.date,
      type: humanizeType(o.type),
      assetCode: o.asset.code,
      value: o.totalValue * (o.ptax ?? 1),
      contributionToTax: 0,
    }));

  return {
    kind: "lei_14754_exterior",
    title: "Lei 14.754 — Aplicacoes Financeiras no Exterior",
    totalValue: ir,
    legalReference: "Lei 14.754/2023 (em vigor desde 01/01/2024)",
    ruleSummary:
      "Ganhos e rendimentos em aplicacoes financeiras no exterior sao tributados anualmente em DAA a aliquota unica de 15%. Imposto pago no exterior pode ser deduzido dentro dos limites legais quando houver tratado ou reciprocidade.",
    steps: [
      { label: "Ganho realizado no exterior (em BRL)", value: Math.max(0, ganho) },
      { label: "Dividendos/rendimentos no exterior (em BRL)", value: Math.max(0, dividendos) },
      { label: "Aliquota unica anual", formula: "15%" },
      { label: "IR Brasil bruto", value: irBruto },
      { label: "Imposto pago no exterior informado/estimado", value: impostoPagoExterior },
      { label: "Credito usado no Brasil", value: -creditoExterior },
      { label: "TOTAL IR Brasil residual Lei 14.754", value: ir, isResult: true },
    ],
    relatedOperations: relatedOps,
    notes: [
      "Apuracao 100% pelo investidor em DAA — sem retencao na fonte no Brasil",
      "No MVP, imposto pago no exterior de dividendos dos EUA e estimado em 30% quando nao informado manualmente",
      "Variacao cambial entra no ganho total em BRL (nao destacada)",
      "Prejuizos no exterior compensam ganhos no exterior, sem prazo",
      "Credito exterior nao deve ser tratado como economia: precisa validar documento da corretora, pais de origem e limite legal",
    ],
  };
}

// =============================================================================
// IRPFM — Tributacao minima Lei 15.270
// =============================================================================

function explainIrpfm(
  result: EngineResult,
  ops: Operation[],
  vehicleId: string,
  year: number
): CalculationExplanation {
  const an = [...result.annual.values()].find((a) => a.vehicleId === vehicleId && a.year === year);
  const rendaTotal = an?.totalIncomeForIrpfm ?? 0;
  const irpfmBruto = an?.irpfmGross ?? 0;
  const irPago = an?.irPaidInYear ?? 0;
  const irpfmDevido = an?.irpfmDue ?? 0;

  const aliquotaAplicada = rendaTotal > 0 ? (irpfmBruto / rendaTotal) * 100 : 0;

  return {
    kind: "irpfm",
    title: "IRPFM — Tributacao Minima Lei 15.270",
    totalValue: irpfmDevido,
    legalReference: "Lei 15.270/2025 (em vigor desde 01/01/2026)",
    ruleSummary:
      "Garante que PF com altas rendas pague uma aliquota minima total. Para rendas entre R$ 600k e R$ 1,2M, aliquota progressiva linear de 0% a 10%. Acima de R$ 1,2M: 10% fixo. Aplica-se sobre base AMPLA (inclui rendimentos isentos como dividendos).",
    steps: [
      { label: "Renda anual total (base ampla)", value: rendaTotal },
      { label: "Aliquota IRPFM aplicavel", formula: `${aliquotaAplicada.toFixed(2)}% (faixa R$ 600k-1.2M)` },
      { label: "IRPFM bruto", formula: "renda * aliquota", value: irpfmBruto },
      { label: "IR ja pago no ano (credito)", value: -irPago },
      { label: "IRPFM devido (apos credito)", value: irpfmDevido, isResult: true },
    ],
    relatedOperations: [],
    notes: [
      "Base AMPLA inclui dividendos isentos, rendimentos FII, LCI/LCA, JCP, etc.",
      "IR ja pago no ano (DARF, IRRF, etc.) e creditavel contra IRPFM",
      "Redutor anti-bitributacao limita carga PJ+PF a 34/40/45% nominais",
      "Sem IRPFM se renda < R$ 600k",
    ],
  };
}

// =============================================================================
// Helpers
// =============================================================================

function humanizeType(t: string): string {
  const map: Record<string, string> = {
    compra: "Compra",
    venda_swing: "Venda swing",
    venda_day: "Venda day trade",
    dividendo: "Dividendo",
    jcp: "JCP",
    rendimento_fii: "Rendimento FII",
    cupom_rf: "Cupom RF",
    vencimento_rf: "Vencimento RF",
    pro_labore: "Pro-labore",
    distribuicao_pj_propria: "Distribuicao PJ propria",
    amortizacao: "Amortizacao",
    aplicacao_fundo: "Aplicacao fundo",
    resgate_fundo: "Resgate fundo",
    come_cotas: "Come-cotas",
    distribuicao_fip: "Distribuicao FIP",
  };
  return map[t] ?? t;
}

function monthName(m: number): string {
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1];
}

function formatBrl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

function estimateOpTaxContribution(_op: Operation): number {
  // Estimativa nao-cirurgica para a UI; o engine ja fez o calculo oficial
  return 0;
}

// Delegado ao loader — elimina a tabela hardcoded duplicada (era diferente do engine e estava errada).
// Opera sobre o BRUTO do pró-labore (igual ao engine). Ver docs/casos-teste-fiscais.md.
function estimateProgressiveIr(bruto: number): number {
  return calcIrpfProLabore(bruto);
}

function isRfIsentaOp(operation: Operation): boolean {
  return (
    operation.asset.isLei12431 === true ||
    operation.asset.class === "lci" ||
    operation.asset.class === "lca" ||
    operation.asset.class === "lig" ||
    operation.asset.class === "cri" ||
    operation.asset.class === "cra" ||
    operation.asset.class === "debenture_incentivada"
  );
}
