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

  // JCP não usa o gatilho de 50k (é 15% na fonte) — fica fora do forecast de dividendos.
  const elegiveis = sources.filter((s) => s.tipo !== "jcp");

  const fontes: SourceForecast[] = elegiveis.map((source) => {
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

// CDI ≈ Selic. Selic 14,25% a.a. (Copom 17/06/2026). Premissa de mercado —
// editável na tela e A VALIDAR com a área fiscal (muda ao longo do tempo).
export const CDI_PADRAO = 0.1425;

export interface SourceTime {
  source: DividendSource;
  porPagamento: number;
  jaPaga: boolean;
  anosParaCruzar: number | null; // null = não cruza (sem dividendo ou crescimento <= 0)
}

export interface TimeToThreshold {
  crescimentoAA: number;
  jaPaga: boolean;
  anosAteComecar: number | null; // 0 se já paga; N se vai cruzar; null se não cruza
  proxima: SourceTime | null; // a fonte que dispara primeiro (ou a que já paga)
  fontes: SourceTime[];
}

// Em quanto tempo o cliente começa a pagar o imposto sobre dividendos.
// O gatilho é POR FONTE (R$ 50k/mês por empresa). Cada fonte cresce à taxa
// `crescimentoAA` e cruza o gatilho de forma independente. A "primeira a
// cruzar" comanda o headline.
export function tempoAteGatilho(
  sources: DividendSource[],
  crescimentoAA: number,
): TimeToThreshold {
  const base = runForecast(sources, 1);

  const fontes: SourceTime[] = base.fontes.map((f) => {
    const pp = f.porPagamento;
    const jaPaga = pp > GATILHO_MENSAL;
    let anos: number | null;
    if (pp <= 0) anos = null;
    else if (jaPaga) anos = 0;
    else if (crescimentoAA <= 0) anos = null;
    else anos = Math.log(GATILHO_MENSAL / pp) / Math.log(1 + crescimentoAA);
    return { source: f.source, porPagamento: pp, jaPaga, anosParaCruzar: anos };
  });

  const jaPaga = fontes.some((f) => f.jaPaga);
  let proxima: SourceTime | null = null;
  let anosAteComecar: number | null = null;

  if (jaPaga) {
    proxima = fontes.find((f) => f.jaPaga) ?? null;
    anosAteComecar = 0;
  } else {
    const vaoCruzar = fontes.filter((f) => f.anosParaCruzar != null);
    if (vaoCruzar.length > 0) {
      proxima = vaoCruzar.reduce((a, b) =>
        (a.anosParaCruzar as number) <= (b.anosParaCruzar as number) ? a : b,
      );
      anosAteComecar = proxima.anosParaCruzar;
    }
  }

  return { crescimentoAA, jaPaga, anosAteComecar, proxima, fontes };
}

// IRPF anual sobre pró-labore mensal (tabela progressiva 2026 + redutor Lei 15.270),
// assumindo pró-labore constante nos 12 meses. Reusa o cálculo do engine.
export function irpfProLaboreAnual(mensalBruto: number): number {
  if (!mensalBruto || mensalBruto <= 0) return 0;
  return Rules.irpfProLabore(mensalBruto) * 12;
}

// JCP: 15% de IRRF na fonte (definitivo). Soma das fontes do tipo "jcp".
export const ALIQ_JCP = Rules.ALIQ_JCP;
export function jcpIrrfAnual(sources: DividendSource[]): number {
  return sources
    .filter((s) => s.tipo === "jcp")
    .reduce((acc, s) => acc + (s.valorAnoPassado || 0) * ALIQ_JCP, 0);
}
