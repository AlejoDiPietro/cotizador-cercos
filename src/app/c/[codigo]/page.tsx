import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/BotonImprimir";
import { Detalle } from "@/components/Detalle";
import { pesos } from "@/dominio/cotizar";
import { NOMBRE_POSTE } from "@/dominio/reglas";
import { llamarApi } from "@/server/api/root";

type Props = { params: Promise<{ codigo: string }> };

async function buscar(codigo: string) {
  try {
    const api = await llamarApi();
    return await api.cotizacion.porCodigo({ codigo });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Cotización ${codigo.toUpperCase()}`,
    // Una cotizacion es de un cliente: no tiene por que estar en Google.
    robots: { index: false, follow: false },
  };
}

export default async function CotizacionGuardada({ params }: Props) {
  const { codigo } = await params;
  const cotizacion = await buscar(codigo);
  const pedido = cotizacion.pedido;

  const metros = pedido.tramos.reduce((a, b) => a + b, 0);
  const fecha = cotizacion.creadaEl.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <header className="junto flex flex-wrap items-start justify-between gap-4 border-b border-linea-fuerte pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-tinta-suave">
            Cotización
          </p>
          <h1 className="cifra mt-0.5 text-[28px] font-semibold leading-none tracking-tight">
            {cotizacion.codigo}
          </h1>
          <p className="mt-2 text-[13px] text-tinta-suave">
            {fecha}
            {cotizacion.cliente && ` · ${cotizacion.cliente}`}
            {cotizacion.obra && ` · ${cotizacion.obra}`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-tinta-suave">
            Total con IVA
          </p>
          <p className="cifra text-[24px] font-semibold leading-tight">
            {pesos(cotizacion.total)}
          </p>
        </div>
      </header>

      <section className="junto mt-6 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
        <Dato etiqueta="Cerco">
          {metros.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m en{" "}
          {pedido.tramos.length} {pedido.tramos.length === 1 ? "tramo" : "tramos"}
          {pedido.cerrado && ", perímetro cerrado"}
        </Dato>
        <Dato etiqueta="Tejido">
          {pedido.altura.toLocaleString("es-AR", { minimumFractionDigits: 2 })} m de
          alto · rombo {pedido.rombo} mm
        </Dato>
        <Dato etiqueta="Estructura">
          {NOMBRE_POSTE[pedido.tipoPoste]}
          {pedido.conHormigon ? " con bases de hormigón" : " sin hormigonar"}
        </Dato>
        <Dato etiqueta="Portones">
          {pedido.portones.length === 0
            ? "Sin portones"
            : pedido.portones.map((a) => `${a.toLocaleString("es-AR")} m`).join(" · ")}
        </Dato>
      </section>

      <div className="mt-8">
        <Detalle items={cotizacion.items} totales={cotizacion} />
      </div>

      {cotizacion.notas && (
        <p className="junto mt-6 border-t border-linea pt-4 text-[13px] leading-relaxed text-tinta-suave">
          {cotizacion.notas}
        </p>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-linea pt-6">
        <p className="max-w-sm text-[12px] leading-relaxed text-tinta-suave">
          Los precios son los del día en que se hizo la cotización y no cambian si
          después cambia la lista.
          {!pedido.conManoDeObra && " No incluye mano de obra."}
        </p>
        <div className="flex gap-2.5">
          <Link
            href="/"
            className="no-imprimir rounded-lg border border-linea-fuerte bg-tarjeta px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-acento hover:text-acento"
          >
            Cotizar otro
          </Link>
          <BotonImprimir />
        </div>
      </footer>
    </article>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-tinta-suave">
        {etiqueta}
      </p>
      <p className="mt-0.5 leading-snug">{children}</p>
    </div>
  );
}
