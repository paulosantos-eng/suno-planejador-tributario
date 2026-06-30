import type { GapLine } from "@/lib/profile";
import { pct } from "@/lib/format";

// Barras por classe: preenchimento = % atual; traço preto = alvo Suno do perfil.
export function GapBars({ linhas }: { linhas: GapLine[] }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      {linhas.map((l) => {
        const atual = Math.max(0, Math.min(1, l.atualPct));
        const alvo = Math.max(0, Math.min(1, l.alvoPct));
        const cor = l.acao === "ok" ? "var(--ink-900)" : "var(--coral-600)";
        const acaoLabel =
          l.acao === "ok" ? "ok" : l.acao === "aumentar" ? "↑ aumentar" : "↓ reduzir";
        return (
          <div key={l.classe} className="col" style={{ gap: 5 }}>
            <div className="row row--between" style={{ fontSize: 13 }}>
              <span className="strong">{l.classe}</span>
              <span className="row" style={{ gap: 8 }}>
                <span className="muted tnum">
                  {pct(l.atualPct)} → {pct(l.alvoPct)}
                </span>
                <span className={"chip " + (l.acao === "ok" ? "" : "chip--amber")}>
                  {acaoLabel}
                </span>
              </span>
            </div>
            <div
              style={{
                position: "relative",
                height: 8,
                background: "var(--ink-100)",
                borderRadius: 999,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${atual * 100}%`,
                  background: cor,
                  borderRadius: 999,
                }}
              />
              <div
                title={`alvo ${pct(l.alvoPct)}`}
                style={{
                  position: "absolute",
                  left: `calc(${alvo * 100}% - 1px)`,
                  top: -2,
                  height: 12,
                  width: 2,
                  background: "var(--ink-900)",
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="subtle" style={{ fontSize: 11 }}>
        Barra = % atual da carteira · traço preto = alvo Suno do perfil.
      </p>
    </div>
  );
}
