import { randomInt } from "node:crypto";

/**
 * Alfabeto sin `I`, `O`, `0` ni `1`.
 *
 * El codigo se dicta por telefono y se lee de una captura de WhatsApp: si
 * puede confundirse un cero con una O, alguien va a abrir la cotizacion
 * equivocada o ninguna. Se pierden 4 simbolos y se gana no tener que aclarar
 * "la O de oso".
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LARGO = 6;

/** `randomInt` y no `Math.random`: el codigo es lo unico que protege el link. */
export function codigoNuevo(): string {
  let codigo = "";
  for (let i = 0; i < LARGO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}
