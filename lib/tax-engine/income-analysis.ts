import { Rules } from "./rules";
import type { Operation } from "./types";

export type IncomeKind =
  | "dividendos_br"
  | "pj_propria"
  | "jcp"
  | "fii"
  | "renda_fixa_isenta"
  | "renda_fixa_tributada"
  | "fundos"
  | "exterior";

export interface IncomeEvent {
  id: string;
  date: string;
  assetCode: string;
  assetName: string;
  source: string;
  kind: IncomeKind;
  grossOriginal: number;
  currency: string;
  ptax?: number;
  grossBrl: number;
  taxBrl: number;
  netBrl: number;
  rule: string;
}

export interface IncomeBucket {
  kind: IncomeKind;
  label: string;
  description: string;
  grossBrl: number;
  taxBrl: number;
  netBrl: number;
  count: number;
}

export interface IncomeAnalysis {
  events: IncomeEvent[];
  buckets: IncomeBucket[];
  totals: {
    grossBrl: number;
    taxBrl: number;
    netBrl: number;
  };
}

export const INCOME_BUCKET_META: Record<IncomeKind, { label: string; description: string }> = {
  dividendos_br: {
    label: "Dividendos de ações BR",
    description: "Isentos na fonte em regra, mas entram na base ampla e podem acionar Lei 15.270.",
  },
  pj_propria: {
    label: "Distribuições de PJ",
    description: "Dividendos da empresa própria ou holding, com gatilho mensal por fonte.",
  },
  jcp: {
    label: "JCP",
    description: "IRRF definitivo de 15%, já tratado como imposto pago no ano.",
  },
  fii: {
    label: "FII / Fiagro",
    description: "Rendimentos podem ser isentos se cumprirem requisitos. Venda de cota é outro evento e entra em DARF, em regra a 20%.",
  },
  renda_fixa_isenta: {
    label: "RF isenta",
    description: "LCI, LCA, LIG, CRI, CRA e debêntures incentivadas. Não geram IRRF, mas entram na base ampla do IRPFM.",
  },
  renda_fixa_tributada: {
    label: "RF tributada",
    description: "Juros, cupons e rendimentos de Tesouro, CDB e debêntures comuns, com IRRF pela tabela regressiva.",
  },
  fundos: {
    label: "Fundos",
    description: "Distribuições e rendimentos de fundos que aparecem como fluxo ao investidor.",
  },
  exterior: {
    label: "Exterior",
    description: "Dividendos de stocks, ETFs e REITs convertidos por PTAX, com crédito para imposto pago no exterior quando aplicável.",
  },
};

interface IncomeCandidate {
  operation: Operation;
  kind: IncomeKind;
  grossBrl: number;
  acquiredAt?: string;
}

