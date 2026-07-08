# PRD-001: Calculadora rápida de división de gastos grupales con IA

## Decisión de alcance (respuesta a revisión)
El MVP sera una herramienta de uso puntual: el usuario entra, describe el gasto en lenguaje natural (o lo carga manualmente), el sistema calcula quién le debe a quién según el consumo real de cada persona (no necesariamente equitativo), y el usuario comparte el resultado por WhatsApp. No hay cuentas, no hay login, no hay grupos guardados ni historial persistente entre sesiones. Quedan documentados como **Fuera de Alcance** más abajo para una eventual v2.

## Contexto y Problema
Dividir gastos en grupos (viajes, cenas, eventos) es un proceso tedioso que suele generar fricción y pérdida de tiempo. Las herramientas tradicionales obligan a los usuarios a rellenar formularios campo por campo o a forzar divisiones equitativas cuando el consumo real fue asimétrico. Además, suelen ser aplicaciones móviles que hay que tener instaladas para usarlas muy ocasionalmente.

Su usuario principal es quien organiza el gasto: la persona que pagó (o centraliza la información de) los gastos del evento y necesita resolver rápido, sin fricción, cuánto le debe cada uno, para después avisarles por WhatsApp.

## Objetivos
- Resolver una división de gastos puntual en segundos, sin necesidad de cuenta, login ni instalación previa.
- Permitir cálculos flexibles según el consumo real de cada persona (no solo división equitativa), a partir de una descripción en lenguaje natural (texto o voz).
- Minimizar la cantidad de transferencias necesarias para saldar las deudas del grupo.
- Facilitar el envío inmediato y sin fricción del resultado por WhatsApp.

## Requerimientos Funcionales
- RF-01: El sistema debe permitir al usuario ingresar la descripción de un gasto grupal mediante un bloque de texto libre.

- RF-02: El sistema debe permitir al usuario ingresar la descripción de un gasto grupal mediante dictado de voz.

- RF-03: El sistema debe identificar mediante procesamiento de lenguaje natural el monto total y el pagador del gasto descrito.

- RF-04: El sistema debe asignar un placeholder ("Vos") al pagador o a un participante cuando el texto lo refiera en primera persona ("yo", "pagué yo", "puse"), quedando ese campo disponible para que el usuario lo reemplace por su nombre real en el formulario editable (RF-11).

- RF-05: El sistema debe identificar los participantes del gasto mencionados en el texto (por nombre o apodo).

- RF-06: El sistema debe distinguir si el texto describe un pago único a dividir equitativamente o consumos individuales distintos por persona.

- RF-07: El sistema debe calcular el monto correspondiente a cada participante según el tipo de gasto identificado en RF-06 (pago único equitativo o consumos individuales).

- RF-08: El sistema debe consolidar múltiples pagos cruzados (varias personas pagando distintos montos) en un saldo neto por persona.

- RF-09: El sistema debe generar una matriz optimizada de transferencias (quién le debe a quién) que minimice la cantidad de movimientos necesarios para saldar las deudas del grupo.

- RF-10: El sistema debe presentar los datos interpretados por la IA (monto, pagador, participantes, montos individuales) en un formulario editable antes de confirmar el cálculo.

- RF-11: El sistema debe permitir al usuario corregir manualmente una asignación de nombre ambigua o incorrecta (por ejemplo, apodos no reconocidos o nombres duplicados) seleccionando o escribiendo el valor correcto en el formulario editable.

- RF-12: El sistema debe permitir confirmar el cálculo final una vez revisado y/o corregido el formulario.

- RF-13: El sistema debe generar un resumen de texto legible con el detalle de los saldos finales (quién le debe a quién y cuánto).

- RF-14: El sistema debe permitir compartir ese resumen directamente por WhatsApp (por ejemplo mediante un enlace `wa.me` o botón de compartir nativo) con un solo clic o copiar al portapapeles el texto generado.

- RF-15: El sistema debe permitir la carga de un gasto de forma 100% manual a través de un formulario tradicional (monto, pagador y montos por participante) como alternativa de respaldo cuando la IA no esté disponible o no interprete correctamente el texto.

