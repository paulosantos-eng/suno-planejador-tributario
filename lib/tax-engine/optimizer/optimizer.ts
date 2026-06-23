// Otimizador Tributario - Orquestrador
// Chama todas as estrategias, agrega resultados, separa por horizonte e ranqueia

import type {
  OptimizationContext,
  OptimizationResult,
  OptimizationPlan,
  Suggestion,
} from "./types";

import { findWindow20kOpportunities } from "./strategies/window-20k";
import { findTaxLossHarvestOpportunities } from "./strategies/tax-loss-harvest";
import { findMigrateToExemptOpportunities } from "./strategies/migrate-to-exempt";
import { findTimePjDistributionOpportunities } from "./strategies/time-pj-15270";
import { findPreferUcitsOpportunities } from "./strategies/prefer-ucits";
import { getDetailedPositions } from "../engine";

export function optimize(ctx: OptimizationContext): OptimizationResult {
  // Roda todas as estrategias
  const allSuggestions: Suggestion[] = [
    ...findWindow20kOpportunities(ctx),
    ...findTaxLossHarvestOpportunities(ctx),
    ...findMigrateToExemptOpportunities(ctx),
    ...findTimePjDistributionOpportunities(ctx),
    ...findPreferUcitsOpportunities(ctx),
  ];

  // Separa por horizonte
  const tacticalSuggestions = allSuggestions
    .filter((s) => s.horizon === "tactical_12m")
    .sort((a, b) => b.estimatedSavingBrl - a.estimatedSavingBrl);

  const strategicSuggestions = allSuggestions
    .filter((s) => s.horizon === "strategic_5y")
    .sort((a, b) => b.estimatedSavingBrl - a.estimatedSavingBrl);

  // Calcula patrimonio para % do portfolio
  const positions = getDetailedPositions(ctx.result, ctx.vehicleId);
  const patrimonio = positions.reduce((s, p) => s + p.currentValue, 0);

  const tactical: OptimizationPlan = {
    horizon: "tactical_12m",
    suggestions: tacticalSuggestions,
    totalSavingBrl: tacticalSuggestions.reduce((s, x) => s + x.estimatedSavingBrl, 0),
    totalSavingPctOfPortfolio:
      patrimonio > 0
        ? tacticalSuggestions.reduce((s, x) => s + x.estimatedSavingBrl, 0) / patrimonio
        : 0,
  };

  const strategic: OptimizationPlan = {
    horizon: "strategic_5y",
    suggestions: strategicSuggestions,
    totalSavingBrl: strategicSuggestions.reduce((s, x) => s + x.estimatedSavingBrl, 0),
    totalSavingPctOfPortfolio:
      patrimonio > 0
        ? strategicSuggestions.reduce((s, x) => s + x.estimatedSavingBrl, 0) / patrimonio
        : 0,
  };

  // Top 5 sugestoes (combinando ambos os horizontes, por valor absoluto)
  const topActions = [...allSuggestions]
    .sort((a, b) => b.estimatedSavingBrl - a.estimatedSavingBrl)
    .slice(0, 5);

  return {
    tactical,
    strategic,
    totalCombinedSaving: tactical.totalSavingBrl + strategic.totalSavingBrl,
    topActions,
  };
}
