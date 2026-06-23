// Estrategia: aproveitar janela R$ 20k de isencao swing-acao mes a mes

import type { OptimizationContext, Suggestion, SuggestedAction } from "../types";
import { Rules } from "../../rules";

export function findWindow20kOpportunities(ctx: OptimizationContext): Suggestion[] {
  const out: Suggestion[] = [];
  const monthsByVeic = new Map<number, { vol: number; gain: number; ops: string[] }>();

  for (const m of ctx.result.monthly.values()) {
    if (m.vehicleId !== ctx.vehicleId || m.year !== ctx.year) continue;
    monthsByVeic.set(m.month, {
      vol: m.volumeSwingShares,
      gain: m.gainSwingShare,
      ops: m.opsRef,
    });
  }

  // Caso 1: meses onde estourou — sugere dividir
  const overflowMonths: number[] = [];
  const idleMonths: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const data = monthsByVeic.get(m);
    if (!data) {
      idleMonths.push(m);
      continue;
    }
    if (data.vol > Rules.ISENCAO_SWING_ACAO_MES) overflowMonths.push(m);
    else if (data.vol < Rules.ISENCAO_SWING_ACAO_MES * 0.3) idleMonths.push(m);
  }

  for (const month of overflowMonths) {
    const data = monthsByVeic.get(month)!;
    const excedente = data.vol - Rules.ISENCAO_SWING_ACAO_MES;
    // IR economizado se dividir
    const irPerdido = data.gain * Rules.ALIQ_SWING_ACAO;
    if (irPerdido < 100) continue;

    const targetMonth = idleMonths.find((m) => m > month) ?? idleMonths[0];
    const actions: SuggestedAction[] = [
      {
        kind: "split",
        valueBrl: excedente,
        whenMonth: month,
        rationale: `Reduzir venda no mes ${month} em ${formatBrl(excedente)}`,
      },
      {
        kind: "delay",
        valueBrl: excedente,
        whenMonth: targetMonth,
        rationale: `Mover excedente para mes ${targetMonth} (janela R$ 20k disponivel)`,
      },
    ];

    out.push({
      id: `win20k_${month}`,
      strategy: "window_20k",
      horizon: "tactical_12m",
      title: `Janela R$ 20k estourada em ${monthName(month)}`,
      description: `Vendas swing-acao somaram ${formatBrl(data.vol)} no mes (limite R$ 20k). Dividir parte das vendas em outro mes economiza ate ${formatBrl(irPerdido)} de IR.`,
      estimatedSavingBrl: irPerdido,
      confidence: "high",
      actions,
      affectedAssets: data.ops,
      monthsToExecute: [month, targetMonth],
    });
  }

  // Caso 2: janelas nao usadas — sugere usar para realizar ganhos
  if (idleMonths.length >= 6 && overflowMonths.length === 0) {
    const totalIdleVolume = idleMonths.length * Rules.ISENCAO_SWING_ACAO_MES;
    out.push({
      id: "win20k_idle",
      strategy: "window_20k",
      horizon: "tactical_12m",
      title: `${idleMonths.length} meses com janela R$ 20k nao utilizada`,
      description: `Voce tem ${idleMonths.length} meses com pouca ou nenhuma venda. Pode aproveitar para realizar ganhos isentos (ate R$ ${(totalIdleVolume / 1000).toFixed(0)} mil no ano).`,
      estimatedSavingBrl: totalIdleVolume * 0.15 * 0.3, // estimativa 30% efetivamente realizavel
      confidence: "medium",
      actions: [
        {
          kind: "sell",
          valueBrl: Rules.ISENCAO_SWING_ACAO_MES,
          rationale: "Realizar ganhos parcialmente dentro da janela mensal R$ 20k",
        },
      ],
      affectedAssets: [],
      monthsToExecute: idleMonths,
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

function monthName(m: number): string {
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1];
}
