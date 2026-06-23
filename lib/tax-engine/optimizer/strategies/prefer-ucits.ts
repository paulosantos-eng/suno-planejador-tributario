// Estrategia: identificar ETFs americanos (VOO/SPY/SCHD) e sugerir migracao para UCITS irlandeses
// Carga total cai de ~40% (EUA dividendo) para ~28% (UCITS via tratado IRE-EUA)

import type { OptimizationContext, Suggestion, SuggestedAction } from "../types";
import { getDetailedPositions } from "../../engine";

const TICKERS_AMERICANOS = ["VOO", "SPY", "SCHD", "QQQ", "VTI", "VYM", "VIG", "DGRO"];
const UCITS_EQUIVALENTES: Record<string, string> = {
  VOO: "CSPX (iShares Core S&P 500 UCITS - acumulacao)",
  SPY: "CSPX",
  SCHD: "VHYL (Vanguard FTSE All-World High Dividend UCITS)",
  QQQ: "EQQQ (Invesco Nasdaq-100 UCITS)",
  VTI: "VWRA (Vanguard FTSE All-World UCITS - acumulacao)",
  VYM: "VHYL",
  VIG: "VHYL",
  DGRO: "VHYL",
};

export function findPreferUcitsOpportunities(ctx: OptimizationContext): Suggestion[] {
  const out: Suggestion[] = [];
  const positions = getDetailedPositions(ctx.result, ctx.vehicleId);

  const americanos = positions.filter(
    (p) => TICKERS_AMERICANOS.includes(p.asset.code) && p.qty > 0
  );

  if (americanos.length === 0) return out;

  for (const pos of americanos) {
    const equivUcits = UCITS_EQUIVALENTES[pos.asset.code] ?? "ETF UCITS equivalente";

    // Calculo de economia: assume 2% de dividend yield
    // Carga atual: 30% retencao EUA + 0 BR (com credito) = 30%
    // Carga UCITS: 15% retencao EUA (tratado IRE) + 13 (Br Lei 14.754 sobre o que sobra) = ~28%
    // Diferenca aproximada: 12pp ao ano sobre dividendo
    const valorAtual = pos.currentValue;
    const dividendoEstimadoAnual = valorAtual * 0.02;
    const cargaAtual = dividendoEstimadoAnual * 0.30;
    const cargaUcits = dividendoEstimadoAnual * 0.28;
    const economiaAnual = cargaAtual - cargaUcits;
    const economia5y = economiaAnual * 5;

    if (economiaAnual < 100) continue;

    const actions: SuggestedAction[] = [
      {
        kind: "migrate",
        assetCode: pos.asset.code,
        assetName: pos.asset.name,
        valueBrl: valorAtual,
        rationale: `Substituir por ${equivUcits} (UCITS irlandes com tratado IRE-EUA)`,
      },
    ];

    out.push({
      id: `ucits_${pos.asset.code}`,
      strategy: "prefer_ucits",
      horizon: "strategic_5y",
      title: `Migrar ${pos.asset.code} para UCITS irlandes`,
      description: `Posicao em ${pos.asset.code} de ${formatBrl(valorAtual)}. Migrar para ${equivUcits} reduz carga em dividendos de ~30% para ~28%, economizando ~${formatBrl(economiaAnual)}/ano. Em 5 anos: ${formatBrl(economia5y)}.`,
      estimatedSavingBrl: economia5y,
      confidence: "high",
      actions,
      affectedAssets: [pos.asset.code],
    });
  }

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
