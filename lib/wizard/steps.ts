// Definição das etapas do funil linear. Fonte única de verdade para
// ordem, rótulos e o "por que" de cada etapa.

export interface WizardStep {
  n: number;
  slug: string;
  title: string;
  why: string;
}

export const STEPS: WizardStep[] = [
  { n: 1, slug: "cliente", title: "Cliente", why: "Quem é o cliente e qual o patrimônio total." },
  { n: 2, slug: "perfil", title: "Enquadramento", why: "O perfil de risco define a alocação-alvo." },
  { n: 3, slug: "renda", title: "Renda esperada", why: "Dividendos de ações e distribuição de lucros da PJ que o cliente espera receber por fonte no ano — base do gatilho de R$ 50 mil/mês." },
  { n: 4, slug: "alocacao", title: "Alocação atual", why: "Onde o dinheiro está hoje, por classe de ativo." },
  { n: 5, slug: "alocar", title: "Onde alocar", why: "O valor a aplicar para comparar a eficiência fiscal (CDB × LCA)." },
];

export const TOTAL_STEPS = STEPS.length;

export function getStep(n: number): WizardStep | undefined {
  return STEPS.find((s) => s.n === n);
}
