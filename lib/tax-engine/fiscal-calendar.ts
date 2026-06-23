import type { FiscalEvent } from "./types";

export type CalendarLayer = "engine" | "legal" | "advisor";
export type CalendarPriority = "normal" | "warn" | "high";

export interface FixedCalendarItem {
  id: string;
  date: string;
  layer: Exclude<CalendarLayer, "engine">;
  kind: FiscalEvent["kind"];
  title: string;
  description: string;
  priority: CalendarPriority;
  source: string;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastBusinessDay(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function getFixedFiscalCalendar(year = 2026): FixedCalendarItem[] {
  const items: FixedCalendarItem[] = [];

  for (let month = 1; month <= 12; month++) {
    const due = nextMonth(year, month);
    const dueDate = lastBusinessDay(due.year, due.month);

    items.push({
      id: `legal-darf-6015-${year}-${month}`,
      date: dueDate,
      layer: "legal",
      kind: "darf",
      title: `DARF 6015 - competência ${String(month).padStart(2, "0")}/${year}`,
      description: "Renda variável, FII, day trade e fundos quando houver apuração.",
      priority: "warn",
      source: "Agenda legal fixa",
    });

    items.push({
      id: `legal-carne-leao-${year}-${month}`,
      date: dueDate,
      layer: "legal",
      kind: "venc",
      title: `Carnê-leão - competência ${String(month).padStart(2, "0")}/${year}`,
      description: "Aluguéis de PF, honorários e rendimentos sem retenção na fonte.",
      priority: "normal",
      source: "Agenda legal fixa",
    });
  }

  items.push(
    {
      id: `legal-come-cotas-maio-${year}`,
      date: lastBusinessDay(year, 5),
      layer: "legal",
      kind: "comeCotas",
      title: "Come-cotas - maio",
      description: "Fundos abertos e fundos fechados sujeitos ao regime pós-Lei 14.754.",
      priority: "warn",
      source: "Agenda legal fixa",
    },
    {
      id: `legal-come-cotas-novembro-${year}`,
      date: lastBusinessDay(year, 11),
      layer: "legal",
      kind: "comeCotas",
      title: "Come-cotas - novembro",
      description: "Fundos abertos e fundos fechados sujeitos ao regime pós-Lei 14.754.",
      priority: "warn",
      source: "Agenda legal fixa",
    },
    {
      id: `legal-daa-${year}`,
      date: iso(year + 1, 5, 31),
      layer: "legal",
      kind: "venc",
      title: `DAA PF - ano-calendário ${year}`,
      description: "Ajuste anual, Lei 14.754 exterior e eventual IRPFM.",
      priority: "high",
      source: "Agenda legal fixa",
    },
  );

  items.push(
    {
      id: `advisor-r20k-q1-${year}`,
      date: iso(year, 3, 20),
      layer: "advisor",
      kind: "venc",
      title: "Revisar janela R$ 20k - 1º trimestre",
      description: "Checar vendas swing em ações e BDRs antes de executar novos rebalanceamentos.",
      priority: "normal",
      source: "Rotina do consultor",
    },
    {
      id: `advisor-r20k-q2-${year}`,
      date: iso(year, 6, 20),
      layer: "advisor",
      kind: "venc",
      title: "Revisar janela R$ 20k - 2º trimestre",
      description: "Checar vendas swing em ações e BDRs antes de executar novos rebalanceamentos.",
      priority: "normal",
      source: "Rotina do consultor",
    },
    {
      id: `advisor-r20k-q3-${year}`,
      date: iso(year, 9, 20),
      layer: "advisor",
      kind: "venc",
      title: "Revisar janela R$ 20k - 3º trimestre",
      description: "Checar vendas swing em ações e BDRs antes de executar novos rebalanceamentos.",
      priority: "normal",
      source: "Rotina do consultor",
    },
    {
      id: `advisor-irpfm-oct-${year}`,
      date: iso(year, 10, 15),
      layer: "advisor",
      kind: "trigger",
      title: "Prévia IRPFM e Lei 15.270",
      description: "Rodar simulação anual antes das decisões de dividendos e harvesting.",
      priority: "high",
      source: "Rotina do consultor",
    },
    {
      id: `advisor-year-end-nov-${year}`,
      date: iso(year, 11, 15),
      layer: "advisor",
      kind: "trigger",
      title: "Plano tributário de fim de ano",
      description: "Separar clientes com IRPFM, Lei 15.270, exterior e oportunidades de compensação.",
      priority: "high",
      source: "Rotina do consultor",
    },
    {
      id: `advisor-year-end-dec-${year}`,
      date: iso(year, 12, 15),
      layer: "advisor",
      kind: "trigger",
      title: "Última chamada de rebalanceamento fiscal",
      description: "Conferir vendas, prejuízos compensáveis, dividendos PJ e posição de 31/12.",
      priority: "high",
      source: "Rotina do consultor",
    },
  );

  return items.sort((a, b) => (a.date < b.date ? -1 : 1));
}
