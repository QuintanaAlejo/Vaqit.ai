# AGENTS.md — project context

## Language

**Always respond in the language the user writes in.** Write every artifact you produce — PRDs,
specs, ADRs, reports, commit messages, status lines — in that same language, regardless of the
language these instructions are written in.

> Working language: `Spanish — write all artifacts in Spanish`

---

## What this project is

Vaqit.ai: webapp de uso puntual. El usuario entra, describe el gasto grupal en lenguaje natural (o
lo carga manualmente), el sistema calcula quién le debe a quién según el consumo real de cada
persona (no necesariamente equitativo), y el usuario comparte el resultado por WhatsApp. Sin
cuentas, login ni historial persistente entre sesiones.

**Reference PRD:** `PRD.md`

---

## Stack

| Field | Value |
|-------|-------|
| Language | TypeScript 6 |
| Runtime | Node 24 |
| Framework | Next.js 16 |
| Database | N/A |
| Test runner | Vitest |
| Linter / formatter | ESLint + Prettier |
| Package manager | pnpm |
| Typecheck | tsc --noEmit |
| Lint | eslint . |

## Cómo correr

- Instalar: `pnpm install`
- Levantar en desarrollo: `pnpm dev`
- Tests: `pnpm test` (Vitest)
- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `pnpm exec eslint .`

---

## Architecture conventions

- **Folder structure:** `src/features/<feature>/` con subcarpetas `ui/`, `domain/`, `data/`, `api/` (route handlers de Next). Cada feature es autocontenida; nada de un `components/` gigante compartido salvo primitivos de UI genéricos (`src/shared/ui/`).
- **Layer separation:** `ui` solo renderiza y dispara acciones; `domain` tiene la lógica de negocio pura (sin fetch, sin React); `data` habla con la DB/API externa (fetch a un LLM, etc.) y expone funciones tipadas. `ui` nunca importa de `data` directamente, siempre pasa por `domain`.
- **Error handling:** errores tipados con clases propias (`class LLMTimeoutError extends AppError`) o un `Result<T, E>` tipo `neverthrow`. Ningún `catch {}` vacío ni `catch (e) { console.log(e) }`; todo error se propaga tipado o se loguea con contexto.
- **Naming:** camelCase para variables/funciones, PascalCase para componentes y tipos, `SCREAMING_SNAKE_CASE` para constantes/env vars. Archivos de componentes en PascalCase, el resto en camelCase o kebab-case (elegí uno y sé consistente).
- **Dependencies:** no se agrega ninguna librería nueva sin justificarla: qué problema resuelve, alternativas consideradas (¿se puede hacer con lo que ya está?), tamaño de bundle si es client-side.

---

## Code conventions

- No `any`. Si es inevitable (tipos de alguna librería sin tipar, respuesta de un LLM sin schema), va con comentario explicando por qué y, si se puede, un `unknown` + type guard en vez de `any`.
- Funciones puras en `domain`; los efectos secundarios (fetch, DB, llamadas a la API del LLM) viven en `data` o en route handlers.
- Comentarios solo cuando el *por qué* no es obvio del código — nunca "// suma 1" arriba de `x + 1`. Especial atención acá con prompts de IA: si un prompt tiene una instrucción rara o un workaround, comentá por qué está.
- Validación de inputs con Zod en los límites del sistema (API routes, formularios, respuestas de LLM antes de parsearlas) — nunca confiar en que la respuesta del modelo viene con el shape esperado.
- Server Components por defecto; `"use client"` solo cuando hay estado o interactividad, y justificado.
- **LLM calls:** siempre tipadas con schema de salida (Zod/JSON schema); manejo explícito de timeout, rate limit y respuesta malformada como errores propios (no genéricos, no `catch` silencioso).
- **Prompts:** viven en archivos propios dentro de `domain/prompts/`, versionados y separados de la lógica que los usa, para poder iterarlos sin tocar código.
- **Simplicidad:** el código siempre lo más simple posible para resolver el problema actual — no se anticipan casos futuros ni se agrega abstracción "por las dudas". Se construye por capas de forma prolija: cada capa (`ui`, `domain`, `data`) hace una sola cosa y no se salta a la siguiente. Si una función necesita explicación larga para entenderse, se simplifica o se divide antes de mergear.

