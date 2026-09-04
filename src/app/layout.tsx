import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

// DM Sans es el sustituto declarado de Cosmica en DESIGN.md.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Excepcion puntual a la regla de una sola familia tipografica: solo se usa
// dentro de la tarjeta de cada gasto, para que se lea como el ticket impreso
// que el nombre evoca (ver --font-ticket en globals.css).
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vaqit.ai — Dividí gastos en segundos",
  description:
    "Contá el gasto del grupo en tus palabras y te decimos quién le debe a quién, con la mínima cantidad de transferencias.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f4f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${dmSans.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
