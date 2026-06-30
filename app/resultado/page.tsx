"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard/context";
import { firstIncompleteStep } from "@/lib/wizard/types";
import { tempoAteGatilho, CDI_PADRAO, GATILHO_MENSAL, irpfProLaboreAnual, jcpIrrfAnual } from "@/lib/forecast";
import { comparar } from "@/lib/asset-compare";
import { computeGap, PERFIL_LABELS } from "@/lib/profile";
import { brl, pct } from "@/lib/format";
import { SunoLockup } from "@/components/suno-lockup";

function fmtAnos(anos: number): string {
  if (anos <= 0) return "imediatamente";
  if (anos < 1) return "menos de 1 ano";
  if (anos > 40) return "mais de 40 anos";
  const v = anos.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${v} ${anos < 2 ? "ano" : "anos"}`;
}

export default function ResultadoPage() {
  const { state, hydrated } = useWizard();
  const router = useRouter();
  const [crescimento, setCrescimento] = useState(CDI_PADRAO);

  // Se o funil não está completo, volta para a etapa pendente.
  useEffect(() => {
    if (hydrated && firstIncompleteStep(state) <= 5) {
      router.replace(`/fluxo/${firstIncompleteStep(state)}`);
    }
  }, [hydrated, state, router]);

  if (!hydrated || firstIncompleteStep(state) <= 5) return null;

  const tt = tempoAteGatilho(state.dividendos, crescimento);
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

  // Headline da projeção
  let heroBig: string;
  let heroSub: string;
  let heroColor: string;
  if (tt.jaPaga) {
    heroBig = "Já paga hoje";
    heroSub = `A fonte ${tt.proxima?.source.nome || "—"} já passa de ${brl(GATILHO_MENSAL)}/mês — incide 10%.`;
    heroColor = "var(--coral-600)";
  } else if (tt.anosAteComecar != null && tt.anosAteComecar <= 40) {
    heroBig = `em ${fmtAnos(tt.anosAteComecar)}`;
    heroSub = `Se os dividendos renderem ${pct(crescimento)} a.a., a fonte ${tt.proxima?.source.nome || ""} cruza os ${brl(GATILHO_MENSAL)}/mês.`;
    heroColor = "var(--ink-900)";
  } else {
    heroBig = "Não tão cedo";
    heroSub = `Com crescimento de ${pct(crescimento)} a.a., nenhuma fonte passa de ${brl(GATILHO_MENSAL)}/mês nos próximos 40 anos.`;
    heroColor = "var(--ink-900)";
  }

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
          {/* Projeção: quando começa a pagar */}
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <span className="eyebrow">Começa a pagar imposto sobre dividendos</span>
            <div className="num num-2xl" style={{ color: heroColor, marginTop: 10 }}>
              {heroBig}
            </div>
            <p className="muted" style={{ marginTop: 10, maxWidth: 540, marginInline: "auto" }}>
              {heroSub}
            </p>

            <div
              className="field"
              style={{ maxWidth: 280, margin: "20px auto 0", textAlign: "left" }}
            >
              <label className="field__label">Crescimento dos dividendos (% a.a.)</label>
              <input
                className="field__input"
                type="number"
                step="0.25"
                value={(crescimento * 100).toFixed(2)}
                onChange={(e) => setCrescimento((Number(e.target.value) || 0) / 100)}
              />
              <span className="field__hint">
                Padrão: CDI ≈ Selic 14,25% a.a. (jun/2026) — premissa, ajuste. A validar com a
                área fiscal.
              </span>
            </div>
          </div>

          {/* Por fonte */}
          <div className="card">
            <span className="eyebrow">Por fonte</span>
            <div className="col" style={{ gap: 8, marginTop: 12 }}>
              {tt.fontes.map((f) => (
                <div key={f.source.id} className="row row--between">
                  <span>
                    {f.source.nome || "—"}{" "}
                    <span className="subtle">· {brl(f.porPagamento)} por pagamento</span>
                  </span>
                  {f.jaPaga ? (
                    <span className="chip chip--coral">já paga</span>
                  ) : f.anosParaCruzar == null ? (
                    <span className="chip">sem gatilho</span>
                  ) : f.anosParaCruzar > 40 ? (
                    <span className="chip">+40 anos</span>
                  ) : (
                    <span className="chip">cruza em {fmtAnos(f.anosParaCruzar)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pró-labore */}
          {state.proLabore != null && state.proLabore > 0 && (
            <div className="card">
              <span className="eyebrow">Pró-labore</span>
              <div className="row row--between" style={{ marginTop: 12 }}>
                <span>IRPF anual (tabela progressiva)</span>
                <span className="num">{brl(irpfProLaboreAnual(state.proLabore))}</span>
              </div>
              <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                Tributação separada do gatilho de dividendos. Entra na base anual do IRPFM
                (a tratar).
              </p>
            </div>
          )}

          {/* JCP */}
          {jcpIrrfAnual(state.dividendos) > 0 && (
            <div className="card">
              <span className="eyebrow">JCP</span>
              <div className="row row--between" style={{ marginTop: 12 }}>
                <span>IRRF 15% na fonte</span>
                <span className="num">{brl(jcpIrrfAnual(state.dividendos))}/ano</span>
              </div>
              <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                Tributação definitiva, separada do gatilho de dividendos. Entra na base anual
                do IRPFM (a tratar).
              </p>
            </div>
          )}

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
              {tt.jaPaga && (
                <li>
                  Já há fonte acima de {brl(GATILHO_MENSAL)}/mês: avalie escalonar os pagamentos
                  para reduzir a incidência mensal.
                </li>
              )}
              {!tt.jaPaga && tt.anosAteComecar != null && tt.anosAteComecar <= 40 && (
                <li>
                  Você tem ~{fmtAnos(tt.anosAteComecar)} antes de começar a pagar — dá tempo de
                  planejar a distribuição.
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

          <p className="subtle" style={{ fontSize: 12, textAlign: "center" }}>
            Estimativa de planejamento — validar com a área fiscal antes de uso com o cliente.
          </p>
        </div>
      </main>
    </div>
  );
}
