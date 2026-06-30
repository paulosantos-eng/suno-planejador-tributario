// Memória de cálculo: como cada imposto foi computado (para o consultor entender).
// Montada a partir das funções do app (forecast). O total de imposto é a soma dos blocos.
import type { WizardState } from "@/lib/wizard/types";
import {
  runForecast,
  jcpIrrfAnual,
  exteriorIrAnual,
  irpfProLaboreAnual,
  inssProLaboreAnual,
  irpfAluguelAnual,
  totalDividendosBr,
  totalJcpAnual,
  totalExteriorAnual,
  irpfmEstimado,
  ALIQ_JCP,
  ALIQ_EXTERIOR,
  TETO_INSS_MENSAL,
} from "@/lib/forecast";

export interface MemoStep {
  label: string;
  valor?: number;
}
export interface MemoBloco {
  titulo: string;
  refLegal: string;
  total: number;
  steps: MemoStep[];
  nota?: string;
}

function money(n: number): string {
  return (n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
function pctn(n: number): string {
  return (n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

export function memoriaCalculo(state: WizardState): MemoBloco[] {
  const blocos: MemoBloco[] = [];
  const fc = runForecast(state.dividendos, 1);
  const pl = state.proLabore ?? 0;
  const al = state.aluguel ?? 0;

  // 1. Dividendos — gatilho 50k/mês por fonte (Lei 15.270)
  if (fc.totalIrrf > 0) {
    blocos.push({
      titulo: "Dividendos — IRRF 10% (acima de R$ 50 mil/mês por fonte)",
      refLegal: "Lei 15.270/2025",
      total: fc.totalIrrf,
      steps: fc.fontes
        .filter((f) => f.cruzaGatilho)
        .map((f) => ({
          label: `${f.source.nome}: ~${money(f.porPagamento)}/mês × 10% × ${f.pagamentos} pagto(s)`,
          valor: f.irrf,
        })),
    });
  }

  // 2. JCP — 15% na fonte
  const jcp = jcpIrrfAnual(state.dividendos);
  if (jcp > 0) {
    blocos.push({
      titulo: "JCP — IRRF 15%",
      refLegal: "Lei 15.270/2025 (JCP)",
      total: jcp,
      steps: [{ label: `JCP ${money(totalJcpAnual(state.dividendos))} × ${pctn(ALIQ_JCP)}`, valor: jcp }],
    });
  }

  // 3. Dividendo exterior — 15% ao ano
  const ext = exteriorIrAnual(state.dividendos);
  if (ext > 0) {
    blocos.push({
      titulo: "Dividendo exterior — 15% ao ano",
      refLegal: "Lei 14.754/2023",
      total: ext,
      steps: [
        { label: `Exterior ${money(totalExteriorAnual(state.dividendos))} × ${pctn(ALIQ_EXTERIOR)}`, valor: ext },
      ],
      nota: "Fora do gatilho de 50k. Estimativa.",
    });
  }

  // 4. Pró-labore — IRPF progressivo (+ INSS)
  if (pl > 0) {
    const irpf = irpfProLaboreAnual(pl);
    blocos.push({
      titulo: "Pró-labore — IRPF (tabela progressiva)",
      refLegal: "Tabela IRPF 2026 (topo 27,5%)",
      total: irpf,
      steps: [
        { label: `Pró-labore ${money(pl)}/mês → IRPF ~${money(irpf / 12)}/mês` },
        { label: "× 12 meses", valor: irpf },
      ],
    });
    const inss = inssProLaboreAnual(pl);
    if (inss > 0) {
      blocos.push({
        titulo: "INSS sobre pró-labore",
        refLegal: "11% até o teto",
        total: inss,
        steps: [{ label: `mín(${money(pl)}; teto ${money(TETO_INSS_MENSAL)}) × 11% × 12`, valor: inss }],
        nota: "Teto do INSS a validar (valor de 2026).",
      });
    }
  }

  // 5. Aluguéis — carnê-leão
  if (al > 0) {
    const irpfAl = irpfAluguelAnual(al);
    blocos.push({
      titulo: "Aluguéis — IRPF (carnê-leão)",
      refLegal: "Tabela progressiva (carnê-leão)",
      total: irpfAl,
      steps: [{ label: `Aluguel ${money(al)}/mês → ~${money(irpfAl / 12)}/mês × 12`, valor: irpfAl }],
      nota: "Estimativa.",
    });
  }

  // 6. IRPFM — imposto mínimo anual (estimativa)
  const base =
    totalDividendosBr(state.dividendos) +
    totalExteriorAnual(state.dividendos) +
    totalJcpAnual(state.dividendos) +
    pl * 12 +
    al * 12;
  const creditos = fc.totalIrrf + ext + jcp + irpfProLaboreAnual(pl) + irpfAluguelAnual(al);
  const irpfm = irpfmEstimado(base, creditos);
  if (base > 0) {
    blocos.push({
      titulo: "IRPFM — imposto mínimo anual (estimativa)",
      refLegal: "Lei 15.270/2025 (IRPFM)",
      total: irpfm.devido,
      steps: [
        { label: "Base ampla (parcial)", valor: irpfm.base },
        { label: `× alíquota mínima ${pctn(irpfm.rate)}`, valor: irpfm.gross },
        { label: "− créditos já pagos", valor: -creditos },
        { label: "= IRPFM devido (adicional)", valor: irpfm.devido },
      ],
      nota: "Estimativa de base parcial — regra a validar com a área fiscal.",
    });
  }

  return blocos;
}

// Imposto total que ele paga hoje (ano): soma dos blocos da memória.
export function impostoTotalHoje(state: WizardState): { total: number; blocos: MemoBloco[] } {
  const blocos = memoriaCalculo(state);
  const total = blocos.reduce((a, b) => a + b.total, 0);
  return { total, blocos };
}
