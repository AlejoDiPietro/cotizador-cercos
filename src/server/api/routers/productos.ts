import { z } from "zod";
import { CODIGOS_MATERIAL, PRECIOS_INICIALES } from "@/dominio/reglas";
import {
  crearRouter,
  procedimientoAdmin,
  procedimientoPublico,
} from "@/server/api/trpc";

/**
 * Un precio en centavos.
 *
 * `int()` no es decoracion: si entrara `1234.56` centavos, la base lo guardaria
 * y despues un total daria un numero que no existe en pesos. El limite de arriba
 * es para que un dedo pesado no deje un precio de mil millones sin que nadie se
 * entere.
 */
const enCentavos = z
  .number()
  .int("Los precios van en centavos enteros")
  .min(0, "Un precio no puede ser negativo")
  .max(100_000_000_000, "Ese precio no es un precio");

export const productosRouter = crearRouter({
  /** La lista completa, en orden. Es publica: son los precios de venta. */
  lista: procedimientoPublico.query(({ ctx }) =>
    ctx.db.producto.findMany({ orderBy: { orden: "asc" } }),
  ),

  /**
   * Guarda varios renglones de una vez.
   *
   * En una transaccion y no en un `for`: cambiar precios es una sola decision
   * ("actualizo la lista"), asi que o entran todos o no entra ninguno. Con un
   * loop suelto, un error en el renglon 7 deja la lista a medio actualizar y
   * nadie sabe cual es el estado.
   */
  actualizar: procedimientoAdmin
    .input(
      z.object({
        cambios: z
          .array(
            z.object({
              codigo: z.enum(CODIGOS_MATERIAL),
              precio: enCentavos,
              costo: enCentavos,
            }),
          )
          .min(1)
          .max(CODIGOS_MATERIAL.length),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const anteriores = await ctx.db.producto.findMany({
        where: { codigo: { in: input.cambios.map((c) => c.codigo) } },
        select: { codigo: true, precio: true },
      });
      const precioViejo = new Map(anteriores.map((a) => [a.codigo, a.precio]));

      await ctx.db.$transaction(
        input.cambios.map((cambio) =>
          ctx.db.producto.update({
            where: { codigo: cambio.codigo },
            data: {
              precio: cambio.precio,
              costo: cambio.costo,
              // Solo se pisa el "anterior" si el precio realmente cambio: si no,
              // guardar el costo borraria el historial del precio sin motivo.
              precioAnterior:
                precioViejo.get(cambio.codigo) === cambio.precio
                  ? undefined
                  : (precioViejo.get(cambio.codigo) ?? null),
            },
          }),
        ),
      );

      return { actualizados: input.cambios.length };
    }),

  /**
   * Aumenta toda la lista un porcentaje.
   *
   * Existe porque es lo que pasa de verdad: no se remarca un articulo, se
   * remarca la lista. Hacerlo a mano son doce renglones y doce oportunidades de
   * equivocarse.
   */
  aumentar: procedimientoAdmin
    .input(
      z.object({
        porcentaje: z
          .number()
          .min(-90, "Bajar mas del 90% es un error de tipeo")
          .max(200, "Aumentar mas del 200% de una vez es un error de tipeo"),
        /** Si tambien se mueve el costo. Si el proveedor aumento, si. */
        incluirCosto: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const factor = 1 + input.porcentaje / 100;
      const productos = await ctx.db.producto.findMany();

      // Al peso entero, igual que en la cotizacion: una lista con centavos
      // arrastra el error a todos los presupuestos que salgan de ella.
      const alPeso = (valor: number) => Math.round((valor * factor) / 100) * 100;

      await ctx.db.$transaction(
        productos.map((producto) =>
          ctx.db.producto.update({
            where: { codigo: producto.codigo },
            data: {
              precio: alPeso(producto.precio),
              precioAnterior: producto.precio,
              ...(input.incluirCosto ? { costo: alPeso(producto.costo) } : {}),
            },
          }),
        ),
      );

      return { actualizados: productos.length };
    }),

  /**
   * Vuelve a la lista de referencia.
   *
   * Es una demo publica: alguien va a poner $1 en el tejido para ver que pasa.
   * Con esto, el que entra despues no encuentra la lista arruinada. Las
   * cotizaciones ya guardadas no se tocan, por definicion.
   */
  restaurar: procedimientoAdmin.mutation(async ({ ctx }) => {
    const inicial = Object.values(PRECIOS_INICIALES);

    await ctx.db.$transaction(
      inicial.map((referencia, orden) =>
        ctx.db.producto.upsert({
          where: { codigo: referencia.codigo },
          update: {
            nombre: referencia.nombre,
            unidad: referencia.unidad,
            precio: referencia.precio,
            costo: referencia.costo,
            precioAnterior: null,
            orden,
          },
          create: { ...referencia, orden },
        }),
      ),
    );

    return { actualizados: inicial.length };
  }),
});
