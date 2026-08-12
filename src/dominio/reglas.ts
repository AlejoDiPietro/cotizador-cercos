/**
 * Reglas del oficio, todas juntas y en un solo lugar.
 *
 * Esto no es configuracion de la app: es como se arma un cerco. Cada numero
 * de acá sale de una decision de obra, no de una preferencia tecnica, y por
 * eso esta separado del calculo: el calculo no cambia nunca, estos numeros si
 * cambian cuando cambia el proveedor, el precio o la forma de trabajar.
 */

/** Alturas de tejido que se fabrican, en metros. */
export const ALTURAS = [1.0, 1.2, 1.5, 1.8, 2.0, 2.4] as const;
export type Altura = (typeof ALTURAS)[number];

/** Abertura del rombo en milimetros. Mas chico el rombo, mas cerrado el cerco. */
export const ROMBOS = [50, 63, 75] as const;
export type Rombo = (typeof ROMBOS)[number];

export const TIPOS_POSTE = [
  "cano-galvanizado",
  "hormigon",
  "angulo-hierro",
] as const;
export type TipoPoste = (typeof TIPOS_POSTE)[number];

export const NOMBRE_POSTE: Record<TipoPoste, string> = {
  "cano-galvanizado": "Caño galvanizado",
  hormigon: "Poste de hormigón",
  "angulo-hierro": "Ángulo de hierro",
};

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

/**
 * Hilos de alambre de tension segun la altura. Van arriba, abajo y en el
 * medio; cuanto mas alto el cerco, mas hilos necesita para no ondularse.
 */
export function hilosDeTension(altura: Altura): number {
  if (altura <= 1.2) return 2;
  if (altura <= 1.8) return 3;
  return 4;
}

/** Puntales (refuerzos diagonales) por tipo de poste estructural. */
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
 * Precios de referencia, en CENTAVOS y sin IVA.
 *
 * Van en centavos a proposito: en pesos, `0.1 + 0.2` no da `0.3` y un total de
 * cotizacion arrastra el error hasta el ultimo digito. Toda la plata de este
 * proyecto es un entero de centavos y recien se divide para mostrarla.
 *
 * Son precios INVENTADOS, con ordenes de magnitud plausibles de 2026. Este
 * proyecto es una demostracion publica: no lleva la lista de precios real de
 * ninguna empresa.
 */
export type CodigoMaterial =
  | "tejido-rollo"
  | "poste-terminal"
  | "poste-intermedio"
  | "puntal"
  | "alambre-tension"
  | "torniquete"
  | "alambre-atadura"
  | "bolsa-premezclado"
  | "porton";

export type Material = {
  codigo: CodigoMaterial;
  nombre: string;
  unidad: string;
  /** Sin IVA, en centavos. */
  precio: number;
};

/**
 * El precio del rollo y del poste dependen de la altura y del material, asi
 * que se resuelven con una funcion y no con una constante suelta.
 */
export function precioRollo(altura: Altura, rombo: Rombo): number {
  const base = 4_200_000; // $42.000 el rollo de 10 m x 1,00 m
  const porAltura = altura / 1.0;
  // Rombo mas chico = mas alambre por metro cuadrado = mas caro.
  const porRombo = 63 / rombo;
  return Math.round(base * porAltura * porRombo);
}

export function precioPoste(
  tipo: TipoPoste,
  altura: Altura,
  estructural: boolean,
): number {
  const base: Record<TipoPoste, number> = {
    "cano-galvanizado": 1_800_000,
    hormigon: 1_350_000,
    "angulo-hierro": 1_500_000,
  };
  // El poste se entierra ~60 cm: siempre mide mas que la altura del tejido.
  const largo = altura + 0.6;
  // El esquinero y el terminal son de seccion mas gruesa.
  const refuerzo = estructural ? 1.35 : 1;
  return Math.round(base[tipo] * largo * refuerzo);
}

export const PRECIOS: Record<
  Exclude<CodigoMaterial, "tejido-rollo" | "poste-terminal" | "poste-intermedio">,
  Material
> = {
  puntal: {
    codigo: "puntal",
    nombre: "Puntal de refuerzo",
    unidad: "u",
    precio: 1_900_000,
  },
  "alambre-tension": {
    codigo: "alambre-tension",
    nombre: "Alambre de tensión galvanizado",
    unidad: "m",
    precio: 32_000,
  },
  torniquete: {
    codigo: "torniquete",
    nombre: "Torniquete tensor",
    unidad: "u",
    precio: 210_000,
  },
  "alambre-atadura": {
    codigo: "alambre-atadura",
    nombre: "Alambre de atadura",
    unidad: "kg",
    precio: 480_000,
  },
  "bolsa-premezclado": {
    codigo: "bolsa-premezclado",
    nombre: "Bolsa de premezclado 30 kg",
    unidad: "u",
    precio: 850_000,
  },
  porton: {
    codigo: "porton",
    nombre: "Portón de tejido con marco",
    unidad: "u",
    precio: 28_000_000,
  },
};

/** Mano de obra, en centavos por metro lineal de cerco. */
export const MANO_DE_OBRA_POR_METRO = 1_450_000;

/** Adicional de mano de obra por portón colocado. */
export const MANO_DE_OBRA_PORTON = 9_500_000;
