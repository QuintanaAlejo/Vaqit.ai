# Bitácora de desarrollo

El MVP se construyó en cinco fases, cada una verificable por sí misma y con su propio commit. El
criterio de orden fue **dominio primero**: el cálculo se resolvió y se testeó antes de escribir UI, y
la app quedó usable de punta a punta antes de depender de un proveedor de IA externo.

| Fase | Documento | Qué dejó listo |
|------|-----------|----------------|
| 0 | [Scaffold y sistema visual](./fase-0-scaffold.md) | Proyecto configurado y tokens de `DESIGN.md` aplicados, adaptados a mobile-first |
| 1 | [Motor de dominio](./fase-1-dominio.md) | Saldos netos, matriz mínima de transferencias, parseo de montos y validación, todo puro y testeado |
| 2 | [Interfaz y carga manual](./fase-2-ui-carga-manual.md) | App usable de punta a punta sin IA (RF-17) |
| 3 | [Interpretación por IA y rate limit](./fase-3-ia-rate-limit.md) | Camino principal: texto libre a datos estructurados, con límite de uso |
| 4 | [Compartir y cierre](./fase-4-compartir.md) | Salida por WhatsApp y portapapeles, y estado final del MVP |
| — | [Verificación contra la IA real](./verificacion-ia-real.md) | Elección de modelo, bug del prompt encontrado y corregido, resultados |

## Cómo leer esto

- **Qué hace el producto**: [`PRD.md`](../PRD.md)
- **Cómo correrlo y cómo está organizado**: [`README.md`](../README.md)
- **Convenciones de código**: [`AGENTS.md`](../AGENTS.md)
- **Sistema visual**: [`DESIGN.md`](../DESIGN.md), incluida la sección de adaptación mobile-first
  que se decidió en la fase 0

## Lo que falta

Al cierre de la fase 4 quedaban dos huecos. Uno ya está cerrado:

1. ~~Ninguna llamada real al proveedor de IA.~~ **Cerrado**: se verificó contra OpenRouter con
   `minimax/minimax-m3:free`. Ver [Verificación contra la IA real](./verificacion-ia-real.md).
2. Ninguna interacción verificada en un browser real: se verificó el render y la lógica, no el click.
