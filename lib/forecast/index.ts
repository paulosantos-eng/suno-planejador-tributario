import { Rules } from "@/lib/tax-engine/rules";
import type { DividendSource, Frequencia } from "@/lib/wizard/types";

// Constantes vêm do engine (rules-config.json) — fonte única de verdade.
export const GATILHO_MENSAL = Rules.TRIGGER_IRRF_LEI_15270; // R$ 50.000/mês por fonte
export const ALIQUOTA = Rules.ALIQ_IRRF_LEI_15270; // 10%

// Meses (0=jan) em que cada frequência paga. O gatilho é POR mês POR fonte,
// então a frequência muda completamente o risco: um pagamento anual cruza com
// só R$ 50k; mensal só cruza acima de R$ 600k/ano.
const MESES_POR_FREQ: Record<Frequencia, number[]> = {
  mensal: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  trimestral: [2, 5, 8, 11],
  semestral: [5, 11],
  anual: [11],
};

export interface SourceForecast {
  source: DividendSource;
  anual: number;
  pagamentos: number;
  porPagamento: number;
  mesesPagamento: number[];
  cruzaGatilho: boolean;
  mesesCruzando: number;
  irrf: number;
  distancia: number; // GATILHO - porPagamento (negativo = já passou)
}

export interface ForecastResult {
  multiplicador: number;
  totalDividendos: number;
  totalIrrf: number;
  algumCruza: boolean;
  fontes: SourceForecast[];
  porMes: number[]; // soma de dividendos por mês (12 posições)
}

export function runForecast(sources: DividendSource[], multiplicador = 1): ForecastResult {
  const porMes = new Array<number>(12).fill(0);
  let totalDividendos = 0;
  let totalIrrf = 0;
  let algumCruza = false;

  const fontes: SourceForecast[] = sources.map((source) => {
    const anual = (source.valorAnoPassado || 0) * multiplicador;
    const meses = MESES_POR_FREQ[source.frequencia] ?? MESES_POR_FREQ.anual;
    const pagamentos = meses.length;
    const porPagamento = pagamentos > 0 ? anual / pagamentos : 0;
    const cruza = porPagamento > GATILHO_MENSAL;
    const irrf = cruza ? porPagamento * ALIQUOTA * pagamentos : 0;

    meses.forEach((m) => {
      porMes[m] += porPagamento;
    });
    totalDividendos += anual;
    totalIrrf += irrf;
    if (cruza) algumCruza = true;

    return {
      source,
      anual,
      pagamentos,
      porPagamento,
      mesesPagamento: meses,
      cruzaGatilho: cruza,
      mesesCruzando: cruza ? pagamentos : 0,
      irrf,
      distancia: GATILHO_MENSAL - porPagamento,
    };
  });

  return { multiplicador, totalDividendos, totalIrrf, algumCruza, fontes, porMes };
}

export const CENARIOS = [
  { id: "abaixo", label: "−20%", mult: 0.8 },
  { id: "base", label: "Base", mult: 1.0 },
  { id: "acima", label: "+20%", mult: 1.2 },
] as const;
