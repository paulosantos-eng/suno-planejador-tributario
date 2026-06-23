import type { OptimizationContext, Suggestion, SuggestedAction } from "../types";
import { Rules } from "../../rules";

export function findTimePjDistributionOpportunities(ctx: OptimizationContext): Suggestion[] {
  const out: Suggestion[] = [];
  const gatilho = Rules.TRIGGER_IRRF_LEI_15270;
  const aliq = Rules.ALIQ_IRRF_LEI_15270;

  let totalIrrf15270 = 0;
  const mesesDispararam: number[] = [];

  for (const m of ctx.result.monthly.values()) {
    if (m.vehicleId !== ctx.vehicleId || m.year !== ctx.year) continue;
    totalIrrf15270 += m.irrf15270;
    if (m.irrf15270 > 0) mesesDispararam.push(m.month);
  }

  if (totalIrrf15270 < 100) return out;

  if (mesesDispararam.length > 0) {
    const economia = totalIrrf15270;
    const actions: SuggestedAction[] = [
      {
        kind: "split",
        valueBrl: totalIrrf15270 / aliq,
        rationale: "Dividir distribuicoes da PJ propria em parcelas mensais ate R$ 50k (abaixo do gatilho)",
      },
      {
        kind: "delay",
        valueBrl: totalIrrf15270 / aliq,
        rationale: "Escalonar pagamentos ao longo de mais meses do ano",
      },
    ];

    out.push({
      id: "time_pj_15270",
      strategy: "time_pj_15270",
      horizon: "tactical_12m",
      title: "Gatilho Lei 15.270 disparado",
      description: `Pagamentos da PJ propria ultrapassaram R$ 50k/mes em ${mesesDispararam.length} mes(es), causando IRRF de ${formatBrl(totalIrrf15270)}. Escalonar em parcelas menores evita o gatilho.`,
      estimatedSavingBrl: economia,
      confidence: "high",
      actions,
      affectedAssets: [],
      monthsToExecute: mesesDispararam,
    });
  }

  if (totalIrrf15270 > 500) {
    out.push({
      id: "time_pj_15270_strategic",
      strategy: "time_pj_15270",
      horizon: "strategic_5y",
      title: "Politica permanente de distribuicao PJ escalonada",
      description: `Adotar politica de distribuicao mensal abaixo de R$ 50k/mes economiza ~${formatBrl(totalIrrf15270)} por ano. Em 5 anos: ${formatBrl(totalIrrf15270 * 5)}.`,
      estimatedSavingBrl: totalIrrf15270 * 5,
      confidence: "high",
      actions: [],
      affectedAssets: [],
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
