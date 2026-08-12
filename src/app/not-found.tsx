import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-[22px] font-semibold tracking-tight">
        No existe esa cotización
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-tinta-suave">
        El código puede estar mal copiado. Son seis caracteres, sin la letra O ni el
        número 0 — justo para que no pase esto.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-acento px-4 py-2.5 text-[14px] font-medium text-sobre-acento transition-opacity hover:opacity-90"
      >
        Hacer una cotización
      </Link>
    </div>
  );
}
