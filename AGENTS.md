# Vaqit.ai

## Propósito
Webapp de uso puntual que interpreta la descripción en lenguaje natural (o carga manual) de un gasto grupal y calcula la matriz óptima de transferencias (quién le debe a quién) para compartir por WhatsApp. Sin cuentas, login ni historial persistente.

## Stack
- Next.js 14 (React) con API routes — sin backend separado.
- Node.js 20 LTS.
- TypeScript.
- Proveedor de IA/LLM: TBD (aún no decidido).
- Framework de testing: TBD (aún no decidido).

## Cómo correr
- Instalar: `npm install`
- Levantar en desarrollo: `npm run dev`
- Tests: TBD — no hay framework de testing elegido todavía.

## Qué NO hacer
- No agregar cuentas, login, ni persistencia de grupos/historial entre sesiones (fuera de alcance del MVP, PRD sección "Fuera de Alcance").
- No implementar OCR/escaneo de tickets o comprobantes; toda la ingesta es texto libre, voz o formulario manual.
- No integrar pasarelas de pago reales (Mercado Pago, Stripe, MODO, bancos); el sistema solo calcula y genera un resumen para compartir, nunca ejecuta transferencias.
