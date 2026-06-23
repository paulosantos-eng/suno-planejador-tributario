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
  { n: 3, slug: "dividendos", title: "Dividendos esperados", why: "Quanto o cliente espera receber por ação/fonte no ano — base do gatilho de R$ 50 mil/mês." },
  { n: 4, slug: "alocacao", title: "Alocação atual", why: "Onde o dinheiro está hoje, por classe de ativo." },
  { n: 5, slug: "alocar", title: "Onde alocar", why: "O valor a aplicar para comparar a eficiência fiscal (CDB × LCA)." },
];

export const TOTAL_STEPS = STEPS.length;

export function getStep(n: number): WizardStep | undefined {
  return STEPS.find((s) => s.n === n);
}
