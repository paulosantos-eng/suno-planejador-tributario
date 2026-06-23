import type { Operation } from "@/lib/tax-engine/types";

export type DataQualitySeverity = "ok" | "info" | "warn" | "high";

export interface DataQualityIssue {
  id: string;
  severity: DataQualitySeverity;
  title: string;
  description: string;
}

const PARTIAL_COVERAGE = new Set([
  "etf_rf_br",
  "fundo_exclusivo",
  "fip_qualificado",
]);

export function analyzeDataQuality(operations: Operation[]): {
  score: number;
  status: DataQualitySeverity;
  issues: DataQualityIssue[];
  stats: {
    operations: number;
    assets: number;
    foreignOperations: number;
    incomeEvents: number;
  };
} {
  const issues: DataQualityIssue[] = [];
  const assets = new Set<string>();
  let foreignOperations = 0;
  let incomeEvents = 0;
  let missingPtax = 0;
  let missingQtyOrPrice = 0;
  let missingPayer = 0;
  const partialClasses = new Set<string>();

  for (const operation of operations) {
    assets.add(operation.asset.code);
    if (operation.asset.currency !== "BRL") {
      foreignOperations += 1;
      if (!operation.ptax || operation.ptax <= 0) missingPtax += 1;
    }

    if (["compra", "venda_swing", "venda_day"].includes(operation.type)) {
      if (!operation.qty || operation.qty <= 0 || !operation.totalValue || operation.totalValue <= 0) {
        missingQtyOrPrice += 1;
      }
    }

    if (["dividendo", "jcp", "distribuicao_pj_propria"].includes(operation.type)) {
      incomeEvents += 1;
      if (operation.type !== "dividendo" || operation.asset.currency === "BRL") {
        if (!operation.payerCnpj) missingPayer += 1;
      }
    }

    if (PARTIAL_COVERAGE.has(operation.asset.class)) {
      partialClasses.add(operation.asset.class);
    }
  }

  if (operations.length === 0) {
    issues.push({
      id: "no_operations",
      severity: "high",
      title: "Sem operações cadastradas",
      description: "O engine ainda não tem compras, vendas ou rendimentos para calcular carteira e imposto.",
    });
  }

  if (missingPtax > 0) {
    issues.push({
      id: "missing_ptax",
      severity: "high",
      title: "PTAX ausente em operação internacional",
      description: `${missingPtax} operação(ões) em moeda estrangeira estão sem câmbio. Exterior pela Lei 14.754 depende de conversão para BRL.`,
    });
  }

  if (missingQtyOrPrice > 0) {
    issues.push({
      id: "missing_trade_values",
      severity: "warn",
      title: "Operações sem quantidade ou valor",
      description: `${missingQtyOrPrice} compra(s)/venda(s) precisam de quantidade e valor para custo médio correto.`,
    });
  }

  if (missingPayer > 0) {
    issues.push({
      id: "missing_payer",
      severity: "warn",
      title: "Fonte pagadora não informada",
      description: `${missingPayer} rendimento(s) não têm CNPJ/fonte. A Lei 15.270 depende do total mensal por mesma fonte pagadora.`,
    });
  }

  if (partialClasses.size > 0) {
    issues.push({
      id: "partial_coverage",
      severity: "info",
      title: "Há classes com cobertura parcial",
      description: `O MVP já aceita estas classes, mas algumas regras finas ainda precisam revisão: ${[
        ...partialClasses,
      ].join(", ")}.`,
    });
  }

  if (operations.length > 0 && incomeEvents === 0) {
    issues.push({
      id: "no_income_events",
      severity: "info",
      title: "Sem rendimentos lançados",
      description: "A carteira tem posições, mas não há dividendos, JCP, rendimentos de FII ou cupons cadastrados.",
    });
  }

  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 35;
    if (issue.severity === "warn") return sum + 18;
    if (issue.severity === "info") return sum + 6;
    return sum;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const status: DataQualitySeverity =
    issues.some((issue) => issue.severity === "high")
      ? "high"
      : issues.some((issue) => issue.severity === "warn")
        ? "warn"
        : issues.some((issue) => issue.severity === "info")
          ? "info"
          : "ok";

  return {
    score,
    status,
    issues,
    stats: {
      operations: operations.length,
      assets: assets.size,
      foreignOperations,
      incomeEvents,
    },
  };
}

