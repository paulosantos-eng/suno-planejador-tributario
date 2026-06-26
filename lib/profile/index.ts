import { CLASSES_SUNO, SUNO_TARGETS, type PerfilId } from "@/lib/suno-model";

export { PERFIL_LABELS } from "@/lib/suno-model";

export interface GapLine {
  classe: string;
  atualPct: number; // fração 0–1
  alvoPct: number; // fração 0–1 (alvo Suno)
  gapPct: number; // alvo - atual
  acao: "aumentar" | "reduzir" | "ok";
}

// GAP da carteira atual (% por classe) contra o alvo Suno do perfil.
export function computeGap(
  perfil: PerfilId,
  alocacao: Record<string, number>, // % por classe Suno
): { total: number; linhas: GapLine[] } {
  const total = CLASSES_SUNO.reduce((a, c) => a + (alocacao[c] || 0), 0);
  const alvos = SUNO_TARGETS[perfil];

  const linhas: GapLine[] = CLASSES_SUNO.map((classe) => {
    const atual = alocacao[classe] || 0; // já em %
    const atualPct = total > 0 ? atual / total : 0; // normaliza p/ fração
    const alvoPct = (alvos[classe] ?? 0) / 100;
    const gapPct = alvoPct - atualPct;
    const acao: GapLine["acao"] =
      Math.abs(gapPct) <= 0.03 ? "ok" : gapPct > 0 ? "aumentar" : "reduzir";
    return { classe, atualPct, alvoPct, gapPct, acao };
  });

  return { total, linhas };
}
