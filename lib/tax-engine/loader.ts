// =============================================================================
// LOADER — Carrega regras tributárias do arquivo JSON e expõe API tipada
// =============================================================================
//
// PRINCÍPIO: regras vivem em rules-config.json (config), não em código.
// Quando uma alíquota muda (IN nova da Receita), edita o JSON e faz commit.
// Sem mexer em código fonte.
//
// =============================================================================

import config from "./rules-config.json";

// -----------------------------------------------------------------------------
// TIPOS — refletem a estrutura do JSON
// -----------------------------------------------------------------------------

interface FaixaRegressiva {
  ate_dias: number | null;
  aliquota: number;
}

interface FaixaPMR {
  ate_pmr_dias: number | null;
  aliquota: number;
}

interface FaixaBaseProgressiva {
  base_ate: number | null;
  aliquota: number;
  parcela_deduzir: number;
}

interface FaixaIrpfm {
  renda_ate: number | null;
  aliquota?: number;
  aliquota_progressiva_linear_ate?: number;
}

interface FaixaItcmdProg {
  progressiva: number[];
}

interface FaixaItcmdFixa {
  aliquota_unica?: number;
  aliquota_atual?: number;
  progressiva_em_estudo?: boolean;
}

// -----------------------------------------------------------------------------
// API PÚBLICA — funções de acesso tipadas, leem do JSON
// -----------------------------------------------------------------------------

export const RulesConfig = config;

export function getVigencia(): string {
  return config.metadata.vigencia_inicio;
}

// === Renda Variável BR ===

export function getAliquotaSwingAcao(): number {
  return config.renda_variavel_br.swing_acao.aliquota;
}

export function getIsencaoSwingAcaoMes(): number {
  return config.renda_variavel_br.swing_acao.isencao_volume_mes;
}

export function getAliquotaDay(): number {
  return config.renda_variavel_br.day_trade.aliquota;
}

export function getAliquotaEtfRvSwing(): number {
  return config.renda_variavel_br.etf_rv_br.aliquota_swing;
}

// === FII / Fiagro ===

export function getAliquotaFiiGanho(): number {
  return config.fii_fiagro.ganho_capital_cota.aliquota;
}

export function getRequisitosIsencaoFii(): string[] {
  return config.fii_fiagro.rendimento_mensal_pf_isencao.requisitos;
}

// === Renda Fixa ===

export function getAliquotaRfRegressiva(dias: number): number {
  const tabela = config.renda_fixa_tributada.tabela_regressiva as FaixaRegressiva[];
  for (const faixa of tabela) {
    if (faixa.ate_dias === null || dias <= faixa.ate_dias) {
      return faixa.aliquota;
    }
  }
  return 0.15; // fallback
}

export function rfPermiteCompensacaoPrejuizo(): boolean {
  return config.renda_fixa_tributada.compensacao_de_prejuizo;
}

// === ETF RF BR ===

export function getAliquotaEtfRfBr(pmrDias: number): number {
  const tabela = config.etf_rf_br.tabela_por_pmr_indice as FaixaPMR[];
  for (const faixa of tabela) {
    if (faixa.ate_pmr_dias === null || pmrDias <= faixa.ate_pmr_dias) {
      return faixa.aliquota;
    }
  }
  return 0.15;
}

// === Dividendos / JCP — Lei 15.270 ===

export function getAliquotaJcp(): number {
  return config.dividendos_jcp.jcp.aliquota_irrf;
}

export function getGatilhoIrrfDividendosLei15270(): number {
  return config.dividendos_jcp.regime_pos_2026_lei_15270.gatilho_irrf_mensal;
}

export function getAliquotaIrrfDividendosLei15270(): number {
  return config.dividendos_jcp.regime_pos_2026_lei_15270.aliquota_irrf_acima_gatilho;
}

export function getDataVigenciaLei15270(): Date {
  return new Date(config.dividendos_jcp.regime_pos_2026_lei_15270.vigencia_inicio);
}

// === IRPFM (Lei 15.270) ===

export function getIrpfmLimiteInferior(): number {
  const faixas = config.irpfm_lei_15270.faixas as FaixaIrpfm[];
  return faixas[0].renda_ate ?? 600000;
}

export function getIrpfmLimiteSuperior(): number {
  const faixas = config.irpfm_lei_15270.faixas as FaixaIrpfm[];
  return faixas[1].renda_ate ?? 1200000;
}

export function getIrpfmAliquotaMax(): number {
  const faixas = config.irpfm_lei_15270.faixas as FaixaIrpfm[];
  return faixas[faixas.length - 1].aliquota ?? 0.10;
}

export function calcAliquotaIrpfm(rendaAnual: number): number {
  const inf = getIrpfmLimiteInferior();
  const sup = getIrpfmLimiteSuperior();
  const max = getIrpfmAliquotaMax();
  if (rendaAnual <= inf) return 0;
  if (rendaAnual >= sup) return max;
  return ((rendaAnual - inf) / (sup - inf)) * max;
}

// === Tabela progressiva mensal 2026 ===

export function getDescontoSimplificadoMensal(): number {
  return (config.tabela_progressiva_irpf_2026 as Record<string, unknown>).desconto_simplificado_mensal as number;
}

