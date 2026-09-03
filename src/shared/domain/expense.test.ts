import { describe, expect, it } from "vitest";
import { capitalizarInicial, claveParticipante, esMismoParticipante } from "./expense";

describe("capitalizarInicial", () => {
  it("pone en mayuscula la primera letra", () => {
    expect(capitalizarInicial("cena")).toBe("Cena");
    expect(capitalizarInicial("rodri")).toBe("Rodri");
    expect(capitalizarInicial("primera noche")).toBe("Primera noche");
  });

  it("no toca el resto del texto", () => {
    // Solo la primera letra: el resto se respeta como vino.
    expect(capitalizarInicial("cena de Ayer")).toBe("Cena de Ayer");
    expect(capitalizarInicial("JUAN")).toBe("JUAN");
    expect(capitalizarInicial("Rodrigo")).toBe("Rodrigo");
  });

  it("respeta las formas deliberadas tipo camelCase", () => {
    expect(capitalizarInicial("iPhone")).toBe("iPhone");
    expect(capitalizarInicial("eBay")).toBe("eBay");
  });

  it("maneja acentos y enies", () => {
    expect(capitalizarInicial("ñoquis del 29")).toBe("Ñoquis del 29");
    expect(capitalizarInicial("ángel")).toBe("Ángel");
  });

  it("recorta espacios y tolera vacio", () => {
    expect(capitalizarInicial("  cena  ")).toBe("Cena");
    expect(capitalizarInicial("")).toBe("");
    expect(capitalizarInicial("   ")).toBe("");
  });

  it("no rompe con textos que no arrancan con letra", () => {
    expect(capitalizarInicial("2 cervezas")).toBe("2 cervezas");
    expect(capitalizarInicial("$500 de taxi")).toBe("$500 de taxi");
  });

  it("no cambia la identidad del participante", () => {
    // Capitalizar es cosmetico: el matching sigue siendo el mismo.
    expect(claveParticipante(capitalizarInicial("rodri"))).toBe(claveParticipante("rodri"));
    expect(esMismoParticipante(capitalizarInicial("juan"), "JUAN")).toBe(true);
  });
});
