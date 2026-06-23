// TaxFlow Advisor — Tax Engine (porta do PoC Python, simplificado para MVP)

import { Rules } from "./rules";
import type {
  Operation,
  Position,
  Asset,
  MonthlyApuracao,
  AnnualApuracao,
  Opportunity,
  FiscalEvent,
} from "./types";

function blankMonth(vehicleId: string, year: number, month: number): MonthlyApuracao {
  return {
    vehicleId, year, month,
    volumeSwingShares: 0, gainSwingShare: 0, gainSwingEtfRv: 0,
    gainFii: 0, gainDay: 0,
    rendFiiIsento: 0, rendFiiTributado: 0,
    rendRfTrib: 0, rendRfIsento: 0, rfIrrf: 0,
    dividends: 0, jcpGross: 0, jcpIrrf: 0, proLabore: 0,
    irrf15270: 0,
    irSwingShare: 0, irDay: 0, irEtfRv: 0, irFiiGain: 0, irProgressive: 0,
    fundoAbertoComeCotasIr: 0, fundoAbertoResgateIr: 0,
    fundoFechadoComeCotasIr: 0, fipQualificadoIr: 0,
    totalDarf6015: 0, opsRef: [],
  };
}

// Classifica classe como fundo (para roteamento)
function isFundoComComeCotas(cls: string): boolean {
  return cls === "fundo_multimercado_lp"
      || cls === "fundo_rf_lp"
      || cls === "fundo_rf_cp"
      || cls === "fidc"
      || cls === "fundo_exclusivo";
}

function isFundoIsentoComeCotas(cls: string): boolean {
  return cls === "fia_aberto" || cls === "fip_qualificado";
}

function aliquotaComeCotas(cls: string): number {
  if (cls === "fundo_rf_cp") return 0.20;
  return 0.15; // LP padrão
}

function aliquotaResgateFundo(cls: string, dias: number): number {
  // Regressiva pelo prazo desde aplicação
  if (cls === "fundo_rf_cp") {
    return dias <= 180 ? 0.225 : 0.20;
  }
  // LP
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
}

export interface EngineResult {
  positions: Map<string, Position>;
  monthly: Map<string, MonthlyApuracao>;
  annual: Map<string, AnnualApuracao>;
  dividendAccumulator: Map<string, number>;
}

