# PRD-001: WebApp para optimizar la division de gastos grupales.

## Contexto y Problema
Dividir gastos en grupos (viajes, cenas, eventos) es un proceso tedioso que suele generar fricción y pérdidas de tiempo. Las herramientas tradicionales obligan a los usuarios a rellenar formularios campo por campo o a forzar divisiones equitativas cuando el consumo real fue asimétrico. Ademas, suelen ser una aplicacion Mobile que se debe tener instalada todos los dias para finalmente usarla muy ocasionalmente. Sus principales usuarios son:

- El organizador financiero del evento: Es el que suele pagar los gastos mayores del evento y se encarga de calcular y reclamar los saldos. Tiene que poder cargar los gastos facilmente y obtener un calculo flexible y rapido. Puede haber mas personas que pagaron cosas pero uno solo sera quien haga el calculo. Podria invocar a su "Grupo de Amigos" asociado al evento. 

- El asistente al evento que no gasto nada aun: Miembro del grupo que participa de las actividades. Quiere pagar exactamente lo que consumió de forma transparente y rápida, sin verse perjudicado por consumos ajenos.

## Objetivos
- Reducir el tiempo de carga y procesamiento de deudas utilizando lenguaje natural (texto o voz) como interfaz principal. Se ofrecera tambien la carga manual a traves de un formulario. 

- Eliminar los errores de asignación de deudas vinculando dinámicamente la interpretación de la IA con el contexto de la base de datos de usuarios registrados.

- Consolidar los saldos finales de los grupos bajo una matriz optimizada que minimice la cantidad de transacciones físicas necesarias para saldar las deudas.


## Requerimientos Funcionales
- RF-01: El sistema debe permitir a un usuario autenticado crear un grupo de amigos asignándole un nombre único.

- RF-02: El sistema debe permitir al creador de un grupo agregar miembros al mismo mediante un mail o usuario, sin 
requerir que estos amigos posean una cuenta registrada en la plataforma.

- RF-03: El sistema debe relacionar un miembro no registrado de un grupo con un usuario real si este se registra en la plataforma posteriormente mediante su Email o Alias.

- RF-04: El sistema debe permitir al usuario ingresar un gasto mediante un bloque de texto libre o un dictado de voz.

- RF-05: El sistema debe identificar mediante procesamiento de lenguaje natural el monto total, el pagador y aplicar una división equitativa entre todos los miembros activos del grupo cuando se procese un pago único.

- RF-06: El sistema debe extraer las entidades, consolidar los montos individuales y generar una matriz optimizada de saldos cuando se procese un texto con múltiples pagos cruzados identificando montos o items especiales por persona y minimizando las transferencias al minimo. 

- RF-07: El sistema debe presentar todos los datos interpretados por la IA en un formulario con campos de entrada editables antes de su confirmación final.

- RF-08: El sistema debe permitir la carga de un gasto de forma 100% manual a través de un formulario tradicional (monto, pagador y selección de participantes) como alternativa de respaldo.

- RF-9: El sistema debe permitir el acceso a las funciones de cálculo inteligente de forma inmediata a través de una "Sesión de Invitado", sin requerir autenticación ni registro previo.

- RF-10: El sistema debe ofrecer una opción explícita para "Guardar Progreso / Crear Cuenta", permitiendo migrar el grupo temporal y sus saldos calculados a una base de datos permanente si el usuario decide registrarse posteriormente.

## Requerimientos No Funcionales
- RNF-01: El procesamiento, extracción y parseo del texto para transformarlo en datos estructurados de gasto debe responder en un tiempo < 5 segundos en el percentil 95 (p95).

- RNF-02: El sistema debe mapear las entidades de nombres extraídas por la IA contra la lista de miembros del grupo con una precisión del 100% siempre que exista coincidencia textual contra el grupo almacendo en la BD.

