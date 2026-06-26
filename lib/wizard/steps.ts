// Definição das etapas do funil linear. Fonte única de verdade para
// ordem, rótulos e o "por que" de cada etapa.

export interface WizardStep {
  n: number;
  slug: string;
  title: string;
  why: string;
}

export const STEPS: WizardStep[] = [
  { n: 1, slug: "cliente", title: "Cliente", why: "Quem é o cliente (o patrimônio pode vir do Gorila)." },
  { n: 2, slug: "carteira", title: "Carteira atual", why: "Importe o relatório do Gorila — a alocação e os ativos vêm prontos (ou preencha em %)." },
  { n: 3, slug: "perfil", title: "Enquadramento", why: "O perfil define a alocação-alvo; o GAP aparece com a carteira." },
  { n: 4, slug: "renda", title: "Renda esperada", why: "Dividendos (pré-preenchidos do Gorila), distribuição de PJ e pró-labore — base do gatilho de R$ 50 mil/mês." },
  { n: 5, slug: "alocar", title: "Onde alocar", why: "O valor a aplicar para comparar a eficiência fiscal (CDB × isentos)." },
];

export const TOTAL_STEPS = STEPS.length;

export function getStep(n: number): WizardStep | undefined {
  return STEPS.find((s) => s.n === n);
}
