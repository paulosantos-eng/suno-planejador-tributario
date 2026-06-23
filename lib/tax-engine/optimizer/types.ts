// Otimizador Tributario - Tipos compartilhados

import type { Asset } from "../types";
import type { EngineResult } from "../engine";

export type Horizon = "tactical_12m" | "strategic_5y";

export type StrategyKind =
  | "window_20k"
  | "tax_loss_harvest"
  | "migrate_to_exempt"
  | "time_pj_15270"
  | "prefer_ucits"
  | "defer_via_accumulation";

export interface Suggestion {
  id: string;
  strategy: StrategyKind;
  horizon: Horizon;
  title: string;
  description: string;
  estimatedSavingBrl: number;
  confidence: "high" | "medium" | "low";
  actions: SuggestedAction[];
  affectedAssets: string[];
  monthsToExecute?: number[];
}

export interface SuggestedAction {
  kind: "sell" | "buy" | "delay" | "split" | "migrate";
  assetCode?: string;
  assetName?: string;
  qty?: number;
  valueBrl: number;
  whenMonth?: number;
  rationale: string;
}

export interface OptimizationContext {
  result: EngineResult;
  vehicleId: string;
  year: number;
  targetAllocation?: Record<string, number>;
}

export interface OptimizationPlan {
  horizon: Horizon;
  suggestions: Suggestion[];
  totalSavingBrl: number;
  totalSavingPctOfPortfolio: number;
}

export interface OptimizationResult {
  tactical: OptimizationPlan;   // 12 meses
  strategic: OptimizationPlan;  // 5 anos
  totalCombinedSaving: number;
  topActions: Suggestion[];     // 3-5 top picks
}