---

## What NOT to do in this project

- No agregar cuentas, login, ni persistencia de grupos/historial entre sesiones (fuera de alcance del MVP).
- No implementar OCR/escaneo de tickets o comprobantes; toda la ingesta es texto libre o formulario manual.
- No integrar pasarelas de pago reales (Mercado Pago, Stripe, MODO, bancos); el sistema solo calcula y genera un resumen para compartir, nunca ejecuta transferencias.

---

## Domain glossary

The terms specific to your product, so the agent uses them correctly instead of inventing synonyms.

Gasto: Un pago hecho por un pagador, por un monto, distribuido en uno o más consumos. Una sola descripción en lenguaje natural puede generar varios Gastos (ej. "previa", "cena" y "bebidas" pagados por personas distintas).

Pagador: La persona que puso la plata para un Gasto puntual. No es necesariamente quien más consumió; el sistema distingue explícitamente entre quién pagó y quién consumió.

Participante: Cualquier persona involucrada en el reparto de un Gasto, haya pagado o no. Se identifica por nombre o apodo mencionado en el texto libre.

Consumo: La porción de un Gasto que le corresponde a un participante específico (participante + monto). Puede ser equitativo (mismo monto para todos) o desigual, según lo que describa el texto.

"Vos" (placeholder): Nombre provisorio que el sistema asigna automáticamente cuando el texto habla en primera persona ("yo pagué", "puse"). Se resalta en rojo claro con ícono de alerta para forzar al usuario a reemplazarlo por su nombre real antes de compartir.

Saldo neto: Por cada participante, la diferencia entre lo que pagó (en todos los Gastos) y lo que consumió. Neto positivo = le deben; neto negativo = debe.

Consolidación de pagos cruzados: Sumar todos los Gastos de una sesión en un único saldo neto por persona, en vez de saldar cada Gasto por separado. Evita transferencias redundantes cuando varias personas pagaron cosas distintas: alguien puede terminar con saldo $0 aunque haya pagado y consumido en Gastos diferentes.

Matriz de transferencias / Transferencia: Lista de movimientos deudor → acreedor por un monto, calculada para saldar todos los saldos netos con el mínimo número de movimientos posible (algoritmo greedy: empareja al mayor deudor con el mayor acreedor sucesivamente).

Minimización de movimientos: Principio de diseño central: no generar una transferencia por cada Consumo individual, sino la cantidad mínima de Transferencias que salden la red completa de deudas.

Formulario editable: Pantalla intermedia obligatoria entre la interpretación de la IA y el cálculo, donde el usuario ve y corrige monto, pagador, participantes y consumos antes de calcular. Nunca se calcula directamente sobre lo que devolvió la IA sin pasar por acá.

Campo ambiguo: Dato que la IA no pudo resolver con certeza (nombre duplicado o participante no identificado). Se deja vacío/resaltado y bloquea la confirmación hasta que el usuario lo completa manualmente.

Carga manual: Flujo alternativo 100% por formulario, sin IA, para cuando el texto libre no se puede interpretar o falla el proveedor de IA. Es el fallback de respaldo, nunca el camino principal.

Resumen: Texto plano (sin markdown ni HTML) generado a partir de la matriz de transferencias, para pegar en WhatsApp sin que se rompa el formato en ningún cliente.

Sesión: Unidad de uso puntual y efímera. No hay cuentas ni login; tanto el uso de la IA como la ausencia de persistencia de datos se aplican a nivel sesión, no a nivel usuario.
