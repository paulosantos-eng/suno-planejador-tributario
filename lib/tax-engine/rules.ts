import * as L from "./loader";

export const Rules = {
  ISENCAO_SWING_ACAO_MES: L.getIsencaoSwingAcaoMes(),
  ALIQ_SWING_ACAO: L.getAliquotaSwingAcao(),
  ALIQ_DAY: L.getAliquotaDay(),
  ALIQ_ETF_RV_SWING: L.getAliquotaEtfRvSwing(),
  ALIQ_FII_GAIN: L.getAliquotaFiiGanho(),
  ALIQ_JCP: L.getAliquotaJcp(),
  TRIGGER_IRRF_LEI_15270: L.getGatilhoIrrfDividendosLei15270(),
  ALIQ_IRRF_LEI_15270: L.getAliquotaIrrfDividendosLei15270(),
  LEI_15270_START: L.getDataVigenciaLei15270(),
  ALIQ_LEI_14754: L.getAliquotaLei14754(),
  IRPFM_LOWER: L.getIrpfmLimiteInferior(),
  IRPFM_UPPER: L.getIrpfmLimiteSuperior(),
  IRPFM_MAX: L.getIrpfmAliquotaMax(),
  VIGENCIA: L.getVigencia(),
  rfRegressive: L.getAliquotaRfRegressiva,
  irpfmRate: L.calcAliquotaIrpfm,
  irpfProgressive: L.calcAliquotaIrpfProgressiva,
  // Calculo completo IRPF sobre pro-labore (base - simplificado + redutor Lei 15.270)
  irpfProLabore: L.calcIrpfProLabore,
};
