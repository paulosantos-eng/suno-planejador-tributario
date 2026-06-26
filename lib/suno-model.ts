// Modelo de alocação Suno — fonte de verdade do enquadramento.
// 6 classes ativas + alvo por perfil (consultoria "Completa").
// "Proteção Patrimonial" omitida (0% em todos os perfis nesta versão).
// Valores a validar com a área responsável (podem mudar).

export const CLASSES_SUNO = [
  "Renda Fixa",
  "Multimercado",
  "Ações",
  "FIIs",
  "Internacional",
  "Alternativo",
] as const;
export type ClasseSuno = (typeof CLASSES_SUNO)[number];

export const PERFIS = [
  "conservador",
  "moderado",
  "dinamico",
  "arrojado",
  "sofisticado",
  "defensivo",
  "intermediario",
  "longo_prazo",
] as const;
export type PerfilId = (typeof PERFIS)[number];

export const PERFIL_LABELS: Record<PerfilId, { label: string; hint: string }> = {
  conservador: { label: "Conservador", hint: "Preservação — Renda Fixa ~94%." },
  moderado: { label: "Moderado", hint: "Renda Fixa ~87% com um toque de risco." },
  dinamico: { label: "Dinâmico", hint: "Renda Fixa ~78% + diversificação." },
  arrojado: { label: "Arrojado", hint: "Mais bolsa e exterior (RF ~63%)." },
  sofisticado: { label: "Sofisticado", hint: "Alto risco/diversificação (RF ~37%)." },
  defensivo: { label: "Defensivo", hint: "Renda via FIIs (~66%)." },
  intermediario: { label: "Intermediário", hint: "Equilibrado — bolsa, FIIs e exterior." },
  longo_prazo: { label: "Longo Prazo", hint: "Crescimento — ações ~40% + exterior." },
};

// Alvo % por perfil × classe (consultoria Completa). Cada linha soma ~100%.
export const SUNO_TARGETS: Record<PerfilId, Record<ClasseSuno, number>> = {
  conservador: { "Renda Fixa": 93.53, Multimercado: 0, "Ações": 2.67, FIIs: 1.79, Internacional: 1.12, Alternativo: 0.89 },
  moderado: { "Renda Fixa": 87.39, Multimercado: 0, "Ações": 4.87, FIIs: 3.26, Internacional: 2.86, Alternativo: 1.62 },
  dinamico: { "Renda Fixa": 78.09, Multimercado: 0, "Ações": 8.13, FIIs: 5.45, Internacional: 5.63, Alternativo: 2.71 },
  arrojado: { "Renda Fixa": 63.15, Multimercado: 0, "Ações": 13.25, FIIs: 8.88, Internacional: 10.3, Alternativo: 4.42 },
  sofisticado: { "Renda Fixa": 36.81, Multimercado: 0, "Ações": 22.12, FIIs: 14.82, Internacional: 18.87, Alternativo: 7.37 },
  defensivo: { "Renda Fixa": 3.4, Multimercado: 0, "Ações": 16.5, FIIs: 66.35, Internacional: 8.25, Alternativo: 5.5 },
  intermediario: { "Renda Fixa": 4.32, Multimercado: 0, "Ações": 34.18, FIIs: 24.99, Internacional: 20.97, Alternativo: 15.54 },
  longo_prazo: { "Renda Fixa": 4.61, Multimercado: 0, "Ações": 39.79, FIIs: 13.33, Internacional: 22.38, Alternativo: 19.89 },
};
