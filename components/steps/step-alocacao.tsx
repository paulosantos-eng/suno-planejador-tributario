"use client";

import { useRef, useState } from "react";
import { useWizard } from "@/lib/wizard/context";
import { CLASSES_ALOCACAO, type ImportAsset, type DividendSource } from "@/lib/wizard/types";
import { parseGorilaCsv } from "@/lib/portfolio-import/gorila";
import type { ClasseSuno } from "@/lib/suno-model";

const fmtPct = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// % por classe a partir dos ativos (ativos sem classe ficam de fora → soma < 100).
function pctsFromAssets(assets: ImportAsset[]): Record<string, number> {
  const total = assets.reduce((a, x) => a + x.posicao, 0);
  const out: Record<string, number> = {};
  for (const c of CLASSES_ALOCACAO) {
    const soma = assets
      .filter((a) => a.classeSuno === c)
      .reduce((a, x) => a + x.posicao, 0);
    out[c] = total > 0 ? Math.round((soma / total) * 10000) / 100 : 0;
  }
  return out;
}

export function StepAlocacao() {
  const { state, setState } = useWizard();
  const aloc = state.alocacao;
  const assets = state.importAssets;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const soma = CLASSES_ALOCACAO.reduce((a, c) => a + (aloc[c] || 0), 0);
  const completo = Math.abs(soma - 100) < 0.5;
  const restante = 100 - soma;
  const naoClassificados = assets?.filter((a) => !a.classeSuno).length ?? 0;

  const setManual = (classe: string, v: number) =>
    setState((s) => ({ ...s, alocacao: { ...s.alocacao, [classe]: v } }));

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buf = reader.result as ArrayBuffer;
        let texto = new TextDecoder("utf-8").decode(buf);
        if (texto.includes(String.fromCharCode(0xfffd))) {
          // arquivo provavelmente em ANSI/Windows-1252 (comum em exports BR)
          texto = new TextDecoder("windows-1252").decode(buf);
        }
        const r = parseGorilaCsv(texto);
        const imported: ImportAsset[] = r.ativos.map((a) => ({
          ativo: a.ativo,
          posicao: a.posicao,
          classeSuno: a.classeSuno,
        }));
        // Ações BR da carteira viram fontes de dividendo (gatilho 50k). O valor é o
        // dividendo do período anualizado (muitas vezes 0/parcial) — ponto de partida
        // editável; o consultor ajusta para o esperado no ano. ETFs/ações no exterior
        // ficam de fora (regime Lei 14.754, não entram no gatilho).
        const fator = r.periodoDias && r.periodoDias > 0 ? 365 / r.periodoDias : 1;
        const divs: DividendSource[] = r.ativos
          .filter((a) => a.classeSuno === "Ações")
          .map((a) => ({
            id: crypto.randomUUID(),
            nome: a.ativo,
            tipo: "dividendo" as const,
            valorAnoPassado: Math.round(a.dividendos * fator),
            frequencia: "mensal" as const,
          }));
        setState((s) => ({
          ...s,
          importAssets: imported,
          alocacao: pctsFromAssets(imported),
          dividendos: divs,
          cliente: { ...s.cliente, patrimonio: Math.round(r.total) },
        }));
        setMsg(
          `Importado: ${r.ativos.length} ativos · patrimônio ${brl(r.total)}.` +
            (divs.length ? ` ${divs.length} ação(ões) listada(s) como fonte de dividendo (ajuste os valores na Renda).` : "") +
            (r.naoMapeados.length ? ` ⚠ ${r.naoMapeados.length} sem classe — escolha abaixo.` : ""),
        );
      } catch (err) {
        setMsg(
          err instanceof Error
            ? `Não consegui ler: ${err.message}`
            : "Não consegui ler o arquivo.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const reassign = (idx: number, classe: ClasseSuno | null) => {
    if (!assets) return;
    const next = assets.map((a, i) => (i === idx ? { ...a, classeSuno: classe } : a));
    setState((s) => ({ ...s, importAssets: next, alocacao: pctsFromAssets(next) }));
  };

  const limparImport = () =>
    setState((s) => ({ ...s, importAssets: undefined, alocacao: {} }));

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="banner banner--info">
        <span>
          Tem o relatório do Gorila? Importe o CSV e a alocação preenche sozinha — depois
          confira e corrija a classe de cada ativo se vier algo errado.
        </span>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => fileRef.current?.click()}
        >
          {assets ? "Reimportar Gorila (CSV)" : "Importar do Gorila (CSV)"}
        </button>
        {assets && (
          <button type="button" className="btn btn--ghost" onClick={limparImport}>
            Preencher manualmente
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="field__hint">{msg}</p>}

      {assets ? (
        <>
          <p className="muted">
            Confira a classe de cada ativo e corrija no seletor se algum veio errado
            {naoClassificados > 0 ? " — há ativos sem classe (em vermelho)." : "."}
          </p>
          <div className="table-wrap" style={{ padding: 0 }}>
            {assets.map((a, i) => (
              <div
                key={i}
                className="row row--between"
                style={{ gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--ink-100)" }}
              >
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span
                    className="strong"
                    style={{
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 300,
                    }}
                  >
                    {a.ativo}
                  </span>
                  <span className="subtle" style={{ fontSize: 12 }}>
                    {brl(a.posicao)}
                  </span>
                </div>
                <select
                  className="field__select"
                  style={{ maxWidth: 200, borderColor: a.classeSuno ? undefined : "var(--coral-600)" }}
                  value={a.classeSuno ?? ""}
                  onChange={(e) => reassign(i, (e.target.value || null) as ClasseSuno | null)}
                >
                  <option value="">— classificar —</option>
                  {CLASSES_ALOCACAO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="divider" />
          <span className="eyebrow">Alocação resultante</span>
          {CLASSES_ALOCACAO.map((c) => (
            <div key={c} className="row row--between">
              <span>{c}</span>
              <span className="num tnum">{fmtPct(aloc[c] || 0)}%</span>
            </div>
          ))}
        </>
      ) : (
        <>
          <p className="muted">…ou preencha em % por classe. Precisa somar 100%.</p>
          {CLASSES_ALOCACAO.map((c) => (
            <div key={c} className="field">
              <label className="field__label">{c} (%)</label>
              <input
                className="field__input"
                type="number"
                min={0}
                max={100}
                value={aloc[c] || ""}
                placeholder="0"
                onChange={(e) => setManual(c, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </>
      )}

      <div className="divider" />
      <div className="row row--between">
        <span className="strong">Total</span>
        <span
          className="num num-lg"
          style={{ color: completo ? "var(--ink-900)" : "var(--coral-600)" }}
        >
          {fmtPct(soma)}%
        </span>
      </div>
      {!completo && (
        <p className="subtle" style={{ fontSize: 12, textAlign: "right", marginTop: -8 }}>
          {restante > 0 ? `Faltam ${fmtPct(restante)}% — ` : `Passou ${fmtPct(-restante)}% — `}
          {assets && naoClassificados > 0
            ? "classifique os ativos em vermelho."
            : "ajuste para fechar 100%."}
        </p>
      )}
    </div>
  );
}
