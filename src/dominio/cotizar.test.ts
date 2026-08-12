/**
 * Los tests del calculo.
 *
 * Cada caso de aca es un error que se comete cotizando a mano. No prueban que
 * el codigo corra: prueban que la cuenta este bien.
 */

import { describe, expect, it } from "vitest";
import { cotizar, type Pedido } from "./cotizar";
import {
  IVA,
  LARGO_ROLLO,
  PRECIOS_INICIALES,
  SEPARACION_POSTES,
  margen,
  type ListaDePrecios,
} from "./reglas";

const base: Pedido = {
  tramos: [30],
  cerrado: false,
  altura: 1.8,
  rombo: 63,
  tipoPoste: "cano-galvanizado",
  portones: [],
  conHormigon: false,
  conManoDeObra: false,
};

const pedido = (cambios: Partial<Pedido> = {}): Pedido => ({ ...base, ...cambios });

/** La lista con algun precio cambiado, sin tocar la original. */
const listaCon = (
  cambios: Partial<Record<keyof ListaDePrecios, number>>,
): ListaDePrecios => {
  const lista = structuredClone(PRECIOS_INICIALES);
  Object.entries(cambios).forEach(([codigo, precio]) => {
    lista[codigo as keyof ListaDePrecios].precio = precio as number;
  });
  return lista;
};

const cotizarCon = (p: Pedido = pedido(), precios = PRECIOS_INICIALES) =>
  cotizar(p, precios);

const item = (c: ReturnType<typeof cotizar>, codigo: string) =>
  c.items.find((i) => i.codigo === codigo);

describe("estructura de postes", () => {
  it("un tramo igual a la separación no lleva ningún poste intermedio", () => {
    const c = cotizarCon(pedido({ tramos: [SEPARACION_POSTES] }));
    expect(c.estructura.postesIntermedios).toBe(0);
  });

  it("un tramo de 30 m lleva 9 intermedios, no 10", () => {
    // 30 / 3 = 10 espacios => 9 postes en el medio. Los otros dos son los
    // extremos, que se cuentan aparte porque son mas gruesos.
    const c = cotizarCon(pedido({ tramos: [30] }));
    expect(c.estructura.postesIntermedios).toBe(9);
  });

  it("un tramo mas corto que la separación sigue teniendo cero intermedios", () => {
    const c = cotizarCon(pedido({ tramos: [1.5] }));
    expect(c.estructura.postesIntermedios).toBe(0);
  });

  it("un perímetro cerrado no tiene terminales: todas las puntas son esquineros", () => {
    const abierto = cotizarCon(pedido({ tramos: [20, 10, 20], cerrado: false }));
    const cerrado = cotizarCon(pedido({ tramos: [20, 10, 20], cerrado: true }));

    // Abierto: 2 esquineros interiores + 2 terminales = 4.
    expect(abierto.estructura.postesEstructurales).toBe(4);
    // Cerrado: 3 esquineros, uno por vertice.
    expect(cerrado.estructura.postesEstructurales).toBe(3);
  });
});

describe("tejido por rollo", () => {
  it("32 m de cerco son 4 rollos de 10 m, no 3,2", () => {
    const c = cotizarCon(pedido({ tramos: [32] }));
    expect(c.estructura.rollos).toBe(4);
    expect(item(c, "tejido")?.cantidad).toBe(4);
  });

  it("un cerco justo de 30 m necesita 4 rollos por el solape", () => {
    // 30 m exactos entran en 3 rollos solo si el tejido no se solapara. Con
    // 3% de solape hacen falta 30,9 m => 4 rollos. Este es el error clasico.
    const c = cotizarCon(pedido({ tramos: [30] }));
    expect(c.estructura.rollos).toBe(4);
  });

  it("el portón no lleva tejido: le resta metros al rollo", () => {
    const sinPorton = cotizarCon(pedido({ tramos: [30] }));
    const conPorton = cotizarCon(pedido({ tramos: [30], portones: [4] }));

    expect(conPorton.estructura.metrosDeTejido).toBe(26);
    expect(conPorton.estructura.rollos).toBeLessThan(sinPorton.estructura.rollos);
  });

  it("el portón agrega dos postes reforzados a cada lado del hueco", () => {
    const sinPorton = cotizarCon(pedido({ portones: [] }));
    const conPorton = cotizarCon(pedido({ portones: [3] }));

    expect(conPorton.estructura.postesEstructurales).toBe(
      sinPorton.estructura.postesEstructurales + 2,
    );
  });

  it("el rollo depende de la altura y del rombo", () => {
    const bajo = cotizarCon(pedido({ altura: 1.0 }));
    const alto = cotizarCon(pedido({ altura: 2.4 }));
    const cerrado = cotizarCon(pedido({ rombo: 50 }));
    const abierto = cotizarCon(pedido({ rombo: 75 }));

    expect(item(alto, "tejido")!.precioUnitario).toBeGreaterThan(
      item(bajo, "tejido")!.precioUnitario,
    );
    expect(item(cerrado, "tejido")!.precioUnitario).toBeGreaterThan(
      item(abierto, "tejido")!.precioUnitario,
    );
  });
});