interface CostState {
  qty: number;
  costBrl: number;
  acquiredAt?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(startDate: string | undefined, endDate: string): number {
  if (!startDate) return 721;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 721;
  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1).replace(".", ",")}%`;
}

function rfTaxRate(operation: Operation, acquiredAt?: string): number {
  return Rules.rfRegressive(daysBetween(acquiredAt, operation.date));
}

function operationValueBrl(operation: Operation): number {
  return operation.totalValue * (operation.ptax ?? 1);
}

function costKey(operation: Operation): string {
  return `${operation.vehicleId}::${operation.asset.code}`;
}

function buildIncomeCandidates(operations: Operation[]): IncomeCandidate[] {
  const costs = new Map<string, CostState>();
  const candidates: IncomeCandidate[] = [];

  for (const operation of [...operations].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const key = costKey(operation);
    const valueBrl = operationValueBrl(operation);

    if (operation.type === "posicao_inicial" || operation.type === "compra" || operation.type === "aplicacao_fundo") {
      const current = costs.get(key) ?? { qty: 0, costBrl: 0, acquiredAt: operation.date };
      costs.set(key, {
        qty: current.qty + (operation.qty ?? 1),
        costBrl: current.costBrl + valueBrl + (operation.costs ?? 0),
        acquiredAt:
          !current.acquiredAt || operation.date < current.acquiredAt
            ? operation.date
            : current.acquiredAt,
      });
    }

    const kind = classifyIncome(operation);
    if (kind) {
      const current = costs.get(key);
      const grossBrl =
        operation.type === "vencimento_rf"
          ? Math.max(0, valueBrl - (current?.costBrl ?? 0))
          : valueBrl;
      if (grossBrl > 0) candidates.push({ operation, kind, grossBrl, acquiredAt: current?.acquiredAt });
    }

    if (operation.type === "vencimento_rf") {
      costs.delete(key);
    }

    if ((operation.type === "venda_swing" || operation.type === "venda_day") && operation.qty) {
      const current = costs.get(key);
      if (current && current.qty > 0) {
        const soldCost = (current.costBrl / current.qty) * operation.qty;
        const nextQty = Math.max(0, current.qty - operation.qty);
        const nextCost = Math.max(0, current.costBrl - soldCost);
        costs.set(key, { qty: nextQty, costBrl: nextCost, acquiredAt: current.acquiredAt });
      }
    }
  }

  return candidates;
}

function classifyIncome(operation: Operation): IncomeKind | null {
  if (operation.type === "distribuicao_pj_propria") return "pj_propria";
  if (operation.type === "jcp") return "jcp";
  if (operation.type === "rendimento_fii") return "fii";
  if (
    operation.type === "cupom_rf" ||
    operation.type === "vencimento_rf" ||
    operation.type === "amortizacao"
  ) {
    if (isFixedIncomeAsset(operation)) {
      return isRfIsenta(operation) ? "renda_fixa_isenta" : "renda_fixa_tributada";
    }
  }
  if (operation.type === "distribuicao_fip") return "fundos";
  if (operation.type === "dividendo") {
    if (operation.asset.currency !== "BRL") return "exterior";
    return "dividendos_br";
  }
  return null;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function isLei15270Dividend(kind: IncomeKind): boolean {
  return kind === "dividendos_br" || kind === "pj_propria";
}

function dividendSourceKey(operation: Operation, kind: IncomeKind): string | null {
  if (!isLei15270Dividend(kind) || !operation.payerCnpj) return null;
  const operationDate = new Date(operation.date);
  if (operationDate < Rules.LEI_15270_START) return null;
  return `${operation.payerCnpj}::${monthKey(operation.date)}`;
}

function isRfIsenta(operation: Operation): boolean {
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

function isFixedIncomeAsset(operation: Operation): boolean {
  return (
    operation.asset.class === "tesouro_selic" ||
    operation.asset.class === "tesouro_pre" ||
    operation.asset.class === "tesouro_ipca" ||
    operation.asset.class === "cdb" ||
    operation.asset.class === "debenture" ||
    operation.asset.class === "lci" ||
    operation.asset.class === "lca" ||
    operation.asset.class === "lig" ||
    operation.asset.class === "cri" ||
    operation.asset.class === "cra" ||
    operation.asset.class === "debenture_incentivada"
  );
}

function ruleFor(operation: Operation, kind: IncomeKind, acquiredAt?: string): string {
  if (kind === "exterior") {
    return operation.asset.origin === "US"
      ? "Lei 14.754 + crédito EUA"
      : "Lei 14.754";
  }
  if (kind === "jcp") return "JCP 15% IRRF";
  if (kind === "pj_propria") return "Lei 15.270";
  if (kind === "dividendos_br") return "Base IRPFM";
  if (kind === "fii") {
    return operation.asset.meetsFiiIsencao
      ? "Rendimento FII isento"
      : "Rendimento FII tributado";
  }
  if (kind === "renda_fixa_isenta") {
    if (operation.type === "amortizacao") return "RF isenta - amortizacao/rendimento";
    return "RF isenta";
  }
  if (kind === "renda_fixa_tributada") {
    const rate = rfTaxRate(operation, acquiredAt);
    if (operation.type === "amortizacao") return `RF tributada - validar juros/principal, IRRF ${formatRate(rate)}`;
    return `RF tributada - IRRF regressivo ${formatRate(rate)}`;
  }
  if (kind === "fundos") return "Distribuicao de fundo";
  return "Rendimento";
}

function taxFor(
  operation: Operation,
  kind: IncomeKind,
  grossBrl: number,
  sourceTotals: Map<string, number>,
  acquiredAt?: string,
): number {
  if (kind === "jcp") return grossBrl * Rules.ALIQ_JCP;
  if (kind === "exterior") {
    const foreignTaxPaid =
      typeof operation.withheldIrrf === "number" && operation.withheldIrrf > 0
        ? operation.withheldIrrf * (operation.ptax ?? 1)
        : operation.asset.origin === "US"
          ? grossBrl * 0.30
          : 0;
    const brazilGrossTax = grossBrl * Rules.ALIQ_LEI_14754;
    const brazilResidualTax = Math.max(0, brazilGrossTax - Math.min(foreignTaxPaid, brazilGrossTax));
    return foreignTaxPaid + brazilResidualTax;
  }
  if (kind === "renda_fixa_isenta") return 0;
  if (kind === "renda_fixa_tributada") return grossBrl * rfTaxRate(operation, acquiredAt);
  if (kind === "fundos") return grossBrl * 0.15;
  if (kind === "fii") return operation.asset.meetsFiiIsencao ? 0 : 0;

  const key = dividendSourceKey(operation, kind);
  if (!key) return 0;
  const totalFromSourceMonth = sourceTotals.get(key) ?? 0;
  return totalFromSourceMonth > Rules.TRIGGER_IRRF_LEI_15270
    ? grossBrl * Rules.ALIQ_IRRF_LEI_15270
    : 0;
}

export function buildIncomeAnalysis(operations: Operation[]): IncomeAnalysis {
  const incomeCandidates = buildIncomeCandidates(operations);

  const sourceTotals = new Map<string, number>();
  for (const item of incomeCandidates) {
    const key = dividendSourceKey(item.operation, item.kind);
    if (key) sourceTotals.set(key, (sourceTotals.get(key) ?? 0) + item.grossBrl);
  }

  const events = incomeCandidates
    .map(({ operation, kind, grossBrl, acquiredAt }): IncomeEvent => {
      const taxBrl = taxFor(operation, kind, grossBrl, sourceTotals, acquiredAt);
      return {
        id: operation.id,
        date: operation.date,
        assetCode: operation.asset.code,
        assetName: operation.asset.name,
        source: operation.payerCnpj ?? operation.asset.name,
        kind,
        grossOriginal: operation.totalValue,
        currency: operation.asset.currency,
        ptax: operation.ptax,
        grossBrl,
        taxBrl,
        netBrl: grossBrl - taxBrl,
        rule: ruleFor(operation, kind, acquiredAt),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const buckets = (Object.keys(INCOME_BUCKET_META) as IncomeKind[])
    .map((kind): IncomeBucket => {
      const meta = INCOME_BUCKET_META[kind];
      const bucketEvents = events.filter((event) => event.kind === kind);
      return {
        kind,
        label: meta.label,
        description: meta.description,
        grossBrl: bucketEvents.reduce((sum, event) => sum + event.grossBrl, 0),
        taxBrl: bucketEvents.reduce((sum, event) => sum + event.taxBrl, 0),
        netBrl: bucketEvents.reduce((sum, event) => sum + event.netBrl, 0),
        count: bucketEvents.length,
      };
    })
    .filter((bucket) => bucket.grossBrl > 0);

  return {
    events,
    buckets,
    totals: {
      grossBrl: buckets.reduce((sum, bucket) => sum + bucket.grossBrl, 0),
      taxBrl: buckets.reduce((sum, bucket) => sum + bucket.taxBrl, 0),
      netBrl: buckets.reduce((sum, bucket) => sum + bucket.netBrl, 0),
    },
  };
}
