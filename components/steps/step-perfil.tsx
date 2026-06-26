"use client";

import { useWizard } from "@/lib/wizard/context";
import { PERFIS, PERFIL_LABELS } from "@/lib/suno-model";

export function StepPerfil() {
  const { state, setState } = useWizard();
  return (
    <div className="col" style={{ gap: 10 }}>
      {PERFIS.map((id) => {
        const sel = state.perfil === id;
        const info = PERFIL_LABELS[id];
        return (
          <button
            key={id}
            type="button"
            className="card"
            onClick={() => setState((s) => ({ ...s, perfil: id }))}
            style={{
              textAlign: "left",
              cursor: "pointer",
              padding: 16,
              borderColor: sel ? "var(--coral-600)" : "var(--border)",
              boxShadow: sel ? "0 0 0 3px var(--coral-50)" : "var(--shadow-xs)",
            }}
          >
            <div className="row row--between">
              <span className="strong">{info.label}</span>
              {sel && <span className="chip chip--coral">Selecionado</span>}
            </div>
            <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              {info.hint}
            </p>
          </button>
        );
      })}
    </div>
  );
}