export function getRedutorLei15270Params(): {
  faixaFixaTetoBruto: number;
  redutorFixo: number;
  faixaDecrescenteTetoBruto: number;
  redutorA: number;
  redutorB: number;
} {
  const r = (config.tabela_progressiva_irpf_2026 as Record<string, unknown>).redutor_lei_15270 as Record<string, number>;
  return {
    faixaFixaTetoBruto: r.faixa_fixa_teto_bruto,
    redutorFixo: r.redutor_fixo,
    faixaDecrescenteTetoBruto: r.faixa_decrescente_teto_bruto,
    redutorA: r.redutor_a,
    redutorB: r.redutor_b,
  };
}

/**
 * Lookup da faixa da tabela progressiva 2026 pela BASE de cálculo
 * (base = bruto - desconto_simplificado_mensal).
 * NÃO recebe o bruto — quem chama deve subtrair o simplificado antes.
 */
export function calcAliquotaIrpfProgressiva(base: number): { rate: number; deduction: number } {
  const tabela = (config.tabela_progressiva_irpf_2026 as Record<string, unknown>).faixas_base_mensais as FaixaBaseProgressiva[];
  for (const faixa of tabela) {
    if (faixa.base_ate === null || base <= faixa.base_ate) {
      return { rate: faixa.aliquota, deduction: faixa.parcela_deduzir };
    }
  }
  return { rate: 0.275, deduction: 908.73 };
}

/**
 * Calcula o IRPF mensal sobre pró-labore completo:
 * 1. base = bruto - desconto_simplificado_mensal
 * 2. impostoTabela = max(0, base * aliquota - parcela_deduzir)
 * 3. redutor da Lei 15.270 calculado sobre o BRUTO
 * 4. redutorEfetivo = min(redutor, impostoTabela)
 * 5. IRPF = impostoTabela - redutorEfetivo
 */
export function calcIrpfProLabore(bruto: number): number {
  const simplificado = getDescontoSimplificadoMensal();
  const base = Math.max(0, bruto - simplificado);
  const { rate, deduction } = calcAliquotaIrpfProgressiva(base);
  const impostoTabela = Math.max(0, base * rate - deduction);

  const red = getRedutorLei15270Params();
  let redutor: number;
  if (bruto <= red.faixaFixaTetoBruto) {
    redutor = red.redutorFixo;
  } else if (bruto <= red.faixaDecrescenteTetoBruto) {
    redutor = red.redutorA - red.redutorB * bruto;
  } else {
    redutor = 0;
  }
  const redutorEfetivo = Math.min(redutor, impostoTabela);
  return Math.round((impostoTabela - redutorEfetivo) * 100) / 100;
}

// === Exterior (Lei 14.754) ===

export function getAliquotaLei14754(): number {
  return config.exterior_lei_14754.aliquota_anual;
}

export function getDataVigenciaLei14754(): Date {
  return new Date(config.exterior_lei_14754.vigencia_inicio);
}

// === Veículos ===

export function getCargaEfetivaPjPresumidoAluguel(): number {
  return config.veiculos.pj_lucro_presumido.carga_efetiva_aluguel_aproximada;
}

export function getCargaNominalPjNaoFinanceira(): number {
  return config.irpfm_lei_15270.redutor_anti_bitributacao.limites_nominais_por_pj.pj_nao_financeira;
}

// === ITCMD ===

export function getItcmdEstado(uf: string): unknown {
  const estados = config.itcmd_referencias_estados as Record<string, unknown>;
  return estados[uf.toLowerCase()];
}

// -----------------------------------------------------------------------------
// VALIDAÇÃO DE INTEGRIDADE — roda no startup
// -----------------------------------------------------------------------------

export function validateRulesConfig(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar alíquotas em range esperado [0, 1]
  function checkAliquota(path: string, val: number) {
    if (val < 0 || val > 1) errors.push(`Alíquota fora do range [0,1] em ${path}: ${val}`);
  }

  checkAliquota("swing_acao.aliquota", getAliquotaSwingAcao());
  checkAliquota("day_trade.aliquota", getAliquotaDay());
  checkAliquota("fii_ganho.aliquota", getAliquotaFiiGanho());
  checkAliquota("jcp", getAliquotaJcp());
  checkAliquota("lei_14754", getAliquotaLei14754());
  checkAliquota("irrf_lei_15270", getAliquotaIrrfDividendosLei15270());

  // Validar tabela regressiva ordenada
  const rfTabela = config.renda_fixa_tributada.tabela_regressiva as FaixaRegressiva[];
  for (let i = 0; i < rfTabela.length - 1; i++) {
    if (rfTabela[i].aliquota < rfTabela[i + 1].aliquota) {
      errors.push(`Tabela regressiva RF tem alíquota crescente em índice ${i} (deveria decrescer)`);
    }
  }

  // Validar vigência
  if (!config.metadata.vigencia_inicio) errors.push("metadata.vigencia_inicio ausente");

  return { ok: errors.length === 0, errors };
}

// Roda validação na importação (fail-fast no startup)
const validation = validateRulesConfig();
if (!validation.ok) {
  console.error("⚠️ RulesConfig validation errors:", validation.errors);
}
