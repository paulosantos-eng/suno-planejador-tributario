// Sanidade da projeção "tempo até o gatilho". Rodar: npx tsx scripts/forecast-check.ts
import { tempoAteGatilho } from "@/lib/forecast";
import type { DividendSource, Frequencia } from "@/lib/wizard/types";

function src(nome: string, anual: number, freq: Frequencia): DividendSource {
  return { id: nome, nome, valorAnoPassado: anual, frequencia: freq };
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
