import { describe, expect, it } from "vitest";
import { formatMonto } from "@/shared/domain/money";
import { calcularSaldosNetos } from "@/features/settlement/domain/balances";
import { generarResumen } from "@/features/settlement/domain/summary";
import { calcularTransferencias } from "@/features/settlement/domain/transfers";
import { borradorAGastos, validarSesion } from "@/features/expense-form/domain/validation";
import type { BorradorSesion } from "@/shared/domain/expense";
import { normalizarRespuesta } from "../domain/normalizarGasto";
import { interpretarConOpenRouter } from "./openRouterClient";

/**
 * Verificacion contra el proveedor de IA REAL. Es la unica suite que sale a la
 * red, asi que esta apagada por defecto: sin OPENROUTER_API_KEY en el entorno
 * se saltea entera y `pnpm test` sigue siendo offline y determinista.
 *
 *   OPENROUTER_API_KEY=... pnpm exec vitest run iaReal
 *
 * Recorre la cadena completa que ejercita la app —proveedor, normalizacion,
 * validacion, calculo y resumen— y compara contra los numeros exactos del PRD.
 * Es lo que detecta una regresion del prompt o un cambio de comportamiento del
 * modelo, que ningun test con respuestas simuladas puede ver.
 */

const hayKey = (process.env.OPENROUTER_API_KEY ?? "") !== "";

/** Los modelos gratuitos tienen latencia muy variable: se reintenta una vez. */
const REINTENTOS = 1;

async function interpretar(texto: string) {
  let ultimoError: unknown;
  for (let intento = 0; intento <= REINTENTOS; intento += 1) {
    try {
      return normalizarRespuesta(await interpretarConOpenRouter(texto));
    } catch (error) {
      ultimoError = error;
    }
  }
  throw ultimoError;
}

/** Arma el borrador tal como lo hace la UI a partir de lo que devolvio la IA. */
function aBorrador(gastos: Awaited<ReturnType<typeof interpretar>>): BorradorSesion {
  return {
    gastos: gastos.map((gasto, i) => ({
      id: `g${i}`,
      descripcion: gasto.descripcion,
      montoTotalCentavos: gasto.montoTotalCentavos,
      pagador: gasto.pagador,
      modoReparto: gasto.modoReparto,
      consumos: gasto.consumos.map((consumo, j) => ({
        id: `g${i}c${j}`,
        participante: consumo.participante,
        montoCentavos: consumo.montoCentavos,
      })),
    })),
  };
}

function resolver(sesion: BorradorSesion) {
  const saldos = calcularSaldosNetos(borradorAGastos(sesion));
  return { saldos, transferencias: calcularTransferencias(saldos) };
}

function netoDe(saldos: ReturnType<typeof calcularSaldosNetos>, participante: string): number {
  return saldos.find((s) => s.participante === participante)?.netoCentavos ?? Number.NaN;
}

/** Cada llamada al proveedor gratuito puede tardar varios segundos. */
const TIMEOUT_TEST = 60_000;

