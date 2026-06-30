// Sanidade da projeção "tempo até o gatilho". Rodar: npx tsx scripts/forecast-check.ts
import { tempoAteGatilho, irpfProLaboreAnual, jcpIrrfAnual, irpfmEstimado } from "@/lib/forecast";
import type { DividendSource, Frequencia } from "@/lib/wizard/types";

function src(nome: string, anual: number, freq: Frequencia): DividendSource {
  return { id: nome, nome, tipo: "dividendo", valorAnoPassado: anual, frequencia: freq };
}

const r = 0.1425; // CDI

const casos = [
  { label: "30k/mês (mensal, anual 360k) → cresce e cruza", s: [src("A", 360_000, "mensal")] },
  { label: "60k/mês (mensal) → já paga", s: [src("B", 720_000, "mensal")] },
  { label: "sem dividendo → null", s: [src("C", 0, "anual")] },
  { label: "60k anual (1 pagamento) → já paga", s: [src("E", 60_000, "anual")] },
  {
    label: "carteira mista (40k/mês + 10k/mês) → 1ª a cruzar",
    s: [src("PETR", 480_000, "mensal"), src("ITSA", 120_000, "mensal")],
  },
];

for (const c of casos) {
  const tt = tempoAteGatilho(c.s, r);
  const anos = tt.anosAteComecar == null ? "null" : tt.anosAteComecar.toFixed(2);
  console.log(
    `${c.label}\n   jaPaga=${tt.jaPaga}  anosAteComecar=${anos}  proxima=${tt.proxima?.source.nome ?? "-"}`,
  );
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
console.log("\nPró-labore — IRPF/ano (tabela progressiva):");
for (const m of [10000, 30000, 50000]) {
  console.log(`  ${brl(m)}/mês → ${brl(irpfProLaboreAnual(m))}/ano`);
}

console.log("\nJCP — 15% IRRF e fora do gatilho:");
const comJcp = [src("ITUB", 100_000, "anual")].map((s) => ({ ...s, tipo: "jcp" as const }));
console.log(`  R$100.000 de JCP → ${brl(jcpIrrfAnual(comJcp))} (esperado R$15.000,00)`);
const ttJcp = tempoAteGatilho(comJcp, 0.1425);
console.log(`  JCP no gatilho? fontes=${ttJcp.fontes.length} jaPaga=${ttJcp.jaPaga} (esperado 0 / false)`);

console.log("\nIRPFM — estimativa por faixa de base (sem créditos):");
for (const base of [400_000, 700_000, 1_500_000]) {
  const ir = irpfmEstimado(base, 0);
  console.log(`  base ${brl(base)} → alíquota ${(ir.rate * 100).toFixed(2)}% · devido ${brl(ir.devido)}`);
}
