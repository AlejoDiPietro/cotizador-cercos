import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";

/**
 * El contexto de cada llamada.
 *
 * Lleva la base y el PIN que mando el cliente. El PIN se lee del header y no de
 * un argumento del procedimiento: si fuera un argumento, cada mutacion tendria
 * que acordarse de pedirlo y validarlo, y la que se olvide queda abierta.
 */
export const crearContexto = async (opciones?: { headers?: Headers }) => ({
  db,
  pin: opciones?.headers?.get("x-pin") ?? null,
});

type Contexto = Awaited<ReturnType<typeof crearContexto>>;

const t = initTRPC.context<Contexto>().create({
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

/**
 * Para lo que cambia la lista de precios.
 *
 * Sin esto, cualquiera que abra la demo puede ponerle $1 al tejido y dejarla
 * inservible para el que entre despues. No es un sistema de usuarios y no
 * pretende serlo: es un PIN, en una variable de entorno, comparado en el
 * servidor. La diferencia con no tener nada es que el limite existe y esta en un
 * solo lugar.
 *
 * Si `ADMIN_PIN` no esta configurado, la lista es editable sin PIN: en
 * desarrollo, pedir una clave para tocar tu propia base es solo molestia.
 */
export const procedimientoAdmin = t.procedure.use(({ ctx, next }) => {
  const esperado = process.env.ADMIN_PIN;
  if (!esperado) return next();

  if (ctx.pin !== esperado) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Para cambiar precios hace falta el PIN.",
    });
  }

  return next();
});
