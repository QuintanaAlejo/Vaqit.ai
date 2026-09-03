# Fase 4 — Compartir y cierre del MVP

## Objetivo

Cerrar el flujo: que el resultado del cálculo salga de la app y llegue al grupo por WhatsApp, que es
el objetivo declarado del PRD.

## Qué se hizo

- `settlement/domain/share.ts`: construcción del enlace de WhatsApp. Puro: devuelve la URL, no
  navega.
- `settlement/ui/AccionesCompartir.tsx`: los botones de compartir y copiar, más el detalle
  desplegable con el texto exacto que se va a enviar.
- Conexión de las acciones al paso de resultado del flujo, reemplazando el aviso provisorio.
- `README.md` del proyecto: cómo correr, variables de entorno, mapa de la arquitectura, decisiones y
  limitaciones conocidas, y el mapeo de tests a criterios de aceptación.

## Decisiones

**El enlace es `wa.me` sin número**, lo que abre el selector de contacto. Es lo correcto acá: no hay
cuentas ni contactos guardados, así que el usuario elige a quién mandarle el resumen.

**Copiar tiene salida real si falla.** Si la Clipboard API rechaza —sin permiso o fuera de un
contexto seguro— en vez de dejar al usuario sin opción se despliega un campo con el resumen que se
autoselecciona al enfocar, para copiarlo a mano (AC-15).

**Aviso de "Vos" en la pantalla final.** Si el placeholder llegó sin reemplazar hasta el momento de
compartir, aparece un cartel de alerta. Es el instante en que realmente importa: es el texto que va
a leer el resto del grupo.

**Se ató `--font-sans` a `--font-cosmica`.** De `--font-sans` sale el `--default-font-family` del
preflight de Tailwind, así la familia correcta se aplica sin depender de qué regla gane la cascada.
Se verificó la cadena completa en el CSS compilado.

## Verificación

7 tests nuevos (127 en total). El test del enlace decodifica la URL generada y verifica que vuelva a
ser exactamente el resumen, incluidos acentos y el signo `$`.

Verificación completa del proyecto en verde: `pnpm test`, `pnpm exec tsc --noEmit`,
`pnpm exec eslint .`, `pnpm exec prettier --check src` y `pnpm build`.

## Estado del MVP

42 archivos fuente, ~4.500 líneas, 127 tests en 11 archivos.

### Criterios de aceptación

| Estado | Criterios |
|--------|-----------|
| Verificados por test con los números exactos del PRD | AC-02, AC-06, AC-07, AC-08, AC-10, AC-11, AC-13, AC-14 |
| Verificados por test | AC-04 |
| Verificados contra el servidor corriendo | AC-05, AC-09, AC-12 |
| Implementados, falta verificación en browser o con IA real | AC-01, AC-03, AC-15 |
| Correctos por construcción, sin test de runtime | AC-16 |

Requerimientos no funcionales: RNF-02, RNF-03, RNF-04 y RNF-05 verificados. RNF-06 con el CSS
compilado verificado, falta dispositivo real. RNF-01 con timeout duro configurado, sin medir contra
el proveedor real. RNF-07 correcto por construcción.

### Los dos huecos que quedan

1. **Ninguna llamada real a OpenRouter.** Toda la capa de IA está testeada con respuestas simuladas.
   Requiere configurar `OPENROUTER_API_KEY` y correr los textos del PRD contra el proveedor.
2. **Ningún click en un browser real.** Se verificó el render del servidor, el HTTP, los tokens CSS y
   toda la lógica vía tests de integración, pero no la interacción.
