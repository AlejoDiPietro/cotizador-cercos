"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pesos, porcentaje } from "@/dominio/cotizar";
import { margen } from "@/dominio/reglas";
import type { Producto } from "@/generated/prisma/client";
import { guardarPin } from "@/lib/pin";
import { useTRPC } from "@/lib/trpc";

/** Lo que se esta editando de un renglon, en PESOS y como texto. */
type Edicion = { precio: string; costo: string };

/**
 * La lista de precios.
 *
 * Trabaja en pesos porque es lo que se tipea; la conversion a centavos pasa una
 * sola vez, al mandar. Al reves —guardar centavos en el input— obliga a dividir
 * y multiplicar en cada tecla y ahi aparecen los $42.000,00000001.
 */
export function Productos({
  iniciales,
  hoy,
}: {
  iniciales: Producto[];
  /**
   * La fecha la manda el servidor. Si la calculara el navegador, el HTML del
   * servidor y el del cliente dirian dias distintos y React tiraria un error de
   * hidratacion por un cartelito.
   */
  hoy: Date;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const productos = useQuery(
    trpc.productos.lista.queryOptions(undefined, { initialData: iniciales }),
  );

  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});
  const [aumento, setAumento] = useState("10");
  const [aumentaCosto, setAumentaCosto] = useState(true);
  const [pin, setPin] = useState("");
  const [pidePin, setPidePin] = useState(false);

  const alTerminar = {
    onSuccess: () => {
      setEdiciones({});
      setPidePin(false);
      queryClient.invalidateQueries({ queryKey: trpc.productos.lista.queryKey() });
    },
    onError: (error: { data?: { code?: string } | null }) => {
      // El servidor es el que decide si el PIN sirve. El formulario solo
      // reacciona: si dijo que no, se pide.
      if (error.data?.code === "UNAUTHORIZED") setPidePin(true);
    },
  };

  const actualizar = useMutation(trpc.productos.actualizar.mutationOptions(alTerminar));
  const aumentar = useMutation(trpc.productos.aumentar.mutationOptions(alTerminar));
  const restaurar = useMutation(trpc.productos.restaurar.mutationOptions(alTerminar));

  const trabajando = actualizar.isPending || aumentar.isPending || restaurar.isPending;
  const error = actualizar.error ?? aumentar.error ?? restaurar.error;

  const filas = productos.data ?? [];

  /** Lo que se ve en un input: lo editado si hay algo, y si no el valor guardado. */
  const valor = (fila: Producto, campo: keyof Edicion) =>
    ediciones[fila.codigo]?.[campo] ?? String(fila[campo] / 100);

  const editar = (fila: Producto, campo: keyof Edicion, texto: string) =>
    setEdiciones((actual) => ({
      ...actual,
      [fila.codigo]: {
        precio: actual[fila.codigo]?.precio ?? String(fila.precio / 100),
        costo: actual[fila.codigo]?.costo ?? String(fila.costo / 100),
        [campo]: texto,
      },
    }));

  const enCentavos = (texto: string) => {
    const n = Number.parseFloat(texto);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) * 100 : null;
  };

  /** Solo los renglones donde el numero realmente cambio. */
  const cambios = filas.flatMap((fila) => {
    const edicion = ediciones[fila.codigo];
    if (!edicion) return [];

    const precio = enCentavos(edicion.precio);
    const costo = enCentavos(edicion.costo);
    if (precio === null || costo === null) return [];
    if (precio === fila.precio && costo === fila.costo) return [];

    return [{ codigo: fila.codigo as never, precio, costo }];
  });

  const hayInvalidos = Object.values(ediciones).some(
    (e) => enCentavos(e.precio) === null || enCentavos(e.costo) === null,
  );

  return (
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-4">
      <header className="max-w-2xl">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          Lista de precios
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-tinta-suave">
          Lo que se cambia acá sale en las cotizaciones{" "}
          <strong className="font-medium text-tinta">nuevas</strong>. Las que ya se
          guardaron no se tocan: tienen los precios del día en que se hicieron.
        </p>
      </header>

      {/* --------------------------------------------------------------- */}
      {/* Remarcar toda la lista                                           */}
      {/* --------------------------------------------------------------- */}
      <section className="mt-7 rounded-xl border border-linea bg-tarjeta p-5">
        <h2 className="text-[14px] font-semibold">Remarcar la lista entera</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-tinta-suave">
          No se remarca un artículo, se remarca la lista. A mano son doce renglones y
          doce oportunidades de equivocarse.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex w-28 items-center rounded-lg border border-linea-fuerte bg-fondo focus-within:border-acento">
            <input
              type="number"
              step={1}
              value={aumento}
              onChange={(e) => setAumento(e.target.value)}
              aria-label="Porcentaje de aumento"
              className="cifra w-full bg-transparent px-3 py-1.5 text-[14px] outline-none"
            />
            <span className="pr-3 text-[12px] text-tinta-suave">%</span>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={aumentaCosto}
              onChange={(e) => setAumentaCosto(e.target.checked)}
              className="size-4 accent-acento"
            />
            También el costo
          </label>

          <button
            type="button"
            disabled={trabajando || !Number.isFinite(Number.parseFloat(aumento))}
            onClick={() =>
              aumentar.mutate({
                porcentaje: Number.parseFloat(aumento),
                incluirCosto: aumentaCosto,
              })
            }
            className="rounded-lg bg-acento px-3.5 py-2 text-[13px] font-medium text-sobre-acento transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Aplicar
          </button>

          <button
            type="button"
            disabled={trabajando}
            onClick={() => restaurar.mutate()}
            className="ml-auto rounded-lg border border-linea-fuerte px-3.5 py-2 text-[13px] transition-colors hover:border-acento hover:text-acento disabled:opacity-40"
          >
            Volver a la lista de referencia
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* PIN                                                              */}
      {/* --------------------------------------------------------------- */}
      {pidePin && (
        <section className="mt-5 rounded-xl border border-acento/30 bg-acento-claro p-5">
          <h2 className="text-[14px] font-semibold">Hace falta el PIN</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-tinta-suave">
            Esta demo es pública: cambiar precios pide una clave para que no quede
            inservible para el que entre después.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              aria-label="PIN de administración"
              className="w-40 rounded-lg border border-linea-fuerte bg-fondo px-3 py-1.5 text-[14px] outline-none focus:border-acento"
            />
            <button
              type="button"
              onClick={() => {
                guardarPin(pin);
                setPidePin(false);
              }}
              className="rounded-lg bg-acento px-3.5 py-2 text-[13px] font-medium text-sobre-acento"
            >
              Guardar el PIN
            </button>
          </div>
        </section>
      )}

      {error && !pidePin && (
        <p className="mt-5 rounded-lg bg-acento-claro px-3.5 py-2.5 text-[13px] text-acento">
          {error.message}
        </p>
      )}

      {/* --------------------------------------------------------------- */}
      {/* La lista                                                         */}
      {/* --------------------------------------------------------------- */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-linea bg-tarjeta">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-linea text-left text-[11px] uppercase tracking-wider text-tinta-suave">
              <th className="py-2.5 pl-5 pr-3 font-medium">Material</th>
              <th className="w-32 px-2 py-2.5 text-right font-medium">Costo</th>
              <th className="w-32 px-2 py-2.5 text-right font-medium">Venta</th>
              <th className="w-20 px-2 py-2.5 text-right font-medium">Margen</th>
              <th className="w-36 py-2.5 pl-2 pr-5 text-right font-medium">
                Último cambio
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const precio = enCentavos(valor(fila, "precio"));
              const costo = enCentavos(valor(fila, "costo"));
              const tocada = Boolean(ediciones[fila.codigo]);
              const m =
                precio !== null && costo !== null ? margen(precio, costo) : null;

              return (
                <tr
                  key={fila.codigo}
                  className={`border-b border-linea/60 last:border-0 ${
                    tocada ? "bg-acento-claro/60" : ""
                  }`}
                >
                  <td className="py-2.5 pl-5 pr-3">
                    <p className="font-medium">{fila.nombre}</p>
                    <p className="text-[12px] text-tinta-suave">{fila.unidad}</p>
                  </td>

                  <td className="px-2 py-2.5">
                    <Plata
                      valor={valor(fila, "costo")}
                      onCambio={(v) => editar(fila, "costo", v)}
                      etiqueta={`Costo de ${fila.nombre}`}
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <Plata
                      valor={valor(fila, "precio")}
                      onCambio={(v) => editar(fila, "precio", v)}
                      etiqueta={`Precio de venta de ${fila.nombre}`}
                    />
                  </td>

                  <td
                    className={`px-2 py-2.5 text-right tabular-nums ${
                      m !== null && m < 0.15 ? "text-acento" : "text-tinta-suave"
                    }`}
                    title={
                      m !== null && m < 0.15
                        ? "Margen bajo: revisá que el precio cubra el costo"
                        : undefined
                    }
                  >
                    {m === null ? "—" : porcentaje(m)}
                  </td>

                  <td className="py-2.5 pl-2 pr-5 text-right text-[12px] text-tinta-suave">
                    <Cambio fila={fila} hoy={hoy} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Guardar                                                          */}
      {/* --------------------------------------------------------------- */}
      <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center gap-3 border-t border-linea bg-fondo/95 py-4 backdrop-blur">
        <button
          type="button"
          disabled={cambios.length === 0 || trabajando}
          onClick={() => actualizar.mutate({ cambios })}
          className="rounded-lg bg-acento px-4 py-2.5 text-[14px] font-medium text-sobre-acento transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actualizar.isPending
            ? "Guardando…"
            : cambios.length === 0
              ? "Sin cambios"
              : `Guardar ${cambios.length} ${cambios.length === 1 ? "cambio" : "cambios"}`}
        </button>

        {Object.keys(ediciones).length > 0 && (
          <button
            type="button"
            onClick={() => setEdiciones({})}
            className="text-[13px] text-tinta-suave underline decoration-linea-fuerte underline-offset-4 hover:text-acento"
          >
            Descartar
          </button>
        )}

        {hayInvalidos && (
          <p className="text-[13px] text-acento">
            Hay un valor que no es un número: ese renglón no se va a guardar.
          </p>
        )}
      </div>
    </div>
  );
}