describe.skipIf(!hayKey)("interpretacion contra el proveedor real", () => {
  it(
    "AC-01: pago unico equitativo en primera persona",
    async () => {
      const gastos = await interpretar("Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo");

      expect(gastos).toHaveLength(1);
      expect(gastos[0]?.montoTotalCentavos).toBe(6_000_000);
      expect(gastos[0]?.pagador).toBe("Vos");
      expect(gastos[0]?.consumos.map((c) => c.participante).sort()).toEqual([
        "Juan",
        "Rodrigo",
        "Vos",
      ]);

      const { transferencias } = resolver(aBorrador(gastos));
      expect(transferencias).toHaveLength(2);
      expect(transferencias.every((t) => t.montoCentavos === 2_000_000)).toBe(true);
      expect(transferencias.every((t) => t.acreedor === "Vos")).toBe(true);
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-02: tres pagadores distintos consolidados en dos transferencias",
    async () => {
      const gastos = await interpretar(
        "Juan pagó 40.000 de carne, yo puse 15.000 de bebida y Rodri gastó 5.000 en helado",
      );

      expect(gastos).toHaveLength(3);
      expect(gastos.map((g) => g.pagador)).toEqual(["Juan", "Vos", "Rodri"]);
      // Regla de participantes implicitos del prompt v2: sin ella la IA
      // devolvia los gastos sin participantes y no habia nada que calcular.
      expect(gastos.every((g) => g.consumos.length === 3)).toBe(true);

      const { saldos, transferencias } = resolver(aBorrador(gastos));

      // El PRD habla de "$20.000 por persona", pero eso es una idealizacion:
      // $40.000 y $5.000 no son divisibles por 3. El reparto le da el centavo
      // sobrante al primer participante, asi que los netos caen a un par de
      // centavos de la cifra redonda. Se compara con tolerancia y se verifica
      // lo que si tiene que valer exacto: que no se pierda ni un centavo.
      const CENTAVOS_DE_TOLERANCIA = 5;
      expect(netoDe(saldos, "Juan")).toBeCloseTo(2_000_000, -1);
      expect(Math.abs(netoDe(saldos, "Juan") - 2_000_000)).toBeLessThanOrEqual(
        CENTAVOS_DE_TOLERANCIA,
      );
      expect(Math.abs(netoDe(saldos, "Vos") + 500_000)).toBeLessThanOrEqual(CENTAVOS_DE_TOLERANCIA);
      expect(Math.abs(netoDe(saldos, "Rodri") + 1_500_000)).toBeLessThanOrEqual(
        CENTAVOS_DE_TOLERANCIA,
      );

      // Invariante duro: lo que se debe iguala exactamente lo que se acredita.
      expect(saldos.reduce((acc, s) => acc + s.netoCentavos, 0)).toBe(0);

      // Juan es el unico acreedor, y se salda en dos movimientos y no en tres.
      expect(transferencias).toHaveLength(2);
      expect(transferencias.every((t) => t.acreedor === "Juan")).toBe(true);
      expect(transferencias.reduce((acc, t) => acc + t.montoCentavos, 0)).toBe(
        netoDe(saldos, "Juan"),
      );

      const resumen = generarResumen(transferencias);
      expect(resumen).toContain("Rodri le debe");
      expect(resumen).toContain("Vos le debe");
      expect(resumen).toContain(formatMonto(netoDe(saldos, "Juan")));
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-13: pagos cruzados que se compensan, sin ninguna transferencia",
    async () => {
      const gastos = await interpretar(
        "Yo pagué 30.000 de la previa (la consumimos Juan y yo, 15.000 cada uno), Juan pagó 30.000 de la cena (la consumimos Juan y Rodri, 15.000 cada uno) y Rodri pagó 30.000 de las bebidas (las consumimos Rodri y yo, 15.000 cada uno)",
      );

      const { saldos, transferencias } = resolver(aBorrador(gastos));
      expect(saldos.every((s) => s.netoCentavos === 0)).toBe(true);
      expect(transferencias).toEqual([]);
      expect(generarResumen(transferencias)).toContain("Nadie le debe nada a nadie");
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-14: minimizacion con saldo neto distinto de cero",
    async () => {
      const gastos = await interpretar(
        "Vos pagaste 50.000 de la primera noche (la consumieron Juan y vos, 25.000 cada uno), Juan pagó 30.000 de la segunda noche (la consumieron Juan y Rodri, 15.000 cada uno) y Rodri pagó 10.000 del traslado (lo consumieron Rodri y vos, 5.000 cada uno)",
      );

      const { saldos, transferencias } = resolver(aBorrador(gastos));
      expect(netoDe(saldos, "Vos")).toBe(2_000_000);
      expect(netoDe(saldos, "Juan")).toBe(-1_000_000);
      expect(netoDe(saldos, "Rodri")).toBe(-1_000_000);

      // Dos y no tres: es la minimizacion que exige RF-10.
      expect(transferencias).toHaveLength(2);
      expect(transferencias.every((t) => t.acreedor === "Vos")).toBe(true);
      expect(transferencias.every((t) => t.montoCentavos === 1_000_000)).toBe(true);
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-08: sin monto extraible, el formulario bloquea en vez de inventar",
    async () => {
      const gastos = await interpretar("gastamos bastante en la cena con Juan y Rodri");

      expect(gastos[0]?.montoTotalCentavos).toBeNull();
      expect(validarSesion(aBorrador(gastos)).puedeConfirmar).toBe(false);
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-10: sin pagador identificable, el formulario bloquea",
    async () => {
      const gastos = await interpretar("se gastaron 30.000 entre Juan, Rodrigo y yo");

      expect(gastos[0]?.montoTotalCentavos).toBe(3_000_000);
      expect(gastos[0]?.pagador).toBeNull();
      expect(validarSesion(aBorrador(gastos)).puedeConfirmar).toBe(false);
    },
    TIMEOUT_TEST,
  );

  it(
    "AC-09: un texto sin gastos no produce nada interpretable",
    async () => {
      expect(await interpretar("el clima está lindo hoy y mañana juego al futbol")).toEqual([]);
    },
    TIMEOUT_TEST,
  );

  it(
    "RNF-05: interpreta el monto sea cual sea el formato en que se escriba",
    async () => {
      // El prompt le pide al modelo que NO normalice numeros: devuelve el texto
      // crudo y parseMonto hace la conversion. Esto verifica esa division.
      const gastos = await interpretar("Pagué $1.234,56 del taxi con Ana");
      expect(gastos[0]?.montoTotalCentavos).toBe(123_456);
    },
    TIMEOUT_TEST,
  );
});
