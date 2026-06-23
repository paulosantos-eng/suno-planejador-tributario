import Link from "next/link";
import { SunoLockup } from "@/components/suno-lockup";

export default function Home() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <SunoLockup />
          <div className="topbar__context">
            <span className="topbar__title">Planejador Tributário</span>
            <span className="topbar__subtitle">Dividendos · Lei 15.270/2025</span>
          </div>
        </div>
      </header>

      <main className="page page--narrow" style={{ paddingTop: 56 }}>
        <div
          className="col"
          style={{ gap: 22, alignItems: "center", textAlign: "center" }}
        >
          <span className="eyebrow">Suno · Planejamento Tributário</span>
          <h1 style={{ fontSize: 40, lineHeight: 1.12, maxWidth: 580 }}>
            Quanto seu cliente vai pagar de imposto sobre dividendos?
          </h1>
          <p className="muted" style={{ maxWidth: 480, fontSize: 16 }}>
            Em poucos passos, projete a tributação de dividendos do próximo ano
            (Lei 15.270/2025), enquadre o perfil e compare onde alocar para pagar
            menos.
          </p>
          <Link href="/fluxo/1" className="btn btn--primary btn--lg">
            Começar
          </Link>
          <div
            className="banner banner--warn"
            style={{ maxWidth: 540, textAlign: "left", marginTop: 18 }}
          >
            <span>
              Estimativa de planejamento. Os números devem ser validados com a
              área fiscal responsável antes de qualquer uso com o cliente.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
