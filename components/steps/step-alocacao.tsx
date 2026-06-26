"use client";

import { useWizard } from "@/lib/wizard/context";
import { CLASSES_ALOCACAO } from "@/lib/wizard/types";

function fmtPct(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function StepAlocacao() {
  const { state, setState } = useWizard();
  const aloc = state.alocacao;
  const soma = Object.values(aloc).reduce((a, b) => a + (b || 0), 0);
  const set = (classe: string, v: number) =>
    setState((s) => ({ ...s, alocacao: { ...s.alocacao, [classe]: v } }));

  const completo = Math.abs(soma - 100) < 0.5;
  const restante = 100 - soma;

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="muted">
        Quanto da carteira o cliente tem hoje em cada classe, em <strong>%</strong>. Precisa
        somar 100%.
      </p>

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
