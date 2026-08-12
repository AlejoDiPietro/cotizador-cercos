"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Detalle } from "@/components/Detalle";
import { cotizar, pesos } from "@/dominio/cotizar";
import { PEDIDO_INICIAL, pedidoValidado, type PedidoEntrada } from "@/dominio/pedido";
import { ALTURAS, NOMBRE_POSTE, ROMBOS, TIPOS_POSTE } from "@/dominio/reglas";
import { useTRPC } from "@/lib/trpc";

export function Cotizador() {
  const [pedido, setPedido] = useState<PedidoEntrada>(PEDIDO_INICIAL);
  const [cliente, setCliente] = useState("");
  const [obra, setObra] = useState("");

  const trpc = useTRPC();
  const guardar = useMutation(trpc.cotizacion.guardar.mutationOptions());

  /**
   * El calculo corre en el navegador mientras se escribe: es una funcion pura,
   * no pega a ningun servidor y el numero cambia sin esperar nada. El servidor
   * lo vuelve a hacer al guardar, con el mismo codigo, porque de este lado
   * cualquiera puede mentir.
   */
  const cambiar = (cambios: Partial<PedidoEntrada>) => {
    setPedido((actual) => ({ ...actual, ...cambios }));
    guardar.reset();
  };

  const validacion = pedidoValidado.safeParse(pedido);
  const calculo = useMemo(() => cotizar(pedido), [pedido]);
  const metros = calculo.estructura.metrosTotales;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
      {/* ---------------------------------------------------------------- */}
      {/* El pedido                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          ¿Cuánto sale cerrar el terreno?
        </h1>
        <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-tinta-suave">
          Cargá los metros de cada lado y el cerco que querés. Sale la lista de
          materiales, la mano de obra y el total con IVA.
        </p>

        <div className="mt-8 space-y-7">
          <Bloque
            titulo="Los tramos"
            ayuda="Un tramo es cada lado recto. Un frente y dos laterales son tres tramos."
          >
            <div className="space-y-2">
              {pedido.tramos.map((metrosTramo, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-16 shrink-0 text-[12px] text-tinta-suave">
                    Tramo {i + 1}
                  </span>
                  <Numero
                    valor={metrosTramo}
                    onCambio={(v) =>
                      cambiar({
                        tramos: pedido.tramos.map((t, j) => (j === i ? v : t)),
                      })
                    }
                    sufijo="m"
                    paso={0.5}
                  />
                  {pedido.tramos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        cambiar({ tramos: pedido.tramos.filter((_, j) => j !== i) })
                      }
                      aria-label={`Quitar el tramo ${i + 1}`}
                      className="rounded-md px-2 py-1 text-[18px] leading-none text-tinta-suave transition-colors hover:bg-acento-claro hover:text-acento"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {pedido.tramos.length < 20 && (
                <button
                  type="button"
                  onClick={() => cambiar({ tramos: [...pedido.tramos, 10] })}
                  className="text-[13px] font-medium text-acento underline decoration-acento/30 underline-offset-4 hover:decoration-acento"
                >
                  Agregar tramo
                </button>
              )}

              <Casilla
                marcada={pedido.cerrado}
                onCambio={(cerrado) => cambiar({ cerrado })}
                etiqueta="El cerco cierra el perímetro"
                ayuda="Sin puntas libres: todos los vértices son esquineros."
              />
            </div>
          </Bloque>

          <Bloque titulo="El tejido">
            <Etiqueta>Altura</Etiqueta>
            <Opciones
              opciones={ALTURAS.map((a) => ({
                valor: a,
                texto: a.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
              }))}
              elegida={pedido.altura}
              onElegir={(altura) => cambiar({ altura })}
            />

            <Etiqueta className="mt-4">Rombo</Etiqueta>
            <Opciones
              opciones={ROMBOS.map((r) => ({ valor: r, texto: `${r} mm` }))}
              elegida={pedido.rombo}
              onElegir={(rombo) => cambiar({ rombo })}
            />
            <p className="mt-2 text-[12px] text-tinta-suave">
              Más chico el rombo, más cerrado el tejido y más caro el rollo.
            </p>
          </Bloque>

          <Bloque titulo="La estructura">
            <Etiqueta>Postes</Etiqueta>
            <Opciones
              opciones={TIPOS_POSTE.map((t) => ({ valor: t, texto: NOMBRE_POSTE[t] }))}
              elegida={pedido.tipoPoste}
              onElegir={(tipoPoste) => cambiar({ tipoPoste })}
            />

            <div className="mt-4">
              <Casilla
                marcada={pedido.conHormigon}
                onCambio={(conHormigon) => cambiar({ conHormigon })}
                etiqueta="Bases de hormigón"
                ayuda="Sin bases el cerco se afloja con el primer viento fuerte."
              />
            </div>
            <div className="mt-2">
              <Casilla
                marcada={pedido.conManoDeObra}
                onCambio={(conManoDeObra) => cambiar({ conManoDeObra })}
                etiqueta="Incluir mano de obra"
                ayuda="Si no, la cotización es solo el material."
              />
            </div>
          </Bloque>

          <Bloque titulo="Portones" ayuda="Donde va un portón no va tejido.">
            {pedido.portones.length === 0 && (
              <p className="text-[13px] text-tinta-suave">Sin portones.</p>
            )}
            <div className="space-y-2">
              {pedido.portones.map((ancho, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-16 shrink-0 text-[12px] text-tinta-suave">
                    Ancho
                  </span>
                  <Numero
                    valor={ancho}
                    onCambio={(v) =>
                      cambiar({
                        portones: pedido.portones.map((p, j) => (j === i ? v : p)),
                      })
                    }
                    sufijo="m"
                    paso={0.1}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      cambiar({ portones: pedido.portones.filter((_, j) => j !== i) })
                    }
                    aria-label={`Quitar el portón ${i + 1}`}
                    className="rounded-md px-2 py-1 text-[18px] leading-none text-tinta-suave transition-colors hover:bg-acento-claro hover:text-acento"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {pedido.portones.length < 6 && (
              <button
                type="button"
                onClick={() => cambiar({ portones: [...pedido.portones, 3] })}
                className="mt-3 text-[13px] font-medium text-acento underline decoration-acento/30 underline-offset-4 hover:decoration-acento"
              >
                Agregar portón
              </button>
            )}
          </Bloque>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* El resultado                                                      */}
      {/* ---------------------------------------------------------------- */}
      {/*
        Nada de `sticky` en esta columna. Se probaron las dos formas: pegar la
        columna entera la deja clavada cuando es mas alta que el viewport, y
        pegar solo la tarjeta del total la hace pasar por encima de la tabla y
        tapar renglones. El total ya se repite al pie del detalle: no necesita
        acompañar al scroll.
      */}
      <div>
        <div className="rounded-xl bg-panel p-6 text-white shadow-sm">
          <p className="text-[12px] uppercase tracking-wider text-white/55">
            Total con IVA
          </p>
          <p className="cifra mt-1 text-[34px] font-semibold leading-none tracking-tight">
            {pesos(calculo.total)}
          </p>
          <p className="mt-2 text-[13px] text-white/65">
            {metros.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m de
            cerco ·{" "}
            <span className="cifra">
              {pesos(Math.round(calculo.total / Math.max(metros, 1)))}
            </span>{" "}
            por metro
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-[13px] sm:grid-cols-4">
            <Dato valor={calculo.estructura.rollos} etiqueta="rollos" />
            <Dato
              valor={
                calculo.estructura.postesEstructurales +
                calculo.estructura.postesIntermedios
              }
              etiqueta="postes"
            />
            <Dato valor={calculo.estructura.hilos} etiqueta="hilos" />
            <Dato valor={calculo.items.length} etiqueta="renglones" />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-linea bg-white p-6">
          {metros > 0 ? (
            <Detalle items={calculo.items} totales={calculo} />
          ) : (
            <p className="py-8 text-center text-[13px] text-tinta-suave">
              Cargá los metros de al menos un tramo.
            </p>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Guardar                                                       */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-6 rounded-xl border border-linea bg-white p-6">
          <h2 className="text-[15px] font-semibold">Guardar y compartir</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-tinta-suave">
            Queda un link con esta cotización y los precios de hoy. Si mañana
            cambian, el link sigue diciendo lo mismo.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Texto
              etiqueta="Cliente"
              valor={cliente}
              onCambio={setCliente}
              placeholder="Opcional"
            />
            <Texto
              etiqueta="Obra"
              valor={obra}
              onCambio={setObra}
              placeholder="Opcional"
            />
          </div>

          {!validacion.success && (
            <p className="mt-4 rounded-lg bg-acento-claro px-3 py-2 text-[13px] text-acento">
              {validacion.error.issues[0]?.message}
            </p>
          )}

          <button
            type="button"
            disabled={!validacion.success || guardar.isPending}
            onClick={() =>
              validacion.success &&
              guardar.mutate({
                pedido: validacion.data,
                cliente: cliente || undefined,
                obra: obra || undefined,
              })
            }
            className="mt-4 w-full rounded-lg bg-acento px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardar.isPending ? "Guardando…" : "Guardar cotización"}
          </button>

          {guardar.isError && (
            <p className="mt-3 text-[13px] text-acento">
              No se pudo guardar: {guardar.error.message}
            </p>
          )}

          {guardar.data && (
            <div className="mt-4 rounded-lg border border-acento/25 bg-acento-claro p-4">
              <p className="text-[13px] text-tinta">
                Guardada con el código{" "}
                <span className="cifra font-semibold">{guardar.data.codigo}</span>.
              </p>
              <Link
                href={`/c/${guardar.data.codigo}`}
                className="mt-2 inline-block text-[13px] font-medium text-acento underline decoration-acento/40 underline-offset-4"
              >
                Abrir la cotización →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Piezas del formulario                                                 */
/* -------------------------------------------------------------------- */

function Bloque({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {ayuda && (
        <p className="mt-1 mb-3 text-[12px] leading-relaxed text-tinta-suave">
          {ayuda}
        </p>
      )}
      <div className={ayuda ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Etiqueta({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-2 text-[11px] uppercase tracking-wider text-tinta-suave ${className}`}
    >
      {children}
    </p>
  );
}

function Numero({
  valor,
  onCambio,
  sufijo,
  paso,
}: {
  valor: number;
  onCambio: (valor: number) => void;
  sufijo: string;
  paso: number;
}) {
  return (
    <div className="flex w-32 items-center rounded-lg border border-linea-fuerte bg-white focus-within:border-acento">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={paso}
        value={valor}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          onCambio(Number.isFinite(n) ? n : 0);
        }}
        className="cifra w-full bg-transparent px-3 py-1.5 text-[14px] outline-none"
      />
      <span className="pr-3 text-[12px] text-tinta-suave">{sufijo}</span>
    </div>
  );
}

function Texto({
  etiqueta,
  valor,
  onCambio,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-tinta-suave">
        {etiqueta}
      </span>
      <input
        type="text"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full rounded-lg border border-linea-fuerte bg-white px-3 py-1.5 text-[14px] outline-none placeholder:text-tinta-suave/60 focus:border-acento"
      />
    </label>
  );
}

/**
 * Botones en vez de un `<select>`.
 *
 * Son seis alturas y tres rombos: con un select hay que abrirlo para saber que
 * opciones existen, y una de las cosas que tiene que hacer esta pantalla es
 * mostrar lo que se fabrica.
 */
function Opciones<T extends string | number>({
  opciones,
  elegida,
  onElegir,
}: {
  opciones: { valor: T; texto: string }[];
  elegida: T;
  onElegir: (valor: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map(({ valor, texto }) => {
        const activa = valor === elegida;
        return (
          <button
            key={String(valor)}
            type="button"
            aria-pressed={activa}
            onClick={() => onElegir(valor)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
              activa
                ? "border-acento bg-acento text-white"
                : "border-linea-fuerte bg-white text-tinta hover:border-acento hover:text-acento"
            }`}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}

function Casilla({
  marcada,
  onCambio,
  etiqueta,
  ayuda,
}: {
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-acento"
      />
      <span>
        <span className="text-[13px]">{etiqueta}</span>
        {ayuda && (
          <span className="block text-[12px] leading-snug text-tinta-suave">
            {ayuda}
          </span>
        )}
      </span>
    </label>
  );
}

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div>
      <p className="cifra text-[19px] font-semibold leading-none">{valor}</p>
      <p className="mt-1 text-[12px] text-white/55">{etiqueta}</p>
    </div>
  );
}
