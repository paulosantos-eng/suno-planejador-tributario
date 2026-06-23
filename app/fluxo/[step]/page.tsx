"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStep, TOTAL_STEPS } from "@/lib/wizard/steps";
import { useWizard } from "@/lib/wizard/context";
import { isStepValid, firstIncompleteStep } from "@/lib/wizard/types";
import { StepCliente } from "@/components/steps/step-cliente";
import { StepPerfil } from "@/components/steps/step-perfil";
import { StepDividendos } from "@/components/steps/step-dividendos";
import { StepAlocacao } from "@/components/steps/step-alocacao";
import { StepComparar } from "@/components/steps/step-comparar";

export default function FluxoStepPage() {
  const params = useParams<{ step: string }>();
  const router = useRouter();
  const { state, hydrated } = useWizard();
  const n = Number(params.step);
  const step = getStep(n);

  // Guarda do funil linear: não pode pular etapa incompleta.
  useEffect(() => {
    if (!hydrated) return;
    if (!step) {
      router.replace("/fluxo/1");
      return;
    }
    const firstIncomplete = firstIncompleteStep(state);
    if (n > firstIncomplete) router.replace(`/fluxo/${firstIncomplete}`);
  }, [hydrated, step, n, state, router]);

  if (!step) return null;

  const progresso = Math.round((n / TOTAL_STEPS) * 100);
  const isFirst = n === 1;
  const isLast = n === TOTAL_STEPS;
  const canAdvance = isStepValid(n, state);

  return (
    <main className="page page--narrow">
      <div className="col" style={{ gap: 22 }}>
        <div>
          <div className="row row--between">
            <span className="eyebrow">
              Etapa {n} de {TOTAL_STEPS}
            </span>
            <span className="muted tnum" style={{ fontSize: 12 }}>
              {progresso}%
            </span>
          </div>
          <div className="progress" style={{ marginTop: 8 }}>
            <div className="progress__bar" style={{ width: `${progresso}%` }} />
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 26 }}>{step.title}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {step.why}
          </p>
        </div>

        {n === 1 && <StepCliente />}
        {n === 2 && <StepPerfil />}
        {n === 3 && <StepDividendos />}
        {n === 4 && <StepAlocacao />}
        {n === 5 && <StepComparar />}

        <div className="row row--between" style={{ marginTop: 8 }}>
          <button
            className="btn btn--secondary"
            disabled={isFirst}
            onClick={() => router.push(`/fluxo/${n - 1}`)}
          >
            Voltar
          </button>
          {isLast ? (
            <button
              className="btn btn--primary"
              disabled={!canAdvance}
              onClick={() => router.push("/resultado")}
            >
              Gerar resultado
            </button>
          ) : (
            <button
              className="btn btn--primary"
              disabled={!canAdvance}
              onClick={() => router.push(`/fluxo/${n + 1}`)}
            >
              Próximo
            </button>
          )}
        </div>
        {!canAdvance && (
          <p className="subtle" style={{ fontSize: 12, textAlign: "right", marginTop: -8 }}>
            Preencha esta etapa para continuar.
          </p>
        )}
      </div>
    </main>
  );
}
