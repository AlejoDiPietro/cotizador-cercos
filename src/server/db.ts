import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Un solo cliente de Prisma para todo el proceso.
 *
 * En desarrollo, cada recarga en caliente crea un modulo nuevo. Sin este
 * cacheo en `globalThis`, cada guardado abre otra conexion y a los diez minutos
 * la base rechaza todo. En produccion no hace falta pero no molesta.
 *
 * Desde Prisma 7 el cliente habla por un driver adapter y no por un motor
 * propio. `pg` es el driver de Postgres de siempre.
 *
 * En Neon conviene la URL con `-pooler`: en serverless cada request puede caer
 * en una instancia distinta, y sin pooler se agotan las conexiones de la base
 * antes que la paciencia.
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
