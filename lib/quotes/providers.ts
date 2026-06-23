// Conectores de cotação gratuitos
// AwesomeAPI: câmbio USD/BRL
// Status Invest: B3 (ações, FIIs, ETFs BR) — endpoints público de histórico
// Stooq: ativos exterior US/UK

export interface QuoteResult {
  input: string;
  price: number | null;
  currency: string | null;
  source: "awesomeapi" | "statusinvest" | "stooq" | "fallback";
  asOf: string | null;
  error?: string;
}

export interface FxResult {
  pair: string;
  rate: number | null;
  source: "awesomeapi" | "fallback";
  asOf: string | null;
}

const FETCH_TIMEOUT_MS = 6000;
const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TaxFlowAdvisor/0.1",
  Accept: "application/json,text/csv,*/*",
};

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms),
    ),
  ]);
}

// === AwesomeAPI: câmbio ===
export async function fetchUsdBrl(): Promise<FxResult> {
  try {
    const res = await withTimeout(
      fetch("https://economia.awesomeapi.com.br/last/USD-BRL", {
        headers: COMMON_HEADERS,
        next: { revalidate: 300 },
      }),
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as {
      USDBRL?: { bid?: string; ask?: string; create_date?: string };
    };
    const bid = parseFloat(json.USDBRL?.bid ?? "");
    const ask = parseFloat(json.USDBRL?.ask ?? "");
    const rate = Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : null;
    return {
      pair: "USDBRL",
      rate,
      source: rate ? "awesomeapi" : "fallback",
      asOf: json.USDBRL?.create_date ?? null,
    };
  } catch {
    return { pair: "USDBRL", rate: null, source: "fallback", asOf: null };
  }
}

// === Status Invest: B3 ===
type StatusInvestKind = "acao" | "fii" | "etf";

function classifyBrAsset(symbol: string): StatusInvestKind {
  const upper = symbol.toUpperCase();
  if (/^[A-Z]{4}11$/.test(upper)) {
    // Heuristic: 11 sufixo pode ser FII, ETF ou Unit. Vai cair em fallback se errar.
    if (
      /^(KNRI|BTLG|MXRF|HGLG|VINO|XPLG|HGCR|HGRU|RBRF|VISC|RECT|HCTR|VRTA|MCCI|RURA|KNCA|RBVA|MALL|GGRC|KNHY|VILG|XPML|HFOF|RBRR|JSRE|KNCR|HGRE|BTRA|TGAR)/.test(
        upper,
      )
    )
      return "fii";
    if (/^(BOVA|IVVB|SMAL|DIVO|IMAB|IRFM|BBSD|ECOO|ESGE|HASH|SPXI|FIND|BBSD)/.test(upper))
      return "etf";
    return "fii";
  }
  return "acao";
}

async function fetchStatusInvestPrice(symbol: string): Promise<QuoteResult> {
  const kind = classifyBrAsset(symbol);
  const url = `https://statusinvest.com.br/${kind}/tickerprice?ticker=${encodeURIComponent(
    symbol,
  )}&type=4`;
  try {
    const res = await withTimeout(
      fetch(url, { headers: COMMON_HEADERS, next: { revalidate: 600 } }),
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as Array<{
      prices?: Array<{ price: number; date: string }>;
    }>;
    const prices = json?.[0]?.prices ?? [];
    const last = prices[prices.length - 1];
    if (!last) throw new Error("no prices");
    return {
      input: symbol,
      price: last.price,
      currency: "BRL",
      source: "statusinvest",
      asOf: last.date ?? null,
    };
  } catch (err) {
    return {
      input: symbol,
      price: null,
      currency: "BRL",
      source: "fallback",
      asOf: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// === Stooq: exterior ===
function stooqSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper === "CSPX") return "cspx.uk";
  // Default US
  return `${upper.toLowerCase()}.us`;
}

async function fetchStooqPrice(symbol: string): Promise<QuoteResult> {
  const stooq = stooqSymbol(symbol);
  const url = `https://stooq.com/q/l/?s=${stooq}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const res = await withTimeout(
      fetch(url, { headers: COMMON_HEADERS, next: { revalidate: 600 } }),
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("no data row");
    const cols = lines[1].split(",");
    // Symbol,Date,Time,Open,High,Low,Close,Volume
    const date = cols[1];
    const close = parseFloat(cols[6]);
    if (!Number.isFinite(close) || date === "N/D") throw new Error("invalid price");
    const currency = stooq.endsWith(".uk") ? "USD" : "USD";
    return {
      input: symbol,
      price: close,
      currency,
      source: "stooq",
      asOf: date,
    };
  } catch (err) {
    return {
      input: symbol,
      price: null,
      currency: null,
      source: "fallback",
      asOf: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// === Orquestrador ===
const FOREIGN_HINTS = new Set([
  "AAPL",
  "MSFT",
  "NVDA",
  "VOO",
  "SCHD",
  "CSPX",
  "VNQ",
  "AGG",
  "GOOGL",
  "AMZN",
  "TSLA",
  "META",
  "BRK.B",
  "JPM",
  "JNJ",
  "WMT",
  "QQQ",
  "VTI",
  "VXUS",
]);

function isForeign(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (FOREIGN_HINTS.has(upper)) return true;
  // Tickers BR têm 4 letras + 1-2 dígitos (PETR4, KNRI11)
  return !/^[A-Z]{4}\d{1,2}$/.test(upper);
}

export async function fetchQuotes(symbols: string[]): Promise<QuoteResult[]> {
  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  return Promise.all(
    unique.map((sym) =>
      isForeign(sym) ? fetchStooqPrice(sym) : fetchStatusInvestPrice(sym),
    ),
  );
}
