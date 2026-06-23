import Link from "next/link";
import { SunoLockup } from "@/components/suno-lockup";

export default function FluxoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <Link href="/" aria-label="Início">
            <SunoLockup />
          </Link>
          <div className="topbar__context">
            <span className="topbar__title">Planejador Tributário</span>
            <span className="topbar__subtitle">Dividendos · Lei 15.270/2025</span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
