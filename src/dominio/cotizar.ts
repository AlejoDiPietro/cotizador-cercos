/**
 * El calculo de la cotizacion: una funcion pura.
 *
 * No toca la base, no sabe que existe React y no lee la hora. Entra un pedido,
 * sale un presupuesto. Por eso es la unica parte del proyecto con tests de
 * verdad: es la que puede estar mal sin que nada se rompa.
 */

import {
  BOLSAS_BASE_ESTRUCTURAL,
  BOLSAS_BASE_INTERMEDIO,
  IVA,
  KG_ATADURA_POR_M2,
  LARGO_ROLLO,
  MANO_DE_OBRA_PORTON,
  MANO_DE_OBRA_POR_METRO,
  NOMBRE_POSTE,
  PRECIOS,
  PUNTALES_POR_ESQUINERO,
  PUNTALES_POR_TERMINAL,
  SEPARACION_POSTES,
  SOLAPE,
  hilosDeTension,
  precioPoste,
  precioRollo,
  type Altura,
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
  /** Todo en centavos, sin IVA. */
  materiales: number;
  manoDeObra: number;
  subtotal: number;
  iva: number;
  total: number;
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

/** Redondeo de plata: los centavos son enteros, nunca medio centavo. */
function centavos(valor: number): number {
  return Math.round(valor);
}

export function cotizar(pedido: Pedido): Cotizacion {
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
  const metrosConSolape = metrosDeTejido * (1 + SOLAPE);
  const rollos = Math.ceil(metrosConSolape / LARGO_ROLLO);

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

  const agregar = (
    codigo: string,
    descripcion: string,
    unidad: string,
    cantidad: number,
    precioUnitario: number,
  ) => {
    if (cantidad <= 0) return;
    items.push({
      codigo,
      descripcion,
      unidad,
      cantidad,
      precioUnitario,
      subtotal: centavos(cantidad * precioUnitario),
    });
  };

  agregar(
    "tejido-rollo",
    `Tejido romboidal ${pedido.altura.toFixed(2)} m · rombo ${pedido.rombo} mm · rollo de ${LARGO_ROLLO} m`,
    "rollo",
    rollos,
    precioRollo(pedido.altura, pedido.rombo),
  );

  agregar(
    "poste-terminal",
    `${NOMBRE_POSTE[pedido.tipoPoste]} reforzado (esquinero, terminal y portón)`,
    "u",
    postesEstructurales,
    precioPoste(pedido.tipoPoste, pedido.altura, true),
  );

  agregar(
    "poste-intermedio",
    `${NOMBRE_POSTE[pedido.tipoPoste]} intermedio (cada ${SEPARACION_POSTES} m)`,
    "u",
    intermedios,
    precioPoste(pedido.tipoPoste, pedido.altura, false),
  );

  agregar(
    "puntal",
    PRECIOS.puntal.nombre,
    PRECIOS.puntal.unidad,
    puntales,
    PRECIOS.puntal.precio,
  );

  agregar(
    "alambre-tension",
    `${PRECIOS["alambre-tension"].nombre} (${hilos} hilos)`,
    PRECIOS["alambre-tension"].unidad,
    metrosDeAlambre,
    PRECIOS["alambre-tension"].precio,
  );

  agregar(
    "torniquete",
    PRECIOS.torniquete.nombre,
    PRECIOS.torniquete.unidad,
    torniquetes,
    PRECIOS.torniquete.precio,
  );

  agregar(
    "alambre-atadura",
    PRECIOS["alambre-atadura"].nombre,
    PRECIOS["alambre-atadura"].unidad,
    kgAtadura,
    PRECIOS["alambre-atadura"].precio,
  );

  if (pedido.conHormigon) {
    const bolsas =
      postesEstructurales * BOLSAS_BASE_ESTRUCTURAL +
      intermedios * BOLSAS_BASE_INTERMEDIO;
    agregar(
      "bolsa-premezclado",
      PRECIOS["bolsa-premezclado"].nombre,
      PRECIOS["bolsa-premezclado"].unidad,
      bolsas,
      PRECIOS["bolsa-premezclado"].precio,
    );
  }

  pedido.portones.forEach((ancho) => {
    items.push({
      codigo: "porton",
      descripcion: `${PRECIOS.porton.nombre} · ${ancho.toFixed(2)} m de ancho`,
      unidad: PRECIOS.porton.unidad,
      cantidad: 1,
      // El porton se cobra por metro de ancho sobre un precio base de 1 m.
      precioUnitario: centavos(PRECIOS.porton.precio * ancho),
      subtotal: centavos(PRECIOS.porton.precio * ancho),
    });
  });

  const materiales = items.reduce((acum, item) => acum + item.subtotal, 0);

  let manoDeObra = 0;
  if (pedido.conManoDeObra) {
    manoDeObra =
      centavos(metrosTotales * MANO_DE_OBRA_POR_METRO) +
      pedido.portones.length * MANO_DE_OBRA_PORTON;
  }

  const subtotal = materiales + manoDeObra;
  const iva = centavos(subtotal * IVA);

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
