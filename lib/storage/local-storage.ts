// Camada de persistencia em localStorage (pre-DB)
// Em producao real, vira chamadas para API backend + DB Postgres

import { getAssetByCode } from "@/lib/data/asset-catalog";
import type { Client, Operation, Vehicle } from "../tax-engine/types";

const KEY_CUSTOM_CLIENTS = "taxflow:custom_clients";
const KEY_CUSTOM_OPERATIONS = "taxflow:custom_operations";
const KEY_CUSTOM_VEHICLES = "taxflow:custom_vehicles_by_client";
const KEY_MONTHLY_INPUTS = "taxflow:monthly_inputs";
const KEY_MONTHLY_INPUT_SETTINGS = "taxflow:monthly_input_settings";
const KEY_CLIENT_INSIGHTS = "taxflow:client_insights";
const KEY_HIDDEN_ENGINE_SIGNALS = "taxflow:hidden_engine_signals";
const KEY_ENGINE_SIGNAL_OVERRIDES = "taxflow:engine_signal_overrides";
const KEY_REPORT_DRAFTS = "taxflow:report_drafts";
const KEY_MANUAL_REBALANCE_PLANS = "taxflow:manual_rebalance_plans";

function notifyDataChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("taxflow:data-changed"));
}

// ============================================================================
// CLIENTES
// ============================================================================

export function getCustomClients(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_CLIENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomClient(client: Client): void {
  if (typeof window === "undefined") return;
  const all = getCustomClients();
  const idx = all.findIndex((c) => c.id === client.id);
  if (idx >= 0) all[idx] = client;
  else all.push(client);
  localStorage.setItem(KEY_CUSTOM_CLIENTS, JSON.stringify(all));
  notifyDataChanged();
}

export function deleteCustomClient(clientId: string): void {
  if (typeof window === "undefined") return;
  const all = getCustomClients().filter((c) => c.id !== clientId);
  localStorage.setItem(KEY_CUSTOM_CLIENTS, JSON.stringify(all));
  // Limpa operacoes e veiculos relacionados
  const ops = getAllCustomOperations();
  delete ops[clientId];
  localStorage.setItem(KEY_CUSTOM_OPERATIONS, JSON.stringify(ops));
  const veh = getAllCustomVehicles();
  delete veh[clientId];
  localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(veh));
  notifyDataChanged();
}

// ============================================================================
// VEICULOS POR CLIENTE
// ============================================================================

type VehiclesByClient = Record<string, Vehicle[]>;

function getAllCustomVehicles(): VehiclesByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_VEHICLES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomVehicles(clientId: string): Vehicle[] {
  return getAllCustomVehicles()[clientId] ?? [];
}

export function addCustomVehicle(clientId: string, vehicle: Vehicle): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomVehicles();
  if (!all[clientId]) all[clientId] = [];
  all[clientId].push(vehicle);
  localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(all));
  notifyDataChanged();
}

export function deleteCustomVehicle(clientId: string, vehicleId: string): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomVehicles();
  if (all[clientId]) {
    all[clientId] = all[clientId].filter((v) => v.id !== vehicleId);
    localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(all));
    notifyDataChanged();
  }
}

// ============================================================================
// OPERACOES POR CLIENTE
// ============================================================================

type OperationsByClient = Record<string, Operation[]>;

function getAllCustomOperations(): OperationsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_OPERATIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomOperations(clientId: string): Operation[] {
  return getAllCustomOperations()[clientId] ?? [];
}

export function saveCustomOperations(clientId: string, ops: Operation[]): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomOperations();
  all[clientId] = ops;
  localStorage.setItem(KEY_CUSTOM_OPERATIONS, JSON.stringify(all));
  notifyDataChanged();
}

// ============================================================================
// INPUTS MENSAIS (grade)
// ============================================================================

export interface MonthlyInput {
  proLabore: number;
  dividendoPjPropria: number;
  dividendoAcoesBr: number;
  jcpAcoesBr: number;
  rendimentoFii: number;
  cupomRfTributado: number;
  cupomRfIsento: number;
  dividendoExterior: number;
  outrosRendimentos: number;
}

