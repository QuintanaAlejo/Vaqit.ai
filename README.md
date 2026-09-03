# Vaqit.ai

Webapp de uso puntual para dividir gastos grupales. Contás el gasto en lenguaje natural, el sistema
calcula quién le debe a quién según el consumo real de cada persona y generás un resumen para
compartir por WhatsApp. Sin cuentas, sin login, sin historial.

Especificación: [`PRD.md`](./PRD.md) · Sistema visual: [`DESIGN.md`](./DESIGN.md) · Convenciones:
[`AGENTS.md`](./AGENTS.md)

## Cómo correr

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm test` | Vitest (una pasada) |
| `pnpm test:watch` | Vitest en watch |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |

## Variables de entorno

Copiá `.env.example` a `.env.local`:

| Variable | Requerida | Para qué |
|----------|-----------|----------|
| `OPENROUTER_API_KEY` | Para la interpretación por IA | Key de [OpenRouter](https://openrouter.ai/) |
| `OPENROUTER_MODEL` | No | Modelo a usar. Default: `minimax/minimax-m3:free` |

**La app funciona sin la key.** Sin ella, el endpoint responde `503 MISSING_CONFIG` y el usuario
completa el flujo por carga manual (RF-17), que no toca la IA en ningún punto.

## Arquitectura

```
src/
  app/                          Rutas de Next (App Router)
    api/parse-expense/          Endpoint de interpretación
  shared/
    domain/                     Modelo canónico: expense, money, split
    errors.ts                   Jerarquía de AppError
    ui/                         Primitivos del design system
  features/
    settlement/                 Cálculo y resultado
      domain/                   balances, transfers, summary, share
      ui/                       ResultadoTransferencias, AccionesCompartir
    expense-form/               Formulario editable y carga manual
      domain/                   borrador, validation
      ui/                       FlujoGasto, FormularioGasto, useBorradorSesion
    expense-parsing/            Interpretación por IA
      domain/                   contract, prompts, parseResponseSchema, normalizarGasto
      data/                     openRouterClient (único punto que habla con la IA)
      api/                      handler, rateLimit, parseExpenseClient
      ui/                       EntradaTexto
