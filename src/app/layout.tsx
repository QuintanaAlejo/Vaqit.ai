import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

// DM Sans es el sustituto declarado de Cosmica en DESIGN.md.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
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
    <html lang="es-AR" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
