/**
 * Los tests del calculo.
 *
 * Cada caso de aca es un error que se comete cotizando a mano. No prueban que
 * el codigo corra: prueban que la cuenta este bien.
 */

import { describe, expect, it } from "vitest";
import { cotizar, type Pedido } from "./cotizar";
import { IVA, LARGO_ROLLO, SEPARACION_POSTES } from "./reglas";

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

const item = (c: ReturnType<typeof cotizar>, codigo: string) =>
  c.items.find((i) => i.codigo === codigo);

describe("estructura de postes", () => {
  it("un tramo igual a la separación no lleva ningún poste intermedio", () => {
    const c = cotizar(pedido({ tramos: [SEPARACION_POSTES] }));
    expect(c.estructura.postesIntermedios).toBe(0);
  });

  it("un tramo de 30 m lleva 9 intermedios, no 10", () => {
    // 30 / 3 = 10 espacios => 9 postes en el medio. Los otros dos son los
    // extremos, que se cuentan aparte porque son mas gruesos.
    const c = cotizar(pedido({ tramos: [30] }));
    expect(c.estructura.postesIntermedios).toBe(9);
  });

  it("un tramo mas corto que la separación sigue teniendo cero intermedios", () => {
    const c = cotizar(pedido({ tramos: [1.5] }));
    expect(c.estructura.postesIntermedios).toBe(0);
  });

  it("un perímetro cerrado no tiene terminales: todas las puntas son esquineros", () => {
    const abierto = cotizar(pedido({ tramos: [20, 10, 20], cerrado: false }));
    const cerrado = cotizar(pedido({ tramos: [20, 10, 20], cerrado: true }));

    // Abierto: 2 esquineros interiores + 2 terminales = 4.
    expect(abierto.estructura.postesEstructurales).toBe(4);
    // Cerrado: 3 esquineros, uno por vertice.
    expect(cerrado.estructura.postesEstructurales).toBe(3);
  });
});

describe("tejido por rollo", () => {
  it("32 m de cerco son 4 rollos de 10 m, no 3,2", () => {
    const c = cotizar(pedido({ tramos: [32] }));
    expect(c.estructura.rollos).toBe(4);
    expect(item(c, "tejido-rollo")?.cantidad).toBe(4);
  });

  it("un cerco justo de 30 m necesita 4 rollos por el solape", () => {
    // 30 m exactos entran en 3 rollos solo si el tejido no se solapara. Con
    // 3% de solape hacen falta 30,9 m => 4 rollos. Este es el error clasico.
    const c = cotizar(pedido({ tramos: [30] }));
    expect(c.estructura.rollos).toBe(4);
  });

  it("el portón no lleva tejido: le resta metros al rollo", () => {
    const sinPorton = cotizar(pedido({ tramos: [30] }));
    const conPorton = cotizar(pedido({ tramos: [30], portones: [4] }));

    expect(conPorton.estructura.metrosDeTejido).toBe(26);
    expect(conPorton.estructura.rollos).toBeLessThan(sinPorton.estructura.rollos);
  });

  it("el portón agrega dos postes reforzados a cada lado del hueco", () => {
    const sinPorton = cotizar(pedido({ portones: [] }));
    const conPorton = cotizar(pedido({ portones: [3] }));

    expect(conPorton.estructura.postesEstructurales).toBe(
      sinPorton.estructura.postesEstructurales + 2,
    );
  });

  it("el rollo depende de la altura y del rombo", () => {
    const bajo = cotizar(pedido({ altura: 1.0 }));
    const alto = cotizar(pedido({ altura: 2.4 }));
    const cerrado = cotizar(pedido({ rombo: 50 }));
    const abierto = cotizar(pedido({ rombo: 75 }));

    expect(item(alto, "tejido-rollo")!.precioUnitario).toBeGreaterThan(
      item(bajo, "tejido-rollo")!.precioUnitario,
    );
    expect(item(cerrado, "tejido-rollo")!.precioUnitario).toBeGreaterThan(
      item(abierto, "tejido-rollo")!.precioUnitario,
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
    const c = cotizar(pedido({ altura }));
    expect(c.estructura.hilos).toBe(esperados);
  });

  it("el alambre de tensión es un hilo por vuelta, no una vuelta sola", () => {
    const c = cotizar(pedido({ tramos: [30], altura: 1.8 }));
    expect(item(c, "alambre-tension")?.cantidad).toBe(90);
  });
});

describe("la plata", () => {
  it("todo subtotal es un entero de centavos: no existe medio centavo", () => {
    const c = cotizar(pedido({ tramos: [37.5], portones: [2.5], conHormigon: true }));
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
    const c = cotizar(
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
    const c = cotizar(pedido({ conManoDeObra: true, conHormigon: true }));
    const sumaDeItems = c.items.reduce((a, i) => a + i.subtotal, 0);

    expect(c.materiales).toBe(sumaDeItems);
    expect(c.subtotal).toBe(c.materiales + c.manoDeObra);
    expect(c.iva).toBe(Math.round(c.subtotal * IVA));
    expect(c.total).toBe(c.subtotal + c.iva);
  });

  it("sin mano de obra la cotización es solo materiales", () => {
    const c = cotizar(pedido({ conManoDeObra: false }));
    expect(c.manoDeObra).toBe(0);
    expect(c.subtotal).toBe(c.materiales);
  });

  it("sin hormigón no aparece el premezclado", () => {
    expect(item(cotizar(pedido({ conHormigon: false })), "bolsa-premezclado")).toBeUndefined();
    expect(item(cotizar(pedido({ conHormigon: true })), "bolsa-premezclado")).toBeDefined();
  });

  it("no devuelve NaN ni infinitos con medidas raras", () => {
    const c = cotizar(pedido({ tramos: [0.5, 1000], portones: [0.8, 6] }));
    expect(Number.isFinite(c.total)).toBe(true);
    expect(c.total).toBeGreaterThan(0);
  });

  it("un item con cantidad cero no se imprime en la cotización", () => {
    // Un tramo corto no lleva intermedios: la linea no tiene que existir con
    // cantidad 0, tiene que no estar.
    const c = cotizar(pedido({ tramos: [2] }));
    expect(item(c, "poste-intermedio")).toBeUndefined();
  });
});

describe("propiedades que tienen que valer siempre", () => {
  const medidas = [3, 7.5, 12, 28, 30, 31, 100, 247.5];

  it("mas metros nunca cuesta menos", () => {
    let anterior = 0;
    medidas.forEach((m) => {
      const total = cotizar(pedido({ tramos: [m], conManoDeObra: true })).total;
      expect(total).toBeGreaterThanOrEqual(anterior);
      anterior = total;
    });
  });

  it("el tejido alcanza para cubrir el cerco", () => {
    medidas.forEach((m) => {
      const c = cotizar(pedido({ tramos: [m] }));
      expect(c.estructura.rollos * LARGO_ROLLO).toBeGreaterThanOrEqual(
        c.estructura.metrosDeTejido,
      );
    });
  });
});
