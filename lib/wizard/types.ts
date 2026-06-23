export type PerfilId = "conservador" | "moderado" | "dinamico";
export type Frequencia = "mensal" | "trimestral" | "semestral" | "anual";

export interface DividendSource {
  id: string;
  nome: string;
  valorAnoPassado: number; // dividendos recebidos no ano anterior (R$/ano)
  frequencia: Frequencia;
}

export const CLASSES_ALOCACAO = [
  "Ações BR",
  "FII / Fiagro",
  "Renda Fixa Trib.",
  "Renda Fixa Isenta",
  "Exterior",
] as const;
export type ClasseAlocacao = (typeof CLASSES_ALOCACAO)[number];

export interface CompararState {
  valor: number | null;
  prazoMeses: number;
  cdiAA: number; // CDI ao ano (decimal) — premissa de mercado, editável
  cdbPctCDI: number; // ex.: 1.10 = 110% do CDI
  lcaPctCDI: number; // ex.: 0.90 = 90% do CDI
}

export interface WizardState {
  cliente: { nome: string; patrimonio: number | null };
  perfil: PerfilId | null;
  dividendos: DividendSource[];
  alocacao: Record<string, number>; // classe -> R$
  comparar: CompararState;
}

export const initialState: WizardState = {
  cliente: { nome: "", patrimonio: null },
  perfil: null,
  dividendos: [],
  alocacao: {},
  comparar: { valor: null, prazoMeses: 24, cdiAA: 0.105, cdbPctCDI: 1.0, lcaPctCDI: 0.9 },
};

export function isStepValid(step: number, s: WizardState): boolean {
  switch (step) {
    case 1:
      return s.cliente.nome.trim().length > 0 && (s.cliente.patrimonio ?? 0) > 0;
    case 2:
      return s.perfil !== null;
    case 3:
      return (
        s.dividendos.length > 0 &&
        s.dividendos.every((d) => d.nome.trim().length > 0 && d.valorAnoPassado >= 0)
      );
    case 4:
      return Object.values(s.alocacao).reduce((a, b) => a + (b || 0), 0) > 0;
    case 5:
      return (s.comparar.valor ?? 0) > 0 && s.comparar.prazoMeses > 0 && s.comparar.cdiAA > 0;
    default:
      return false;
  }
}

/** Primeira etapa ainda não preenchida (1..5), ou 6 se tudo completo. */
export function firstIncompleteStep(s: WizardState): number {
  for (let i = 1; i <= 5; i++) if (!isStepValid(i, s)) return i;
  return 6;
}
