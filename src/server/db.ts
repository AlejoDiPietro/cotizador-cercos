import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Un solo cliente de Prisma para todo el proceso.
 *
 * En desarrollo, cada recarga en caliente crea un modulo nuevo. Sin este
 * cacheo en `globalThis`, cada guardado abre otro pool y a los diez minutos la
 * base rechaza todo por limite de conexiones. En produccion no hace falta pero
 * no molesta.
 *
 * Desde Prisma 7 el cliente habla por un driver adapter y no por el motor
 * propio: `pg` es el driver de Postgres de siempre, asi que la misma linea
 * sirve para la base local y para la de produccion.
 */
const cache = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env y poné la cadena de conexión.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = cache.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") cache.prisma = db;
