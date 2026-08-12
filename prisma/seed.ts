/**
 * Datos de ejemplo.
 *
 * Un repo que se clona y muestra una pantalla vacia obliga a adivinar que hace.
 * Esto deja la lista de precios cargada y tres cotizaciones para abrir, que son
 * tres casos distintos del calculo: un lote cerrado, un frente con porton y un
 * cerco largo sin mano de obra.
 *
 * Los totales NO estan escritos a mano: salen de `cotizar()` con la lista que
 * acaba de quedar en la base, el mismo codigo que usa la app. Un seed con
 * numeros a mano miente en cuanto cambia una regla o un precio.
 *
 * Se corre con `npm run db:seed` y es idempotente: `upsert` por codigo, asi que
 * dos corridas dejan la base igual que una.
 */

import { cotizar, pesos, type Pedido } from "../src/dominio/cotizar";
import { PRECIOS_INICIALES } from "../src/dominio/reglas";
import { db } from "../src/server/db";
import { listaDePrecios } from "../src/server/precios";

const ejemplos: {
  codigo: string;
  cliente: string;
  obra: string;
  notas?: string;
  pedido: Pedido;
}[] = [
  {
    codigo: "K7M2QX",
    cliente: "Familia Duarte",
    obra: "Lote en Moreno",
    notas:
      "El lote está cerrado por los cuatro lados. Entrega y colocación dentro de los 15 días de la seña.",
    pedido: {
      tramos: [32, 18, 32, 18],
      cerrado: true,
      altura: 1.8,
      rombo: 63,
      tipoPoste: "cano-galvanizado",
      portones: [],
      conHormigon: true,
      conManoDeObra: true,
    },
  },
  {
    codigo: "H4TJ9P",
    cliente: "Depósito San Martín",
    obra: "Frente sobre la calle",
    notas: "Portón de 4 m para que entre el camión.",
    pedido: {
      tramos: [24],
      cerrado: false,
      altura: 2.4,
      rombo: 50,
      tipoPoste: "hormigon",
      portones: [4],
      conHormigon: true,
      conManoDeObra: true,
    },
  },
  {
    codigo: "R3XN8B",
    cliente: "Cooperativa La Esperanza",
    obra: "Cancha de fútbol",
    notas: "Solo materiales: la colocación la hacen ellos.",
    pedido: {
      tramos: [100, 64, 100, 64],
      cerrado: true,
      altura: 2.0,
      rombo: 75,
      tipoPoste: "angulo-hierro",
      portones: [3, 3],
      conHormigon: false,
      conManoDeObra: false,
    },
  },
];

async function sembrarPrecios() {
  const inicial = Object.values(PRECIOS_INICIALES);

  for (const [orden, referencia] of inicial.entries()) {
    await db.producto.upsert({
      where: { codigo: referencia.codigo },
      // El `update` deja el nombre y la unidad al dia pero NO pisa precio ni
      // costo: si alguien ya los ajusto, correr el seed otra vez no tiene por
      // que devolverle la lista al valor de fabrica. Para eso esta "restaurar".
      update: { nombre: referencia.nombre, unidad: referencia.unidad, orden },
      create: { ...referencia, orden },
    });
  }

  console.log(`  ${inicial.length} productos en la lista de precios`);
}

async function sembrarCotizaciones() {
  const precios = await listaDePrecios(db);

  for (const ejemplo of ejemplos) {
    const calculo = cotizar(ejemplo.pedido, precios);

    const datos = {
      cliente: ejemplo.cliente,
      obra: ejemplo.obra,
      notas: ejemplo.notas ?? null,
      pedido: JSON.stringify(ejemplo.pedido),
      materiales: calculo.materiales,
      manoDeObra: calculo.manoDeObra,
      subtotal: calculo.subtotal,
      iva: calculo.iva,
      total: calculo.total,
    };

    const items = calculo.items.map((item, orden) => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      orden,
    }));

    await db.cotizacion.upsert({
      where: { codigo: ejemplo.codigo },
      // Al reescribir una cotizacion de ejemplo hay que borrar sus renglones
      // primero: si no, se suman a los viejos y el detalle queda duplicado.
      update: { ...datos, items: { deleteMany: {}, create: items } },
      create: { codigo: ejemplo.codigo, ...datos, items: { create: items } },
    });

    console.log(
      `  ${ejemplo.codigo}  ${ejemplo.cliente.padEnd(26)} ${pesos(calculo.total)}`,
    );
  }
}

async function main() {
  await sembrarPrecios();
  await sembrarCotizaciones();
  console.log("\nListo. Entrá a /c/K7M2QX o a /productos");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
