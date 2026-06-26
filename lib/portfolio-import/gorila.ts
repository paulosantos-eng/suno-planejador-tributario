// Importador do relatório CSV do Gorila → alocação por classe Suno.
// Lê a seção "Posição" (ativo a ativo) e mapeia cada um para as classes Suno.
import { CLASSES_SUNO, type ClasseSuno } from "@/lib/suno-model";

export { CLASSES_SUNO };
export type { ClasseSuno };

export interface GorilaAsset {
  ativo: string;
  subClasse: string;
  classe: string;
  posicao: number;
  classeSuno: ClasseSuno | null;
}

export interface GorilaImport {
  porClasse: Record<ClasseSuno, number>; // % (0–100) por classe Suno
  porClasseBrl: Record<ClasseSuno, number>; // R$ por classe
  total: number; // soma das posições (= Patrimônio Bruto)
  ativos: GorilaAsset[];
  naoMapeados: GorilaAsset[]; // classes não reconhecidas (sobem como alerta)
}

// Mapeamento Gorila → Suno (confirmado: Multimercado→Alternativo, BDR→Ações).
export function mapToSuno(classe: string, subClasse: string): ClasseSuno | null {
  const c = classe.trim();
  const s = subClasse.trim();
  if (c === "Renda Fixa" || c === "Caixa") return "Renda Fixa";
  if (c === "Investimento No Exterior") return "Internacional";
  if (c === "Multimercado") return "Multimercado";
  if (c === "Renda Variável") {
    if (s === "FIIs") return "FIIs";
    return "Ações"; // Ações e BDRs
  }
  return null; // desconhecido — vira alerta, não some
}

// "R$145.114,28" / "-R$479,06" / "R$0,00" → number
export function parseBRL(raw: string): number {
  if (!raw) return 0;
  const limpo = raw
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function parseGorilaCsv(text: string): GorilaImport {
  const linhas = text.split(/\r?\n/);

  // Acha o cabeçalho da seção "Posição".
  let headerIdx = -1;
  for (let i = 0; i < linhas.length; i++) {
    const cols = linhas[i].split(";");
    if (cols[0]?.trim() === "Corretora" && cols[1]?.trim() === "Ativo") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error("Não encontrei a seção 'Posição' no CSV do Gorila.");
  }

  const header = linhas[headerIdx].split(";").map((h) => h.trim());
  const idxAtivo = header.indexOf("Ativo");
  const idxSub = header.indexOf("Sub-Classe");
  const idxClasse = header.indexOf("Classe");
  const idxPos = header.indexOf("Posição (R$)");
  if (idxPos === -1 || idxClasse === -1) {
    throw new Error("Colunas 'Classe'/'Posição (R$)' não encontradas no CSV do Gorila.");
  }

  const ativos: GorilaAsset[] = [];
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";");
    const ativo = (cols[idxAtivo] ?? "").trim();
    const classe = (cols[idxClasse] ?? "").trim();
    if (!ativo || !classe) continue; // pula linhas vazias / outras seções
    const subClasse = (cols[idxSub] ?? "").trim();
    const posicao = parseBRL(cols[idxPos] ?? "");
    ativos.push({
      ativo,
      subClasse,
      classe,
      posicao,
      classeSuno: mapToSuno(classe, subClasse),
    });
  }

  const porClasseBrl = Object.fromEntries(
    CLASSES_SUNO.map((c) => [c, 0]),
  ) as Record<ClasseSuno, number>;
  const naoMapeados: GorilaAsset[] = [];
  let total = 0;
  for (const a of ativos) {
    total += a.posicao;
    if (a.classeSuno) porClasseBrl[a.classeSuno] += a.posicao;
    else naoMapeados.push(a);
  }

  const porClasse = Object.fromEntries(
    CLASSES_SUNO.map((c) => [c, total > 0 ? (porClasseBrl[c] / total) * 100 : 0]),
  ) as Record<ClasseSuno, number>;

  return { porClasse, porClasseBrl, total, ativos, naoMapeados };
}
