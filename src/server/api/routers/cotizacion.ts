import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { cotizar } from "@/dominio/cotizar";
import { pedidoSchema, pedidoValidado } from "@/dominio/pedido";
import { crearRouter, procedimientoPublico } from "@/server/api/trpc";
import { codigoNuevo } from "@/server/codigo";
import { listaDePrecios } from "@/server/precios";
import { Prisma } from "@/generated/prisma/client";

const datosDelCliente = z.object({
  cliente: z.string().trim().max(120).optional(),
  obra: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(1000).optional(),
});

export const cotizacionRouter = crearRouter({
  /**
   * Guarda una cotizacion.
   *
   * Recibe el pedido, NO los totales. El navegador ya calculo lo mismo para
   * mostrarlo en pantalla, pero el numero que se guarda lo vuelve a sacar el
   * servidor: si el total viniera de afuera, cualquiera podria guardar un cerco
   * de 200 m con un total de $1 y despues reclamarlo. El calculo es una funcion
   * pura justamente para poder correrla en los dos lados sin duplicarla.
   */
  guardar: procedimientoPublico
    .input(datosDelCliente.extend({ pedido: pedidoValidado }))
    .mutation(async ({ ctx, input }) => {
      // Los precios se leen acá y no llegan del navegador, por la misma razon
      // que los totales: lo que manda el cliente no decide cuanto sale.
      const calculo = cotizar(input.pedido, await listaDePrecios(ctx.db));

      // El codigo es aleatorio, asi que puede repetirse. La base tiene la
      // restriccion unica y aca se reintenta: la unicidad se defiende en la
      // base, no confiando en que el azar no choque.
      for (let intento = 0; intento < 5; intento++) {
        try {
          const guardada = await ctx.db.cotizacion.create({
            data: {
              codigo: codigoNuevo(),
              cliente: input.cliente || null,
              obra: input.obra || null,
              notas: input.notas || null,
              pedido: JSON.stringify(input.pedido),
              materiales: calculo.materiales,
              manoDeObra: calculo.manoDeObra,
              subtotal: calculo.subtotal,
              iva: calculo.iva,
              total: calculo.total,
              items: {
                create: calculo.items.map((item, orden) => ({
                  codigo: item.codigo,
                  descripcion: item.descripcion,
                  unidad: item.unidad,
                  cantidad: new Prisma.Decimal(item.cantidad),
                  precioUnitario: item.precioUnitario,
                  subtotal: item.subtotal,
                  orden,
                })),
              },
            },
            select: { codigo: true },
          });

          return { codigo: guardada.codigo };
        } catch (error) {
          const choque =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";
          if (!choque) throw error;
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No se pudo generar un código libre. Probá de nuevo.",
      });
    }),

  /** Una cotizacion guardada, como se guardo. No se recalcula nada. */
  porCodigo: procedimientoPublico
    .input(z.object({ codigo: z.string().trim().toUpperCase().length(6) }))
    .query(async ({ ctx, input }) => {
      const cotizacion = await ctx.db.cotizacion.findUnique({
        where: { codigo: input.codigo },
        include: { items: { orderBy: { orden: "asc" } } },
      });

      if (!cotizacion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No existe esa cotización.",
        });
      }

      return {
        ...cotizacion,

        /**
         * El pedido sale de la base como texto y se valida, no se castea.
         * Un `as` acá seria una promesa: "confien en que esto tiene la forma
         * que digo". Lo que hay del otro lado de una base es un dato que
         * escribio una version anterior de este mismo programa, y esa version
         * puede haber guardado otra cosa.
         */
        pedido: pedidoSchema.parse(JSON.parse(cotizacion.pedido)),

        // `Decimal` no cruza a un Client Component: se convierte una sola vez,
        // aca, y no en cada lugar que lo muestre.
        items: cotizacion.items.map((item) => ({
          ...item,
          cantidad: item.cantidad.toNumber(),
        })),
      };
    }),
});
