import { Cotizador } from "@/components/Cotizador";
import { db } from "@/server/db";
import { listaDePrecios } from "@/server/precios";

/**
 * Sin esto, Next prerenderiza esta pagina en el build y los precios quedan
 * congelados en los que habia el dia que se compilo. Es el error mas facil de
 * cometer con App Router: la pagina "anda", y muestra una lista de precios
 * vieja para siempre.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  // Los precios se leen en el servidor y bajan con el HTML. Asi el formulario
  // puede calcular en el navegador desde el primer render, sin un spinner ni una
  // request extra para saber cuanto sale un rollo de tejido.
  const precios = await listaDePrecios(db);

  return <Cotizador precios={precios} />;
}
