"use client";

/**
 * El PDF lo hace el navegador.
 *
 * "Guardar como PDF" ya esta en el dialogo de impresion de todos los
 * navegadores, y la hoja se maqueta con `@media print` en globals.css. Una
 * libreria de PDF serian cientos de kB para volver a dibujar una tabla que ya
 * esta dibujada.
 */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-imprimir rounded-lg border border-linea-fuerte bg-tarjeta px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-acento hover:text-acento"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
