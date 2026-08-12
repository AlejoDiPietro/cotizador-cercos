/**
 * Chequea que el entorno del build tenga lo que hace falta, antes de empezar.
 *
 * Existe porque cuando falta `DATABASE_URL`, Prisma falla con "The datasource.url
 * property is required in your Prisma config file", que describe el sintoma
 * —su config quedo sin url— y no la causa: la variable no llego al build. Se
 * pierden diez minutos mirando el archivo de config equivocado.
 *
 * Nunca imprime el valor, solo si esta y cuantos caracteres tiene. Una connection
 * string en un log de build es una credencial en un log de build.
 */

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("");
  console.error("  ✗ Falta DATABASE_URL en el entorno del build.");
  console.error("");
  console.error("  En Vercel: Storage → conectá una base Postgres al proyecto,");
  console.error("  o Settings → Environment Variables → agregala a mano.");
  console.error("  Después hay que volver a desplegar: las variables se leen");
  console.error("  cuando el build arranca, no después.");
  console.error("");
  process.exit(1);
}

if (!url.startsWith("postgres")) {
  console.error("");
  console.error(
    `  ✗ DATABASE_URL no parece un Postgres (empieza con "${url.slice(0, 12)}…").`,
  );
  console.error("    El schema es postgresql: un archivo SQLite acá no va a andar.");
  console.error("");
  process.exit(1);
}

console.log(`  ✓ DATABASE_URL presente (${url.length} caracteres, Postgres)`);
