// TaxFlow Advisor — Tax Engine Types (porta do PoC Python)

export type AssetClass =
  | "acao_br"
  | "etf_rv_br"
  | "etf_rf_br"
  | "fii"
  | "fiagro"
  | "tesouro_selic"
  | "tesouro_pre"
  | "tesouro_ipca"
  | "cdb"
  | "debenture"
  | "lci"
  | "lca"
  | "lig"
  | "cri"
  | "cra"
  | "debenture_incentivada"
  | "stock_exterior"
  | "etf_exterior_acumulacao"
  | "etf_exterior_distribuicao"
  | "reit_exterior"
  | "fundo_multimercado_lp"
  | "fundo_rf_lp"
  | "fundo_rf_cp"
  | "fia_aberto"
  | "fidc"
  | "fip_qualificado"
  | "fundo_exclusivo";

export type OperationType =
  | "posicao_inicial"
  | "compra"
  | "venda_swing"
  | "venda_day"
  | "dividendo"
  | "jcp"
  | "rendimento_fii"
  | "cupom_rf"
  | "vencimento_rf"
  | "pro_labore"
  | "distribuicao_pj_propria"
  | "amortizacao"
  | "aplicacao_fundo"
  | "resgate_fundo"
  | "come_cotas"
  | "distribuicao_fip";

export type VehicleType =
  | "PF"
  | "PJ_LR"
  | "PJ_LP"
  | "PJ_SIMPLES"
  | "HOLDING"
  | "OFFSHORE_OPACA"
  | "OFFSHORE_TRANSPARENTE"
  | "TRUST";

export interface Asset {
  code: string;
  name: string;
  class: AssetClass;
  currency: string; // "BRL" | "USD" | ...
  meetsFiiIsencao?: boolean;
  isLei12431?: boolean;
  couponFrequency?: "mensal" | "trimestral" | "semestral" | "anual" | "vencimento" | "sob_demanda";
  policy?: "acumulacao" | "distribuicao";
  origin?: string; // país de origem
}

export interface Vehicle {
  id: string;
  clientId: string;
  type: VehicleType;
  country: string;
}

export interface Client {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  residency: string;
  vehicles: Vehicle[];
  investorProfile?: "conservador" | "moderado" | "dinamico" | "sofisticado";
  avatar?: string;
  occupation?: string;
  bio?: string;
  objective?: string;
}

export interface Operation {
  id: string;
  vehicleId: string;
  asset: Asset;
  type: OperationType;
  date: string; // ISO yyyy-mm-dd
  qty?: number;
  unitPrice?: number;
  totalValue: number;
  costs?: number;
  ptax?: number; // taxa de câmbio (1 para BRL)
  withheldIrrf?: number; // IR retido/pago na moeda original do ativo quando aplicável
  payerCnpj?: string;
  note?: string;
}

export interface Position {
  asset: Asset;
  qty: number;
  totalCostBrl: number;
  meanCost: number;
}

export interface MonthlyApuracao {
  vehicleId: string;
  year: number;
  month: number;
  volumeSwingShares: number;
  gainSwingShare: number;
  gainSwingEtfRv: number;
  gainFii: number;
  gainDay: number;
  rendFiiIsento: number;
  rendFiiTributado: number;
  rendRfTrib: number;
  rendRfIsento: number;
  rfIrrf: number;
  dividends: number;
  jcpGross: number;
  jcpIrrf: number;
  proLabore: number;
  irrf15270: number;
  irSwingShare: number;
  irDay: number;
  irEtfRv: number;
  irFiiGain: number;
  irProgressive: number;
  // Fundos abertos / fechados
  fundoAbertoComeCotasIr: number;
  fundoAbertoResgateIr: number;
  fundoFechadoComeCotasIr: number;
  fipQualificadoIr: number;
  totalDarf6015: number;
  opsRef: string[];
}

export interface FundLot {
  asset: Asset;
  vehicleId: string;
  dataAplicacao: string;
  valorAplicado: number;
  rendimentoAcumuladoNoPeriodo: number;
  irRetidoComeCotasAcumulado: number;
}

export interface AnnualApuracao {
  vehicleId: string;
  year: number;
  totalIncomeForIrpfm: number;
  irPaidInYear: number;
  irpfmGross: number;
  irpfmDue: number;
  exteriorGainBrl: number;
  exteriorDividendBrl: number;
  foreignTaxPaidBrl: number;
  exteriorIrGrossBrl: number;
  exteriorTaxCreditBrl: number;
  exteriorIrBrl: number;
}

export interface Opportunity {
  id: string;
  kind: "windowR20k" | "lei15270Transition" | "ucitsMigration" | "taxLossHarvest" | "irpfmRoom";
  title: string;
  description: string;
  estimatedSavingBrl?: number;
  severity: "info" | "warn" | "high";
}

export interface FiscalEvent {
  id: string;
  date: string;
  kind: "darf" | "comeCotas" | "venc" | "dividend" | "trigger";
  description: string;
  amount?: number;
  clientId?: string;
}
