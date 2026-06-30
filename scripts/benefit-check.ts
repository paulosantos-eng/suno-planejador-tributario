// Sanidade do benefício fiscal. Rodar: npx tsx scripts/benefit-check.ts
import { beneficioFiscal } from "@/lib/benefit";
import { initialState, type WizardState } from "@/lib/wizard/types";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const state: WizardState = {
  ...initialState,
  cliente: { nome: "Dr. Teste", patrimonio: 5_000_000 },
  alocacao: { "Renda Fixa": 50, Ações: 20, FIIs: 10, Internacional: 15, Alternativo: 5, Multimercado: 0 },
  dividendos: [
    // mensal e > 600k/ano: escalonar NÃO ajuda (60k/mês mesmo espalhado).
    { id: "pj", nome: "Empresa dele (PJ)", tipo: "distribuicao_pj", valorAnoPassado: 720_000, frequencia: "mensal" },
    // lump anual 300k: hoje 30k de IRRF; espalhado a 25k/mês → 0 (escalona ajuda).
    { id: "lump", nome: "Dividendo anual", tipo: "dividendo", valorAnoPassado: 300_000, frequencia: "anual" },
  ],
};

const r = beneficioFiscal(state);
console.log(`Benefício total: ${brl(r.total)}`);
console.log(`  carteira (RF→isento): ${brl(r.carteira)}`);
console.log(`  escalonamento: ${brl(r.escalonamento)}`);
for (const m of r.movimentos) console.log(`   • ${m.titulo} → ${brl(m.economia)}`);
