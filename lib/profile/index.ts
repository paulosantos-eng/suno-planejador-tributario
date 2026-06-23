import { INVESTOR_POLICIES } from "@/lib/tax-engine/investor-profile";
import { CLASSES_ALOCACAO, type PerfilId } from "@/lib/wizard/types";

export interface GapLine {
  classe: string;
  atualBrl: number;
  atualPct: number;
  alvoPct: number;
  gapPct: number; // alvo - atual
  acao: "aumentar" | "reduzir" | "ok";
}

export function computeGap(
  perfil: PerfilId,
  alocacao: Record<string, number>,
): { total: number; linhas: GapLine[] } {
  const policy = INVESTOR_POLICIES[perfil];
  const total = Object.values(alocacao).reduce((a, b) => a + (b || 0), 0);

  const linhas: GapLine[] = CLASSES_ALOCACAO.map((classe) => {
    const atualBrl = alocacao[classe] || 0;
    const atualPct = total > 0 ? atualBrl / total : 0;
    const alvoPct = policy.bands[classe]?.target ?? 0;
    const gapPct = alvoPct - atualPct;
    const acao: GapLine["acao"] =
      Math.abs(gapPct) <= 0.03 ? "ok" : gapPct > 0 ? "aumentar" : "reduzir";
    return { classe, atualBrl, atualPct, alvoPct, gapPct, acao };
  });

  return { total, linhas };
}

export const PERFIL_LABELS: Record<PerfilId, { label: string; desc: string }> = {
  conservador: {
    label: "Conservador",
    desc: "Preserva capital, renda recorrente e baixa rotação.",
  },
  moderado: {
    label: "Moderado",
    desc: "Equilibra crescimento, renda e eficiência fiscal.",
  },
  dinamico: {
    label: "Dinâmico",
    desc: "Aceita mais volatilidade e exterior para otimizar no longo prazo.",
  },
};
