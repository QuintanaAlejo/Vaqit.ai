export interface Consumo {
  participante: string;
  monto: number;
}

export interface Gasto {
  pagador: string;
  monto: number;
  consumos: Consumo[];
}

export interface Saldo {
  participante: string;
  neto: number;
}

export interface Transferencia {
  deudor: string;
  acreedor: string;
  monto: number;
}
