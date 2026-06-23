"use client";

import { useWizard } from "@/lib/wizard/context";
import { CLASSES_ALOCACAO } from "@/lib/wizard/types";
import { brl, pct } from "@/lib/format";

export function StepAlocacao() {
  const { state, setState } = useWizard();
  const aloc = state.alocacao;
  const total = Object.values(aloc).reduce((a, b) => a + (b || 0), 0);
  const set = (classe: string, v: number) =>
    setState((s) => ({ ...s, alocacao: { ...s.alocacao, [classe]: v } }));

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="muted">
        Quanto o cliente tem hoje em cada classe (R$). Serve para comparar com o perfil.
      </p>
      {CLASSES_ALOCACAO.map((c) => (
        <div key={c} className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="field grow">
            <label className="field__label">{c}</label>
            <input
              className="field__input"
              type="number"
              min={0}
              value={aloc[c] || ""}
              placeholder="0"
              onChange={(e) => set(c, Number(e.target.value) || 0)}
            />
          </div>
          <span
            className="muted tnum"
            style={{ minWidth: 56, textAlign: "right", paddingBottom: 12 }}
          >
            {total > 0 ? pct((aloc[c] || 0) / total) : "—"}
          </span>
        </div>
      ))}
      <div className="divider" />
      <div className="row row--between">
        <span className="strong">Total</span>
        <span className="num num-lg">{brl(total)}</span>
      </div>
    </div>
  );
}
