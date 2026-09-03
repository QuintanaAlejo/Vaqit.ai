import { manejarInterpretacion } from "@/features/expense-parsing/api/handler";

/**
 * El route handler es un adaptador de una linea: toda la logica vive en la
 * feature, donde se puede testear inyectandole el proveedor y el reloj.
 */
export async function POST(request: Request): Promise<Response> {
  return manejarInterpretacion(request);
}

/** Nunca se cachea: cada interpretacion es de un texto distinto. */
export const dynamic = "force-dynamic";
