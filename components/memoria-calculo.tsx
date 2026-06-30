import type { MemoBloco } from "@/lib/memoria-calculo";
import { brl } from "@/lib/format";

export function MemoriaCalculo({ blocos }: { blocos: MemoBloco[] }) {
  if (!blocos.length) {
    return <p className="muted">Sem impostos lançados ainda.</p>;
  }
  return (
    <div className="col" style={{ gap: 16 }}>
      {blocos.map((b, i) => (
        <div key={i} className="col" style={{ gap: 4 }}>
          <div className="row row--between">
            <span className="strong">{b.titulo}</span>
            <span className="num">{brl(b.total)}</span>
          </div>
          <span className="subtle" style={{ fontSize: 11 }}>
            {b.refLegal}
          </span>
          <div className="col" style={{ gap: 3, marginTop: 4 }}>
            {b.steps.map((s, j) => (
              <div key={j} className="row row--between" style={{ fontSize: 12.5 }}>
                <span className="muted">{s.label}</span>
                {s.valor != null && <span className="tnum">{brl(s.valor)}</span>}
              </div>
            ))}
          </div>
          {b.nota && (
            <span className="subtle" style={{ fontSize: 11, marginTop: 2 }}>
              {b.nota}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
