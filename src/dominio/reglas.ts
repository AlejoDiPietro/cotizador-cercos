/**
 * Reglas del oficio y lista de precios.
 *
 * Dos cosas distintas viven en este archivo, y la diferencia es la que ordena
 * el proyecto entero:
 *
 * - Las **reglas de obra** (postes cada 3 m, rollos de 10 m, 3% de solape) son
 *   como se arma un cerco. Cambian cuando cambia la forma de trabajar, casi
 *   nunca, y las cambia alguien que sabe de obra.
 * - Los **precios** cambian todas las semanas y los cambia cualquiera desde
 *   /productos. Por eso los precios no son constantes: son datos. Lo que hay
 *   acá abajo es solo la lista con la que arranca la base.
 *
 * El calculo no importa ninguna de las dos cosas: recibe la lista de precios
 * como argumento. Asi sigue siendo una funcion pura aunque los precios vivan en
 * una base que cambia todos los dias.
 */

/** Alturas de tejido que se fabrican, en metros. */
export const ALTURAS = [1.0, 1.2, 1.5, 1.8, 2.0, 2.4] as const;
export type Altura = (typeof ALTURAS)[number];

/** Abertura del rombo en milimetros. Mas chico el rombo, mas cerrado el cerco. */
export const ROMBOS = [50, 63, 75] as const;
export type Rombo = (typeof ROMBOS)[number];

export const TIPOS_POSTE = ["cano-galvanizado", "hormigon", "angulo-hierro"] as const;
export type TipoPoste = (typeof TIPOS_POSTE)[number];

export const NOMBRE_POSTE: Record<TipoPoste, string> = {
  "cano-galvanizado": "Caño galvanizado",
  hormigon: "Poste de hormigón",
  "angulo-hierro": "Ángulo de hierro",
};

/* -------------------------------------------------------------------------- */
/* Reglas de obra                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Separacion entre postes intermedios, en metros.
 *
 * 3 m es lo que se usa con tejido romboidal: mas lejos el tejido panza entre
 * poste y poste, mas cerca se paga estructura de mas.
 */
export const SEPARACION_POSTES = 3;

/**
 * Largo del rollo de tejido, en metros. El tejido no se corta al metro: se
 * compra por rollo. Es la regla que mas sorprende al que cotiza a mano, porque
 * 32 m de cerco no son 32 m de tejido, son cuatro rollos.
 */
export const LARGO_ROLLO = 10;

/** Solape entre rollo y rollo: se pierde tejido en cada union. */
export const SOLAPE = 0.03;

/** Altura de referencia de la lista: el rollo se cotiza sobre 1,00 m. */
export const ALTURA_BASE = 1.0;

/** Rombo de referencia de la lista. */
export const ROMBO_BASE = 63;

/** Lo que se entierra un poste, en metros. Siempre mide mas que el tejido. */
export const POSTE_ENTERRADO = 0.6;

/** El esquinero y el terminal son de seccion mas gruesa que el intermedio. */
export const REFUERZO_ESTRUCTURAL = 1.35;

/**
 * Hilos de alambre de tension segun la altura. Van arriba, abajo y en el
 * medio; cuanto mas alto el cerco, mas hilos necesita para no ondularse.
 */
export function hilosDeTension(altura: Altura): number {
  if (altura <= 1.2) return 2;
  if (altura <= 1.8) return 3;
  return 4;
}

/** Puntales (refuerzos diagonales) por poste estructural. */
export const PUNTALES_POR_TERMINAL = 1;
export const PUNTALES_POR_ESQUINERO = 2;

/** Alambre de atadura, en kg por metro cuadrado de tejido. */
export const KG_ATADURA_POR_M2 = 0.04;

/**
 * Bolsas de premezclado por base. El esquinero y el terminal tiran del cerco
 * entero, asi que llevan base mas profunda que el intermedio.
 */
export const BOLSAS_BASE_INTERMEDIO = 2;
export const BOLSAS_BASE_ESTRUCTURAL = 3;

/** IVA general en Argentina. */
export const IVA = 0.21;

/**
 * Redondeo al peso entero.
 *
 * Nadie cotiza un rollo de tejido con centavos. Y hay una razon mas fuerte que
 * la costumbre: el presupuesto se muestra al peso, asi que si un renglon
 * tuviera centavos, la suma de lo que se lee en la hoja no daria el total que
 * se lee abajo. Un presupuesto donde los renglones no suman el total es un
 * presupuesto que el cliente no firma.
 */
export function aPesosEnteros(valorEnCentavos: number): number {
  return Math.round(valorEnCentavos / 100) * 100;
}

/* -------------------------------------------------------------------------- */
/* Lista de precios                                                           */
/* -------------------------------------------------------------------------- */

export const CODIGOS_MATERIAL = [
  "tejido",
  "poste-cano-galvanizado",
  "poste-hormigon",
  "poste-angulo-hierro",
  "puntal",
  "alambre-tension",
  "torniquete",
  "alambre-atadura",
  "bolsa-premezclado",
  "porton",
  "mano-de-obra",
  "mano-de-obra-porton",
] as const;
export type CodigoMaterial = (typeof CODIGOS_MATERIAL)[number];

/** Que renglon de la lista le corresponde a cada tipo de poste. */
export const CODIGO_POSTE: Record<TipoPoste, CodigoMaterial> = {
  "cano-galvanizado": "poste-cano-galvanizado",
  hormigon: "poste-hormigon",
  "angulo-hierro": "poste-angulo-hierro",
};

