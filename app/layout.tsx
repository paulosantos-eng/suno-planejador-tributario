import type { Metadata } from "next";
import "./globals.css";
import { WizardProvider } from "@/lib/wizard/context";

export const metadata: Metadata = {
  title: "Planejador Tributário de Dividendos — Suno",
  description:
    "Previsão da tributação de dividendos (Lei 15.270/2025), enquadramento por perfil e comparação de ativos por eficiência fiscal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-vibe="institutional">
      <body>
        <WizardProvider>{children}</WizardProvider>
      </body>
    </html>
  );
}