/** Un input de plata, en pesos. */
function Plata({
  valor,
  onCambio,
  etiqueta,
}: {
  valor: string;
  onCambio: (valor: string) => void;
  etiqueta: string;
}) {
  return (
    <div className="flex items-center rounded-lg border border-linea-fuerte bg-fondo focus-within:border-acento">
      <span className="pl-2.5 text-[12px] text-tinta-suave">$</span>
      <input
        type="number"
        inputMode="numeric"
        step={100}
        min={0}
        value={valor}
        aria-label={etiqueta}
        onChange={(e) => onCambio(e.target.value)}
        className="cifra w-full bg-transparent px-2 py-1.5 text-right text-[13px] outline-none"
      />
    </div>
  );
}

/**
 * Cuanto se movio el precio y cuando.
 *
 * Con inflacion, "hace 40 dias que no toco este precio" es un dato de gestion:
 * es plata que se esta perdiendo en cada cotizacion que sale con ese numero.
 */
function Cambio({ fila, hoy }: { fila: Producto; hoy: Date }) {
  const dias = Math.floor(
    (hoy.getTime() - fila.actualizadoEl.getTime()) / (1000 * 60 * 60 * 24),
  );

  const variacion =
    fila.precioAnterior && fila.precioAnterior > 0
      ? (fila.precio - fila.precioAnterior) / fila.precioAnterior
      : null;

  return (
    <>
      {variacion !== null && (
        <span
          className={`cifra ${variacion > 0 ? "text-acento" : "text-tinta-suave"}`}
          title={`Antes: ${pesos(fila.precioAnterior!)}`}
        >
          {variacion > 0 ? "+" : ""}
          {porcentaje(variacion)}{" "}
        </span>
      )}
      <span className={dias >= 30 ? "text-acento" : undefined}>
        {dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`}
      </span>
    </>
  );
}
