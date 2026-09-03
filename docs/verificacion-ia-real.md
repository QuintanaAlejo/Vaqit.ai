# Verificación contra el proveedor de IA real

Cierra el primer hueco que quedaba abierto al final de la fase 4: hasta acá toda la capa de IA
estaba testeada con respuestas simuladas y nunca se había llamado al proveedor.

## Modelo elegido

`minimax/minimax-m3:free` en OpenRouter, configurado en `OPENROUTER_MODEL` y como default del
código.

Antes de elegirlo se relevó el catálogo: de 425 modelos había 21 gratuitos. **El default anterior,
`meta-llama/llama-3.3-70b-instruct:free`, ya no existe** — el modelo sigue en el catálogo pero solo
pago, así que la app habría fallado en la primera llamada real.

MiniMax M3 soporta `response_format: json_object`, que es lo que usa el cliente, y tiene throughput
alto. El criterio fue velocidad: la extracción es una tarea fácil y lo que aprieta es RNF-01
(p95 < 10s con timeout duro de 9s), no la capacidad de razonamiento.

## Bug encontrado: participantes implícitos

En la primera corrida contra el proveedor, seis de siete casos salieron perfectos. **AC-02 falló**:

> "Juan pagó 40.000 de carne, yo puse 15.000 de bebida y Rodri gastó 5.000 en helado"

El modelo identificó bien los tres gastos, los tres montos y los tres pagadores, pero devolvió los
tres con la lista de consumos **vacía**. El texto no dice explícitamente quién consumió qué, y el
prompt v1 no cubría ese caso: entre inventar y devolver vacío, el modelo eligió vacío, que era lo
que le habíamos pedido.

El problema es que un gasto sin participantes no se puede repartir. El usuario habría llegado al
formulario con tres gastos vacíos y la confirmación bloqueada.

**Corregido en el prompt v2** con una regla nueva: si el texto no dice quién consumió pero menciona
un grupo de personas, se asume que todas lo consumieron en partes iguales, y nunca se devuelve la
lista de consumos vacía habiendo al menos una persona mencionada. La regla aclara que no aplica
cuando el texto sí dice quién consumió qué, para no pisar los casos explícitos de AC-13 y AC-14.

Verificado después del cambio: los tres gastos vuelven con sus tres participantes y el cálculo da
los saldos del PRD.

## El centavo del AC-02

El PRD dice "$20.000 por persona", pero $40.000 y $5.000 no son divisibles por 3. El reparto asigna
el centavo sobrante al primer participante, así que Juan consume $20.000,01 y su saldo neto queda en
$19.999,99 en lugar de $20.000.

No es un error: es aritmética inevitable, y el invariante que importa se mantiene exacto — la suma de
todos los saldos netos da cero y no se pierde ningún centavo. El test compara los saldos con
tolerancia y verifica la suma en cero de forma estricta.

> **Actualización posterior.** Los centavos se veían mal en el mensaje de WhatsApp
> (`"Rodri le debe $14.999,99"`), así que el reparto pasó a redondear la parte de cada uno al peso
> entero y a dejarle el resto al pagador. Los mensajes ya no muestran centavos; la tolerancia del
> test ahora se mide en pesos.

## Resultado

Ocho casos contra el proveedor real, todos en verde:

| Caso | Qué verifica |
|------|--------------|
| AC-01 | Pago único equitativo en primera persona, con el placeholder "Vos" |
| AC-02 | Tres pagadores distintos consolidados en dos transferencias |
| AC-13 | Pagos cruzados que se compensan: ninguna transferencia |
| AC-14 | Minimización con saldo neto distinto de cero: dos y no tres |
| AC-08 | Sin monto extraíble, el formulario bloquea en vez de inventar |
| AC-10 | Sin pagador identificable, el formulario bloquea |
| AC-09 | Un texto sin gastos no produce nada interpretable |
| RNF-05 | El monto se interpreta sea cual sea el formato en que se escriba |

**Latencias observadas**: entre 1,4 y 6,9 segundos por llamada, todas dentro del presupuesto de
RNF-01. Pero en varias corridas algún caso llegó a los 9 segundos y cortó por timeout: la latencia
del free tier es errática y el margen no es holgado. No es un fallo de la app —el usuario recibe el
error y la carga manual como salida— pero vuelve inestable a esta suite, así que reintenta hasta
tres veces antes de dar un caso por perdido.

## Cómo correrlo

Es la única suite que sale a la red, así que está apagada por defecto: sin `OPENROUTER_API_KEY` en
el entorno se saltea entera y `pnpm test` sigue siendo offline y determinista.

```bash
set -a; . ./.env.local; set +a
pnpm exec vitest run iaReal
```

Recorre la cadena completa —proveedor, normalización, validación, cálculo y resumen— con los textos
literales del PRD. Es lo que detecta una regresión del prompt o un cambio de comportamiento del
modelo, que ningún test con respuestas simuladas puede ver.

## Límites del free tier

Los modelos `:free` de OpenRouter tienen **20 requests por minuto** y **50 por día** sin créditos
comprados, que suben a **1.000 por día** con al menos US$10 cargados. Con 50 diarios, y dado que
RNF-04 permite 5 interpretaciones por sesión, unas diez sesiones agotan la cuota de toda la app: es
suficiente para desarrollo y demo, no para usuarios reales.
