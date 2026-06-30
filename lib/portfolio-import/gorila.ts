// Importador do relatório CSV do Gorila → alocação por classe Suno + dividendos.
// Tolerante a codificação (acentos), variações de cabeçalho e delimitador.
import { CLASSES_SUNO, type ClasseSuno } from "@/lib/suno-model";

export { CLASSES_SUNO };
export type { ClasseSuno };

export interface GorilaAsset {
  ativo: string;
  subClasse: string;
  classe: string;
  posicao: number;
  dividendos: number; // dividendos no período do relatório (R$)
  jscp: number; // JCP no período do relatório (R$)
  classeSuno: ClasseSuno | null;
}

export interface GorilaImport {
  porClasse: Record<ClasseSuno, number>; // % (0–100) por classe Suno
  porClasseBrl: Record<ClasseSuno, number>; // R$ por classe
  total: number; // soma das posições (= Patrimônio Bruto)
  ativos: GorilaAsset[];
  naoMapeados: GorilaAsset[]; // classes não reconhecidas (sobem como alerta)
  periodoDias: number | null; // duração do relatório (p/ anualizar dividendos)
}

// minúsculas, sem acento, sem espaços nas pontas — tolera variações de cabeçalho/classe.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Mapeamento Gorila → Suno (Multimercado próprio, BDR→Ações). Tolerante a acento/caixa.
export function mapToSuno(classe: string, subClasse: string): ClasseSuno | null {
  const c = norm(classe);
  const s = norm(subClasse);
  if (c === "renda fixa" || c === "caixa") return "Renda Fixa";
  if (c === "investimento no exterior") return "Internacional";
  if (c === "multimercado") return "Multimercado";
  if (c === "renda variavel") {
    if (s === "fiis") return "FIIs";
    return "Ações"; // Ações e BDRs
  }
  return null; // desconhecido — vira alerta, não some
}

// É ação brasileira (dividendo sujeito ao gatilho da Lei 15.270)?
// BDRs (empresa estrangeira) e exterior ficam de fora.
export function ehAcaoBr(a: { classe: string; subClasse: string }): boolean {
  return norm(a.classe) === "renda variavel" && norm(a.subClasse) === "acoes";
}

// "R$145.114,28" / "-R$479,06" / "R$0,00" → number
export function parseBRL(raw: string): number {
  if (!raw) return 0;
  const limpo = raw
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}

// "13/01/2026" → Date (ou null).
function parseBrDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

// Detecta o delimitador a partir da própria linha de cabeçalho (sem decimais).
function detectDelim(line: string): string {
  let best = ";";
  let bestN = -1;
  for (const d of [";", ",", "\t"]) {
    const n = line.split(d).length - 1;
    if (n > bestN) {
      bestN = n;
      best = d;
    }
  }
  return best;
}

export function parseGorilaCsv(text: string): GorilaImport {
  const linhas = text.split(/\r?\n/);

  // 1. Acha o cabeçalho da seção "Posição" (tolerante a acento e delimitador).
  let headerIdx = -1;
  for (let i = 0; i < linhas.length; i++) {
    const low = norm(linhas[i]);
    if (low.includes("corretora") && low.includes("ativo") && low.includes("posicao")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error(
      "não achei a seção de posições (linha com Corretora/Ativo/Posição). É o relatório de carteira do Gorila em CSV?",
    );
  }

  const delim = detectDelim(linhas[headerIdx]);

  // 2. Período (para anualizar dividendos).
  let dataIni: Date | null = null;
  let dataFim: Date | null = null;
  for (const l of linhas) {
    const c = l.split(delim);
    const k = norm(c[0] ?? "");
    if (k === "data inicial") dataIni = parseBrDate(c[1] ?? "");
    if (k === "data final") dataFim = parseBrDate(c[1] ?? "");
  }
  const periodoDias =
    dataIni && dataFim
      ? Math.max(1, Math.round((dataFim.getTime() - dataIni.getTime()) / 86400000))
      : null;

  // 3. Colunas (por nome normalizado).
  const header = linhas[headerIdx].split(delim).map(norm);
  const idxAtivo = header.indexOf("ativo");
  const idxClasse = header.indexOf("classe");
  const idxSub = header.findIndex((h) => h.includes("sub") && h.includes("classe"));
  const idxPos = header.findIndex((h) => h.includes("posicao") && h.includes("r$"));
  const idxDiv = header.findIndex((h) => h.includes("dividend"));
  const idxJscp = header.findIndex((h) => h.includes("jscp") || h.includes("jcp"));
  if (idxAtivo === -1 || idxClasse === -1 || idxPos === -1) {
    throw new Error(
      "não encontrei as colunas Ativo/Classe/Posição (R$) — o layout do relatório pode ser diferente.",
    );
  }

  const ativos: GorilaAsset[] = [];
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const cols = linhas[i].split(delim);
    const ativo = (cols[idxAtivo] ?? "").trim();
    const classe = (cols[idxClasse] ?? "").trim();
    if (!ativo || !classe) continue; // pula linhas vazias / outras seções
    const subClasse = (cols[idxSub] ?? "").trim();
    const posicao = parseBRL(cols[idxPos] ?? "");
    const dividendos = idxDiv >= 0 ? parseBRL(cols[idxDiv] ?? "") : 0;
    const jscp = idxJscp >= 0 ? parseBRL(cols[idxJscp] ?? "") : 0;
    ativos.push({
      ativo,
      subClasse,
      classe,
      posicao,
      dividendos,
      jscp,
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

  return { porClasse, porClasseBrl, total, ativos, naoMapeados, periodoDias };
}