## Requerimientos No Funcionales
- RNF-01: El procesamiento, extracción y parseo del texto para transformarlo en datos estructurados de gasto debe responder en un tiempo < 5 segundos en el percentil 95 (p95).

- RNF-02: El sistema no debe requerir registro, login ni instalación para completar el flujo completo (cargar gasto → revisar → confirmar → compartir).

- RNF-03: El resumen generado para compartir por WhatsApp debe ser texto plano: sin markdown (sin `*`, `_`, `#`, etc.), sin HTML ni ningún otro tipo de marcado o estilo, de forma que se muestre correctamente sin renderizado adicional en cualquier cliente de mensajería.

## Criterios de Aceptación

### Casos exitosos
- AC-01 (RF-01, RF-03, RF-04, RF-06, RF-07): Dado que el usuario ingresa el texto "Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo", cuando el sistema procesa el texto, entonces identifica el monto total ($60.000), asigna "Vos" como placeholder del pagador, a Juan y Rodrigo como participantes, y calcula una deuda de $20.000 para Juan y $20.000 para Rodrigo. En el formulario editable, el campo "Vos" se destaca con un resaltado en color rojo claro y un ícono de alerta, invitando al usuario a reemplazarlo por su nombre real antes de compartir el resultado.

- AC-02 (RF-03, RF-04, RF-07, RF-08, RF-09): Dado el texto "Juan pagó 40.000 de carne, yo puse 15.000 de bebida y Rodri gastó 5.000 en helado", cuando el sistema lo procesa, entonces calcula un gasto total consolidado de $60.000 ($20.000 por persona) y muestra como transferencias óptimas "Rodri le debe $15.000 a Juan" y "Yo le debo $5.000 a Juan". Si el campo ("Vos") se actualizó, dira el nombre de esa persona en lugar de yo.

- AC-03 (RF-10, RF-12): Dado que la IA interpretó un gasto, cuando se muestra el formulario editable con los datos, entonces el usuario puede modificar cualquier campo (monto, pagador, participantes) antes de presionar "Confirmar", y el cálculo final refleja los valores corregidos, no los originalmente interpretados.

- AC-04 (RF-13, RF-14): Dado un cálculo confirmado, cuando el usuario presiona "Compartir por WhatsApp", entonces el sistema abre WhatsApp (web o app) con un mensaje pre-cargado en texto plano que detalla cada deuda individual, sin requerir que el usuario copie o formatee nada manualmente.

- AC-05 (RF-15): Dado un fallo de conexión o timeout con el proveedor de IA, cuando el usuario presiona el botón de carga alternativa, entonces el sistema despliega un formulario con inputs nativos para monto, pagador y montos por participante, permitiendo completar el cálculo sin intervención de modelos de lenguaje.

### Casos de error / ambigüedad
- AC-06 (RF-05, RF-11): Dado un texto donde se mencionan dos participantes con el mismo nombre o apodo (por ejemplo "Juan" aparece dos veces sin distinción), cuando el sistema no puede identificar de forma unívoca a qué persona corresponde cada monto, entonces resalta el campo ambiguo en el formulario editable y solicita al usuario que lo diferencie manualmente (por ejemplo agregando un apellido o inicial) antes de permitir confirmar.

- AC-07 (RF-03): Dado un texto donde no se menciona un monto o el monto es ilegible/ambiguo (por ejemplo "gastamos bastante en la cena"), cuando el sistema no puede extraer un valor numérico, entonces deja el campo de monto vacío en el formulario editable y no permite confirmar el cálculo hasta que el usuario lo complete manualmente.

- AC-08 (RF-01, RF-03): Dado un texto que la IA no logra interpretar en absoluto (texto sin relación con un gasto, o demasiado ambiguo), cuando el procesamiento falla, entonces el sistema muestra un mensaje indicando que no pudo interpretar el texto y ofrece al usuario ir directamente a la carga manual (RF-15).

