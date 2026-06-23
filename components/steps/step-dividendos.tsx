"use client";

import { useWizard } from "@/lib/wizard/context";
import type { DividendSource, Frequencia } from "@/lib/wizard/types";
import { GATILHO_MENSAL, runForecast } from "@/lib/forecast";
import { brl } from "@/lib/format";

const FREQS: { id: Frequencia; label: string }[] = [
  { id: "mensal", label: "Mensal" },
  { id: "trimestral", label: "Trimestral" },
  { id: "semestral", label: "Semestral" },
  { id: "anual", label: "Anual (1x)" },
];

function emptySource(): DividendSource {
  return { id: crypto.randomUUID(), nome: "", valorAnoPassado: 0, frequencia: "anual" };
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
          Use os dividendos que o cliente recebeu <strong>no ano passado</strong>, por
          papel/fonte. É o melhor ponto de partida. O imposto incide quando uma fonte passa
          de <strong>{brl(GATILHO_MENSAL)} por mês</strong>.
        </span>
      </div>

      {sources.length === 0 && (
        <p className="muted">
          Nenhuma fonte ainda. Adicione as ações/fontes que pagam dividendos ao cliente.
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
            <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field grow" style={{ minWidth: 150 }}>
                <label className="field__label">Ação / fonte</label>
                <input
                  className="field__input"
                  value={d.nome}
                  placeholder="Ex.: ITSA4"
                  onChange={(e) => patch(d.id, { nome: e.target.value })}
                />
              </div>
              <div className="field" style={{ minWidth: 150 }}>
                <label className="field__label">Dividendo ano passado (R$)</label>
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
    </div>
  );
}