describe("hilos de tensión", () => {
  it.each([
    [1.0, 2],
    [1.2, 2],
    [1.5, 3],
    [1.8, 3],
    [2.0, 4],
    [2.4, 4],
  ] as const)("un cerco de %s m lleva %i hilos", (altura, esperados) => {
    const c = cotizarCon(pedido({ altura }));
    expect(c.estructura.hilos).toBe(esperados);
  });

  it("el alambre de tensión es un hilo por vuelta, no una vuelta sola", () => {
    const c = cotizarCon(pedido({ tramos: [30], altura: 1.8 }));
    expect(item(c, "alambre-tension")?.cantidad).toBe(90);
  });
});

describe("la plata", () => {
  it("todo subtotal es un entero de centavos: no existe medio centavo", () => {
    const c = cotizarCon(
      pedido({ tramos: [37.5], portones: [2.5], conHormigon: true }),
    );
    c.items.forEach((i) => {
      expect(Number.isInteger(i.subtotal)).toBe(true);
      expect(Number.isInteger(i.precioUnitario)).toBe(true);
    });
    expect(Number.isInteger(c.total)).toBe(true);
    expect(Number.isInteger(c.iva)).toBe(true);
  });

  it("la columna de subtotales suma exactamente el total que se lee abajo", () => {
    // La hoja se muestra al peso. Si un renglon tuviera centavos, lo que suma
    // el cliente con la calculadora no daria el total impreso, y ahi se cae la
    // cotizacion entera. Todo valor que se muestra es multiplo de 100 centavos.
    const c = cotizarCon(
      pedido({
        tramos: [37.5, 12.3, 8.7],
        portones: [2.5, 3.2],
        conHormigon: true,
        conManoDeObra: true,
      }),
    );

    c.items.forEach((i) => expect(i.subtotal % 100).toBe(0));
    expect(c.manoDeObra % 100).toBe(0);
    expect(c.iva % 100).toBe(0);
    expect(c.total % 100).toBe(0);

    const sumaEnPesos = c.items.reduce((a, i) => a + i.subtotal / 100, 0);
    expect(sumaEnPesos).toBe(c.materiales / 100);
    expect(sumaEnPesos + c.manoDeObra / 100 + c.iva / 100).toBe(c.total / 100);
  });

  it("el total es el subtotal con IVA, y el subtotal es lo que suman los items", () => {
    const c = cotizarCon(pedido({ conManoDeObra: true, conHormigon: true }));
    const sumaDeItems = c.items.reduce((a, i) => a + i.subtotal, 0);

    expect(c.materiales).toBe(sumaDeItems);
    expect(c.subtotal).toBe(c.materiales + c.manoDeObra);
    expect(c.iva).toBe(Math.round((c.subtotal * IVA) / 100) * 100);
    expect(c.total).toBe(c.subtotal + c.iva);
  });

  it("sin mano de obra la cotización es solo materiales", () => {
    const c = cotizarCon(pedido({ conManoDeObra: false }));
    expect(c.manoDeObra).toBe(0);
    expect(c.subtotal).toBe(c.materiales);
  });

  it("sin hormigón no aparece el premezclado", () => {
    expect(
      item(cotizarCon(pedido({ conHormigon: false })), "bolsa-premezclado"),
    ).toBeUndefined();
    expect(
      item(cotizarCon(pedido({ conHormigon: true })), "bolsa-premezclado"),
    ).toBeDefined();
  });

  it("no devuelve NaN ni infinitos con medidas raras", () => {
    const c = cotizarCon(pedido({ tramos: [0.5, 1000], portones: [0.8, 6] }));
    expect(Number.isFinite(c.total)).toBe(true);
    expect(c.total).toBeGreaterThan(0);
  });

  it("un item con cantidad cero no se imprime en la cotización", () => {
    // Un tramo corto no lleva intermedios: la linea no tiene que existir con
    // cantidad 0, tiene que no estar.
    const c = cotizarCon(pedido({ tramos: [2] }));
    expect(c.items.filter((i) => i.descripcion.includes("intermedio"))).toHaveLength(0);
  });
});

