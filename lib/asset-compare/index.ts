import { Rules } from "@/lib/tax-engine/rules";

export interface CompareProduct {
  nome: string;
  isento: boolean; // isento de IR para PF?
  pctCDI: number; // % do CDI (1.0 = 100%)
}

// Cardápio padrão: tributados (CDB, Tesouro Selic) × isentos (LCI/LCA, CRI/CRA).
// Debênture incentivada (IPCA+) e FII (rendimento mensal) são modelos diferentes — fica para depois.
export const PRODUTOS_PADRAO: CompareProduct[] = [
  { nome: "CDB", isento: false, pctCDI: 1.0 },
  { nome: "Tesouro Selic", isento: false, pctCDI: 1.0 },
  { nome: "LCI/LCA", isento: true, pctCDI: 0.9 },
  { nome: "CRI/CRA", isento: true, pctCDI: 0.95 },
];

export interface CompareLine extends CompareProduct {
  taxaAA: number;
  bruto: number; // rendimento bruto no prazo
  aliquotaIR: number;
  ir: number;
  liquido: number; // rendimento líquido no prazo
  total: number; // principal + líquido
}

export interface CompareResult {
  dias: number;
  anos: number;
  linhas: CompareLine[]; // ordenadas por líquido (desc)
  vencedor: CompareLine;
  diferenca: number; // líquido do vencedor menos o do 2º
}

export function comparar(
  valor: number,
  prazoMeses: number,
  cdiAA: number,
  produtos: CompareProduct[],
): CompareResult {
  const dias = Math.round(prazoMeses * 30.4);
  const anos = prazoMeses / 12;
  const aliqRf = Rules.rfRegressive(dias); // tabela regressiva por prazo (tributados)

  const linhas: CompareLine[] = produtos.map((p) => {
    const taxaAA = cdiAA * p.pctCDI;
    const bruto = valor * (Math.pow(1 + taxaAA, anos) - 1);
    const aliquotaIR = p.isento ? 0 : aliqRf;
    const ir = bruto * aliquotaIR;
    const liquido = bruto - ir;
    return { ...p, taxaAA, bruto, aliquotaIR, ir, liquido, total: valor + liquido };
  });

  linhas.sort((a, b) => b.liquido - a.liquido);
  const vencedor = linhas[0];
  const diferenca = linhas.length > 1 ? vencedor.liquido - linhas[1].liquido : 0;

  return { dias, anos, linhas, vencedor, diferenca };
}
