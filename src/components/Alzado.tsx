import {
  POSTE_ENTERRADO,
  SEPARACION_POSTES,
  type Altura,
  type Rombo,
} from "@/dominio/reglas";

type Props = {
  tramos: number[];
  portones: number[];
  altura: Altura;
  rombo: Rombo;
  hilos: number;
  conHormigon: boolean;
};

/** Un trozo del cerco desarrollado: o lleva tejido, o es el hueco de un porton. */
type Trozo = { tipo: "tejido" | "porton"; metros: number };

/**
 * El cerco dibujado a escala.
 *
 * Es un alzado desarrollado: los tramos uno tras otro, como si el cerco se
 * estirara en linea recta. No es un plano —los angulos del terreno no los sabe
 * nadie— y no pretende serlo: sirve para ver lo que la tabla dice en numeros.
 * Los postes estan donde van a estar, cada 3 m; los hilos de tension son los
 * que se cobran; y lo que se ve enterrado bajo la linea de tierra es por que un
 * poste de un cerco de 1,80 m se paga como 2,40 m.
 *
 * Se dibuja con SVG y sin ninguna libreria: son cuatro `line` y un `pattern`.
 */
export function Alzado({ tramos, portones, altura, rombo, hilos, conHormigon }: Props) {
  const metrosTotales = tramos.reduce((a, b) => a + b, 0);
  if (metrosTotales <= 0) return null;

  const anchoPortones = portones.reduce((a, b) => a + b, 0);

  /**
   * Los portones se dibujan al final del ultimo tramo y le restan su ancho: el
   * dibujo mide lo mismo que el cerco. Donde estan de verdad no lo dice el
   * pedido, asi que ponerlos en otro lado seria inventar.
   */
  const trozos: Trozo[] = [];
  tramos.forEach((metros, i) => {
    const esUltimo = i === tramos.length - 1;
    const utiles = esUltimo ? Math.max(0, metros - anchoPortones) : metros;
    if (utiles > 0) trozos.push({ tipo: "tejido", metros: utiles });
  });
  portones.forEach((ancho) => trozos.push({ tipo: "porton", metros: ancho }));

  const metrosDibujados = trozos.reduce((a, t) => a + t.metros, 0);
  if (metrosDibujados <= 0) return null;

  /* Geometria del dibujo, en unidades del viewBox. */
  const ANCHO = 1000;
  const MARGEN_IZQ = 46; // deja lugar a la cota de altura
  const MARGEN_DER = 14;
  const UTIL = ANCHO - MARGEN_IZQ - MARGEN_DER;

  // La altura del dibujo sigue la proporcion real del cerco, con un techo: un
  // cerco de 100 m dibujado a escala real seria una raya.
  const escalaX = UTIL / metrosDibujados;
  const altoTejido = Math.min(150, Math.max(70, altura * 62));
  const enterrado = altoTejido * (POSTE_ENTERRADO / altura);
  const TIERRA = 24 + altoTejido;
  const ALTO = TIERRA + enterrado + 34;

  const x = (metros: number) => MARGEN_IZQ + metros * escalaX;
  const y = (fraccion: number) => TIERRA - fraccion * altoTejido;

  /**
   * Con muchos metros, un poste cada 3 m deja de ser un poste y pasa a ser una
   * trama gris. Mejor no dibujarlos que dibujar una mancha, y decirlo.
   */
  const separacionEnPx = SEPARACION_POSTES * escalaX;
  const dibujarIntermedios = separacionEnPx >= 7;

  const postesEstructurales: number[] = [];
  const postesIntermedios: number[] = [];
  const huecos: { desde: number; hasta: number }[] = [];
  const paños: { desde: number; hasta: number }[] = [];

  let cursor = 0;
  trozos.forEach((trozo, i) => {
    if (i === 0) postesEstructurales.push(cursor);

    if (trozo.tipo === "tejido") {
      paños.push({ desde: cursor, hasta: cursor + trozo.metros });
      if (dibujarIntermedios) {
        const cantidad = Math.max(0, Math.ceil(trozo.metros / SEPARACION_POSTES) - 1);
        for (let n = 1; n <= cantidad; n++) {
          postesIntermedios.push(cursor + n * (trozo.metros / (cantidad + 1)));
        }
      }
    } else {
      huecos.push({ desde: cursor, hasta: cursor + trozo.metros });
    }

    cursor += trozo.metros;
    postesEstructurales.push(cursor);
  });

  const idRombo = `rombo-${rombo}`;

  return (
    <figure className="junto">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={`Alzado del cerco: ${metrosTotales.toLocaleString("es-AR")} metros de largo, ${altura.toLocaleString("es-AR", { minimumFractionDigits: 2 })} metros de alto, con ${postesEstructurales.length} postes reforzados${portones.length > 0 ? ` y ${portones.length} ${portones.length === 1 ? "portón" : "portones"}` : ""}.`}
      >
        <defs>
          {/*
            El rombo del tejido, a escala del rombo elegido: con 50 mm la trama
            se ve mas cerrada que con 75. Es el unico lugar de la app donde se
            ve la diferencia entre un tejido y otro.
          */}
          <pattern
            id={idRombo}
            width={rombo / 5}
            height={rombo / 5}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M0 ${rombo / 10} L${rombo / 10} 0 M${rombo / 10} ${rombo / 5} L${rombo / 5} ${rombo / 10}`}
              className="stroke-tinta-suave"
              strokeWidth="0.7"
              fill="none"
            />
            <path
              d={`M0 ${rombo / 10} L${rombo / 10} ${rombo / 5} M${rombo / 10} 0 L${rombo / 5} ${rombo / 10}`}
              className="stroke-tinta-suave"
              strokeWidth="0.7"
              fill="none"
            />
          </pattern>
        </defs>

        {/* Paños de tejido */}
        {paños.map((paño, i) => (
          <rect
            key={`pano-${i}`}
            x={x(paño.desde)}
            y={y(1)}
            width={(paño.hasta - paño.desde) * escalaX}
            height={altoTejido}
            fill={`url(#${idRombo})`}
            opacity={0.55}
          />
        ))}

        {/* Hilos de tension: los que se cobran, ni uno mas */}
        {Array.from({ length: hilos }, (_, i) => {
          const fraccion = hilos === 1 ? 0.5 : 0.06 + (i * 0.88) / (hilos - 1);
          return (
            <line
              key={`hilo-${i}`}
              x1={MARGEN_IZQ}
              x2={x(metrosDibujados)}
              y1={y(fraccion)}
              y2={y(fraccion)}
              className="stroke-acento"
              strokeWidth="1.4"
              opacity={0.75}
            />
          );
        })}

        {/* Portones */}
        {huecos.map((hueco, i) => (
          <g key={`porton-${i}`}>
            <rect
              x={x(hueco.desde)}
              y={y(1)}
              width={(hueco.hasta - hueco.desde) * escalaX}
              height={altoTejido}
              className="fill-acento-claro stroke-acento"
              strokeWidth="1.6"
            />
            {/* La diagonal es como se dibuja una hoja de porton en un plano. */}
            <line
              x1={x(hueco.desde)}
              y1={y(0)}
              x2={x(hueco.hasta)}
              y2={y(1)}
              className="stroke-acento"
              strokeWidth="1.2"
              opacity={0.6}
            />
          </g>
        ))}

        {/* Postes intermedios */}
        {postesIntermedios.map((metros, i) => (
          <line
            key={`intermedio-${i}`}
            x1={x(metros)}
            x2={x(metros)}
            y1={y(1.04)}
            y2={TIERRA + enterrado}
            className="stroke-tinta-suave"
            strokeWidth="2"
          />
        ))}

        {/* Postes estructurales: mas gruesos, como en la obra */}
        {postesEstructurales.map((metros, i) => (
          <line
            key={`estructural-${i}`}
            x1={x(metros)}
            x2={x(metros)}
            y1={y(1.09)}
            y2={TIERRA + enterrado}
            className="stroke-tinta"
            strokeWidth="4"
          />
        ))}

        {/* Bases de hormigon */}
        {conHormigon &&
          postesEstructurales.map((metros, i) => (
            <rect
              key={`base-${i}`}
              x={x(metros) - 5}
              y={TIERRA}
              width={10}
              height={enterrado}
              className="fill-tinta-suave"
              opacity={0.28}
            />
          ))}

        {/* Linea de tierra */}
        <line
          x1={4}
          x2={ANCHO - 4}
          y1={TIERRA}
          y2={TIERRA}
          className="stroke-tinta"
          strokeWidth="1.5"
        />

        {/* Lo enterrado, punteado: por eso el poste se paga mas largo que el cerco */}
        <line
          x1={4}
          x2={ANCHO - 4}
          y1={TIERRA + enterrado}
          y2={TIERRA + enterrado}
          className="stroke-tinta-suave"
          strokeWidth="1"
          strokeDasharray="3 5"
          opacity={0.7}
        />

        {/* Cota de altura */}
        <g className="fill-tinta-suave stroke-tinta-suave">
          <line x1={26} x2={26} y1={y(1)} y2={y(0)} strokeWidth="1" />
          <line x1={22} x2={30} y1={y(1)} y2={y(1)} strokeWidth="1" />
          <line x1={22} x2={30} y1={y(0)} y2={y(0)} strokeWidth="1" />
          <text
            x={18}
            y={y(0.5)}
            textAnchor="middle"
            transform={`rotate(-90 18 ${y(0.5)})`}
            className="cifra fill-tinta-suave"
            fontSize="11"
            stroke="none"
          >
            {altura.toLocaleString("es-AR", { minimumFractionDigits: 2 })} m
          </text>
        </g>

        {/* Cota de largo */}
        <g>
          <text
            x={MARGEN_IZQ}
            y={TIERRA + enterrado + 24}
            className="cifra fill-tinta-suave"
            fontSize="11"
          >
            {metrosTotales.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m de
            cerco
          </text>
          <text
            x={x(metrosDibujados)}
            y={TIERRA + enterrado + 24}
            textAnchor="end"
            className="fill-tinta-suave"
            fontSize="11"
          >
            {dibujarIntermedios
              ? `postes cada ${SEPARACION_POSTES} m`
              : "postes intermedios no dibujados: no entran"}
          </text>
        </g>
      </svg>
    </figure>
  );
}
