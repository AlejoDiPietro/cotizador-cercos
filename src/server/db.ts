import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Un solo cliente de Prisma para todo el proceso.
 *
 * En desarrollo, cada recarga en caliente crea un modulo nuevo. Sin este
 * cacheo en `globalThis`, cada guardado abre otra conexion y a los diez minutos
 * la base rechaza todo. En produccion no hace falta pero no molesta.
 *
 * Desde Prisma 7 el cliente habla por un driver adapter y no por un motor
 * propio. Hoy el adapter es SQLite y la base es un archivo, asi que el proyecto
 * se clona y corre. Para pasarlo a Postgres se cambian dos lineas —el adapter
 * de acá y el `provider` del schema— y ninguna del resto de la app: el modelo
 * no usa un solo tipo propio de un motor.
 */
const cache = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env (para desarrollo alcanza con file:./dev.db).",
    );
  }

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = cache.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") cache.prisma = db;
