import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Proveedores } from "@/lib/trpc";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Cotizador de cercos",
    template: "%s · Cotizador de cercos",
  },
  description:
    "Calcula los materiales y el precio de un cerco de tejido romboidal: postes, rollos, alambre y mano de obra. Guarda la cotización y la comparte por link.",
  openGraph: {
    title: "Cotizador de cercos",
    description:
      "De los metros del terreno a la lista de materiales y el total con IVA.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="no-imprimir sticky top-0 z-20 border-b border-linea bg-papel/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <Cerco />
              <span className="text-[15px] font-semibold tracking-tight">
                Cotizador de cercos
              </span>
            </Link>

            <a
              href="https://github.com/AlejoDiPietro/cotizador-cercos"
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-tinta-suave underline decoration-linea-fuerte underline-offset-4 transition-colors hover:text-acento"
            >
              Código en GitHub
            </a>
          </div>
        </header>

        <Proveedores>
          <main className="flex-1">{children}</main>
        </Proveedores>

        <footer className="no-imprimir border-t border-linea">
          <div className="mx-auto max-w-6xl px-5 py-8 text-[13px] leading-relaxed text-tinta-suave">
            <p>
              Proyecto de demostración de{" "}
              <a
                href="https://alejodipietro.github.io"
                target="_blank"
                rel="noreferrer"
                className="text-tinta underline decoration-linea-fuerte underline-offset-4 hover:text-acento"
              >
                Alejo Di Pietro
              </a>
              . Los precios son inventados: no son la lista de ninguna empresa.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

/** El logo: tres rombos, que es lo que se ve de cerca en un tejido. */
function Cerco() {
  return (
    <svg
      viewBox="0 0 32 20"
      aria-hidden
      className="h-5 w-8 text-acento transition-transform group-hover:-translate-y-px"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M2 10 L8 4 L14 10 L8 16 Z" />
        <path d="M14 10 L20 4 L26 10 L20 16 Z" />
        <path d="M0 4 L2 4 M0 16 L2 16 M26 10 L32 4 M26 10 L32 16" />
      </g>
    </svg>
  );
}
