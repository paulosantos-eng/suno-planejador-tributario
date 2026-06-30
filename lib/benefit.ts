// Benefício fiscal (asset location). Estimativa — validar com a área fiscal.
// Duas frentes: (A) migrar renda fixa tributável da carteira para isenta;
// (B) escalonar distribuição/dividendo para não cruzar os R$ 50k/mês.
import { runForecast, GATILHO_MENSAL, ALIQUOTA } from "@/lib/forecast";
import { brl } from "@/lib/format";
import type { WizardState } from "@/lib/wizard/types";

export interface BenefitMove {
  titulo: string;
  economia: number;
  nota?: string;
}
export interface BenefitResult {
  carteira: number; // economia anual de IR migrando RF tributável → isenta
  escalonamento: number; // economia anual escalonando distribuição/dividendo
  total: number;
  movimentos: BenefitMove[];
}

export function beneficioFiscal(state: WizardState): BenefitResult {
  const movimentos: BenefitMove[] = [];

  // A. Asset location: renda fixa tributável → isenta (LCI/LCA, CRI/CRA).
  const patrimonio = state.cliente.patrimonio ?? 0;
  const rfPct = (state.alocacao["Renda Fixa"] ?? 0) / 100;
  const valorRF = patrimonio * rfPct;
  const cdi = state.comparar?.cdiAA ?? 0.1425;
  const carteira = valorRF * cdi * 0.15; // IR (15% longo prazo) sobre o rendimento que ficaria isento
  if (carteira > 0) {
    movimentos.push({
      titulo: `Migrar renda fixa tributável (~${brl(valorRF)}) para isenta`,
      economia: carteira,
      nota: "Potencial: assume a RF rendendo ~CDI e hoje tributada. Respeitar liquidez e perfil.",
    });
  }

  // B. Escalonar distribuição/dividendo p/ não cruzar 50k/mês.
  const fc = runForecast(state.dividendos, 1);
  let escalonamento = 0;
  for (const f of fc.fontes) {
    if (!f.cruzaGatilho) continue;
    const spreadMensal = f.anual / 12;
    const spreadIrrf = spreadMensal > GATILHO_MENSAL ? f.anual * ALIQUOTA : 0; // já espalhado, ainda cruza?
    const economia = Math.max(0, f.irrf - spreadIrrf);
    if (economia > 0) {
      escalonamento += economia;
      movimentos.push({
        titulo: `Distribuir "${f.source.nome}" em parcelas ≤ ${brl(GATILHO_MENSAL)}/mês`,
        economia,
      });
    }
  }

  return { carteira, escalonamento, total: carteira + escalonamento, movimentos };
}
