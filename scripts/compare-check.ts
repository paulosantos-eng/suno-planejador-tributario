// Sanidade do comparador. Rodar: npx tsx scripts/compare-check.ts
import { comparar, PRODUTOS_PADRAO } from "@/lib/asset-compare";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const r = comparar(200_000, 24, 0.1425, 0.045, PRODUTOS_PADRAO);
console.log(`Aplicar R$ 200.000 por 24 meses · CDI 14,25% · IPCA 4,5% · dias=${r.dias}`);
for (const l of r.linhas) {
  const ir = l.isento ? "isento" : `IR ${(l.aliquotaIR * 100).toFixed(1)}%`;
  const idx =
    l.indexador === "cdi" ? `${(l.taxa * 100).toFixed(0)}% CDI` : `IPCA+${(l.taxa * 100).toFixed(1)}%`;
  console.log(`  ${l.nome.padEnd(22)} ${idx.padEnd(11)} ${ir.padEnd(9)} líquido ${brl(l.liquido)}`);
}
console.log(`Vencedor: ${r.vencedor.nome} (+${brl(r.diferenca)} vs 2º)`);
