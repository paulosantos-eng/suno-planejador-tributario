"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard/context";
import { firstIncompleteStep } from "@/lib/wizard/types";
import { runForecast, CENARIOS, GATILHO_MENSAL } from "@/lib/forecast";
import { comparar } from "@/lib/asset-compare";
import { computeGap, PERFIL_LABELS } from "@/lib/profile";
import { brl, pct } from "@/lib/format";
import { SunoLockup } from "@/components/suno-lockup";

export default function ResultadoPage() {
  const { state, hydrated } = useWizard();
  const router = useRouter();
  const [cenIdx, setCenIdx] = useState(1); // "Base"

  // Se o funil não está completo, volta para a etapa pendente.
  useEffect(() => {
    if (hydrated && firstIncompleteStep(state) <= 5) {
      router.replace(`/fluxo/${firstIncompleteStep(state)}`);
    }
  }, [hydrated, state, router]);

  if (!hydrated || firstIncompleteStep(state) <= 5) return null;

  const cen = CENARIOS[cenIdx];
  const fc = runForecast(state.dividendos, cen.mult);
  const gap = state.perfil ? computeGap(state.perfil, state.alocacao) : null;
  const cmp =
    state.comparar.valor && state.comparar.valor > 0
      ? comparar({
          valor: state.comparar.valor,
          prazoMeses: state.comparar.prazoMeses,
          cdiAA: state.comparar.cdiAA,
          cdbPctCDI: state.comparar.cdbPctCDI,
          lcaPctCDI: state.comparar.lcaPctCDI,
        })
      : null;

  const algumCruza = fc.algumCruza;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <SunoLockup />
          <div className="topbar__context">
            <span className="topbar__title">Resultado — {state.cliente.nome || "Cliente"}</span>
            <span className="topbar__subtitle">Planejamento de dividendos · 2026</span>
          </div>
        </div>
        <Link href="/fluxo/1" className="btn btn--secondary">
          Editar
        </Link>
      </header>

      <main className="page">
        <div className="col" style={{ gap: 20 }}>
          {/* Seletor de cenário */}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="eyebrow" style={{ alignSelf: "center" }}>
              Cenário de dividendos
            </span>
            {CENARIOS.map((s, i) => (
              <button
                key={s.id}
                className={"chip " + (i === cenIdx ? "chip--ink" : "")}
                style={{ cursor: "pointer" }}
                onClick={() => setCenIdx(i)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Número principal */}
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <span className="eyebrow">Imposto previsto sobre dividendos · 2026</span>
            <div
              className="num num-2xl"
              style={{ color: algumCruza ? "var(--coral-600)" : "var(--ink-900)", marginTop: 10 }}
            >
              {brl(fc.totalIrrf)}
            </div>
            <p className="muted" style={{ marginTop: 10, maxWidth: 520, marginInline: "auto" }}>
              {algumCruza
                ? `Pelo menos uma fonte passa de ${brl(GATILHO_MENSAL)}/mês — incide 10% de imposto.`
                : `Nenhuma fonte passa de ${brl(GATILHO_MENSAL)}/mês. Sem imposto sobre dividendos neste cenário.`}
            </p>
            <p className="subtle" style={{ marginTop: 8, fontSize: 12 }}>
              Estimativa de planejamento — validar com a área fiscal antes de uso com o cliente.
            </p>
          </div>

          {/* Por fonte */}
          <div className="card">
            <span className="eyebrow">Por fonte</span>
            <div className="col" style={{ gap: 8, marginTop: 12 }}>
              {fc.fontes.map((f) => (
                <div key={f.source.id} className="row row--between">
                  <span>
                    {f.source.nome || "—"}{" "}
                    <span className="subtle">· {brl(f.porPagamento)}/pagamento</span>
                  </span>
                  {f.cruzaGatilho ? (
                    <span className="chip chip--coral">paga {brl(f.irrf)}</span>
                  ) : (
                    <span className="chip">faltam {brl(f.distancia)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enquadramento / GAP */}
          {gap && state.perfil && (
            <div className="card">
              <span className="eyebrow">Enquadramento — {PERFIL_LABELS[state.perfil].label}</span>
              <div className="col" style={{ gap: 8, marginTop: 12 }}>
                {gap.linhas.map((l) => (
                  <div key={l.classe} className="row row--between">
                    <span>{l.classe}</span>
                    <span className="row" style={{ gap: 10 }}>
                      <span className="muted tnum">
                        {pct(l.atualPct)} → {pct(l.alvoPct)}
                      </span>
                      <span className={"chip " + (l.acao === "ok" ? "" : "chip--amber")}>
                        {l.acao === "ok" ? "ok" : l.acao === "aumentar" ? "↑ aumentar" : "↓ reduzir"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparador */}
          {cmp && (
            <div className="card">
              <span className="eyebrow">
                Onde alocar {brl(state.comparar.valor || 0)} por {state.comparar.prazoMeses} meses
              </span>
              <div className="row row--between" style={{ marginTop: 12 }}>
                <span>CDB líquido (IR {pct(cmp.cdb.aliquotaIR)})</span>
                <span className="num">{brl(cmp.cdb.liquido)}</span>
              </div>
              <div className="row row--between" style={{ marginTop: 6 }}>
                <span>LCA/LCI líquido (isento)</span>
                <span className="num">{brl(cmp.lca.liquido)}</span>
              </div>
              <div className="divider" />
              <div className="banner banner--info">
                <span>
                  {cmp.vencedor === "empate"
                    ? "CDB e LCA/LCI empatam no líquido."
                    : `${cmp.vencedor === "lca" ? "LCA/LCI" : "CDB"} rende ${brl(cmp.diferenca)} a mais no líquido.`}
                </span>
              </div>
            </div>
          )}

          {/* Como se preparar */}
          <div className="card card--dark">
            <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>
              Como se preparar
            </span>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
              {algumCruza && (
                <li>
                  Há fonte acima de {brl(GATILHO_MENSAL)}/mês: avalie escalonar os pagamentos para
                  reduzir a incidência mensal.
                </li>
              )}
              {cmp && cmp.vencedor === "lca" && (
                <li>Para o novo aporte, LCA/LCI rende mais líquido que o CDB neste prazo.</li>
              )}
              {gap && gap.linhas.some((l) => l.acao !== "ok") && (
                <li>
                  Carteira fora do perfil em algumas classes — ajuste os próximos aportes para
                  aproximar do alvo.
                </li>
              )}
              <li>Revise a projeção quando confirmar os dividendos reais do ano.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
