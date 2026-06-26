"use client";

import { useWizard } from "@/lib/wizard/context";
import type { DividendSource, Frequencia, TipoRenda } from "@/lib/wizard/types";
import { GATILHO_MENSAL, runForecast, irpfProLaboreAnual } from "@/lib/forecast";
import { brl } from "@/lib/format";

const TIPOS: { id: TipoRenda; label: string }[] = [
  { id: "dividendo", label: "Dividendo de ação" },
  { id: "distribuicao_pj", label: "Distribuição de lucros (PJ)" },
];

const FREQS: { id: Frequencia; label: string }[] = [
  { id: "mensal", label: "Mensal" },
  { id: "trimestral", label: "Trimestral" },
  { id: "semestral", label: "Semestral" },
  { id: "anual", label: "Anual (1x)" },
];

function emptySource(): DividendSource {
  return {
    id: crypto.randomUUID(),
    nome: "",
    tipo: "dividendo",
    valorAnoPassado: 0,
    frequencia: "anual",
  };
}

export function StepDividendos() {
  const { state, setState } = useWizard();
  const sources = state.dividendos;
  const fc = runForecast(sources, 1);

  const setSources = (next: DividendSource[]) =>
    setState((s) => ({ ...s, dividendos: next }));
  const add = () => setSources([...sources, emptySource()]);
  const remove = (id: string) => setSources(sources.filter((d) => d.id !== id));
  const patch = (id: string, p: Partial<DividendSource>) =>
    setSources(sources.map((d) => (d.id === id ? { ...d, ...p } : d)));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="banner banner--info">
        <span>
          Entram no gatilho: <strong>dividendos de ações</strong> e{" "}
          <strong>distribuição de lucros da PJ</strong>. Use o valor recebido{" "}
          <strong>no ano passado</strong>, por fonte. O imposto incide quando uma fonte
          passa de <strong>{brl(GATILHO_MENSAL)} por mês</strong>.
        </span>
      </div>

      {sources.length === 0 && (
        <p className="muted">
          Nenhuma fonte ainda. Adicione as ações ou a PJ que pagam ao cliente.
        </p>
      )}

      {sources.map((d) => {
        const f = fc.fontes.find((x) => x.source.id === d.id);
        const cruza = f?.cruzaGatilho;
        return (
          <div
            key={d.id}
            className="card"
            style={{ borderColor: cruza ? "var(--coral-600)" : "var(--border)" }}
          >
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field__label">Tipo de renda</label>
              <select
                className="field__select"
                value={d.tipo ?? "dividendo"}
                onChange={(e) => patch(d.id, { tipo: e.target.value as TipoRenda })}
              >
                {TIPOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field grow" style={{ minWidth: 150 }}>
                <label className="field__label">Empresa / fonte</label>
                <input
                  className="field__input"
                  value={d.nome}
                  placeholder={
                    d.tipo === "distribuicao_pj" ? "Ex.: Minha Empresa Ltda" : "Ex.: ITSA4"
                  }
                  onChange={(e) => patch(d.id, { nome: e.target.value })}
                />
              </div>
              <div className="field" style={{ minWidth: 150 }}>
                <label className="field__label">Recebido ano passado (R$)</label>
                <input
                  className="field__input"
                  type="number"
                  min={0}
                  value={d.valorAnoPassado || ""}
                  placeholder="0"
                  onChange={(e) =>
                    patch(d.id, { valorAnoPassado: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="field" style={{ minWidth: 130 }}>
                <label className="field__label">Frequência</label>
                <select
                  className="field__select"
                  value={d.frequencia}
                  onChange={(e) => patch(d.id, { frequencia: e.target.value as Frequencia })}
                >
                  {FREQS.map((fq) => (
                    <option key={fq.id} value={fq.id}>
                      {fq.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => remove(d.id)}>
                Remover
              </button>
            </div>

            {d.valorAnoPassado > 0 && f && (
              <p style={{ marginTop: 10, fontSize: 13 }} className={cruza ? "" : "muted"}>
                {cruza ? (
                  <span className="chip chip--coral">
                    Passa do gatilho · ~{brl(f.porPagamento)}/mês → paga 10%
                  </span>
                ) : (
                  <>
                    ~{brl(f.porPagamento)} por pagamento · faltam {brl(f.distancia)} para o
                    gatilho
                  </>
                )}
              </p>
            )}
          </div>
        );
      })}

      <div>
        <button type="button" className="btn btn--secondary" onClick={add}>
          + Adicionar fonte
        </button>
      </div>

      <div className="divider" />
      <div className="field">
        <label className="field__label">Pró-labore mensal (R$) — opcional</label>
        <input
          className="field__input"
          type="number"
          min={0}
          value={state.proLabore ?? ""}
          placeholder="0"
          onChange={(e) =>
            setState((s) => ({
              ...s,
              proLabore: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
        />
        {state.proLabore != null && state.proLabore > 0 && (
          <span className="field__hint">
            IRPF estimado ~{brl(irpfProLaboreAnual(state.proLabore))}/ano (tabela
            progressiva). Não entra no gatilho dos dividendos.
          </span>
        )}
      </div>
    </div>
  );
}
