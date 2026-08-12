import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";

/**
 * El contexto de cada llamada. Hoy es solo la base; el dia que haya login,
 * la sesion entra aca y no en cada procedimiento.
 */
export const crearContexto = async () => ({ db });

const t = initTRPC.context<typeof crearContexto>().create({
  /**
   * Sin transformer, un `Decimal` o un `Date` llegan al navegador como string y
   * el tipo miente: TypeScript dice `Date` y en runtime hay texto.
   */
  transformer: superjson,

  /**
   * Los errores de validacion viajan desarmados por campo, para que el
   * formulario pueda marcar el input que esta mal en vez de mostrar un cartel
   * generico.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const crearRouter = t.router;
export const procedimientoPublico = t.procedure;
export const crearLlamador = t.createCallerFactory;
