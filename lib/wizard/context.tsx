"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type WizardState, initialState } from "./types";

const STORAGE_KEY = "suno-planejador:v1";

interface WizardContextValue {
  state: WizardState;
  setState: (updater: (s: WizardState) => WizardState) => void;
  hydrated: boolean;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setRaw] = useState<WizardState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  // Carrega do localStorage uma vez (cliente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRaw({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignora storage corrompido */
    }
    setHydrated(true);
  }, []);

  // Persiste a cada mudança, após hidratar.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage cheio/indisponível — segue sem persistir */
    }
  }, [state, hydrated]);

  const setState = (updater: (s: WizardState) => WizardState) => setRaw(updater);
  const reset = () => setRaw(initialState);

  return (
    <WizardContext.Provider value={{ state, setState, hydrated, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard precisa estar dentro de <WizardProvider>");
  return ctx;
}
