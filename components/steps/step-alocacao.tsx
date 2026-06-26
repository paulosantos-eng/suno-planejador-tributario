"use client";

import { useRef, useState } from "react";
import { useWizard } from "@/lib/wizard/context";
import { CLASSES_ALOCACAO } from "@/lib/wizard/types";
import { parseGorilaCsv } from "@/lib/portfolio-import/gorila";

function fmtPct(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StepAlocacao() {
  const { state, setState } = useWizard();
  const aloc = state.alocacao;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const soma = CLASSES_ALOCACAO.reduce((a, c) => a + (aloc[c] || 0), 0);
  const completo = Math.abs(soma - 100) < 0.5;
  const restante = 100 - soma;
  const set = (classe: string, v: number) =>
    setState((s) => ({ ...s, alocacao: { ...s.alocacao, [classe]: v } }));

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const r = parseGorilaCsv(String(reader.result ?? ""));
        const novo: Record<string, number> = {};
        for (const c of CLASSES_ALOCACAO) {
          novo[c] = Math.round((r.porClasse[c] ?? 0) * 100) / 100;
        }
        setState((s) => ({ ...s, alocacao: novo }));
        setMsg(
          `Importado: ${r.ativos.length} ativos · patrimônio ${brl(r.total)}.` +
            (r.naoMapeados.length
              ? ` ⚠ ${r.naoMapeados.length} não mapeados — revise.`
              : ""),
        );
      } catch {
        setMsg("Não consegui ler — confirme que é o CSV do Gorila.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="banner banner--info">
        <span>
          Tem o relatório do Gorila? Importe o CSV e a alocação preenche sozinha.
        </span>
      </div>
      <div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => fileRef.current?.click()}
        >
          Importar do Gorila (CSV)
        </button>
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
            onChange={(e) => set(c, Number(e.target.value) || 0)}
          />
        </div>
      ))}

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
          {restante > 0
            ? `Faltam ${fmtPct(restante)}% para fechar 100%.`
            : `Passou ${fmtPct(-restante)}% — precisa fechar em 100%.`}
        </p>
      )}
    </div>
  );
}
