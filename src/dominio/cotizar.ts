/**
 * El calculo de la cotizacion: una funcion pura.
 *
 * No toca la base, no sabe que existe React y no lee la hora. Entra un pedido y
 * una lista de precios, sale un presupuesto. Por eso es la unica parte del
 * proyecto con tests de verdad: es la que puede estar mal sin que nada se rompa.
 *
 * Los precios entran por argumento y no por import. Es lo que permite que se
 * editen desde /productos sin que el calculo deje de ser puro: la misma entrada
 * da siempre la misma salida, y cuando cambia un precio, lo que cambia es la
 * entrada.
 */

import {
  BOLSAS_BASE_ESTRUCTURAL,
  BOLSAS_BASE_INTERMEDIO,
  CODIGO_POSTE,
  IVA,
  KG_ATADURA_POR_M2,
  LARGO_ROLLO,
  NOMBRE_POSTE,
  PUNTALES_POR_ESQUINERO,
  PUNTALES_POR_TERMINAL,
  SEPARACION_POSTES,
  SOLAPE,
  aPesosEnteros,
  hilosDeTension,
  precioDelPoste,
  precioDelRollo,
  type Altura,
  type ListaDePrecios,
  type Rombo,
  type TipoPoste,
} from "./reglas";

export type Pedido = {
  /** Metros de cada tramo recto. Un frente y dos laterales son tres tramos. */
  tramos: number[];
  /** Si el cerco cierra sobre si mismo (un lote cerrado) o es una linea abierta. */
  cerrado: boolean;
  altura: Altura;
  rombo: Rombo;
  tipoPoste: TipoPoste;
  /** Anchos de los portones, en metros. */
  portones: number[];
  /** Bases de hormigon para los postes. Sin esto, el cerco se afloja. */
  conHormigon: boolean;
  conManoDeObra: boolean;
};

export type Item = {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  /** Sin IVA, en centavos. */
  precioUnitario: number;
  /** Sin IVA, en centavos. */
  subtotal: number;
  /** Lo que cuesta este renglon, en centavos. Nunca se le muestra al cliente. */
  costo: number;
};

export type Cotizacion = {
  /** Lo que se descompone en materiales y trabajo. */
  items: Item[];
  /** Las cuentas intermedias, para poder explicar el numero y no solo mostrarlo. */
  estructura: {
    metrosTotales: number;
    metrosDeTejido: number;
    postesEstructurales: number;
    postesIntermedios: number;
    rollos: number;
    hilos: number;
  };
  /** Todo en centavos, sin IVA salvo `total`. */
  materiales: number;
  manoDeObra: number;
  subtotal: number;
  iva: number;
  total: number;
  /**
   * Lo que cuesta hacer la obra y lo que queda, en centavos.
   *
   * Va aparte de los totales y no se imprime en la hoja del cliente: es para
   * quien cotiza. Sin esto se puede cerrar un trabajo a perdida y no enterarse
   * hasta que hay que pagar los materiales.
   */
  costo: number;
  ganancia: number;
};

/**
 * Cuenta la estructura de postes.
 *
 * Es la parte que se cotiza mal a ojo. Un tramo de 3 m no lleva ningun poste
 * intermedio: lleva los dos de los extremos y nada mas. Y en un lote cerrado
 * no hay terminales, porque cada punta se junta con la siguiente y todas son
 * esquineros.
 */
function contarPostes(tramos: number[], cerrado: boolean) {
  const intermedios = tramos.reduce(
    (acum, metros) => acum + Math.max(0, Math.ceil(metros / SEPARACION_POSTES) - 1),
    0,
  );

  const esquineros = cerrado ? tramos.length : tramos.length - 1;
  const terminales = cerrado ? 0 : 2;

  return { intermedios, esquineros, terminales };
}

