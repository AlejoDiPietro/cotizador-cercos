"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import { leerPin } from "@/lib/pin";
import type { AppRouter } from "@/server/api/root";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function Proveedores({ children }: { children: ReactNode }) {
  // `useState` y no una constante de modulo: un QueryClient compartido entre
  // pedidos filtraria la cache de un visitante al siguiente.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000 } },
      }),
  );

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          /**
           * Se resuelve en cada request y no una sola vez al crear el cliente:
           * si se leyera aca arriba, el PIN que se escribe despues de cargar la
           * pagina no viajaria hasta recargar.
           */
          headers: () => {
            const pin = leerPin();
            return pin ? { "x-pin": pin } : {};
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