## Criterios de Aceptación
- AC-01 (RF-04, RF-O5): Dado que el usuario pertenece al grupo "Asado" donde están registrados "Juan" y "Rodrigo", cuando el usuario ingresa el texto: "Pagué 60.000 de la cena de ayer del grupo Asado", entonces el sistema registra un gasto total de $60.000, asigna al usuario logueado como el emisor del pago, y genera una deuda exacta de $20.000 para Juan y $20.000 para Rodrigo.

- AC-02 (RF-05, RF-06): Dado un grupo activo con tres miembros (Usuario Logueado, Juan, Rodri), cuando se ingresa el texto: 'Juan pagó 40.000 de carne, yo puse 15.000 de bebida y Rodri gastó 5.000 en helado', entonces el sistema calcula el gasto total consolidado de $60.000 ($20.000 por persona) y muestra en la interfaz un listado de transferencias pendientes donde estan "Rodri le debe a $15.000 a Juan" y "El user logueado le debe $5000 a Juan".

- AC-03 (RF-08): Dado un fallo de conexión con el proveedor de IA, cuando el usuario presiona el botón de carga alternativa, entonces el sistema despliega un formulario limpio con inputs nativos para monto, pagador y checkboxes para los miembros del grupo, permitiendo guardar el gasto de forma exitosa sin intervención de modelos de lenguaje.

- AC-04 (RF-04, RF-05, RF-09): Dado que un usuario ingresa a la aplicación sin loguearse (Sesión de Invitado), cuando escribe en la interfaz el texto: "Cena de ayer: gastamos 30.000 entre Carlos, Sofía y yo, y pagué todo yo", entonces el sistema crea un grupo temporal, detecta automáticamente tres entidades ("Carlos", "Sofía" y "Yo"), y despliega la UI pre-completada con una división equitativa de $10.000 de deuda para Carlos y Sofía respectivamente. Luego le ofrece al usuario registrarse y eventualmente, carga el grupo de amigos y reemplaza "Yo" por el nombre del usuario logueado.

- AC-05 (RF-03, RF-10): Dado un grupo temporal con saldos consolidados en modo invitado, cuando el usuario presiona el botón "Guardar Grupo" y completa exitosamente el formulario de registro con su Email, entonces el sistema crea la cuenta de usuario en la base de datos, persiste el grupo, y vincula el historial al nuevo perfil de forma permanente, quedando listo para relacionar a esos amigos con usuarios reales si se registran a futuro.

## Fuera de Alcance
- Procesamiento de imágenes y visión computacional (OCR): No se incluye el escaneo de tickets físicos, facturas ni fotos de comprobantes. Toda la ingesta de datos es exclusivamente por texto libre, dictado de voz o carga manual en formulario.

- Integración con pasarelas de pago reales: La aplicación no se conectará con plataformas externas (como Mercado Pago, Stripe, MODO o bancos) para realizar las transferencias de dinero. La app es estrictamente un motor de cálculo, optimización y registro de saldos.

## Riesgos y Dependencias
- Riesgo: Ambigüedad en el lenguaje natural (el usuario usa apodos distintos a los cargados en el grupo en la BD o comete errores ortográficos severos que el LLM no logra asociar con los miembros del grupo).
➔ Mitigación: Se implementa el requerimiento RF-07 (formulario intermedio editable). Si la IA detecta una entidad pero no puede asociarla con un ID del grupo con un 100% de confianza, pre-completa el monto en el formulario pero resalta el campo de la persona en rojo con un desplegable (dropdown) para que el usuario fuerce la asignación correcta con un solo clic.

- Riesgo: Alta latencia o indisponibilidad temporal en las APIs de Inteligencia Artificial que arruinen la experiencia de usuario o bloqueen la carga.
➔ Mitigación: Se establece un timeout estricto en el backend para la llamada. Si la API no responde en ese tiempo, el sistema redirige fluidamente al usuario al flujo tradicional de carga manual (RF-08), mostrando un mensaje amigable: "El motor inteligente está saturado, pero podés cargar el gasto manualmente aquí".

- Dependencia de Infraestructura de IA: El funcionamiento del Core inteligente (parseo de texto) depende al 100% de la disponibilidad, políticas de cuotas y tiempos de respuesta de los servidores del proveedor del LLM seleccionado.