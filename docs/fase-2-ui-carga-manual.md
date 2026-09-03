# Fase 2 — Interfaz y carga manual

## Objetivo

Dejar la app usable de punta a punta **sin la IA**. Eso satisface RF-17 (carga 100% manual como
respaldo) y da un producto demostrable antes de depender de un proveedor externo.

## Qué se hizo

### Primitivos de UI (`src/shared/ui/`)

`Button` con las tres variantes de `DESIGN.md`, `Card` como superficie elevada por borde hairline, y
`Field` con `Input`, `Select`, `Label`, `Mensaje` e `IconoAlerta`. El ícono de alerta es un SVG
inline: no se agregó ninguna librería de iconos para un solo glifo.

### Flujo (`src/features/expense-form/`)

- `ui/FlujoGasto.tsx`: orquesta los tres pasos —entrada, formulario, resultado— y es el único
  componente con estado del paso actual.
- `ui/FormularioGasto.tsx`: el formulario editable de RF-11, con el resaltado de campos ambiguos y
  el botón de confirmar deshabilitado mientras haya errores de validación.
- `ui/useBorradorSesion.ts`: reducer del borrador, con las acciones de editar gasto, agregar y
  quitar gastos y participantes, cambiar el modo de reparto y renombrar.
- `domain/borrador.ts`: construcción del borrador vacío, listado de participantes de la sesión, y
  el renombrado de un participante en todos los gastos a la vez (RF-05).

### Entrada y resultado

- `expense-parsing/ui/EntradaTexto.tsx`: pantalla de ingreso que ofrece siempre las dos vías, el
  texto libre y la carga manual.
- `expense-parsing/domain/contract.ts`: schemas Zod del contrato del endpoint, compartidos por los
  dos lados del límite HTTP.
- `expense-parsing/api/parseExpenseClient.ts`: cliente tipado del endpoint.
- `settlement/ui/ResultadoTransferencias.tsx`: la matriz de transferencias más el saldo neto de cada
  participante, para que se entienda de dónde salieron esos movimientos.

## Decisiones

**Los montos se guardan dos veces, a propósito.** El reducer mantiene el número parseado en el
borrador (lo que consume el dominio) y el texto crudo aparte (lo que el usuario está tipeando). Sin
el texto crudo, un input controlado por el número parseado pelea con el usuario mientras escribe
`"60.0"` camino a `"60.000"`. El dominio sigue viendo solo centavos.

**El cliente HTTP quedó en `api/`, no en `data/`.** `AGENTS.md` pide que `ui` nunca importe de
`data`, pero también que `domain` sea puro sin fetch. Para un `fetch` del browser al propio route
handler las dos reglas se contradicen. Se resolvió ubicando el cliente en `api/`, que es el límite
HTTP de la feature: así el flujo queda `ui → api → (servidor) → data` y ninguna regla se rompe.

**El estado vive solo en memoria.** No se usa `localStorage` ni `sessionStorage`: recargar la página
empieza de cero, que es el comportamiento efímero que define el PRD.

## Verificación

- Se levantó el servidor de desarrollo y se confirmó HTTP 200 con los elementos clave renderizados.
- Como el endpoint de IA todavía no existía en esta fase, el `POST` devolvía 404 y el cliente lo
  convertía en el mensaje de fallback a carga manual. Es decir, **el camino de error de AC-05 y
  AC-09 quedó ejercitado desde esta fase**, en lugar de tener UI muerta.
- 13 tests nuevos (65 en total), entre ellos `flujoCompleto.test.ts`, que recorre exactamente el
  camino que hace la UI —borrador con montos tipeados como strings, validación, conversión, saldos,
  transferencias y resumen— para AC-01, AC-08, AC-10, AC-13 y AC-14.

### Pendiente de esta fase

El recorrido interactivo con clicks en un browser real. Se verificó el render del servidor y toda la
lógica que esos clicks disparan, pero no el click en sí: requeriría agregar Playwright como
dependencia.
