// Verifica o parser do Gorila.
//   npx tsx scripts/gorila-check.ts                 -> amostra embutida (fake)
//   npx tsx scripts/gorila-check.ts "<arquivo.csv>" -> arquivo real
import { readFileSync } from "node:fs";
import { parseGorilaCsv, CLASSES_SUNO } from "@/lib/portfolio-import/gorila";

const SAMPLE = `Patrimônio Bruto (R$);R$1.000,00;;
;;;
Posição;;;;;;
Corretora;Ativo;Sub-Classe;Classe;Quantidade;Posição (R$);Preço (R$)
X;CDB FAKE;Indexado a Juros;Renda Fixa;1;R$500,00;R$1,00
X;Caixa (BRL);Caixa;Caixa;1;R$0,00;R$1,00
X;PETR4;Ações;Renda Variável;1;R$100,00;R$1,00
X;ROXO34;BDRs;Renda Variável;1;R$100,00;R$1,00
X;BTLG11;FIIs;Renda Variável;1;R$50,00;R$1,00
X;VOO;Renda Variável;Investimento No Exterior;1;R$200,00;R$1,00
X;FUNDO MM;Fundos;Multimercado;1;R$50,00;R$1,00
`;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const path = process.argv[2];
const text = path ? readFileSync(path, "utf8") : SAMPLE;
const r = parseGorilaCsv(text);

console.log(`Patrimônio (soma das posições): ${brl(r.total)}`);
console.log(`Ativos lidos: ${r.ativos.length} | Não mapeados: ${r.naoMapeados.length}`);
for (const c of CLASSES_SUNO) {
  console.log(
    `  ${c.padEnd(14)} ${r.porClasse[c].toFixed(1).padStart(5)}%  (${brl(r.porClasseBrl[c])})`,
  );
}
const soma = CLASSES_SUNO.reduce((a, c) => a + r.porClasse[c], 0);
console.log(`  Soma: ${soma.toFixed(1)}%`);
if (r.naoMapeados.length) {
  console.log(
    "⚠ não mapeados: " +
      r.naoMapeados.map((a) => `${a.ativo} (${a.classe}/${a.subClasse})`).join(", "),
  );
}
