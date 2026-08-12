import {
  CODIGOS_MATERIAL,
  PRECIOS_INICIALES,
  type CodigoMaterial,
  type ListaDePrecios,
} from "@/dominio/reglas";
import type { db as Db } from "@/server/db";

/**
 * Lee la lista de precios de la base y la deja en la forma que espera el
 * calculo.
 *
 * Si a la base le falta un renglon, se usa el de `PRECIOS_INICIALES` en lugar de
 * explotar. Pasa de verdad: se agrega un material nuevo en el codigo y todavia
 * no corrio el seed. La alternativa seria que el cotizador entero deje de andar
 * porque falta el precio del alambre de atadura, y eso es peor que cotizar con
 * el precio de referencia y que se vea raro.
 */
export async function listaDePrecios(db: typeof Db): Promise<ListaDePrecios> {
  const filas = await db.producto.findMany();
  const porCodigo = new Map(filas.map((fila) => [fila.codigo, fila]));

  const lista = {} as ListaDePrecios;

  CODIGOS_MATERIAL.forEach((codigo: CodigoMaterial) => {
    const fila = porCodigo.get(codigo);
    lista[codigo] = fila
      ? {
          codigo,
          nombre: fila.nombre,
          unidad: fila.unidad,
          precio: fila.precio,
          costo: fila.costo,
        }
      : PRECIOS_INICIALES[codigo];
  });

  return lista;
}
