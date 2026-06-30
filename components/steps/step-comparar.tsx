"use client";

import { useWizard } from "@/lib/wizard/context";
import { comparar, PRODUTOS_PADRAO } from "@/lib/asset-compare";
import { brl, pct } from "@/lib/format";

export function StepComparar() {
  const { state, setState } = useWizard();
  const c = state.comparar;
  const produtos =
    c.produtos?.length && c.produtos.every((p) => p.indexador)
      ? c.produtos
      : PRODUTOS_PADRAO.map((x) => ({ ...x }));
  const ipcaAA = c.ipcaAA ?? 0.045;

  const set = (p: Partial<typeof c>) =>
    setState((s) => ({ ...s, comparar: { ...s.comparar, ...p } }));
  const setTaxa = (i: number, taxa: number) =>
    set({ produtos: produtos.map((p, idx) => (idx === i ? { ...p, taxa } : p)) });

  const r = c.valor && c.valor > 0 ? comparar(c.valor, c.prazoMeses, c.cdiAA, ipcaAA, produtos) : null;

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="muted">
        Quanto o cliente vai aplicar e por quanto tempo. Comparo o líquido (após IR) de cada
        produto — os <strong>isentos</strong> não pagam imposto.
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
          <label className="field__label">CDI a.a. (%)</label>
          <input
            className="field__input"
            type="number"
            step="0.1"
            value={(c.cdiAA * 100).toFixed(1)}
            onChange={(e) => set({ cdiAA: (Number(e.target.value) || 0) / 100 })}
          />
        </div>
        <div className="field grow">
          <label className="field__label">IPCA a.a. (%)</label>
          <input
            className="field__input"
            type="number"
            step="0.1"
            value={(ipcaAA * 100).toFixed(1)}
            onChange={(e) => set({ ipcaAA: (Number(e.target.value) || 0) / 100 })}
          />
        </div>
      </div>
      <span className="field__hint">CDI e IPCA são premissas de mercado — ajuste conforme o cenário.</span>

      <div className="divider" />
      <span className="eyebrow">Produtos (taxa editável)</span>
      {produtos.map((p, i) => {
        const linha = r?.linhas.find((l) => l.nome === p.nome);
        const ipca = p.indexador === "ipca";
        return (
          <div key={p.nome} className="row" style={{ gap: 12, alignItems: "flex-end" }}>
            <div className="field grow">
              <label className="field__label">
                {p.nome} · {p.isento ? "isento" : "tributado"} · {ipca ? "IPCA + (%)" : "% do CDI"}
              </label>
              <input
                className="field__input"
                type="number"
                step={ipca ? "0.1" : "1"}
                value={(p.taxa * 100).toFixed(ipca ? 1 : 0)}
                onChange={(e) => setTaxa(i, (Number(e.target.value) || 0) / 100)}
              />
            </div>
            {linha && (
              <span
                className="num tnum"
                style={{ minWidth: 120, textAlign: "right", paddingBottom: 12 }}
              >
                {brl(linha.liquido)}
              </span>
            )}
          </div>
        );
      })}

      {r && (
        <div className="card" style={{ marginTop: 4 }}>
          <div className="row row--between">
            <span className="strong">
              Melhor líquido: {r.vencedor.nome}
              {r.vencedor.isento ? " (isento)" : ` (após IR ${pct(r.vencedor.aliquotaIR)})`}
            </span>
            <span className="chip chip--ink">{brl(r.vencedor.liquido)}</span>
          </div>
          {r.diferenca > 0 && (
            <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Rende {brl(r.diferenca)} a mais que o 2º colocado no período.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
