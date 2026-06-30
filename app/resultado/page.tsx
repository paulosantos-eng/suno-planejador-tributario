"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard/context";
import { firstIncompleteStep } from "@/lib/wizard/types";
import {
  tempoAteGatilho,
  CDI_PADRAO,
  GATILHO_MENSAL,
  irpfProLaboreAnual,
  jcpIrrfAnual,
  runForecast,
  totalDividendosBr,
  totalJcpAnual,
  totalExteriorAnual,
  exteriorIrAnual,
  inssProLaboreAnual,
  irpfAluguelAnual,
  irpfmEstimado,
} from "@/lib/forecast";
import { comparar, PRODUTOS_PADRAO } from "@/lib/asset-compare";
import { computeGap, PERFIL_LABELS } from "@/lib/profile";
import { brl, pct } from "@/lib/format";
import { SunoLockup } from "@/components/suno-lockup";
import { GapBars } from "@/components/gap-bars";
import { MemoriaCalculo } from "@/components/memoria-calculo";
import { impostoTotalHoje } from "@/lib/memoria-calculo";
import { beneficioFiscal } from "@/lib/benefit";

type Visao = "tecnica" | "comercial" | "simplificada";

function fmtAnos(anos: number): string {
  if (anos <= 0) return "imediatamente";
  if (anos < 1) return "menos de 1 ano";
  if (anos > 40) return "mais de 40 anos";
  const v = anos.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${v} ${anos < 2 ? "ano" : "anos"}`;
}

function getSemaforo(total: number): { cor: string; label: string; frase: string } {
  if (total > 100_000)
    return {
      cor: "var(--coral-600)",
      label: "Alto",
      frase:
        "Sua carga tributária anual é elevada — há espaço significativo para planejamento e economia.",
    };
  if (total > 20_000)
    return {
      cor: "var(--amber-600)",
      label: "Moderado",
      frase:
        "Sua carga tributária é moderada — algumas otimizações já podem gerar economia relevante.",
    };
  return {
    cor: "var(--green-800)",
    label: "Baixo",
    frase:
      "Sua carga tributária atual é baixa — continue monitorando à medida que a renda cresce.",
  };
}

export default function ResultadoPage() {
  const { state, hydrated } = useWizard();
  const router = useRouter();
  const [crescimento, setCrescimento] = useState(CDI_PADRAO);
  const [visao, setVisao] = useState<Visao>("tecnica");

  useEffect(() => {
    if (hydrated && firstIncompleteStep(state) <= 5) {
      router.replace(`/fluxo/${firstIncompleteStep(state)}`);
    }
  }, [hydrated, state, router]);

  if (!hydrated || firstIncompleteStep(state) <= 5) return null;

  // ── Cálculos (compartilhados entre visões) ──────────────────────────────
  const tt = tempoAteGatilho(state.dividendos, crescimento);
  const gap = state.perfil ? computeGap(state.perfil, state.alocacao) : null;
  const cmpProdutos =
    state.comparar.produtos?.length && state.comparar.produtos.every((p) => p.indexador)
      ? state.comparar.produtos
      : PRODUTOS_PADRAO;
  const cmp =
    state.comparar.valor && state.comparar.valor > 0
      ? comparar(
          state.comparar.valor,
          state.comparar.prazoMeses,
          state.comparar.cdiAA,
          state.comparar.ipcaAA ?? 0.045,
          cmpProdutos,
        )
      : null;

  const fc = runForecast(state.dividendos, 1);
  const proLaboreAnual = (state.proLabore ?? 0) * 12;
  const aluguelAnual = (state.aluguel ?? 0) * 12;
  const irpfmBase =
    totalDividendosBr(state.dividendos) +
    totalExteriorAnual(state.dividendos) +
    totalJcpAnual(state.dividendos) +
    proLaboreAnual +
    aluguelAnual;
  const irpfmCreditos =
    fc.totalIrrf +
    exteriorIrAnual(state.dividendos) +
    jcpIrrfAnual(state.dividendos) +
    irpfProLaboreAnual(state.proLabore ?? 0) +
    irpfAluguelAnual(state.aluguel ?? 0);
  const irpfm = irpfmEstimado(irpfmBase, irpfmCreditos);
  const imposto = impostoTotalHoje(state);
  const benefit = beneficioFiscal(state);
  const semaforo = getSemaforo(imposto.total);

  // imposto estimado com plano: só subtrai escalonamento de renda (carteira é adicional)
  const impostoComPlano = Math.max(0, imposto.total - benefit.escalonamento);

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

  const VISOES: { id: Visao; label: string }[] = [
    { id: "tecnica", label: "Técnica" },
    { id: "comercial", label: "Comercial" },
    { id: "simplificada", label: "Simplificada" },
  ];

  return (
    <div className="app">
      {/* Topbar — oculto no print */}
      <header className="topbar no-print">
        <div className="topbar__brand">
          <SunoLockup />
          <div className="topbar__context">
            <span className="topbar__title">Resultado — {state.cliente.nome || "Cliente"}</span>
            <span className="topbar__subtitle">Planejamento tributário · 2026</span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/fluxo/1" className="btn btn--secondary">
            Editar
          </Link>
          <button className="btn btn--secondary" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
        </div>
      </header>

      {/* Cabeçalho print */}
      <div className="print-only" style={{ padding: "0 32px 20px", borderBottom: "2px solid var(--coral-600)", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SunoLockup />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{state.cliente.nome || "Cliente"}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Planejamento tributário · Visão {VISOES.find((v) => v.id === visao)?.label} · 2026
            </div>
          </div>
        </div>
      </div>

      <main className="page">
        <div className="col" style={{ gap: 20 }}>
          {/* Seletor de visão */}
          <div className="view-selector no-print">
            <div className="view-tabs">
              {VISOES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisao(v.id)}
                  className={`view-tab${visao === v.id ? " view-tab--active" : ""}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
              VISÃO TÉCNICA
              ════════════════════════════════════════ */}
          {visao === "tecnica" && (
            <>
              <div className="card" style={{ textAlign: "center", padding: 28 }}>
                <span className="eyebrow">Imposto que você paga hoje (estimativa anual)</span>
                <div className="num num-2xl" style={{ marginTop: 8 }}>
                  {brl(imposto.total)}
                </div>
                <p className="muted" style={{ marginTop: 8, maxWidth: 520, marginInline: "auto" }}>
                  Soma de dividendos, JCP, exterior, pró-labore, INSS, aluguéis e IRPFM — detalhe na
                  memória de cálculo abaixo.
                </p>
              </div>

              {benefit.total > 0 && (
                <div className="card card--coral" style={{ textAlign: "center", padding: 28 }}>
                  <span className="eyebrow" style={{ color: "rgba(255,255,255,.85)" }}>
                    Benefício fiscal potencial (estimativa anual)
                  </span>
                  <div className="num num-xl" style={{ color: "var(--white)", marginTop: 8 }}>
                    {brl(benefit.total)}
                  </div>
                  <p style={{ color: "rgba(255,255,255,.92)", marginTop: 8, fontSize: 13.5 }}>
                    De ~{brl(imposto.total)} para ~{brl(impostoComPlano)} nas rendas
                    {benefit.carteira > 0 ? ` + ${brl(benefit.carteira)} de IR na carteira` : ""}.
                  </p>
                  <div className="col" style={{ gap: 4, marginTop: 12, textAlign: "left" }}>
                    {benefit.movimentos.map((m, i) => (
                      <div key={i} className="row row--between" style={{ fontSize: 13 }}>
                        <span>{m.titulo}</span>
                        <span className="tnum">{brl(m.economia)}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: "rgba(255,255,255,.72)", fontSize: 11, marginTop: 10 }}>
                    Estimativa, respeitando o perfil. A migração de RF isenta não está no "imposto
                    hoje". Validar com a área fiscal.
                  </p>
                </div>
              )}

              <div className="card" style={{ textAlign: "center", padding: 32 }}>
                <span className="eyebrow">Começa a pagar imposto sobre dividendos</span>
                <div className="num num-2xl" style={{ color: heroColor, marginTop: 10 }}>
                  {heroBig}
                </div>
                <p className="muted" style={{ marginTop: 10, maxWidth: 540, marginInline: "auto" }}>
                  {heroSub}
                </p>
                <div
                  className="field no-print"
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
                    Padrão: CDI ≈ Selic 14,25% a.a. (jun/2026) — premissa, ajuste.
                  </span>
                </div>
              </div>

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

              {state.proLabore != null && state.proLabore > 0 && (
                <div className="card">
                  <span className="eyebrow">Pró-labore</span>
                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span>IRPF anual (tabela progressiva)</span>
                    <span className="num">{brl(irpfProLaboreAnual(state.proLabore))}</span>
                  </div>
                  <div className="row row--between" style={{ marginTop: 6 }}>
                    <span>INSS anual (11% até o teto · estimativa)</span>
                    <span className="num">{brl(inssProLaboreAnual(state.proLabore))}</span>
                  </div>
                  <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                    Separado do gatilho de dividendos; entra na base do IRPFM. Teto do INSS a
                    validar (valor de 2026).
                  </p>
                </div>
              )}

              {jcpIrrfAnual(state.dividendos) > 0 && (
                <div className="card">
                  <span className="eyebrow">JCP</span>
                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span>IRRF 15% na fonte</span>
                    <span className="num">{brl(jcpIrrfAnual(state.dividendos))}/ano</span>
                  </div>
                  <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                    Tributação definitiva, separada do gatilho de dividendos. Entra na base anual
                    do IRPFM.
                  </p>
                </div>
              )}

              {totalExteriorAnual(state.dividendos) > 0 && (
                <div className="card">
                  <span className="eyebrow">Dividendo exterior</span>
                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span>IR 15% ao ano (Lei 14.754)</span>
                    <span className="num">{brl(exteriorIrAnual(state.dividendos))}</span>
                  </div>
                  <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                    Sobre dividendos de ativos no exterior/BDR — fora do gatilho de 50k.
                    Estimativa, a validar.
                  </p>
                </div>
              )}

              {state.aluguel != null && state.aluguel > 0 && (
                <div className="card">
                  <span className="eyebrow">Aluguéis</span>
                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span>IRPF anual (carnê-leão)</span>
                    <span className="num">{brl(irpfAluguelAnual(state.aluguel))}</span>
                  </div>
                  <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                    Tabela progressiva; entra na base do IRPFM. Estimativa.
                  </p>
                </div>
              )}

              {irpfm.base > 0 && (
                <div className="card">
                  <span className="eyebrow">IRPFM — imposto mínimo anual (estimativa)</span>
                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span>Base ampla (parcial)</span>
                    <span className="num">{brl(irpfm.base)}</span>
                  </div>
                  <div className="row row--between" style={{ marginTop: 6 }}>
                    <span>Alíquota mínima</span>
                    <span className="num">{pct(irpfm.rate)}</span>
                  </div>
                  <div className="row row--between" style={{ marginTop: 6 }}>
                    <span className="strong">IRPFM devido (após créditos)</span>
                    <span
                      className="num"
                      style={{
                        color: irpfm.devido > 0 ? "var(--coral-600)" : "var(--ink-900)",
                      }}
                    >
                      {brl(irpfm.devido)}
                    </span>
                  </div>
                  <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                    Estimativa: base soma dividendos (BR + exterior) + JCP + pró-labore + aluguéis
                    (faltam FII, RF isenta e ganhos). Acima de R$ 600 mil/ano a alíquota sobe até
                    10% (R$ 1,2 mi). Regra e base a validar com a área fiscal.
                  </p>
                </div>
              )}

              {gap && state.perfil && (
                <div className="card">
                  <span className="eyebrow">
                    Enquadramento — {PERFIL_LABELS[state.perfil].label}
                  </span>
                  <div style={{ marginTop: 12 }}>
                    <GapBars linhas={gap.linhas} />
                  </div>
                </div>
              )}

              {cmp && (
                <div className="card">
                  <span className="eyebrow">
                    Onde alocar {brl(state.comparar.valor || 0)} por {state.comparar.prazoMeses}{" "}
                    meses
                  </span>
                  <div className="col" style={{ gap: 6, marginTop: 12 }}>
                    {cmp.linhas.map((l) => (
                      <div key={l.nome} className="row row--between">
                        <span>
                          {l.nome}{" "}
                          <span className="subtle">
                            {l.isento ? "· isento" : `· IR ${pct(l.aliquotaIR)}`}
                          </span>
                        </span>
                        <span className="num tnum">{brl(l.liquido)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                  <div className="banner banner--info">
                    <span>
                      Melhor líquido: <strong>{cmp.vencedor.nome}</strong>
                      {cmp.diferenca > 0 ? ` — ${brl(cmp.diferenca)} acima do 2º.` : "."}
                    </span>
                  </div>
                </div>
              )}

              <div className="card">
                <span className="eyebrow">Memória de cálculo</span>
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Como cada imposto foi calculado — base, alíquota e referências legais.
                </p>
                <div className="divider" />
                <MemoriaCalculo blocos={imposto.blocos} />
              </div>

              <div className="card card--dark">
                <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>
                  Como se preparar
                </span>
                <ul style={{ margin: "12px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                  {tt.jaPaga && (
                    <li>
                      Já há fonte acima de {brl(GATILHO_MENSAL)}/mês: avalie escalonar os
                      pagamentos para reduzir a incidência mensal.
                    </li>
                  )}
                  {!tt.jaPaga && tt.anosAteComecar != null && tt.anosAteComecar <= 40 && (
                    <li>
                      Você tem ~{fmtAnos(tt.anosAteComecar)} antes de começar a pagar — dá tempo
                      de planejar a distribuição.
                    </li>
                  )}
                  {cmp && cmp.vencedor.isento && (
                    <li>
                      Para o novo aporte, um isento ({cmp.vencedor.nome}) rende mais líquido neste
                      prazo.
                    </li>
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
            </>
          )}

          {/* ════════════════════════════════════════
              VISÃO COMERCIAL
              ════════════════════════════════════════ */}
          {visao === "comercial" && (
            <>
              {/* Antes / Depois */}
              <div className="card" style={{ padding: 32 }}>
                <span className="eyebrow">Impacto do planejamento</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    gap: 24,
                    marginTop: 20,
                    alignItems: "center",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                      Hoje (sem plano)
                    </div>
                    <div className="num num-xl" style={{ color: "var(--coral-600)" }}>
                      {brl(imposto.total)}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      imposto anual estimado
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--ink-300)",
                      fontSize: 28,
                      fontWeight: 300,
                    }}
                  >
                    →
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                      Com planejamento
                    </div>
                    <div
                      className="num num-xl"
                      style={{ color: benefit.total > 0 ? "var(--green-800)" : "var(--ink-900)" }}
                    >
                      {brl(impostoComPlano)}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      imposto anual estimado
                    </div>
                  </div>
                </div>
                {benefit.total > 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 20,
                      padding: "16px 0 0",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span className="eyebrow">economia potencial anual</span>
                    <div className="num num-lg" style={{ color: "var(--green-800)", marginTop: 4 }}>
                      {brl(benefit.total)}
                    </div>
                  </div>
                )}
              </div>

              {/* O que fazer */}
              {benefit.movimentos.length > 0 && (
                <div className="card">
                  <span className="eyebrow">O que fazer</span>
                  <div className="col" style={{ gap: 0, marginTop: 12 }}>
                    {benefit.movimentos.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                          padding: "14px 0",
                          borderBottom:
                            i < benefit.movimentos.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "var(--coral-50)",
                            border: "1px solid var(--coral-100)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--coral-700)",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{m.titulo}</div>
                          {m.nota && (
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {m.nota}
                            </div>
                          )}
                        </div>
                        <div
                          className="num"
                          style={{ color: "var(--green-800)", whiteSpace: "nowrap" }}
                        >
                          + {brl(m.economia)}/ano
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projeção resumida */}
              <div className="card" style={{ textAlign: "center", padding: 28 }}>
                <span className="eyebrow">Quando começa a incidir o imposto sobre dividendos</span>
                <div className="num num-xl" style={{ color: heroColor, marginTop: 10 }}>
                  {heroBig}
                </div>
                <p
                  className="muted"
                  style={{ marginTop: 8, maxWidth: 480, marginInline: "auto" }}
                >
                  {heroSub}
                </p>
              </div>

              {/* Comparador (vencedor em destaque) */}
              {cmp && (
                <div className="card">
                  <span className="eyebrow">
                    Melhor opção para {brl(state.comparar.valor || 0)}
                  </span>
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{cmp.vencedor.nome}</div>
                    <div className="num num-lg" style={{ marginTop: 6 }}>
                      {brl(cmp.vencedor.liquido)}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      líquido em {state.comparar.prazoMeses} meses
                    </div>
                    {cmp.diferenca > 0 && (
                      <div style={{ marginTop: 8, color: "var(--green-800)", fontSize: 13 }}>
                        {brl(cmp.diferenca)} a mais que a segunda opção
                      </div>
                    )}
                  </div>
                  <div
                    className="col"
                    style={{ gap: 6, borderTop: "1px solid var(--border)", paddingTop: 12 }}
                  >
                    {cmp.linhas.map((l, i) => (
                      <div key={l.nome} className="row row--between" style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: i === 0 ? 600 : 400 }}>{l.nome}</span>
                        <span className="tnum" style={{ fontWeight: i === 0 ? 600 : 400 }}>
                          {brl(l.liquido)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enquadramento */}
              {gap && state.perfil && (
                <div className="card">
                  <span className="eyebrow">
                    Carteira vs. perfil {PERFIL_LABELS[state.perfil].label}
                  </span>
                  <div style={{ marginTop: 12 }}>
                    <GapBars linhas={gap.linhas} />
                  </div>
                  {gap.linhas.some((l) => l.acao !== "ok") && (
                    <div className="banner banner--info" style={{ marginTop: 12 }}>
                      <span>
                        Há classes fora do alvo — direcionar próximos aportes pode corrigir o
                        desvio gradualmente.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Próximos passos */}
              <div className="card card--dark">
                <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>
                  Próximos passos
                </span>
                <ol style={{ margin: "12px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
                  {benefit.movimentos.slice(0, 2).map((m, i) => (
                    <li key={i}>{m.titulo}</li>
                  ))}
                  {!tt.jaPaga && tt.anosAteComecar != null && tt.anosAteComecar <= 40 && (
                    <li>
                      Planejar a distribuição antes de cruzar {brl(GATILHO_MENSAL)}/mês por fonte.
                    </li>
                  )}
                  <li>Revisar anualmente com os valores reais de dividendos.</li>
                </ol>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════
              VISÃO SIMPLIFICADA
              ════════════════════════════════════════ */}
          {visao === "simplificada" && (
            <>
              {/* Semáforo + número */}
              <div className="card" style={{ textAlign: "center", padding: 48 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: semaforo.cor,
                    margin: "0 auto 14px",
                    boxShadow: `0 0 0 8px ${semaforo.cor}1A`,
                  }}
                />
                <span className="eyebrow">{semaforo.label}</span>
                <div
                  className="num num-2xl"
                  style={{ marginTop: 10, color: semaforo.cor }}
                >
                  {brl(imposto.total)}
                </div>
                <div className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                  em impostos por ano (estimativa)
                </div>
                <p
                  style={{
                    marginTop: 18,
                    maxWidth: 400,
                    marginInline: "auto",
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--ink-700)",
                  }}
                >
                  {semaforo.frase}
                </p>
              </div>

              {/* Benefício */}
              {benefit.total > 0 && (
                <div className="card card--coral" style={{ textAlign: "center", padding: 36 }}>
                  <span className="eyebrow" style={{ color: "rgba(255,255,255,.85)" }}>
                    Com planejamento, você pode economizar
                  </span>
                  <div
                    className="num num-xl"
                    style={{ color: "var(--white)", marginTop: 10 }}
                  >
                    {brl(benefit.total)}/ano
                  </div>
                  <p
                    style={{
                      color: "rgba(255,255,255,.9)",
                      marginTop: 10,
                      fontSize: 14,
                      maxWidth: 380,
                      marginInline: "auto",
                    }}
                  >
                    Sua carga tributária cairia de {brl(imposto.total)} para aproximadamente{" "}
                    {brl(impostoComPlano)}/ano.
                  </p>
                </div>
              )}

              {/* Resumo em linguagem simples */}
              <div className="card">
                <span className="eyebrow">Em resumo</span>
                <ul
                  style={{
                    margin: "12px 0 0",
                    paddingLeft: 18,
                    lineHeight: 1.85,
                    fontSize: 14.5,
                  }}
                >
                  {tt.jaPaga ? (
                    <li>
                      Já há dividendos acima do limite mensal — o imposto de 10% já incide agora.
                    </li>
                  ) : tt.anosAteComecar != null && tt.anosAteComecar <= 40 ? (
                    <li>
                      O imposto sobre dividendos deve entrar em{" "}
                      {fmtAnos(tt.anosAteComecar)} — ainda dá tempo de se preparar.
                    </li>
                  ) : (
                    <li>
                      Nenhuma fonte de dividendos está próxima do limite no horizonte de 40 anos.
                    </li>
                  )}
                  {cmp && cmp.vencedor.isento && (
                    <li>
                      Para novos aportes, títulos isentos como {cmp.vencedor.nome} são mais
                      eficientes neste prazo.
                    </li>
                  )}
                  {gap && gap.linhas.some((l) => l.acao !== "ok") && (
                    <li>
                      A carteira tem desvios em relação ao perfil{" "}
                      {state.perfil ? PERFIL_LABELS[state.perfil].label : ""} — pequenos ajustes
                      nos aportes resolvem gradualmente.
                    </li>
                  )}
                  <li>
                    Todos os números são estimativas — a validação com especialista tributário é
                    recomendada antes de qualquer decisão.
                  </li>
                </ul>
              </div>

              <p className="subtle" style={{ fontSize: 12, textAlign: "center" }}>
                Planejamento tributário · Suno Consultoria · 2026
              </p>
            </>
          )}

          <p className="subtle" style={{ fontSize: 12, textAlign: "center" }}>
            Estimativa de planejamento — validar com a área fiscal antes de uso com o cliente.
          </p>
        </div>
      </main>
    </div>
  );
}
