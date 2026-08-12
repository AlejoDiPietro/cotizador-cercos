const CLAVE = "cotizador.pin";

/**
 * El PIN que autoriza cambiar precios, guardado en el navegador.
 *
 * En `localStorage` y no en una cookie porque no lo necesita el servidor para
 * renderizar nada: viaja como header solo en las mutaciones que lo piden. Y
 * queda escrito ahi para no tener que tipearlo en cada cambio de precio.
 *
 * No es una sesion ni pretende serlo. La comprobacion real esta en el servidor
 * (`procedimientoAdmin`): esto es solo donde el navegador se acuerda del PIN.
 */
export function leerPin(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE);
}

export function guardarPin(pin: string) {
  window.localStorage.setItem(CLAVE, pin);
}

export function olvidarPin() {
  window.localStorage.removeItem(CLAVE);
}
