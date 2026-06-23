import { getOperationsForClient } from "@/lib/data/mock-clients";
import { getAssetByCode } from "@/lib/data/asset-catalog";
import type { Operation } from "@/lib/tax-engine/types";

export type PortfolioTemplateId = "joao" | "marina" | "roberto" | "global" | "fundos";

export interface PortfolioTemplate {
  id: PortfolioTemplateId;
  title: string;
  subtitle: string;
  description: string;
  sourceClientId: string;
  customFactory?: true;
}

export const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = [
  {
    id: "joao",
    title: "Carteira balanceada",
    subtitle: "PF com renda, FIIs, RF, fundos e exterior",
    description: "Boa para demonstrar visão geral, rebalanceamento e Lei 15.270 pontual.",
    sourceClientId: "cli_joao",
  },
  {
    id: "marina",
    title: "Alta renda",
    subtitle: "Renda alta, dividendos mensais e IRPFM",
    description: "Mostra gatilhos críticos: Lei 15.270 recorrente, IRPFM e exterior.",
    sourceClientId: "cli_marina",
  },
  {
    id: "roberto",
    title: "Conservadora",
    subtitle: "RF, FII, debênture incentivada e UCITS",
    description: "Boa para cliente em dia, com carteira defensiva e baixa fricção fiscal.",
    sourceClientId: "cli_roberto",
  },
  {
    id: "global",
    title: "Internacional diversificada",
    subtitle: "Ações BR, FIIs, RF isenta, stocks, ETF e REIT",
    description: "Mostra dividendos no Brasil, exterior Lei 14.754, REIT e risco de câmbio.",
    sourceClientId: "",
    customFactory: true,
  },
  {
    id: "fundos",
    title: "Fundos e crédito privado",
    subtitle: "Multimercado, FIA, FIDC, FIP e fundo exclusivo",
    description: "Boa para demonstrar come-cotas, fundos fechados e classes com revisão tributária.",
    sourceClientId: "",
    customFactory: true,
  },
];

export function buildPortfolioTemplateOperations(
  templateId: PortfolioTemplateId,
  clientId: string,
  vehicleId: string,
): Operation[] {
  const template = PORTFOLIO_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return [];
  if (template.customFactory) return buildCustomTemplate(templateId, clientId, vehicleId);

  return getOperationsForClient(template.sourceClientId).map((operation) => ({
    ...operation,
    id: `template_${templateId}_${clientId}_${operation.id}`,
    vehicleId,
    note: `Carteira modelo: ${template.title}`,
  }));
}

function buildCustomTemplate(
  templateId: PortfolioTemplateId,
  clientId: string,
  vehicleId: string,
): Operation[] {
  if (templateId === "global") return buildGlobalTemplate(clientId, vehicleId);
  if (templateId === "fundos") return buildFundsTemplate(clientId, vehicleId);
  return [];
}

function asset(code: string) {
  const found = getAssetByCode(code);
  if (!found) throw new Error(`Asset not found in catalog: ${code}`);
  return found;
}

function op(
  clientId: string,
  vehicleId: string,
  suffix: string,
  data: Omit<Operation, "id" | "vehicleId">,
): Operation {
  return {
    ...data,
    id: `template_custom_${clientId}_${suffix}`,
    vehicleId,
  };
}

