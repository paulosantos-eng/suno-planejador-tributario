// Sanidade do imposto total + memória (persona médico). Rodar: npx tsx scripts/memoria-check.ts
import { impostoTotalHoje } from "@/lib/memoria-calculo";
import { initialState, type WizardState } from "@/lib/wizard/types";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Médico: pró-labore alto + aluguel + distribuição/dividendos + JCP + exterior.
const state: WizardState = {
  ...initialState,
  cliente: { nome: "Dr. Teste", patrimonio: 5_000_000 },
  proLabore: 200_000,
  aluguel: 30_000,
  dividendos: [
    { id: "a", nome: "Empresa dele (PJ)", tipo: "distribuicao_pj", valorAnoPassado: 720_000, frequencia: "mensal" },
    { id: "j", nome: "ITUB (JCP)", tipo: "jcp", valorAnoPassado: 50_000, frequencia: "anual" },
    { id: "e", nome: "VOO", tipo: "dividendo_exterior", valorAnoPassado: 20_000, frequencia: "anual" },
  ],
};

const r = impostoTotalHoje(state);
console.log(`IMPOSTO TOTAL HOJE: ${brl(r.total)}\n`);
for (const b of r.blocos) {
  console.log(`${b.titulo}  →  ${brl(b.total)}`);
  for (const s of b.steps) {
    console.log(`   ${s.label}${s.valor != null ? "  " + brl(s.valor) : ""}`);
  }
}
