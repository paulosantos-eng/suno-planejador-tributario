import { Rules } from "@/lib/tax-engine/rules";

export interface CompareInput {
  valor: number;
  prazoMeses: number;
  cdiAA: number; // decimal ao ano
  cdbPctCDI: number; // ex.: 1.10
  lcaPctCDI: number; // ex.: 0.90
}

export interface CompareLine {
  nome: string;
  isento: boolean;
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
  cdb: CompareLine;
  lca: CompareLine;
  vencedor: "cdb" | "lca" | "empate";
  diferenca: number; // diferença absoluta no líquido
}

export function comparar(input: CompareInput): CompareResult {
  const dias = Math.round(input.prazoMeses * 30.4);
  const anos = input.prazoMeses / 12;

  // CDB — tributado pela tabela regressiva da RF (alíquota por prazo).
  const cdbTaxa = input.cdiAA * input.cdbPctCDI;
  const cdbBruto = input.valor * (Math.pow(1 + cdbTaxa, anos) - 1);
  const aliq = Rules.rfRegressive(dias);
  const cdbIr = cdbBruto * aliq;
  const cdbLiq = cdbBruto - cdbIr;

  // LCA/LCI — isento de IR para PF.
  const lcaTaxa = input.cdiAA * input.lcaPctCDI;
  const lcaBruto = input.valor * (Math.pow(1 + lcaTaxa, anos) - 1);

  const cdb: CompareLine = {
    nome: "CDB",
    isento: false,
    taxaAA: cdbTaxa,
    bruto: cdbBruto,
    aliquotaIR: aliq,
    ir: cdbIr,
    liquido: cdbLiq,
    total: input.valor + cdbLiq,
  };
  const lca: CompareLine = {
    nome: "LCA/LCI",
    isento: true,
    taxaAA: lcaTaxa,
    bruto: lcaBruto,
    aliquotaIR: 0,
    ir: 0,
    liquido: lcaBruto,
    total: input.valor + lcaBruto,
  };

  const diff = lca.liquido - cdb.liquido;
  const vencedor =
    Math.abs(diff) < 0.005 * input.valor ? "empate" : diff > 0 ? "lca" : "cdb";

  return { dias, anos, cdb, lca, vencedor, diferenca: Math.abs(diff) };
}
