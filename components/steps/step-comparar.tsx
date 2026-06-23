"use client";

import { useWizard } from "@/lib/wizard/context";
import { comparar } from "@/lib/asset-compare";
import { brl, pct } from "@/lib/format";

export function StepComparar() {
  const { state, setState } = useWizard();
  const c = state.comparar;
  const set = (p: Partial<typeof c>) =>
    setState((s) => ({ ...s, comparar: { ...s.comparar, ...p } }));

  const r =
    c.valor && c.valor > 0
      ? comparar({
          valor: c.valor,
          prazoMeses: c.prazoMeses,
          cdiAA: c.cdiAA,
          cdbPctCDI: c.cdbPctCDI,
          lcaPctCDI: c.lcaPctCDI,
        })
      : null;

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="muted">
        Quanto o cliente vai aplicar e onde comparar. CDB paga imposto (tabela regressiva);
        LCA/LCI é isento.
      </p>

      <div className="field">
        <label className="field__label">Valor a aplicar (R$)</label>
        <input
          className="field__input"
          type="number"
          min={0}
          value={c.valor ?? ""}
          placeholder="Ex.: 200000"
          onChange={(e) => set({ valor: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </div>

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="field grow">
          <label className="field__label">Prazo (meses)</label>
          <input
            className="field__input"
            type="number"
            min={1}
            value={c.prazoMeses}
            onChange={(e) => set({ prazoMeses: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="field grow">
          <label className="field__label">CDI ao ano (%)</label>
          <input
            className="field__input"
            type="number"
            step="0.1"
            value={(c.cdiAA * 100).toFixed(1)}
            onChange={(e) => set({ cdiAA: (Number(e.target.value) || 0) / 100 })}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="field grow">
          <label className="field__label">CDB (% do CDI)</label>
          <input
            className="field__input"
            type="number"
            step="1"
            value={(c.cdbPctCDI * 100).toFixed(0)}
            onChange={(e) => set({ cdbPctCDI: (Number(e.target.value) || 0) / 100 })}
          />
        </div>
        <div className="field grow">
          <label className="field__label">LCA/LCI (% do CDI)</label>
          <input
            className="field__input"
            type="number"
            step="1"
            value={(c.lcaPctCDI * 100).toFixed(0)}
            onChange={(e) => set({ lcaPctCDI: (Number(e.target.value) || 0) / 100 })}
          />
        </div>
      </div>
      <span className="field__hint">
        CDI é premissa de mercado — ajuste conforme o cenário atual.
      </span>

      {r && (
        <div className="card" style={{ marginTop: 4 }}>
          <div className="row row--between">
            <span className="muted">CDB líquido (após IR {pct(r.cdb.aliquotaIR)})</span>
            <span className="num">{brl(r.cdb.liquido)}</span>
          </div>
          <div className="row row--between" style={{ marginTop: 6 }}>
            <span className="muted">LCA/LCI líquido (isento)</span>
            <span className="num">{brl(r.lca.liquido)}</span>
          </div>
          <div className="divider" />
          <div className="row row--between">
            <span className="strong">
              {r.vencedor === "empate"
                ? "Empate técnico"
                : r.vencedor === "lca"
                  ? "LCA/LCI rende mais"
                  : "CDB rende mais"}
            </span>
            <span className="chip chip--ink">+{brl(r.diferenca)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