export function cotizar(pedido: Pedido, precios: ListaDePrecios): Cotizacion {
  const metrosTotales = pedido.tramos.reduce((a, b) => a + b, 0);
  const anchoPortones = pedido.portones.reduce((a, b) => a + b, 0);

  const { intermedios, esquineros, terminales } = contarPostes(
    pedido.tramos,
    pedido.cerrado,
  );

  // Cada porton corta el cerco: sus dos lados son terminales, y donde va el
  // porton no va tejido.
  const postesDePorton = pedido.portones.length * 2;
  const postesEstructurales = esquineros + terminales + postesDePorton;

  const metrosDeTejido = Math.max(0, metrosTotales - anchoPortones);
  const rollos = Math.ceil((metrosDeTejido * (1 + SOLAPE)) / LARGO_ROLLO);

  const hilos = hilosDeTension(pedido.altura);
  const metrosDeAlambre = Math.ceil(metrosDeTejido * hilos);
  // Un torniquete por hilo y por tramo: cada tramo se tensa por separado.
  const torniquetes = hilos * pedido.tramos.length;

  const kgAtadura =
    Math.ceil(metrosDeTejido * pedido.altura * KG_ATADURA_POR_M2 * 10) / 10;

  const puntales =
    terminales * PUNTALES_POR_TERMINAL +
    esquineros * PUNTALES_POR_ESQUINERO +
    postesDePorton * PUNTALES_POR_TERMINAL;

  const items: Item[] = [];

  /**
   * Agrega un renglon.
   *
   * El precio y el costo entran calculados y no salen de la lista pelada: el
   * rollo y el poste llevan las reglas de producto encima. El costo lleva las
   * mismas reglas que el precio, o el margen mentiria.
   */
  const agregar = (
    codigo: string,
    descripcion: string,
    unidad: string,
    cantidad: number,
    precioUnitario: number,
    costoUnitario: number,
  ) => {
    if (cantidad <= 0) return;
    items.push({
      codigo,
      descripcion,
      unidad,
      cantidad,
      precioUnitario,
      subtotal: aPesosEnteros(cantidad * precioUnitario),
      costo: aPesosEnteros(cantidad * costoUnitario),
    });
  };

  const tejido = precios.tejido;
  agregar(
    tejido.codigo,
    `${tejido.nombre} ${pedido.altura.toFixed(2)} m · rombo ${pedido.rombo} mm · rollo de ${LARGO_ROLLO} m`,
    "rollo",
    rollos,
    precioDelRollo(tejido.precio, pedido.altura, pedido.rombo),
    precioDelRollo(tejido.costo, pedido.altura, pedido.rombo),
  );

  const poste = precios[CODIGO_POSTE[pedido.tipoPoste]];
  agregar(
    poste.codigo,
    `${NOMBRE_POSTE[pedido.tipoPoste]} reforzado (esquinero, terminal y portón)`,
    "u",
    postesEstructurales,
    precioDelPoste(poste.precio, pedido.altura, true),
    precioDelPoste(poste.costo, pedido.altura, true),
  );
  agregar(
    poste.codigo,
    `${NOMBRE_POSTE[pedido.tipoPoste]} intermedio (cada ${SEPARACION_POSTES} m)`,
    "u",
    intermedios,
    precioDelPoste(poste.precio, pedido.altura, false),
    precioDelPoste(poste.costo, pedido.altura, false),
  );

  const puntal = precios.puntal;
  agregar(puntal.codigo, puntal.nombre, "u", puntales, puntal.precio, puntal.costo);

  const alambre = precios["alambre-tension"];
  agregar(
    alambre.codigo,
    `${alambre.nombre} (${hilos} hilos)`,
    "m",
    metrosDeAlambre,
    alambre.precio,
    alambre.costo,
  );

  const torniquete = precios.torniquete;
  agregar(
    torniquete.codigo,
    torniquete.nombre,
    "u",
    torniquetes,
    torniquete.precio,
    torniquete.costo,
  );

  const atadura = precios["alambre-atadura"];
  agregar(
    atadura.codigo,
    atadura.nombre,
    "kg",
    kgAtadura,
    atadura.precio,
    atadura.costo,
  );

  if (pedido.conHormigon) {
    const bolsa = precios["bolsa-premezclado"];
    const bolsas =
      postesEstructurales * BOLSAS_BASE_ESTRUCTURAL +
      intermedios * BOLSAS_BASE_INTERMEDIO;
    agregar(bolsa.codigo, bolsa.nombre, "u", bolsas, bolsa.precio, bolsa.costo);
  }

  const porton = precios.porton;
  pedido.portones.forEach((ancho) => {
    agregar(
      porton.codigo,
      `${porton.nombre} · ${ancho.toFixed(2)} m de ancho`,
      "u",
      1,
      // El porton se cobra por metro de ancho sobre un precio base de 1 m.
      aPesosEnteros(porton.precio * ancho),
      aPesosEnteros(porton.costo * ancho),
    );
  });

  const materiales = items.reduce((acum, item) => acum + item.subtotal, 0);

  let manoDeObra = 0;
  let costoManoDeObra = 0;
  if (pedido.conManoDeObra) {
    const trabajo = precios["mano-de-obra"];
    const colocacion = precios["mano-de-obra-porton"];

    manoDeObra =
      aPesosEnteros(metrosTotales * trabajo.precio) +
      aPesosEnteros(pedido.portones.length * colocacion.precio);
    costoManoDeObra =
      aPesosEnteros(metrosTotales * trabajo.costo) +
      aPesosEnteros(pedido.portones.length * colocacion.costo);
  }

  const subtotal = materiales + manoDeObra;
  const iva = aPesosEnteros(subtotal * IVA);
  const costo = items.reduce((acum, item) => acum + item.costo, 0) + costoManoDeObra;

  return {
    items,
    estructura: {
      metrosTotales,
      metrosDeTejido,
      postesEstructurales,
      postesIntermedios: intermedios,
      rollos,
      hilos,
    },
    materiales,
    manoDeObra,
    subtotal,
    iva,
    total: subtotal + iva,
    costo,
    // Sobre el subtotal y no sobre el total: el IVA no es plata de la empresa.
    ganancia: subtotal - costo,
  };
}

/** Centavos a texto en pesos. Una sola forma de mostrar plata en todo el sitio. */
export function pesos(valorEnCentavos: number): string {
  return (valorEnCentavos / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

/** Un valor entre 0 y 1 como porcentaje. */
export function porcentaje(valor: number): string {
  return valor.toLocaleString("es-AR", {
    style: "percent",
    maximumFractionDigits: 1,
  });
}
