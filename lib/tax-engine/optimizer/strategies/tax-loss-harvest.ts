// Estrategia: tax-loss harvesting
// Identifica ativos com prejuizo latente e sugere realizar para compensar ganhos

import type { OptimizationContext, Suggestion, SuggestedAction } from "../types";
import { getDetailedPositions } from "../../engine";

export function findTaxLossHarvestOpportunities(ctx: OptimizationContext): Suggestion[] {
  const out: Suggestion[] = [];
  const positions = getDetailedPositions(ctx.result, ctx.vehicleId);

  // Calcula ganho realizado por categoria no ano
  let ganhoRealizadoSwing = 0;
  let ganhoRealizadoFii = 0;
  let ganhoExteriorBrl = 0;
  for (const m of ctx.result.monthly.values()) {
    if (m.vehicleId !== ctx.vehicleId || m.year !== ctx.year) continue;
    ganhoRealizadoSwing += Math.max(0, m.gainSwingShare) + Math.max(0, m.gainSwingEtfRv);
    ganhoRealizadoFii += Math.max(0, m.gainFii);
  }
  const an = [...ctx.result.annual.values()].find((a) => a.vehicleId === ctx.vehicleId && a.year === ctx.year);
  ganhoExteriorBrl = an?.exteriorGainBrl ?? 0;

  // Identifica prejuizo latente por categoria
  const prejuizoLatentePorCategoria: Record<string, { value: number; assets: typeof positions }> = {};
  for (const p of positions) {
    if (p.unrealizedGain >= 0) continue;
    const cat = categorizar(p.classLabel);
    if (!cat) continue;
    if (!prejuizoLatentePorCategoria[cat]) {
      prejuizoLatentePorCategoria[cat] = { value: 0, assets: [] };
    }
    prejuizoLatentePorCategoria[cat].value += Math.abs(p.unrealizedGain);
    prejuizoLatentePorCategoria[cat].assets.push(p);
  }

  // Para cada categoria, sugere harvesting se ha prejuizo + ganho realizado
  const ganhosPorCategoria: Record<string, number> = {
    swing: ganhoRealizadoSwing,
    fii: ganhoRealizadoFii,
    exterior: ganhoExteriorBrl,
  };

  const aliquotaPorCategoria: Record<string, number> = {
    swing: 0.15,
    fii: 0.20,
    exterior: 0.15,
  };

  for (const [cat, data] of Object.entries(prejuizoLatentePorCategoria)) {
    const ganho = ganhosPorCategoria[cat] ?? 0;
    if (ganho < 500) continue;

    const prejuizoConsumivel = Math.min(data.value, ganho);
    const aliq = aliquotaPorCategoria[cat] ?? 0.15;
    const economia = prejuizoConsumivel * aliq;

    if (economia < 100) continue;

    const actions: SuggestedAction[] = data.assets
      .slice(0, 3)
      .map((p) => ({
        kind: "sell" as const,
        assetCode: p.asset.code,
        assetName: p.asset.name,
        valueBrl: p.currentValue,
        rationale: `Realizar prejuizo latente de ${formatBrl(Math.abs(p.unrealizedGain))} para compensar ganhos`,
      }));

    out.push({
      id: `harvest_${cat}`,
      strategy: "tax_loss_harvest",
      horizon: "tactical_12m",
      title: `Tax-loss harvesting em ${labelCategoria(cat)}`,
      description: `Voce tem ${formatBrl(data.value)} em prejuizo latente em ${labelCategoria(cat)} e ${formatBrl(ganho)} de ganho realizado no ano. Realizar o prejuizo agora compensa o ganho e economiza ${formatBrl(economia)} de IR.`,
      estimatedSavingBrl: economia,
      confidence: "high",
      actions,
      affectedAssets: data.assets.map((p) => p.asset.code),
    });
  }

  return out;
}

function categorizar(classLabel: string): string | null {
  if (classLabel === "Acoes BR" || classLabel === "ETF RV BR") return "swing";
  if (classLabel === "FII / Fiagro") return "fii";
  if (classLabel === "Exterior") return "exterior";
  return null;
}

function labelCategoria(cat: string): string {
  return { swing: "Acoes/ETF BR", fii: "FII", exterior: "Exterior" }[cat] ?? cat;
}

function formatBrl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}
