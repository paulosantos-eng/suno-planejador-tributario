// Teste de paridade/smoke do engine portado.
// Roda o engine nas personas mock e imprime os números fiscais-chave.
// Esperado: Marina/Daniela disparam IRRF Lei 15.270 (dividendos/distribuição > 50k/mês);
// Roberto (conservador) não dispara.
//
// Rodar: npx tsx scripts/parity-engine.ts

import { runEngine } from "@/lib/tax-engine/engine";
import { CLIENTS, getOperationsForClient } from "@/lib/data/mock-clients";

function brl(n: number): string {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

let failures = 0;

for (const c of CLIENTS) {
  const ops = getOperationsForClient(c.id);
  const res = runEngine(ops);

  let dividends = 0;
  let irrf15270 = 0;
  let jcpGross = 0;
  const monthsTriggered: string[] = [];
  for (const m of res.monthly.values()) {
    dividends += m.dividends;
    jcpGross += m.jcpGross;
    if (m.irrf15270 > 0) {
      irrf15270 += m.irrf15270;
      monthsTriggered.push(`${String(m.month).padStart(2, "0")}/${m.year}`);
    }
  }

  let irpfmDue = 0;
  let incomeForIrpfm = 0;
  for (const a of res.annual.values()) {
    irpfmDue += a.irpfmDue ?? 0;
    incomeForIrpfm += a.totalIncomeForIrpfm ?? 0;
  }

  console.log("─".repeat(72));
  console.log(`${c.id}  (${c.name})  perfil=${c.investorProfile ?? "?"}`);
  console.log(`  ops=${ops.length}  dividendos=${brl(dividends)}  JCP bruto=${brl(jcpGross)}`);
  console.log(`  IRRF Lei 15.270 (ano)=${brl(irrf15270)}  meses c/ gatilho: ${monthsTriggered.length ? monthsTriggered.join(", ") : "nenhum"}`);
  console.log(`  base IRPFM=${brl(incomeForIrpfm)}  IRPFM devido=${brl(irpfmDue)}`);
}

console.log("─".repeat(72));

// Asserts qualitativos de sanidade (paridade de comportamento)
function expect(name: string, cond: boolean) {
  const ok = cond;
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}

function irrfForClient(id: string): number {
  const c = CLIENTS.find((x) => x.id === id);
  if (!c) return -1;
  const res = runEngine(getOperationsForClient(id));
  let s = 0;
  for (const m of res.monthly.values()) s += m.irrf15270;
  return s;
}

console.log("\nSANIDADE:");
expect("Marina dispara IRRF Lei 15.270 (>0)", irrfForClient("cli_marina") > 0);
expect("Roberto NÃO dispara IRRF Lei 15.270 (=0)", irrfForClient("cli_roberto") === 0);

console.log(`\n${failures === 0 ? "OK — paridade de comportamento confirmada" : `FALHOU — ${failures} asserts`}`);
process.exit(failures === 0 ? 0 : 1);