```

Separación de capas: `ui` renderiza y dispara acciones, `domain` es lógica pura (sin fetch, sin
React), `data` habla con servicios externos. `ui` nunca importa de `data`.

### Todos los montos son enteros en centavos

Se parsean con `parseMonto()` (`shared/domain/money.ts`) y no se vuelven a tocar como float. El
redondeo existe en un solo lugar: `repartirEquitativo()` (`shared/domain/split.ts`), que redondea la
parte de cada uno **al peso entero** y le deja el resto al pagador. Así el resumen que se comparte no
tiene centavos: sin esto, un gasto de $40.000 entre tres produce mensajes como
`"Rodri le debe $14.999,99"`, que se leen como un error aunque sean exactos.

El resto tiene que asignarse a alguien sí o sí: si la suma de los consumos no diera exactamente el
total, los saldos netos no cerrarían en cero y la matriz de transferencias quedaría descompensada.

### Los montos vuelven del modelo como texto

El prompt le pide explícitamente al modelo que **no** normalice números y devuelva el monto tal cual
aparece en el texto. Los modelos chicos se equivocan sistemáticamente leyendo `"60.000"` como 60. La
conversión la hace `parseMonto()`, testeado contra todos los formatos de RNF-05.

## Decisiones y limitaciones conocidas

**El rate limit es por proceso.** RNF-04 (5 interpretaciones cada 10 minutos por sesión) usa un
`Map` en memoria con la clave de una cookie `httpOnly`. En un deploy serverless multi-instancia el
límite es **por instancia** y se reinicia en cada cold start. Es una concesión deliberada a cambio
de no agregar infraestructura; si hace falta exactitud, se reemplaza
`features/expense-parsing/api/rateLimit.ts` por Vercel KV sin tocar a quien lo llama.

**No se persiste nada server-side** (RNF-07). El rate limit guarda únicamente timestamps: ningún
texto, monto ni nombre sobrevive al request. En el cliente el estado vive en memoria (ni
`localStorage` ni `sessionStorage`), así que recargar la página empieza de cero.

**El texto se envía a un tercero.** La interpretación depende de OpenRouter y del modelo elegido.
Su política de retención es una dependencia abierta del PRD: conviene revisarla antes de publicar.

**Un separador con tres dígitos a la derecha es de miles.** `"60.000"` son sesenta mil, lo que
implica que `"10,004"` se lee como diez mil cuatro y no como diez con cuatro milésimas. Es la
lectura correcta para montos en es-AR.

**El pagador absorbe el resto del redondeo.** Cuando un gasto no es divisible entre los
participantes, cada uno recibe una parte redondeada al peso y la diferencia (a lo sumo unos pesos) la
absorbe quien pagó. Es lo que mantiene el resumen libre de centavos sin que los saldos dejen de
cuadrar.

**Si los consumos no suman el total, se bloquea la confirmación.** El PRD no lo especifica; la
alternativa era que el pagador absorbiera la diferencia en silencio, que produce un resultado
sutilmente equivocado. El formulario muestra cuánto falta o sobra.

**`DESIGN.md` se aplica adaptado a mobile-first.** Los tokens se respetan tal cual; la escala
tipográfica y el ancho de contenido se adaptan. Ver la sección
[Adaptación mobile-first](./DESIGN.md#adaptación-mobile-first-vaqitai) de ese documento.

## Tests

```bash
pnpm test
```

Los criterios de aceptación del PRD están codificados con sus números exactos. Los más
significativos:

| Test | Verifica |
|------|----------|
| `settlement.test.ts` | AC-01, AC-02, AC-13 (saldo cero → cero transferencias), AC-14 (2 y no 3) |
| `money.test.ts` | AC-06 / RNF-05: todos los formatos numéricos |
| `validation.test.ts` | AC-07, AC-08, AC-10, AC-11: qué bloquea la confirmación |
| `summary.test.ts` | RF-14 / RNF-03: texto plano sin markdown |
| `share.test.ts` | RF-15 / AC-04: enlace `wa.me` |
| `rateLimit.test.ts` + `handler.test.ts` | RNF-04 / AC-12: el excedente no invoca al proveedor |
| `normalizarGasto.test.ts` | RF-04, AC-07/08/09/10: la ambigüedad se propaga como `null` |
| `flujoCompleto.test.ts` | Integración: borrador → validación → cálculo → resumen |
| `iaReal.test.ts` | Verificación contra el proveedor de IA real (opt-in, ver abajo) |

### Verificación contra la IA real

`iaReal.test.ts` es la única suite que sale a la red y está apagada por defecto: sin
`OPENROUTER_API_KEY` en el entorno se saltea entera, así que `pnpm test` sigue siendo offline y
determinista. Para correrla:

```bash
set -a; . ./.env.local; set +a
pnpm exec vitest run iaReal
```

Recorre la cadena completa —proveedor, normalización, validación, cálculo y resumen— con los textos
literales del PRD. Es lo que detecta una regresión del prompt o un cambio de comportamiento del
modelo, que ningún test con respuestas simuladas puede ver.

**Sobre el AC-02:** el PRD dice "$20.000 por persona", pero $40.000 y $5.000 no son divisibles por
3. Como el reparto redondea al peso, los saldos caen a unos pesos de la cifra redonda. El test
compara con tolerancia y verifica en cambio el invariante que sí es exacto: la suma de todos los
saldos netos da cero.

**Sobre la latencia:** los modelos gratuitos de OpenRouter superan de vez en cuando el timeout de 9
segundos del cliente. No es un fallo de la app —el usuario recibe el error y la carga manual como
salida— pero volvería inutilizable a esta suite, así que reintenta hasta tres veces antes de dar un
caso por perdido.
