export function brl(n: number): string {
  return (n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function brl2(n: number): string {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(n: number, frac = 1): string {
  return (
    (n * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: frac,
    }) + "%"
  );
}
