import type { Metadata } from "next";
import { Productos } from "@/components/Productos";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Lista de precios",
  description:
    "Costo y precio de venta de cada material, con el margen y cuánto hace que no se toca.",
};

/** La lista cambia todos los días: prerenderizarla seria mostrarla vieja. */
export const dynamic = "force-dynamic";

export default async function PaginaProductos() {
  const iniciales = await db.producto.findMany({ orderBy: { orden: "asc" } });

  return <Productos iniciales={iniciales} hoy={new Date()} />;
}
