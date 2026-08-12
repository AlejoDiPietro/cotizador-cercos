import { cotizacionRouter } from "@/server/api/routers/cotizacion";
import { crearContexto, crearLlamador, crearRouter } from "@/server/api/trpc";

export const appRouter = crearRouter({
  cotizacion: cotizacionRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Para llamar la API desde un Server Component sin dar una vuelta por HTTP.
 * La pagina de una cotizacion se renderiza en el servidor: pedirse a si misma
 * por la red seria pagar una request para hablar con su propio proceso.
 */
export const llamarApi = async () =>
  crearLlamador(appRouter)(await crearContexto());