export type MonthlyInputs = Record<number, MonthlyInput>; // chave = mes 1-12

export interface MonthlyInputSettings {
  dividendoAcoesBrAssetCode: string;
  jcpAcoesBrAssetCode: string;
  rendimentoFiiAssetCode: string;
  cupomRfTributadoAssetCode: string;
  cupomRfIsentoAssetCode: string;
  dividendoExteriorAssetCode: string;
  exteriorPtax: number;
}

export const DEFAULT_MONTHLY_INPUT_SETTINGS: MonthlyInputSettings = {
  dividendoAcoesBrAssetCode: "PETR4",
  jcpAcoesBrAssetCode: "ITSA4",
  rendimentoFiiAssetCode: "KNRI11",
  cupomRfTributadoAssetCode: "DEB_VALE",
  cupomRfIsentoAssetCode: "DEB_ELET",
  dividendoExteriorAssetCode: "VOO",
  exteriorPtax: 5.2,
};

type MonthlyInputsByClient = Record<string, MonthlyInputs>;
type MonthlyInputSettingsByClient = Record<string, MonthlyInputSettings>;

function getAllMonthlyInputs(): MonthlyInputsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_MONTHLY_INPUTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMonthlyInputs(clientId: string): MonthlyInputs {
  return getAllMonthlyInputs()[clientId] ?? {};
}

export function saveMonthlyInputs(clientId: string, inputs: MonthlyInputs): void {
  if (typeof window === "undefined") return;
  const all = getAllMonthlyInputs();
  all[clientId] = inputs;
  localStorage.setItem(KEY_MONTHLY_INPUTS, JSON.stringify(all));
  notifyDataChanged();
}

function getAllMonthlyInputSettings(): MonthlyInputSettingsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_MONTHLY_INPUT_SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMonthlyInputSettings(clientId: string): MonthlyInputSettings {
  return {
    ...DEFAULT_MONTHLY_INPUT_SETTINGS,
    ...(getAllMonthlyInputSettings()[clientId] ?? {}),
  };
}

export function saveMonthlyInputSettings(clientId: string, settings: MonthlyInputSettings): void {
  if (typeof window === "undefined") return;
  const all = getAllMonthlyInputSettings();
  all[clientId] = settings;
  localStorage.setItem(KEY_MONTHLY_INPUT_SETTINGS, JSON.stringify(all));
  notifyDataChanged();
}

// ============================================================================
// INSIGHTS / DIAGNOSTICO HUMANO
// ============================================================================

export interface ClientInsight {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warn" | "high";
  status: "active" | "done";
  estimatedImpactBrl?: number;
  createdAt: string;
}

type InsightsByClient = Record<string, ClientInsight[]>;

function getAllClientInsights(): InsightsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CLIENT_INSIGHTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getClientInsights(clientId: string): ClientInsight[] {
  return getAllClientInsights()[clientId] ?? [];
}

export function saveClientInsights(clientId: string, insights: ClientInsight[]): void {
  if (typeof window === "undefined") return;
  const all = getAllClientInsights();
  all[clientId] = insights;
  localStorage.setItem(KEY_CLIENT_INSIGHTS, JSON.stringify(all));
  notifyDataChanged();
}

