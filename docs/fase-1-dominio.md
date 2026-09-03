# Fase 1 — Motor de dominio

## Objetivo

Construir el corazón del producto —el cálculo— como funciones puras y testeadas, antes de escribir
una línea de UI o de tocar la IA. Si el reparto de gastos está mal, nada de lo demás importa.

## Qué se hizo

### Modelo (`src/shared/`)

- `domain/expense.ts`: el modelo canónico. Vive en `shared/` porque lo comparten las tres features;
  es el vocabulario del dominio, no un componente compartido.
- `errors.ts`: nueve clases de error sobre una base `AppError`, cada una con un `code`
  discriminante (timeout de la IA, proveedor caído, respuesta malformada, texto no interpretable,
  rate limit de sesión, request inválido, falta de configuración).
- `domain/money.ts`: parseo y formateo de montos.
- `domain/split.ts`: reparto en partes iguales.

### Cálculo (`src/features/settlement/domain/`)

- `balances.ts`: consolida todos los gastos de la sesión en un saldo neto por persona (RF-09).
- `transfers.ts`: matriz mínima de transferencias con el algoritmo greedy (RF-10).
- `summary.ts`: resumen en texto plano para compartir (RF-14, RNF-03).

### Validación (`src/features/expense-form/domain/`)

- `validation.ts`: qué habilita y qué bloquea la confirmación del formulario, más la conversión del
  borrador validado a los gastos que acepta el motor.

## Decisiones que definen el comportamiento

**Todos los montos son enteros en centavos.** Evita el error de punto flotante al sumar y deja el
redondeo concentrado en un solo lugar: `repartirEquitativo()` distribuye los centavos sobrantes
entre los primeros participantes, así la suma de consumos siempre cuadra exactamente con el total.
Redondear cada parte por separado haría que $100 entre 3 pierda un centavo.

**Dos niveles de estado.** `BorradorGasto` tiene campos anulables y es lo que se edita en el
formulario; `Gasto` está completo y es lo único que entra al cálculo. El motor nunca ve un `null`, y
el compilador lo garantiza.

**El placeholder "Vos" advierte pero no bloquea.** AC-01 pide "invitar" a reemplazarlo y AC-02
contempla explícitamente calcular con "Vos" sin reemplazar. Por eso la validación devuelve `errores`
(bloquean) y `advertencias` (solo se muestran) por separado.

**Un separador con tres dígitos a la derecha es de miles.** `"60.000"` son sesenta mil, que es la
lectura correcta para dinero en es-AR. La contracara es que `"10,004"` se lee como diez mil cuatro y
no como diez con cuatro milésimas. Un test escrito durante esta fase falló justamente acá y
confirmó que la regla es consistente.

**Si los consumos no suman el total, se bloquea la confirmación** mostrando cuánto falta o sobra.
El PRD no lo especifica; la alternativa era que el pagador absorbiera la diferencia en silencio, lo
que produce un resultado sutilmente equivocado que el usuario no detecta.

## Verificación

52 tests. Los criterios de aceptación del PRD están codificados con sus números exactos, de forma
que el test falla si el comportamiento se desvía:

- **AC-13** falla si aparece *cualquier* transferencia cuando todos los saldos netos son cero.
- **AC-14** falla si se emiten más de 2 transferencias donde el PRD exige 2.
- **AC-06 / RNF-05** cubre los seis formatos numéricos del PRD más casos de borde.
- **AC-01, AC-02, AC-07, AC-08, AC-10, AC-11** cubiertos en cálculo y validación.
