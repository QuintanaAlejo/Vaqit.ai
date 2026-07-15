export interface GastoInterpretado {
  monto: number | null;
  pagador: string | null;
  modo: "equitativo" | "individual";
  consumidores: string[];
  montosIndividuales: Record<string, number>;
}

export interface InterpretacionGasto {
  interpretable: boolean;
  participantes: string[];
  gastos: GastoInterpretado[];
  advertencias: string[];
}
