# Fase 0 — Scaffold y sistema visual

## Objetivo

Levantar el proyecto desde cero con el stack de `AGENTS.md` y dejar los tokens de `DESIGN.md`
aplicados, para que las fases siguientes solo agreguen funcionalidad.

## Qué se hizo

- Inicialización del proyecto con **pnpm**: `package.json` con los scripts `dev`, `build`, `test`,
  `typecheck`, `lint`, `format`.
- Configuración de TypeScript en modo estricto, con `noUncheckedIndexedAccess` activado porque el
  motor de transferencias indexa arrays y conviene que el compilador lo verifique.
- Configuración de Next 16 (App Router), Tailwind v4 vía PostCSS, Vitest, ESLint y Prettier.
- Estructura de carpetas por feature según `AGENTS.md`: `src/features/<feature>/{ui,domain,data,api}`
  más `src/shared/{domain,ui}`.
- `src/app/globals.css` con el bloque `@theme` de Tailwind v4 conteniendo la paleta, los radios y la
  escala tipográfica de `DESIGN.md`.
- **DM Sans** cargada con `next/font/google` como sustituto de Cosmica (que no es distribuible
  públicamente), expuesta bajo la variable `--font-cosmica` para no romper la nomenclatura del
  style guide.
- `.env.example` documentando las variables del proveedor de IA, y `.gitignore`.

## Decisión de diseño registrada en `DESIGN.md`

`DESIGN.md` fue capturado de un sitio editorial desktop (titulares de 64px, ancho de 1200px), pero
el flujo de Vaqit.ai se completa en el celular (RNF-06). Se agregó al propio documento la sección
**"Adaptación mobile-first (Vaqit.ai)"**, que deja asentado:

- Qué se conserva sin cambios: la paleta zinc completa y sus roles, la elevación por borde hairline
  en lugar de drop shadow, los radios nombrados y la familia tipográfica única.
- Qué se adapta: escala tipográfica fluida con `clamp()`, ancho de contenido de 560px para el
  wizard, padding de card de 20px en mobile y 28px en desktop, inputs a 16px mínimo (por debajo de
  eso iOS Safari hace zoom al enfocar) y controles de 44px de alto mínimo.
- La única extensión cromática permitida: tres tokens `--color-alert-*` para el resaltado en rojo
  claro que AC-01 y AC-07 exigen sobre el placeholder "Vos" y los campos ambiguos. El sistema
  original es acromático y su único acento (`--color-ember`) está reservado a badges.

## Desvíos respecto de `AGENTS.md`

| Declarado | Instalado | Motivo |
|-----------|-----------|--------|
| Node 24 | 22.23.0 | Es lo disponible en el entorno; Next 16 funciona igual |
| TypeScript 6 | 6.0.3 | Se intentó con 7.0.2 y hubo que bajar: `typescript-eslint` todavía no soporta TS 7 |
| ESLint (sin versión) | 9.39.5 | ESLint 10 rompe: `eslint-plugin-react` 7.37.x usa `context.getFilename()`, eliminado en la 10 |

Dos ajustes menores: se descartó `FlatCompat` porque `eslint-config-next` 16 ya exporta flat configs
nativos, y se habilitó el build script de `unrs-resolver` (el resolver nativo que ESLint necesita
para resolver imports).

No se agregó ninguna librería fuera del stack declarado. En particular se descartó `neverthrow`: el
manejo de errores usa clases propias sobre `AppError`, que es lo que `AGENTS.md` permite sin
justificar una dependencia nueva.

## Verificación

`pnpm build`, `pnpm exec tsc --noEmit` y `pnpm exec eslint .` en verde.
