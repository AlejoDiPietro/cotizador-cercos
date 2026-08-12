"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const rutas = [
  { href: "/", texto: "Cotizar" },
  { href: "/productos", texto: "Precios" },
];

/**
 * La navegacion.
 *
 * Es un Client Component solo por `usePathname`: marcar donde estas parado es
 * lo que hace que dos pantallas se sientan una app y no dos paginas sueltas.
 */
export function Nav() {
  const ruta = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {rutas.map(({ href, texto }) => {
        const activa = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
              activa
                ? "bg-acento-claro font-medium text-acento"
                : "text-tinta-suave hover:text-tinta"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
