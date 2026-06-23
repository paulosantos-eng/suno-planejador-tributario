import type { Client, Operation } from "@/lib/tax-engine/types";

export type InvestorProfileId = "conservador" | "moderado" | "dinamico";

export interface AllocationBand {
  min: number;
  target: number;
  max: number;
}

export interface InvestorPolicy {
  id: InvestorProfileId;
  label: string;
  description: string;
  riskNote: string;
  bands: Record<string, AllocationBand>;
}

export const INVESTOR_POLICIES: Record<InvestorProfileId, InvestorPolicy> = {
  conservador: {
    id: "conservador",
    label: "Conservador",
    description: "Prioriza preservação de capital, renda recorrente e baixa rotação.",
    riskNote: "Evitar excesso de renda variável, exterior concentrado e fundos ilíquidos.",
    bands: {
      "Ações BR": { min: 0, target: 0.05, max: 0.10 },
      "ETF RV BR": { min: 0, target: 0.02, max: 0.08 },
      "FII / Fiagro": { min: 0.10, target: 0.20, max: 0.28 },
      "Renda Fixa Trib.": { min: 0.30, target: 0.40, max: 0.55 },
      "Renda Fixa Isenta": { min: 0.20, target: 0.30, max: 0.45 },
      Exterior: { min: 0, target: 0.10, max: 0.18 },
      "Fundos Abertos": { min: 0, target: 0.05, max: 0.15 },
      "Fundos Fechados": { min: 0, target: 0, max: 0.05 },
      "FIP Qualificado": { min: 0, target: 0, max: 0.05 },
    },
  },
  moderado: {
    id: "moderado",
    label: "Moderado",
    description: "Equilibra crescimento, renda e eficiência fiscal sem concentração excessiva.",
    riskNote: "Permite mais exterior e renda variável, mantendo núcleo relevante em renda fixa.",
    bands: {
      "Ações BR": { min: 0.08, target: 0.16, max: 0.25 },
      "ETF RV BR": { min: 0, target: 0.05, max: 0.12 },
      "FII / Fiagro": { min: 0.10, target: 0.18, max: 0.28 },
      "Renda Fixa Trib.": { min: 0.15, target: 0.25, max: 0.40 },
      "Renda Fixa Isenta": { min: 0.10, target: 0.18, max: 0.30 },
      Exterior: { min: 0.08, target: 0.18, max: 0.30 },
      "Fundos Abertos": { min: 0, target: 0.08, max: 0.20 },
      "Fundos Fechados": { min: 0, target: 0.05, max: 0.12 },
      "FIP Qualificado": { min: 0, target: 0, max: 0.08 },
    },
  },
  dinamico: {
    id: "dinamico",
    label: "Dinâmico",
    description: "Aceita maior volatilidade, exterior e ativos menos líquidos para otimização multi-ano.",
    riskNote: "Exige controle de concentração, liquidez e auditoria fiscal mais forte.",
    bands: {
      "Ações BR": { min: 0.05, target: 0.12, max: 0.25 },
      "ETF RV BR": { min: 0, target: 0.05, max: 0.15 },
      "FII / Fiagro": { min: 0.08, target: 0.16, max: 0.28 },
      "Renda Fixa Trib.": { min: 0.15, target: 0.25, max: 0.40 },
      "Renda Fixa Isenta": { min: 0.08, target: 0.18, max: 0.32 },
      Exterior: { min: 0.12, target: 0.24, max: 0.40 },
      "Fundos Abertos": { min: 0, target: 0.08, max: 0.20 },
      "Fundos Fechados": { min: 0, target: 0.08, max: 0.18 },
      "FIP Qualificado": { min: 0, target: 0.05, max: 0.15 },
    },
  },
};

function normalizeProfile(profile?: Client["investorProfile"]): InvestorProfileId | undefined {
  if (profile === "conservador" || profile === "moderado" || profile === "dinamico") return profile;
  if (profile === "sofisticado") return "dinamico";
  return undefined;
}

export function resolveInvestorPolicy(
  clientId: string,
  operations: Operation[],
  explicitProfile?: Client["investorProfile"],
): InvestorPolicy {
  const selectedProfile = normalizeProfile(explicitProfile);
  if (selectedProfile) return INVESTOR_POLICIES[selectedProfile];

  if (clientId === "cli_roberto") return INVESTOR_POLICIES.conservador;
  if (clientId === "cli_marina") return INVESTOR_POLICIES.dinamico;
  if (clientId === "cli_joao") return INVESTOR_POLICIES.moderado;
  if (clientId === "cli_daniela") return INVESTOR_POLICIES.dinamico;

  const templateOperation = operations.find((operation) => operation.id.startsWith("template_"));
  if (templateOperation?.id.startsWith("template_roberto_")) return INVESTOR_POLICIES.conservador;
  if (templateOperation?.id.startsWith("template_marina_")) return INVESTOR_POLICIES.dinamico;
  return INVESTOR_POLICIES.moderado;
}

export function clampToPolicy(classLabel: string, value: number, policy: InvestorPolicy): number {
  const band = policy.bands[classLabel];
  if (!band) return value;
  return Math.min(Math.max(value, band.min), band.max);
}

export function isInsidePolicy(classLabel: string, value: number, policy: InvestorPolicy): boolean {
  const band = policy.bands[classLabel];
  if (!band) return true;
  return value >= band.min && value <= band.max;
}