function buildGlobalTemplate(clientId: string, vehicleId: string): Operation[] {
  return [
    op(clientId, vehicleId, "g_001", { asset: asset("PETR4"), type: "compra", date: "2026-01-10", qty: 1200, unitPrice: 28, totalValue: 33600, costs: 18 }),
    op(clientId, vehicleId, "g_002", { asset: asset("BBSE3"), type: "compra", date: "2026-01-10", qty: 900, unitPrice: 36, totalValue: 32400, costs: 16 }),
    op(clientId, vehicleId, "g_003", { asset: asset("TAEE11"), type: "compra", date: "2026-01-11", qty: 700, unitPrice: 34, totalValue: 23800, costs: 12 }),
    op(clientId, vehicleId, "g_004", { asset: asset("BOVA11"), type: "compra", date: "2026-01-12", qty: 500, unitPrice: 125, totalValue: 62500, costs: 30 }),
    op(clientId, vehicleId, "g_005", { asset: asset("KNRI11"), type: "compra", date: "2026-01-12", qty: 1800, unitPrice: 160, totalValue: 288000, costs: 140 }),
    op(clientId, vehicleId, "g_006", { asset: asset("HGLG11"), type: "compra", date: "2026-01-13", qty: 900, unitPrice: 165, totalValue: 148500, costs: 75 }),
    op(clientId, vehicleId, "g_007", { asset: asset("RURA11"), type: "compra", date: "2026-01-13", qty: 1200, unitPrice: 10, totalValue: 12000, costs: 8 }),
    op(clientId, vehicleId, "g_008", { asset: asset("LFT2029"), type: "compra", date: "2026-01-15", qty: 600, unitPrice: 1000, totalValue: 600000 }),
    op(clientId, vehicleId, "g_009", { asset: asset("LCI_ITAU"), type: "compra", date: "2026-01-15", qty: 1, totalValue: 450000 }),
    op(clientId, vehicleId, "g_010", { asset: asset("DEB_RAIL"), type: "compra", date: "2026-01-20", qty: 350, unitPrice: 1000, totalValue: 350000 }),
    op(clientId, vehicleId, "g_011", { asset: asset("CRI_LOG"), type: "compra", date: "2026-01-21", qty: 200, unitPrice: 1000, totalValue: 200000 }),
    op(clientId, vehicleId, "g_012", { asset: asset("CRA_AGRO"), type: "compra", date: "2026-01-21", qty: 150, unitPrice: 1000, totalValue: 150000 }),
    op(clientId, vehicleId, "g_013", { asset: asset("DEB_VALE"), type: "compra", date: "2026-01-22", qty: 100, unitPrice: 1000, totalValue: 100000 }),
    op(clientId, vehicleId, "g_014", { asset: asset("VOO"), type: "compra", date: "2026-02-02", qty: 450, unitPrice: 455, totalValue: 204750, ptax: 5.12 }),
    op(clientId, vehicleId, "g_015", { asset: asset("SCHD"), type: "compra", date: "2026-02-02", qty: 600, unitPrice: 78, totalValue: 46800, ptax: 5.12 }),
    op(clientId, vehicleId, "g_016", { asset: asset("MSFT"), type: "compra", date: "2026-02-05", qty: 160, unitPrice: 415, totalValue: 66400, ptax: 5.15 }),
    op(clientId, vehicleId, "g_017", { asset: asset("VNQ"), type: "compra", date: "2026-02-05", qty: 250, unitPrice: 86, totalValue: 21500, ptax: 5.15 }),
    op(clientId, vehicleId, "g_div_petr", { asset: asset("PETR4"), type: "dividendo", date: "2026-03-28", totalValue: 1800, payerCnpj: "33.000.167/0001-01" }),
    op(clientId, vehicleId, "g_jcp_itsa", { asset: asset("TAEE11"), type: "jcp", date: "2026-04-20", totalValue: 1200, payerCnpj: "07.859.971/0001-30" }),
    op(clientId, vehicleId, "g_fii_knri_1", { asset: asset("KNRI11"), type: "rendimento_fii", date: "2026-04-15", totalValue: 2160 }),
    op(clientId, vehicleId, "g_fii_hglg_1", { asset: asset("HGLG11"), type: "rendimento_fii", date: "2026-04-15", totalValue: 900 }),
    op(clientId, vehicleId, "g_cup_deb", { asset: asset("DEB_RAIL"), type: "cupom_rf", date: "2026-06-15", totalValue: 10500 }),
    op(clientId, vehicleId, "g_cup_cri", { asset: asset("CRI_LOG"), type: "cupom_rf", date: "2026-06-20", totalValue: 7200 }),
    op(clientId, vehicleId, "g_cup_cra", { asset: asset("CRA_AGRO"), type: "cupom_rf", date: "2026-07-20", totalValue: 5400 }),
    op(clientId, vehicleId, "g_cup_deb_comum", { asset: asset("DEB_VALE"), type: "cupom_rf", date: "2026-08-20", totalValue: 3500 }),
    op(clientId, vehicleId, "g_div_schd", { asset: asset("SCHD"), type: "dividendo", date: "2026-06-28", totalValue: 850, ptax: 5.22, payerCnpj: "SCHD_US" }),
    op(clientId, vehicleId, "g_div_vnq", { asset: asset("VNQ"), type: "dividendo", date: "2026-06-28", totalValue: 620, ptax: 5.22, payerCnpj: "VNQ_US" }),
  ];
}

function buildFundsTemplate(clientId: string, vehicleId: string): Operation[] {
  return [
    op(clientId, vehicleId, "f_001", { asset: asset("ITAU_MULTI"), type: "aplicacao_fundo", date: "2026-01-12", qty: 1, totalValue: 500000 }),
    op(clientId, vehicleId, "f_002", { asset: asset("XP_MACRO"), type: "aplicacao_fundo", date: "2026-01-20", qty: 1, totalValue: 450000 }),
    op(clientId, vehicleId, "f_003", { asset: asset("RF_LP"), type: "aplicacao_fundo", date: "2026-01-22", qty: 1, totalValue: 700000 }),
    op(clientId, vehicleId, "f_004", { asset: asset("BB_FIA"), type: "aplicacao_fundo", date: "2026-02-10", qty: 1, totalValue: 300000 }),
    op(clientId, vehicleId, "f_005", { asset: asset("FIDC_SUP"), type: "aplicacao_fundo", date: "2026-03-05", qty: 1, totalValue: 400000 }),
    op(clientId, vehicleId, "f_006", { asset: asset("FIP_INO"), type: "aplicacao_fundo", date: "2026-03-20", qty: 1, totalValue: 250000 }),
    op(clientId, vehicleId, "f_007", { asset: asset("FEXCL"), type: "aplicacao_fundo", date: "2026-04-01", qty: 1, totalValue: 600000 }),
    op(clientId, vehicleId, "f_cc_mai_multi", { asset: asset("ITAU_MULTI"), type: "come_cotas", date: "2026-05-29", totalValue: 18000 }),
    op(clientId, vehicleId, "f_cc_mai_xp", { asset: asset("XP_MACRO"), type: "come_cotas", date: "2026-05-29", totalValue: 14500 }),
    op(clientId, vehicleId, "f_cc_mai_rf", { asset: asset("RF_LP"), type: "come_cotas", date: "2026-05-29", totalValue: 21000 }),
    op(clientId, vehicleId, "f_cc_mai_fidc", { asset: asset("FIDC_SUP"), type: "come_cotas", date: "2026-05-29", totalValue: 12500 }),
    op(clientId, vehicleId, "f_cc_mai_excl", { asset: asset("FEXCL"), type: "come_cotas", date: "2026-05-29", totalValue: 24000 }),
    op(clientId, vehicleId, "f_fip_dist", { asset: asset("FIP_INO"), type: "distribuicao_fip", date: "2026-08-15", totalValue: 35000 }),
    op(clientId, vehicleId, "f_resgate_multi", { asset: asset("ITAU_MULTI"), type: "resgate_fundo", date: "2026-12-15", totalValue: 560000 }),
  ];
}