describe("la lista de precios entra por argumento", () => {
  it("con la misma entrada da siempre lo mismo", () => {
    const p = pedido({ conManoDeObra: true, conHormigon: true });
    expect(cotizarCon(p).total).toBe(cotizarCon(p).total);
  });

  it("si sube el precio del tejido, sube el total", () => {
    const antes = cotizarCon(pedido(), PRECIOS_INICIALES);
    const despues = cotizarCon(
      pedido(),
      listaCon({ tejido: PRECIOS_INICIALES.tejido.precio * 2 }),
    );

    expect(despues.total).toBeGreaterThan(antes.total);
  });

  it("cambiar el precio de un material que no se usa no mueve el total", () => {
    // Sin hormigon el premezclado no entra, asi que su precio es irrelevante.
    // Suena obvio y es justo lo que se rompe cuando el calculo lee una
    // constante global en vez del renglon que corresponde.
    const antes = cotizarCon(pedido({ conHormigon: false }));
    const despues = cotizarCon(
      pedido({ conHormigon: false }),
      listaCon({ "bolsa-premezclado": 99_999_999 }),
    );

    expect(despues.total).toBe(antes.total);
  });

  it("cada tipo de poste cobra su propio precio de lista", () => {
    const cano = cotizarCon(pedido({ tipoPoste: "cano-galvanizado" }));
    const hormigon = cotizarCon(pedido({ tipoPoste: "hormigon" }));

    expect(item(cano, "poste-cano-galvanizado")).toBeDefined();
    expect(item(hormigon, "poste-hormigon")).toBeDefined();
    // El hormigon es mas barato por metro en la lista inicial.
    expect(hormigon.total).toBeLessThan(cano.total);
  });

  it("no muta la lista que recibe", () => {
    const lista = structuredClone(PRECIOS_INICIALES);
    const copia = structuredClone(lista);
    cotizarCon(pedido({ conManoDeObra: true, conHormigon: true }), lista);
    expect(lista).toEqual(copia);
  });
});

describe("costo y ganancia", () => {
  it("el costo es menor que lo que se cobra, y la ganancia es la diferencia", () => {
    const c = cotizarCon(pedido({ conManoDeObra: true, conHormigon: true }));

    expect(c.costo).toBeGreaterThan(0);
    expect(c.costo).toBeLessThan(c.subtotal);
    expect(c.ganancia).toBe(c.subtotal - c.costo);
  });

  it("la ganancia se mide contra el subtotal: el IVA no es ganancia", () => {
    const c = cotizarCon(pedido({ conManoDeObra: true }));
    expect(c.ganancia).toBeLessThan(c.total - c.costo);
  });

  it("vender al costo deja ganancia cero", () => {
    const alCosto = structuredClone(PRECIOS_INICIALES);
    Object.values(alCosto).forEach((p) => {
      p.precio = p.costo;
    });

    const c = cotizarCon(pedido({ conManoDeObra: true, conHormigon: true }), alCosto);
    expect(c.ganancia).toBe(0);
  });

  it("el margen es sobre el precio de venta, no sobre el costo", () => {
    // Vender a 100 lo que costo 70 es 30% de margen, no 43%. Confundirlos es
    // como se termina vendiendo mas barato de lo que se cree.
    expect(margen(10_000, 7_000)).toBeCloseTo(0.3, 10);
    expect(margen(0, 7_000)).toBe(0);
  });
});

describe("propiedades que tienen que valer siempre", () => {
  const medidas = [3, 7.5, 12, 28, 30, 31, 100, 247.5];

  it("mas metros nunca cuesta menos", () => {
    let anterior = 0;
    medidas.forEach((m) => {
      const total = cotizarCon(pedido({ tramos: [m], conManoDeObra: true })).total;
      expect(total).toBeGreaterThanOrEqual(anterior);
      anterior = total;
    });
  });

  it("el tejido alcanza para cubrir el cerco", () => {
    medidas.forEach((m) => {
      const c = cotizarCon(pedido({ tramos: [m] }));
      expect(c.estructura.rollos * LARGO_ROLLO).toBeGreaterThanOrEqual(
        c.estructura.metrosDeTejido,
      );
    });
  });
});
