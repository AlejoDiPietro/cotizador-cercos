import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { crearContexto } from "@/server/api/trpc";

/** Un solo endpoint HTTP para toda la API. */
const manejar = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    // Los headers entran al contexto: de ahi sale el PIN que autoriza cambiar
    // precios.
    createContext: () => crearContexto({ headers: req.headers }),
    onError({ error, path }) {
      // En produccion los errores de servidor no se ven en el navegador, asi
      // que si no se loguean acá no se ven en ningun lado.
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] ${path ?? "<sin ruta>"}:`, error.cause ?? error);
      }
    },
  });

export { manejar as GET, manejar as POST };
