// Sanidade do comparador de eficiência fiscal. Rodar: npx tsx scripts/compare-check.ts
import { comparar, PRODUTOS_PADRAO } from "@/lib/asset-compare";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const r = comparar(200_000, 24, 0.1425, PRODUTOS_PADRAO);
console.log(`Aplicar R$ 200.000 por 24 meses · CDI 14,25% · dias=${r.dias} · IR RF=${(r.linhas.find((l) => !l.isento)?.aliquotaIR ?? 0) * 100}%`);
for (const l of r.linhas) {
  const ir = l.isento ? "isento" : `IR ${(l.aliquotaIR * 100).toFixed(1)}%`;
  console.log(`  ${l.nome.padEnd(14)} ${(l.pctCDI * 100).toFixed(0)}% CDI · ${ir.padEnd(9)} · líquido ${brl(l.liquido)}`);
}
console.log(`Vencedor: ${r.vencedor.nome} (+${brl(r.diferenca)} vs 2º)`);
