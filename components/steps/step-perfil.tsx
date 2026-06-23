"use client";

import { useWizard } from "@/lib/wizard/context";
import { PERFIL_LABELS } from "@/lib/profile";
import type { PerfilId } from "@/lib/wizard/types";

const ORDER: PerfilId[] = ["conservador", "moderado", "dinamico"];

export function StepPerfil() {
  const { state, setState } = useWizard();
  return (
    <div className="col" style={{ gap: 12 }}>
      {ORDER.map((id) => {
        const sel = state.perfil === id;
        return (
          <button
            key={id}
            type="button"
            className="card"
            onClick={() => setState((s) => ({ ...s, perfil: id }))}
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderColor: sel ? "var(--coral-600)" : "var(--border)",
              boxShadow: sel ? "0 0 0 3px var(--coral-50)" : "var(--shadow-xs)",
            }}
          >
            <div className="row row--between">
              <span className="strong" style={{ fontSize: 16 }}>
                {PERFIL_LABELS[id].label}
              </span>
              {sel && <span className="chip chip--coral">Selecionado</span>}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {PERFIL_LABELS[id].desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