export type PrecioDeLista = {
  codigo: CodigoMaterial;
  nombre: string;
  /** Sobre que se cobra. Va impreso en la cotizacion. */
  unidad: string;
  /**
   * Lo que se le cobra al cliente, en CENTAVOS y sin IVA.
   *
   * En centavos a proposito: en pesos, `0.1 + 0.2` no da `0.3` y un total de
   * cotizacion arrastra el error hasta el ultimo digito.
   */
  precio: number;
  /**
   * Lo que cuesta comprarlo, en centavos.
   *
   * No entra en ninguna cotizacion: existe para saber cuanto se gana. Un
   * cotizador que no sabe el costo puede vender a perdida sin enterarse.
   */
  costo: number;
};

export type ListaDePrecios = Record<CodigoMaterial, PrecioDeLista>;

/**
 * La lista con la que arranca la base.
 *
 * Son precios INVENTADOS, con ordenes de magnitud plausibles de 2026. Este
 * proyecto es una demostracion publica: no lleva la lista de precios real de
 * ninguna empresa.
 */
export const PRECIOS_INICIALES: ListaDePrecios = {
  tejido: {
    codigo: "tejido",
    nombre: "Tejido romboidal",
    unidad: `rollo de ${LARGO_ROLLO} m × ${ALTURA_BASE.toFixed(2)} m, rombo ${ROMBO_BASE} mm`,
    precio: 4_200_000,
    costo: 2_940_000,
  },
  "poste-cano-galvanizado": {
    codigo: "poste-cano-galvanizado",
    nombre: "Caño galvanizado",
    unidad: "por metro de poste",
    precio: 1_800_000,
    costo: 1_260_000,
  },
  "poste-hormigon": {
    codigo: "poste-hormigon",
    nombre: "Poste de hormigón",
    unidad: "por metro de poste",
    precio: 1_350_000,
    costo: 985_000,
  },
  "poste-angulo-hierro": {
    codigo: "poste-angulo-hierro",
    nombre: "Ángulo de hierro",
    unidad: "por metro de poste",
    precio: 1_500_000,
    costo: 1_020_000,
  },
  puntal: {
    codigo: "puntal",
    nombre: "Puntal de refuerzo",
    unidad: "unidad",
    precio: 1_900_000,
    costo: 1_330_000,
  },
  "alambre-tension": {
    codigo: "alambre-tension",
    nombre: "Alambre de tensión galvanizado",
    unidad: "metro",
    precio: 32_000,
    costo: 21_000,
  },
  torniquete: {
    codigo: "torniquete",
    nombre: "Torniquete tensor",
    unidad: "unidad",
    precio: 210_000,
    costo: 138_000,
  },
  "alambre-atadura": {
    codigo: "alambre-atadura",
    nombre: "Alambre de atadura",
    unidad: "kilo",
    precio: 480_000,
    costo: 335_000,
  },
  "bolsa-premezclado": {
    codigo: "bolsa-premezclado",
    nombre: "Bolsa de premezclado 30 kg",
    unidad: "unidad",
    precio: 850_000,
    costo: 640_000,
  },
  porton: {
    codigo: "porton",
    nombre: "Portón de tejido con marco",
    unidad: "por metro de ancho",
    precio: 28_000_000,
    costo: 19_600_000,
  },
  "mano-de-obra": {
    codigo: "mano-de-obra",
    nombre: "Mano de obra",
    unidad: "por metro de cerco",
    precio: 1_450_000,
    // El "costo" de la mano de obra es lo que se le paga a la cuadrilla.
    costo: 950_000,
  },
  "mano-de-obra-porton": {
    codigo: "mano-de-obra-porton",
    nombre: "Colocación de portón",
    unidad: "por portón",
    precio: 9_500_000,
    costo: 6_200_000,
  },
};

/**
 * Cuanto se gana sobre el precio de venta, entre 0 y 1.
 *
 * Sobre el precio y no sobre el costo: es el margen, no el recargo. Vender a
 * $100 lo que costo $70 es 30% de margen y 43% de recargo, y confundir uno con
 * otro es como se termina vendiendo mas barato de lo que se cree.
 */
export function margen(precio: number, costo: number): number {
  if (precio <= 0) return 0;
  return (precio - costo) / precio;
}

/* -------------------------------------------------------------------------- */
/* Como un precio de lista se convierte en el precio de un renglon            */
/* -------------------------------------------------------------------------- */

/**
 * El rollo se cotiza sobre 1,00 m de alto y rombo 63.
 *
 * Un tejido de 1,80 m tiene casi el doble de alambre, y un rombo mas chico
 * tiene mas alambre por metro cuadrado. Las dos cosas son reglas de producto y
 * no precios: por eso siguen acá y no en la base.
 */
export function precioDelRollo(
  precioBase: number,
  altura: Altura,
  rombo: Rombo,
): number {
  return aPesosEnteros(precioBase * (altura / ALTURA_BASE) * (ROMBO_BASE / rombo));
}

/** El poste se cotiza por metro, y mide la altura del tejido mas lo enterrado. */
export function precioDelPoste(
  precioPorMetro: number,
  altura: Altura,
  estructural: boolean,
): number {
  const largo = altura + POSTE_ENTERRADO;
  return aPesosEnteros(
    precioPorMetro * largo * (estructural ? REFUERZO_ESTRUCTURAL : 1),
  );
}
