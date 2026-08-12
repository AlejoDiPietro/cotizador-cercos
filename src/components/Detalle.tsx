import { pesos } from "@/dominio/cotizar";

export type RenglonVisible = {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type TotalesVisibles = {
  materiales: number;
  manoDeObra: number;
  subtotal: number;
  iva: number;
  total: number;
};

/**
 * La tabla del presupuesto y los totales.
 *
 * La usan las dos pantallas: la que calcula en vivo y la de una cotizacion
 * guardada. Es el mismo papel, y tiene que verse igual en las dos o el cliente
 * va a pensar que le cambiaron el presupuesto.
 */
export function Detalle({
  items,
  totales,
}: {
  items: RenglonVisible[];
  totales: TotalesVisibles;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-linea-fuerte text-left text-[11px] uppercase tracking-wider text-tinta-suave">
              <th className="py-2 pr-3 font-medium">Material</th>
              <th className="w-20 py-2 px-2 text-right font-medium">Cant.</th>
              <th className="w-28 py-2 px-2 text-right font-medium">Unitario</th>
              <th className="w-28 py-2 pl-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.codigo}-${i}`} className="border-b border-linea/70">
                <td className="py-2.5 pr-3 leading-snug">{item.descripcion}</td>
                <td className="cifra py-2.5 px-2 text-right whitespace-nowrap">
                  {formatearCantidad(item.cantidad)}{" "}
                  <span className="text-tinta-suave">{item.unidad}</span>
                </td>
                <td className="cifra py-2.5 px-2 text-right whitespace-nowrap text-tinta-suave">
                  {pesos(item.precioUnitario)}
                </td>
                <td className="cifra py-2.5 pl-2 text-right whitespace-nowrap">
                  {pesos(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="junto mt-5 ml-auto max-w-xs space-y-1.5 text-[13px]">
        <Fila etiqueta="Materiales" valor={totales.materiales} />
        {totales.manoDeObra > 0 && (
          <Fila etiqueta="Mano de obra" valor={totales.manoDeObra} />
        )}
        <Fila etiqueta="Subtotal" valor={totales.subtotal} />
        <Fila etiqueta="IVA 21%" valor={totales.iva} />
        <div className="flex items-baseline justify-between border-t border-linea-fuerte pt-2.5">
          <dt className="font-semibold">Total</dt>
          <dd className="cifra text-lg font-semibold">{pesos(totales.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="cifra">{pesos(valor)}</dd>
    </div>
  );
}

/** Los enteros se muestran sin decimales; los kilos de alambre, con uno. */
function formatearCantidad(cantidad: number): string {
  return Number.isInteger(cantidad)
    ? String(cantidad)
    : cantidad.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}
