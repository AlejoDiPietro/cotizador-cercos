/**
 * La forma valida de un pedido, escrita una sola vez.
 *
 * El mismo schema valida el formulario en el navegador y la llamada en el
 * servidor. No es por comodidad: el navegador se puede saltear, el servidor no.
 */

import { z } from "zod";
import { ALTURAS, ROMBOS, TIPOS_POSTE } from "./reglas";
import type { Pedido } from "./cotizar";

export const pedidoSchema = z.object({
  tramos: z
    .array(
      z
        .number()
        .positive("Cada tramo tiene que medir más de 0 m")
        .max(1000, "Más de 1.000 m por tramo no es un cerco, es una ruta"),
    )
    .min(1, "Hace falta al menos un tramo")
    .max(20, "Hasta 20 tramos"),
  cerrado: z.boolean(),
  altura: z.union(
    ALTURAS.map((a) => z.literal(a)) as unknown as [
      z.ZodLiteral<(typeof ALTURAS)[number]>,
      z.ZodLiteral<(typeof ALTURAS)[number]>,
      ...z.ZodLiteral<(typeof ALTURAS)[number]>[],
    ],
  ),
  rombo: z.union(
    ROMBOS.map((r) => z.literal(r)) as unknown as [
      z.ZodLiteral<(typeof ROMBOS)[number]>,
      z.ZodLiteral<(typeof ROMBOS)[number]>,
      ...z.ZodLiteral<(typeof ROMBOS)[number]>[],
    ],
  ),
  tipoPoste: z.enum(TIPOS_POSTE),
  portones: z
    .array(
      z
        .number()
        .min(0.8, "Un portón de menos de 0,80 m no pasa nadie")
        .max(6, "Más de 6 m ya es un portón especial, se cotiza aparte"),
    )
    .max(6, "Hasta 6 portones"),
  conHormigon: z.boolean(),
  conManoDeObra: z.boolean(),
});

/**
 * Un pedido cerrado no puede tener menos de tres tramos: con dos no cierra
 * nada. Va como refinamiento y no como comentario porque es una regla, y una
 * regla que no esta en el codigo es una regla que alguien va a romper.
 */
export const pedidoValidado = pedidoSchema.refine(
  (p) => !p.cerrado || p.tramos.length >= 3,
  {
    message: "Un perímetro cerrado necesita al menos tres tramos",
    path: ["tramos"],
  },
);

/** El tipo del formulario y el del calculo son el mismo. Si se separan, se desincronizan. */
export type PedidoEntrada = z.infer<typeof pedidoSchema>;

const _verificacion: PedidoEntrada extends Pedido ? true : never = true;
void _verificacion;

export const PEDIDO_INICIAL: PedidoEntrada = {
  tramos: [30, 15, 30],
  cerrado: false,
  altura: 1.8,
  rombo: 63,
  tipoPoste: "cano-galvanizado",
  portones: [3],
  conHormigon: true,
  conManoDeObra: true,
};
