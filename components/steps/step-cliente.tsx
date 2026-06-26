"use client";

import { useWizard } from "@/lib/wizard/context";

export function StepCliente() {
  const { state, setState } = useWizard();
  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="field">
        <label className="field__label">Nome do cliente</label>
        <input
          className="field__input"
          value={state.cliente.nome}
          placeholder="Ex.: Maria Silva"
          onChange={(e) =>
            setState((s) => ({ ...s, cliente: { ...s.cliente, nome: e.target.value } }))
          }
        />
      </div>
      <div className="field">
        <label className="field__label">Patrimônio total investido (R$)</label>
        <input
          className="field__input"
          type="number"
          inputMode="numeric"
          min={0}
          value={state.cliente.patrimonio ?? ""}
          placeholder="Ex.: 2000000"
          onChange={(e) =>
            setState((s) => ({
              ...s,
              cliente: {
                ...s.cliente,
                patrimonio: e.target.value === "" ? null : Number(e.target.value),
              },
            }))
          }
        />
        <span className="field__hint">Opcional — pode vir automático do import do Gorila.</span>
      </div>
    </div>
  );
}
