// Estrategia: substituir RF tributada por isenta equivalente (LCI/LCA/Deb. incentivada)

import type { OptimizationContext, Suggestion, SuggestedAction } from "../types";
import { getDetailedPositions } from "../../engine";

export function findMigrateToExemptOpportunities(ctx: OptimizationContext): Suggestion[] {
  const out: Suggestion[] = [];
  const positions = getDetailedPositions(ctx.result, ctx.vehicleId);

  // Identifica posicoes em RF tributada
  const rfTributada = positions.filter((p) =>
    p.classLabel === "Renda Fixa Trib." && p.currentValue > 50000
  );

  if (rfTributada.length === 0) return out;

  // Calcula economia anual (assume rendimento ~10% a.a.)
  const totalEmRfTrib = rfTributada.reduce((s, p) => s + p.currentValue, 0);
  const rendimentoEstimado = totalEmRfTrib * 0.10;
  const irAtual = rendimentoEstimado * 0.15; // alíquota minima RF tributada longo prazo
  const irIsenta = 0;
  const economiaAnual = irAtual - irIsenta;
  const economia5y = economiaAnual * 5;

  if (economiaAnual < 500) return out;

  const actions: SuggestedAction[] = rfTributada.slice(0, 3).map((p) => ({
    kind: "migrate" as const,
    assetCode: p.asset.code,
    assetName: p.asset.name,
    valueBrl: p.currentValue,
    rationale: `Substituir por LCI/LCA/Deb. incentivada equivalente em rendimento`,
  }));

  out.push({
    id: "mig_to_exempt_tactical",
    strategy: "migrate_to_exempt",
    horizon: "tactical_12m",
    title: "Migrar RF tributada para isenta (12 meses)",
    description: `Voce tem ${formatBrl(totalEmRfTrib)} em RF tributada. Migrar para LCI/LCA/debenture incentivada equivalente economiza ~${formatBrl(economiaAnual)} de IR no ano sobre rendimentos.`,
    estimatedSavingBrl: economiaAnual,
    confidence: "medium",
    actions,
    affectedAssets: rfTributada.map((p) => p.asset.code),
  });

  out.push({
    id: "mig_to_exempt_strategic",
    strategy: "migrate_to_exempt",
    horizon: "strategic_5y",
    title: "Migrar RF tributada para isenta (5 anos)",
    description: `Substituicao estrutural de RF tributada por isenta. Economia composta ao longo de 5 anos: ${formatBrl(economia5y)}.`,
    estimatedSavingBrl: economia5y,
    confidence: "medium",
    actions,
    affectedAssets: rfTributada.map((p) => p.asset.code),
  });

  return out;
}

function formatBrl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}