const keyPos = (vehId: string, assetCode: string) => `${vehId}::${assetCode}`;
const keyMonth = (vehId: string, y: number, m: number) => `${vehId}::${y}::${m}`;
const keyAnnual = (vehId: string, y: number) => `${vehId}::${y}`;
const keyDiv = (cnpj: string, vehId: string, y: number, m: number) =>
  `${cnpj}::${vehId}::${y}::${m}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(startDate: string | undefined, endDate: string): number {
  if (!startDate) return 721;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 721;
  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
}

function foreignTaxPaidBrl(op: Operation, grossBrl: number): number {
  if (typeof op.withheldIrrf === "number" && op.withheldIrrf > 0) {
    return op.withheldIrrf * (op.ptax ?? 1);
  }
  if (op.asset.origin === "US" && op.type === "dividendo") {
    return grossBrl * 0.30;
  }
  return 0;
}

function isRfIsentaAsset(asset: Asset): boolean {
  return (
    asset.isLei12431 === true ||
    asset.class === "lci" ||
    asset.class === "lca" ||
    asset.class === "lig" ||
    asset.class === "cri" ||
    asset.class === "cra" ||
    asset.class === "debenture_incentivada"
  );
}

function isFixedIncomeAsset(asset: Asset): boolean {
  return (
    asset.class === "tesouro_selic" ||
    asset.class === "tesouro_pre" ||
    asset.class === "tesouro_ipca" ||
    asset.class === "cdb" ||
    asset.class === "debenture" ||
    asset.class === "lci" ||
    asset.class === "lca" ||
    asset.class === "lig" ||
    asset.class === "cri" ||
    asset.class === "cra" ||
    asset.class === "debenture_incentivada"
  );
}

function sumIrrfLei15270ForMonth(
  dividendAcc: Map<string, number>,
  vehicleId: string,
  year: number,
  month: number,
): number {
  const suffix = `::${vehicleId}::${year}::${month}`;
  let total = 0;
  for (const [key, accumulated] of dividendAcc.entries()) {
    if (key.endsWith(suffix) && accumulated > Rules.TRIGGER_IRRF_LEI_15270) {
      total += accumulated * Rules.ALIQ_IRRF_LEI_15270;
    }
  }
  return total;
}

export function runEngine(ops: Operation[]): EngineResult {
  const positions = new Map<string, Position>();
  const monthly = new Map<string, MonthlyApuracao>();
  const annual = new Map<string, AnnualApuracao>();
  const dividendAcc = new Map<string, number>();
  const acquisitionDates = new Map<string, string>();

  const getMonth = (vehId: string, y: number, m: number): MonthlyApuracao => {
    const k = keyMonth(vehId, y, m);
    if (!monthly.has(k)) monthly.set(k, blankMonth(vehId, y, m));
    return monthly.get(k)!;
  };
  const getAnnual = (vehId: string, y: number): AnnualApuracao => {
    const k = keyAnnual(vehId, y);
    if (!annual.has(k)) {
      annual.set(k, {
        vehicleId: vehId, year: y,
        totalIncomeForIrpfm: 0, irPaidInYear: 0,
        irpfmGross: 0, irpfmDue: 0,
        exteriorGainBrl: 0,
        exteriorDividendBrl: 0,
        foreignTaxPaidBrl: 0,
        exteriorIrGrossBrl: 0,
        exteriorTaxCreditBrl: 0,
        exteriorIrBrl: 0,
      });
    }
    return annual.get(k)!;
  };
  const updatePos = (op: Operation, deltaQty: number, deltaCost: number) => {
    const k = keyPos(op.vehicleId, op.asset.code);
    const existing = positions.get(k);
    if (!existing) {
      positions.set(k, {
        asset: op.asset,
        qty: deltaQty,
        totalCostBrl: deltaCost,
        meanCost: deltaQty > 0 ? deltaCost / deltaQty : 0,
      });
    } else {
      existing.qty += deltaQty;
      existing.totalCostBrl += deltaCost;
      existing.meanCost = existing.qty > 0 ? existing.totalCostBrl / existing.qty : 0;
    }
  };
  const registerAcquisitionDate = (op: Operation) => {
    const k = keyPos(op.vehicleId, op.asset.code);
    const current = acquisitionDates.get(k);
    if (!current || op.date < current) acquisitionDates.set(k, op.date);
  };
  const rfRateForOperation = (op: Operation): number => {
    const k = keyPos(op.vehicleId, op.asset.code);
    return Rules.rfRegressive(daysBetween(acquisitionDates.get(k), op.date));
  };

  // Ordena por data
  const sorted = [...ops].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const op of sorted) {
    const d = new Date(op.date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const ap = getMonth(op.vehicleId, y, m);
    ap.opsRef.push(op.id);

    switch (op.type) {
      case "posicao_inicial":
      case "compra": {
        const valueBrl = op.totalValue * (op.ptax ?? 1) + (op.costs ?? 0);
        updatePos(op, op.qty ?? 0, valueBrl);
        registerAcquisitionDate(op);
        break;
      }
      case "venda_swing": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos || pos.qty < (op.qty ?? 0)) break;
        const valueSell = op.totalValue * (op.ptax ?? 1) - (op.costs ?? 0);
        const allocCost = pos.meanCost * (op.qty ?? 0);
        const gain = valueSell - allocCost;

        const cls = op.asset.class;
        if (cls === "acao_br") {
          ap.volumeSwingShares += valueSell;
          ap.gainSwingShare += gain;
        } else if (cls === "etf_rv_br") {
          ap.gainSwingEtfRv += gain;
        } else if (cls === "fii" || cls === "fiagro") {
          ap.gainFii += gain;
        } else if (
          cls === "stock_exterior" ||
          cls === "etf_exterior_acumulacao" ||
          cls === "etf_exterior_distribuicao" ||
          cls === "reit_exterior"
        ) {
          const an = getAnnual(op.vehicleId, y);
          an.exteriorGainBrl += gain;
        }
        // Atualiza posição
        const newQty = pos.qty - (op.qty ?? 0);
        const newCost = pos.totalCostBrl - allocCost;
        pos.qty = newQty;
        pos.totalCostBrl = newCost;
        pos.meanCost = newQty > 0 ? newCost / newQty : 0;
        break;
      }
      case "venda_day": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos) break;
        const valueSell = op.totalValue * (op.ptax ?? 1) - (op.costs ?? 0);
        const allocCost = pos.meanCost * (op.qty ?? 0);
        const gain = valueSell - allocCost;
        ap.gainDay += gain;
        const newQty = pos.qty - (op.qty ?? 0);
        const newCost = pos.totalCostBrl - allocCost;
        pos.qty = newQty;
        pos.totalCostBrl = newCost;
        pos.meanCost = newQty > 0 ? newCost / newQty : 0;
        break;
      }
      case "dividendo":
      case "distribuicao_pj_propria": {
        const isExteriorDividend =
          op.type === "dividendo" &&
          (
            op.asset.class === "stock_exterior" ||
            op.asset.class === "etf_exterior_acumulacao" ||
            op.asset.class === "etf_exterior_distribuicao" ||
            op.asset.class === "reit_exterior"
          );

        if (isExteriorDividend) {
          const an = getAnnual(op.vehicleId, y);
          const grossBrl = op.totalValue * (op.ptax ?? 1);
          an.exteriorDividendBrl += grossBrl;
          an.foreignTaxPaidBrl += foreignTaxPaidBrl(op, grossBrl);
          break;
        }

        ap.dividends += op.totalValue;
        const opDate = new Date(op.date);
        if (opDate >= Rules.LEI_15270_START && op.payerCnpj) {
          const dk = keyDiv(op.payerCnpj, op.vehicleId, y, m);
          const acc = (dividendAcc.get(dk) ?? 0) + op.totalValue;
          dividendAcc.set(dk, acc);
          ap.irrf15270 = sumIrrfLei15270ForMonth(dividendAcc, op.vehicleId, y, m);
        }
        break;
      }
      case "jcp": {
        ap.jcpGross += op.totalValue;
        ap.jcpIrrf += op.totalValue * Rules.ALIQ_JCP;
        break;
      }
      case "rendimento_fii": {
        if (op.asset.meetsFiiIsencao) ap.rendFiiIsento += op.totalValue;
        else ap.rendFiiTributado += op.totalValue;
        break;
      }
      case "cupom_rf": {
        if (isRfIsentaAsset(op.asset)) {
          ap.rendRfIsento += op.totalValue;
        } else {
          const irrf = op.totalValue * rfRateForOperation(op);
          ap.rendRfTrib += op.totalValue;
          ap.rfIrrf += irrf;
        }
        break;
      }
      case "amortizacao": {
        if (!isFixedIncomeAsset(op.asset)) break;
        if (isRfIsentaAsset(op.asset)) {
          ap.rendRfIsento += op.totalValue;
        } else {
          const irrf = op.totalValue * rfRateForOperation(op);
          ap.rendRfTrib += op.totalValue;
          ap.rfIrrf += irrf;
        }
        break;
      }
      case "vencimento_rf": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos) break;
        const gain = op.totalValue - pos.totalCostBrl;
        if (gain > 0) {
          if (isRfIsentaAsset(op.asset)) {
            ap.rendRfIsento += gain;
          } else {
            const irrf = gain * rfRateForOperation(op);
            ap.rendRfTrib += gain;
            ap.rfIrrf += irrf;
          }
        }
        pos.qty = 0;
        pos.totalCostBrl = 0;
        pos.meanCost = 0;
        break;
      }
      case "pro_labore": {
        ap.proLabore += op.totalValue;
        break;
      }

      // === FUNDOS ABERTOS / FECHADOS ===
      case "aplicacao_fundo": {
        // Cria/atualiza posição como qtde=1, custo=valor
        const valueBrl = op.totalValue;
        updatePos(op, op.qty ?? 1, valueBrl);
        registerAcquisitionDate(op);
        break;
      }

      case "come_cotas": {
        // op.totalValue traz o RENDIMENTO ESTIMADO do período
        // op.withheldIrrf opcionalmente já trazia o IR retido
        const cls = op.asset.class;
        const aliq = aliquotaComeCotas(cls);
        const irRetido = op.totalValue * aliq;
        const isFechado = cls === "fidc" || cls === "fundo_exclusivo";
        if (isFechado) {
          ap.fundoFechadoComeCotasIr += irRetido;
        } else {
          ap.fundoAbertoComeCotasIr += irRetido;
        }
        break;
      }

      case "resgate_fundo": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos) break;
        const cls = op.asset.class;
        const valueResgate = op.totalValue;
        const ganho = Math.max(0, valueResgate - pos.totalCostBrl);
        // Calcula prazo em dias (default 365 se não tem data_compra rastreada)
        const dias = 365; // simplificação PoC
        const aliquota = aliquotaResgateFundo(cls, dias);
        const ir = ganho * aliquota;
        ap.fundoAbertoResgateIr += ir;
        // Zera posição
        pos.qty = 0;
        pos.totalCostBrl = 0;
        pos.meanCost = 0;
        break;
      }

      case "distribuicao_fip": {
        // FIP qualificado distribui — 15% retido na fonte
        const ir = op.totalValue * 0.15;
        ap.fipQualificadoIr += ir;
        break;
      }
    }
  }

  // Fecha apurações mensais (calcula IR por categoria)
  for (const ap of monthly.values()) {
    if (ap.volumeSwingShares <= Rules.ISENCAO_SWING_ACAO_MES) {
      ap.irSwingShare = 0;
    } else {
      ap.irSwingShare = Math.max(0, ap.gainSwingShare) * Rules.ALIQ_SWING_ACAO;
    }
    ap.irEtfRv = Math.max(0, ap.gainSwingEtfRv) * Rules.ALIQ_ETF_RV_SWING;
    ap.irDay = Math.max(0, ap.gainDay) * Rules.ALIQ_DAY;
    ap.irFiiGain = Math.max(0, ap.gainFii) * Rules.ALIQ_FII_GAIN;

    if (ap.proLabore > 0) {
      // Fórmula correta: base = bruto - simplificado; tabela sobre base; redutor Lei 15.270 sobre bruto
      // Ver docs/casos-teste-fiscais.md — corrigido de tabela-sobre-bruto sem redutor
      ap.irProgressive = Rules.irpfProLabore(ap.proLabore);
    }
    ap.totalDarf6015 = ap.irSwingShare + ap.irDay + ap.irEtfRv + ap.irFiiGain
                     + ap.fundoAbertoComeCotasIr + ap.fundoAbertoResgateIr
                     + ap.fundoFechadoComeCotasIr + ap.fipQualificadoIr;
  }

  // Garante apuração anual também para clientes sem eventos de exterior.
  // IRPFM depende da base mensal ampla, então pró-labore/dividendos precisam criar ano.
  for (const m of monthly.values()) {
    getAnnual(m.vehicleId, m.year);
  }

  // Fecha anuais — IRPFM
  for (const [k, ap] of annual.entries()) {
    let totalIncome = 0;
    let irPaid = 0;
    for (const m of monthly.values()) {
      if (m.vehicleId !== ap.vehicleId || m.year !== ap.year) continue;
      totalIncome += m.proLabore + m.dividends + m.jcpGross
        + m.rendFiiIsento + m.rendFiiTributado
        + m.rendRfIsento + m.rendRfTrib
        + Math.max(0, m.gainSwingShare) + Math.max(0, m.gainSwingEtfRv)
        + Math.max(0, m.gainFii) + Math.max(0, m.gainDay);
      irPaid += m.totalDarf6015 + m.irProgressive + m.jcpIrrf + m.irrf15270 + m.rfIrrf;
    }
    const exteriorGainTaxable = Math.max(0, ap.exteriorGainBrl);
    const exteriorDividendTaxable = Math.max(0, ap.exteriorDividendBrl);
    const exteriorTaxableIncome = exteriorGainTaxable + exteriorDividendTaxable;
    totalIncome += exteriorTaxableIncome;
    const exteriorGainIrGross = exteriorGainTaxable * Rules.ALIQ_LEI_14754;
    const exteriorDividendIrGross = exteriorDividendTaxable * Rules.ALIQ_LEI_14754;
    ap.exteriorIrGrossBrl = exteriorGainIrGross + exteriorDividendIrGross;
    ap.exteriorTaxCreditBrl = Math.min(ap.foreignTaxPaidBrl, exteriorDividendIrGross);
    ap.exteriorIrBrl = exteriorGainIrGross + Math.max(0, exteriorDividendIrGross - ap.exteriorTaxCreditBrl);
    irPaid += ap.exteriorIrBrl;
    ap.totalIncomeForIrpfm = totalIncome;
    ap.irPaidInYear = irPaid;
    const rate = Rules.irpfmRate(totalIncome);
    ap.irpfmGross = totalIncome * rate;
    ap.irpfmDue = Math.max(0, ap.irpfmGross - irPaid);
  }

  return { positions, monthly, annual, dividendAccumulator: dividendAcc };
}

// Computa oportunidades a partir dos resultados
export function findOpportunities(
  result: EngineResult,
  vehicleId: string,
  year: number
): Opportunity[] {
  const opps: Opportunity[] = [];

  // 1. Janela R$ 20k usada
  let maxSwingVol = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId === vehicleId && m.year === year) {
      maxSwingVol = Math.max(maxSwingVol, m.volumeSwingShares);
    }
  }
  if (maxSwingVol > 20000) {
    opps.push({
      id: "op_r20k",
      kind: "windowR20k",
      title: "Janela R$ 20k de isenção foi quebrada",
      description: `Pico de ${formatBRL(maxSwingVol)} em vendas swing num mês ultrapassou a janela. Revisar se havia alternativa operacional para escalonar vendas sem sair do perfil.`,
      severity: "warn",
    });
  } else if (maxSwingVol > 0) {
    opps.push({
      id: "op_r20k_room",
      kind: "windowR20k",
      title: "Janela R$ 20k preservada",
      description: `Pico mensal de ${formatBRL(maxSwingVol)} — sob o limite.`,
      severity: "info",
    });
  }

  // 2. Lei 15.270 disparada
  let irrf15270Total = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId === vehicleId && m.year === year) irrf15270Total += m.irrf15270;
  }
  if (irrf15270Total > 0) {
    opps.push({
      id: "op_15270",
      kind: "lei15270Transition",
      title: "IRRF de 10% (Lei 15.270) foi retido",
      description: `${formatBRL(irrf15270Total)} retidos por disparo do gatilho de R$ 50k/mês por fonte. Validar política de distribuição, caixa da PJ e efeitos de IRPFM antes de recomendar escalonamento.`,
      severity: "high",
    });
  }

  // 3. IRPFM
  const an = result.annual.get(keyAnnual(vehicleId, year));
  if (an) {
    if (an.irpfmDue > 0) {
      opps.push({
        id: "op_irpfm",
        kind: "irpfmRoom",
        title: `IRPFM devido: ${formatBRL(an.irpfmDue)}`,
        description: "Cliente está acima do gatilho de R$ 600k de renda anual. Validar redutor anti-bitributação, renda isenta, distribuição de PJ e momento de realização de ganhos.",
        severity: "high",
      });
    } else {
      const room = Rules.IRPFM_LOWER - an.totalIncomeForIrpfm;
      if (room > 0) {
        opps.push({
          id: "op_irpfm_room",
          kind: "irpfmRoom",
          title: "Folga confortável no IRPFM",
          description: `${formatBRL(room)} abaixo do gatilho de R$ 600k. Sem IRPFM aplicável.`,
          severity: "info",
        });
      }
    }

    // 4. Exterior
    const exteriorIncome = an.exteriorGainBrl + an.exteriorDividendBrl;
    if (exteriorIncome > 5000) {
      opps.push({
        id: "op_ucits",
        kind: "ucitsMigration",
        title: "Ganho relevante no exterior",
        description: `${formatBRL(exteriorIncome)} de ganhos e dividendos no exterior. Revisar retenção no país de origem, crédito de imposto pago no exterior e estrutura US ETF vs UCITS antes de recomendar troca.`,
        severity: "info",
      });
    }
  }

  return opps;
}

// Helper de formatação
export function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatPercent(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(v);
}

// Computa eventos fiscais (calendário)
export function listFiscalEvents(
  result: EngineResult,
  vehicleId: string,
  year: number
): FiscalEvent[] {
  const events: FiscalEvent[] = [];
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    const lastDay = new Date(Date.UTC(m.year, m.month, 0)).toISOString().slice(0, 10);
    if (m.totalDarf6015 > 0) {
      events.push({
        id: `darf-${m.year}-${m.month}`,
        date: lastDay,
        kind: "darf",
        description: `DARF 6015 — ${monthName(m.month)}/${m.year}`,
        amount: m.totalDarf6015,
      });
    }
    if (m.irrf15270 > 0) {
      events.push({
        id: `trig-${m.year}-${m.month}`,
        date: `${m.year}-${String(m.month).padStart(2, "0")}-15`,
        kind: "trigger",
        description: `Gatilho Lei 15.270 — ${monthName(m.month)}/${m.year}`,
        amount: m.irrf15270,
      });
    }
  }
  events.sort((a, b) => (a.date < b.date ? -1 : 1));
  return events;
}

function monthName(m: number): string {
  const names = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
  return names[m - 1];
}

// Helper para construir resumo agregado por classe
export interface AllocationItem {
  classLabel: string;
  totalBrl: number;
  pct: number;
}

export function computeAllocation(
  result: EngineResult,
  vehicleId: string
): AllocationItem[] {
  const buckets = new Map<string, number>();
  for (const [key, pos] of result.positions.entries()) {
    if (!key.startsWith(vehicleId + "::")) continue;
    if (pos.qty <= 0) continue;
    const label = classLabel(pos.asset);
    const apprec = APPRECIATION[pos.asset.class] ?? 0.05;
    const currentValue = pos.totalCostBrl * (1 + apprec);
    buckets.set(label, (buckets.get(label) ?? 0) + currentValue);
  }
  const total = [...buckets.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  return [...buckets.entries()]
    .map(([k, v]) => ({ classLabel: k, totalBrl: v, pct: (v / total) }))
    .sort((a, b) => b.totalBrl - a.totalBrl);
}

// Apreciação simulada por classe (em produção viria de cotações)
const APPRECIATION: Record<string, number> = {
  acao_br: 0.12,
  etf_rv_br: 0.10,
  etf_rf_br: 0.06,
  fii: 0.04,
  fiagro: 0.05,
  tesouro_selic: 0.06,
  tesouro_pre: 0.05,
  tesouro_ipca: 0.07,
  cdb: 0.06,
  debenture: 0.07,
  lci: 0.07,
  lca: 0.07,
  lig: 0.07,
  cri: 0.075,
  cra: 0.075,
  debenture_incentivada: 0.08,
  stock_exterior: 0.15,
  etf_exterior_acumulacao: 0.13,
  etf_exterior_distribuicao: 0.10,
  reit_exterior: 0.08,
  fundo_multimercado_lp: 0.09,
  fundo_rf_lp: 0.07,
  fundo_rf_cp: 0.06,
  fia_aberto: 0.11,
  fidc: 0.08,
  fip_qualificado: 0.18,
  fundo_exclusivo: 0.09,
};

export interface DetailedPosition {
  asset: Asset;
  qty: number;
  meanCost: number;
  currentValue: number;
  costTotal: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  classLabel: string;
  potentialTaxIfSold: number;
}

export function getDetailedPositions(result: EngineResult, vehicleId: string): DetailedPosition[] {
  const out: DetailedPosition[] = [];
  for (const [key, pos] of result.positions.entries()) {
    if (pos.qty <= 0) continue;
    if (!key.startsWith(vehicleId + "::")) continue;
    const apprec = APPRECIATION[pos.asset.class] ?? 0.05;
    const currentValue = pos.totalCostBrl * (1 + apprec);
    const gain = currentValue - pos.totalCostBrl;
    const cls = classLabel(pos.asset);
    // Estimativa de IR latente se realizar agora
    let taxRate = 0.15;
    if (pos.asset.class === "fii" || pos.asset.class === "fiagro") taxRate = 0.20;
    if (isRfIsentaAsset(pos.asset)) taxRate = 0;
    const potentialTax = Math.max(0, gain) * taxRate;
    out.push({
      asset: pos.asset,
      qty: pos.qty,
      meanCost: pos.meanCost,
      currentValue,
      costTotal: pos.totalCostBrl,
      unrealizedGain: gain,
      unrealizedGainPct: gain / pos.totalCostBrl,
      classLabel: cls,
      potentialTaxIfSold: potentialTax,
    });
  }
  // ordena por classe, depois por valor
  return out.sort((a, b) => {
    if (a.classLabel !== b.classLabel) return a.classLabel.localeCompare(b.classLabel);
    return b.currentValue - a.currentValue;
  });
}

function classLabel(asset: Asset): string {
  switch (asset.class) {
    case "acao_br": return "Ações BR";
    case "etf_rv_br": return "ETF RV BR";
    case "etf_rf_br": return "ETF RF BR";
    case "fii": case "fiagro": return "FII / Fiagro";
    case "tesouro_selic": case "tesouro_pre": case "tesouro_ipca":
    case "cdb": case "debenture": return "Renda Fixa Trib.";
    case "lci": case "lca": case "lig": case "cri": case "cra": case "debenture_incentivada":
      return "Renda Fixa Isenta";
    case "stock_exterior":
    case "etf_exterior_acumulacao":
    case "etf_exterior_distribuicao":
    case "reit_exterior":
      return "Exterior";
    case "fundo_multimercado_lp":
    case "fundo_rf_lp":
    case "fundo_rf_cp":
      return "Fundos Abertos";
    case "fia_aberto":
      return "Fundos de Acoes";
    case "fidc":
    case "fundo_exclusivo":
      return "Fundos Fechados";
    case "fip_qualificado":
      return "FIP Qualificado";
    default: return "Outros";
  }
}