- AC-09 (RF-03): Dado un texto donde no queda claro quién pagó (por ejemplo "se gastaron 30.000 entre Juan, Rodrigo y yo" sin indicar pagador), cuando el sistema no puede identificar un pagador con certeza, entonces deja el campo de pagador vacío/resaltado en el formulario editable y exige que el usuario lo seleccione antes de confirmar.

- AC-10 (RF-15): Dado que el usuario está en el formulario de carga manual, cuando intenta confirmar sin completar monto o sin seleccionar un pagador, entonces el sistema bloquea la confirmación y señala los campos faltantes.

### Casos de optimización y fallback de envío
- AC-11 (RF-08, RF-09): Dado el texto "Yo pagué 30.000 de la previa (la consumimos Juan y yo, 15.000 cada uno), Juan pagó 30.000 de la cena (la consumimos Juan y Rodri, 15.000 cada uno) y Rodri pagó 30.000 de las bebidas (las consumimos Rodri y yo, 15.000 cada uno)", cuando el sistema consolida los pagos cruzados y genera la matriz optimizada, entonces determina que cada persona pagó y consumió exactamente $30.000 (saldo neto $0 para todos) y no muestra ninguna transferencia pendiente — en lugar de las 3 transferencias cruzadas que resultarían de saldar cada consumo por separado (Juan le debe $15.000 a Vos, Rodri le debe $15.000 a Juan, Vos le debe $15.000 a Rodri), demostrando la minimización de movimientos exigida por RF-09.

- AC-12 (RF-14): Dado un cálculo confirmado en un dispositivo sin WhatsApp instalado ni acceso a WhatsApp Web, cuando el usuario presiona "Copiar", entonces el sistema copia al portapapeles el mismo resumen en texto plano generado por RF-13 y muestra una confirmación visual (por ejemplo "Copiado"), permitiendo al usuario pegarlo manualmente donde prefiera.

- AC-13 (RF-02): Dado el mismo gasto descrito por dictado de voz ("Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo") y por texto escrito con idéntico contenido, cuando el sistema transcribe el audio a texto, entonces la transcripción resultante es exactamente igual al texto escrito a mano (mismo contenido, sin diferencias que alteren el sentido), y el procesamiento posterior (identificación de monto, pagador, participantes y cálculo) produce el mismo resultado y el mismo comportamiento del formulario editable en ambos casos.

## Fuera de Alcance
- Cuentas de usuario, login y autenticación.
- Grupos guardados, historial persistente entre sesiones y "Grupo de Amigos" reutilizable.
- Miembros invitados sin cuenta y su posterior vinculación a un usuario registrado.
- Permisos y control de acceso multi-usuario (quién puede ver/editar un grupo).
- Procesamiento de imágenes y visión computacional (OCR): no se incluye el escaneo de tickets, facturas ni fotos de comprobantes. Toda la ingesta de datos es por texto libre, dictado de voz o carga manual en formulario.
- Integración con pasarelas de pago reales: la aplicación no se conectará con plataformas externas (Mercado Pago, Stripe, MODO, bancos) para ejecutar transferencias. Es estrictamente un motor de cálculo, optimización y generación de resumen para compartir.

## Riesgos y Dependencias
- Riesgo: Ambigüedad en el lenguaje natural (apodos, nombres duplicados o errores ortográficos que la IA no logra resolver por sí sola).
  ➔ Mitigación: RF-10 y RF-11 (formulario editable con resaltado de campos ambiguos), validado en AC-06, AC-07 y AC-09.

- Riesgo: Alta latencia o indisponibilidad temporal de las APIs de IA que arruinen la experiencia o bloqueen la carga.
  ➔ Mitigación: Timeout estricto en el backend (RNF-01). Si la API no responde a tiempo, se redirige al flujo de carga manual (RF-15), validado en AC-05.

- Dependencia de Infraestructura de IA: el funcionamiento del núcleo inteligente (parseo de texto) depende al 100% de la disponibilidad, cuotas y tiempos de respuesta del proveedor del LLM seleccionado.

- Dependencia externa: el envío por WhatsApp vía `wa.me` depende de que el usuario tenga WhatsApp instalado o acceso a WhatsApp Web. En caso contrario, se usara la funcionalidad de copiar manualmente el texto.