export function generateInsightId(): string {
  return `ins_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================================
// SINAIS AUTOMATICOS OCULTOS / RELATORIO EDITAVEL
// ============================================================================

type HiddenSignalsByClient = Record<string, string[]>;

export interface EngineSignalOverride {
  id: string;
  title: string;
  description: string;
  estimatedImpactBrl?: number;
  updatedAt: string;
}

type EngineSignalOverridesByClient = Record<string, Record<string, EngineSignalOverride>>;

function getAllHiddenEngineSignals(): HiddenSignalsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_HIDDEN_ENGINE_SIGNALS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getHiddenEngineSignals(clientId: string): string[] {
  return getAllHiddenEngineSignals()[clientId] ?? [];
}

export function saveHiddenEngineSignals(clientId: string, signalIds: string[]): void {
  if (typeof window === "undefined") return;
  const all = getAllHiddenEngineSignals();
  all[clientId] = [...new Set(signalIds)];
  localStorage.setItem(KEY_HIDDEN_ENGINE_SIGNALS, JSON.stringify(all));
  notifyDataChanged();
}

function getAllEngineSignalOverrides(): EngineSignalOverridesByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_ENGINE_SIGNAL_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getEngineSignalOverrides(clientId: string): Record<string, EngineSignalOverride> {
  return getAllEngineSignalOverrides()[clientId] ?? {};
}

export function saveEngineSignalOverride(clientId: string, override: EngineSignalOverride): void {
  if (typeof window === "undefined") return;
  const all = getAllEngineSignalOverrides();
  all[clientId] = {
    ...(all[clientId] ?? {}),
    [override.id]: override,
  };
  localStorage.setItem(KEY_ENGINE_SIGNAL_OVERRIDES, JSON.stringify(all));
  notifyDataChanged();
}

export function deleteEngineSignalOverride(clientId: string, signalId: string): void {
  if (typeof window === "undefined") return;
  const all = getAllEngineSignalOverrides();
  if (!all[clientId]) return;
  delete all[clientId][signalId];
  localStorage.setItem(KEY_ENGINE_SIGNAL_OVERRIDES, JSON.stringify(all));
  notifyDataChanged();
}

export interface ClientReportDraft {
  finalSummary: string;
  validatedSaving5y?: number;
  updatedAt: string;
}

type ReportDraftsByClient = Record<string, ClientReportDraft>;

function getAllReportDrafts(): ReportDraftsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_REPORT_DRAFTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getClientReportDraft(clientId: string): ClientReportDraft | null {
  return getAllReportDrafts()[clientId] ?? null;
}

export function saveClientReportDraft(clientId: string, draft: ClientReportDraft): void {
  if (typeof window === "undefined") return;
  const all = getAllReportDrafts();
  all[clientId] = draft;
  localStorage.setItem(KEY_REPORT_DRAFTS, JSON.stringify(all));
  notifyDataChanged();
}

// ============================================================================
// REBALANCEAMENTO MANUAL
// ============================================================================

export interface ManualRebalancePlan {
  targets: Record<string, number>;
  updatedAt: string;
}

type ManualRebalancePlansByClient = Record<string, ManualRebalancePlan>;

function getAllManualRebalancePlans(): ManualRebalancePlansByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_MANUAL_REBALANCE_PLANS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getManualRebalancePlan(clientId: string): ManualRebalancePlan | null {
  return getAllManualRebalancePlans()[clientId] ?? null;
}

export function saveManualRebalancePlan(clientId: string, targets: Record<string, number>): void {
  if (typeof window === "undefined") return;
  const all = getAllManualRebalancePlans();
  all[clientId] = {
    targets,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY_MANUAL_REBALANCE_PLANS, JSON.stringify(all));
  notifyDataChanged();
}

export function deleteManualRebalancePlan(clientId: string): void {
  if (typeof window === "undefined") return;
  const all = getAllManualRebalancePlans();
  delete all[clientId];
  localStorage.setItem(KEY_MANUAL_REBALANCE_PLANS, JSON.stringify(all));
  notifyDataChanged();
}

// ============================================================================
// UTILITARIOS
// ============================================================================

export function generateClientId(): string {
  return `cli_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function generateVehicleId(clientId: string): string {
  return `vec_${clientId.slice(4)}_${Date.now().toString(36)}`;
}

const FALLBACK_PL = {
  code: "PRO_LABORE",
  name: "Pro-labore",
  class: "acao_br" as const,
  currency: "BRL",
};

const FALLBACK_DIST = {
  code: "DIST_PJ",
  name: "Distribuicao PJ propria",
  class: "acao_br" as const,
  currency: "BRL",
};

function safeAsset(code: string, fallback = FALLBACK_PL) {
  return getAssetByCode(code) ?? fallback;
}

// Converte inputs mensais em operacoes que o engine processa
export function inputsToOperations(
  clientId: string,
  vehicleId: string,
  inputs: MonthlyInputs,
  year: number,
  cnpjPjPropria?: string,
  settings: MonthlyInputSettings = DEFAULT_MONTHLY_INPUT_SETTINGS,
): Operation[] {
  const ops: Operation[] = [];

  for (let m = 1; m <= 12; m++) {
    const input = inputs[m];
    if (!input) continue;
    const date = `${year}-${String(m).padStart(2, "0")}-05`;
    if (input.proLabore > 0) {
      ops.push({
        id: `custom_pl_${clientId}_${m}`,
        vehicleId,
        asset: FALLBACK_PL,
        type: "pro_labore",
        date,
        totalValue: input.proLabore,
        payerCnpj: cnpjPjPropria,
      });
    }
    if (input.dividendoPjPropria > 0) {
      ops.push({
        id: `custom_dist_${clientId}_${m}`,
        vehicleId,
        asset: FALLBACK_DIST,
        type: "distribuicao_pj_propria",
        date: `${year}-${String(m).padStart(2, "0")}-25`,
        totalValue: input.dividendoPjPropria,
        payerCnpj: cnpjPjPropria,
      });
    }
    if ((input.dividendoAcoesBr ?? 0) > 0) {
      const asset = safeAsset(settings.dividendoAcoesBrAssetCode);
      ops.push({
        id: `custom_divbr_${clientId}_${m}`,
        vehicleId,
        asset,
        type: "dividendo",
        date: `${year}-${String(m).padStart(2, "0")}-28`,
        totalValue: input.dividendoAcoesBr,
        payerCnpj: `CUSTOM-${asset.code}`,
      });
    }
    if ((input.jcpAcoesBr ?? 0) > 0) {
      const asset = safeAsset(settings.jcpAcoesBrAssetCode);
      ops.push({
        id: `custom_jcp_${clientId}_${m}`,
        vehicleId,
        asset,
        type: "jcp",
        date: `${year}-${String(m).padStart(2, "0")}-28`,
        totalValue: input.jcpAcoesBr,
        payerCnpj: `CUSTOM-${asset.code}`,
      });
    }
    if ((input.rendimentoFii ?? 0) > 0) {
      ops.push({
        id: `custom_fii_${clientId}_${m}`,
        vehicleId,
        asset: safeAsset(settings.rendimentoFiiAssetCode),
        type: "rendimento_fii",
        date: `${year}-${String(m).padStart(2, "0")}-15`,
        totalValue: input.rendimentoFii,
      });
    }
    if ((input.cupomRfTributado ?? 0) > 0) {
      ops.push({
        id: `custom_cupom_rf_trib_${clientId}_${m}`,
        vehicleId,
        asset: safeAsset(settings.cupomRfTributadoAssetCode),
        type: "cupom_rf",
        date: `${year}-${String(m).padStart(2, "0")}-15`,
        totalValue: input.cupomRfTributado,
      });
    }
    if ((input.cupomRfIsento ?? 0) > 0) {
      ops.push({
        id: `custom_cupom_rf_isento_${clientId}_${m}`,
        vehicleId,
        asset: safeAsset(settings.cupomRfIsentoAssetCode),
        type: "cupom_rf",
        date: `${year}-${String(m).padStart(2, "0")}-15`,
        totalValue: input.cupomRfIsento,
      });
    }
    if ((input.dividendoExterior ?? 0) > 0) {
      ops.push({
        id: `custom_divext_${clientId}_${m}`,
        vehicleId,
        asset: safeAsset(settings.dividendoExteriorAssetCode),
        type: "dividendo",
        date: `${year}-${String(m).padStart(2, "0")}-28`,
        totalValue: input.dividendoExterior,
        ptax: settings.exteriorPtax || DEFAULT_MONTHLY_INPUT_SETTINGS.exteriorPtax,
        payerCnpj: "CUSTOM-EXTERIOR-US",
      });
    }
    if ((input.outrosRendimentos ?? 0) > 0) {
      ops.push({
        id: `custom_outros_${clientId}_${m}`,
        vehicleId,
        asset: FALLBACK_PL,
        type: "pro_labore",
        date: `${year}-${String(m).padStart(2, "0")}-10`,
        totalValue: input.outrosRendimentos,
        note: "Outros rendimentos tributáveis informados manualmente",
      });
    }
  }
  return ops;
}
