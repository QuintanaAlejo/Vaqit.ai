# Fase 3 — Interpretación por IA y rate limit

## Objetivo

Agregar el camino principal del producto: convertir una descripción en lenguaje natural en datos
estructurados de gasto, sin que una respuesta mala del modelo pueda producir un cálculo equivocado
silencioso, y sin que el endpoint sea abusable dado que no hay login.

## Qué se hizo

### Prompt (`domain/prompts/parseGasto.ts`)

El prompt vive en su propio archivo y versionado, separado de la lógica que lo usa, para poder
iterarlo sin tocar código. Define la estructura de salida y ocho reglas.

### Validación y normalización (`domain/`)

- `parseResponseSchema.ts`: schema Zod de lo que devuelve **el modelo**, que no es lo mismo que lo
  que devuelve el endpoint. La respuesta se valida siempre antes de usarse.
- `normalizarGasto.ts`: función pura que convierte la respuesta validada al modelo de la app,
  unifica las variantes de primera persona al placeholder "Vos" y propaga toda ambigüedad como
  `null`.

### Proveedor (`data/openRouterClient.ts`)

Único punto de la app que habla con la IA. Timeout duro, modelo configurable por variable de
entorno, y cada modo de falla traducido a un error propio y tipado: timeout, proveedor inalcanzable,
cuota del proveedor, respuesta malformada, falta de configuración. Ningún `catch` silencioso.

### Endpoint (`api/`)

- `rateLimit.ts`: ventana deslizante en memoria con el reloj inyectable.
- `handler.ts`: el handler completo, con el proveedor, el limitador, el reloj y la sesión inyectables
  para poder testearlo sin red.
- `src/app/api/parse-expense/route.ts`: adaptador de una línea; toda la lógica vive en la feature.

## Decisiones que definen el comportamiento

**Los montos vuelven del modelo como texto crudo, no como número.** Es la decisión menos obvia y la
más importante del prompt: los modelos chicos se equivocan sistemáticamente al normalizar `"60.000"`
(lo leen como 60). Devolviendo el string tal como aparece en el texto, la conversión queda a cargo de
`parseMonto()`, que ya está testeado contra todos los formatos de RNF-05.

**`null` antes que adivinar.** El prompt lo declara como regla con prioridad sobre las demás, y la
razón está escrita en el propio prompt: un campo inventado produce un cálculo equivocado que el
usuario no va a detectar, mientras que un campo vacío lo completa él en el formulario.

**`temperature: 0`.** La misma descripción tiene que interpretarse igual dos veces seguidas, o el
usuario no entiende por qué cambió el resultado.

**En reparto equitativo se descartan los montos individuales que mande el modelo.** Dos fuentes de
verdad para el mismo dato serían un bug silencioso: manda el total y los consumos los deriva el
dominio.

**El rate limit se chequea antes de invocar al proveedor.** AC-12 exige rechazar el excedente *sin*
llamar a la IA, así que el orden del handler es: validar el body, chequear configuración, chequear
el límite, y solo entonces llamar al proveedor.

**Todo mensaje de error ofrece la carga manual como salida.** Hay un test que verifica que cada
mensaje contenga esa salida, y otro que verifica que un error inesperado no filtre detalles internos
al cliente.

## Bug encontrado y corregido durante la verificación

Al probar el endpoint contra el servidor real **sin API key**, se detectó que los fallos por falta de
configuración **consumían cupo del rate limit**: el usuario se comía los cinco intentos y a partir
del sexto recibía un 429 confuso en lugar del motivo real. Se movió el chequeo de configuración
antes del limitador y se agregaron tres tests. Reverificado: ocho requests seguidos sin key devuelven
los ocho el motivo correcto, sin ningún 429.

## Privacidad

El texto del usuario no se loguea en ningún punto. El rate limit guarda únicamente timestamps
asociados a un uuid de cookie: ningún texto, monto ni nombre sobrevive al request (RNF-07).

## Limitación conocida

El contador del rate limit vive en la memoria del proceso. En un deploy serverless multi-instancia
el límite es **por instancia** y se reinicia en cada cold start. Es una concesión deliberada a cambio
de no agregar infraestructura; si hace falta exactitud, se reemplaza el módulo por un store
compartido sin tocar a quien lo llama.

## Verificación

52 tests nuevos (120 en total).

Verificado contra el servidor corriendo:

- `POST` sin key devuelve el motivo real y ofrece carga manual (AC-05).
- Body inválido devuelve 400 sin tocar el proveedor.
- La cookie de sesión se emite como `httpOnly`, `SameSite=lax`, con vida acotada.
- Con cookie real: cinco interpretaciones pasan y la sexta se rechaza informando cuánto esperar
  (AC-12).

### Pendiente de esta fase

**Nunca se llamó a OpenRouter de verdad.** Los 13 tests del cliente cubren timeout, cuota, error del
servidor, HTML en vez de JSON, JSON roto, schema incorrecto y JSON envuelto en bloque de código, pero
todos con respuestas simuladas. Falta configurar `OPENROUTER_API_KEY` y correr los textos literales
del PRD contra el proveedor. Con un modelo gratuito es esperable que el prompt necesite iteraciones;
para eso está aislado en su propio archivo.
