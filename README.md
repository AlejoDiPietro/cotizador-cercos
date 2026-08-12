# Cotizador de cercos

Calcula lo que cuesta cerrar un terreno con tejido romboidal: los metros de cada
lado entran, y sale la lista de materiales, la mano de obra y el total con IVA.
La cotización se guarda y queda en un link para mandar por WhatsApp, o se
imprime como PDF.

**Demo:** _(pendiente de deploy)_ · **Código:** este repo.

No es un CRUD de ejemplo. La parte difícil de un cotizador no es la pantalla:
es que la cuenta esté bien y que un presupuesto que ya se mandó no cambie
después. Casi todas las decisiones de este repo salen de ahí.

## Las cinco decisiones que explican el código

### 1. El cálculo es una función pura, y es lo único con tests

[`src/dominio/cotizar.ts`](src/dominio/cotizar.ts) no toca la base, no sabe que
existe React y no lee la hora: entra un pedido, sale un presupuesto. Eso permite
las dos cosas que importan.

**Corre en los dos lados.** El navegador la ejecuta mientras se escribe, así el
número cambia sin esperar una request. El servidor la vuelve a ejecutar al
guardar y **descarta los totales que manda el cliente**: si el total viajara
desde el navegador, cualquiera podría guardar 200 m de cerco con un total de $1
y venir a reclamarlo. No es duplicación, es el mismo módulo importado dos veces.

**Se puede probar de verdad.** Los [25 tests](src/dominio/cotizar.test.ts) no
verifican que el código corra: verifican la cuenta. Cada caso es un error que se
comete cotizando a mano.

```
✓ un tramo de 30 m lleva 9 intermedios, no 10
✓ un cerco justo de 30 m necesita 4 rollos por el solape
✓ un perímetro cerrado no tiene terminales: todas las puntas son esquineros
✓ el portón no lleva tejido: le resta metros al rollo
✓ todo subtotal es un entero de centavos: no existe medio centavo
✓ la columna de subtotales suma exactamente el total que se lee abajo
```

### 2. Una cotización guardada no se recalcula

Guarda el pedido, pero también **cada renglón y cada precio del día** en que se
hizo ([`prisma/schema.prisma`](prisma/schema.prisma)). Si mañana sube el tejido,
el link que le mandé al cliente la semana pasada tiene que seguir diciendo lo
mismo: es una oferta con la que puede venir a reclamar.

Es la misma razón por la que una factura no consulta la lista de precios, la
congela. Un cotizador que recalcula al abrir el link es un cotizador que le
cambia el precio al cliente sin avisarle.

Por eso `Item.codigo` es un `String` y no una relación al catálogo: si mañana se
deja de vender un artículo, el renglón de una cotización vieja tiene que seguir
existiendo igual.

### 3. La plata son enteros de centavos

En pesos, `0.1 + 0.2` no da `0.3`, y ese error se arrastra hasta el último
dígito del total. Todos los precios son `Int` en centavos y recién se dividen
para mostrarlos, en un solo lugar
([`pesos()`](src/dominio/cotizar.ts)). Las cantidades fraccionarias (kg de
alambre) son `Decimal` en la base, no `Float`, por lo mismo.

Y todo lo que se imprime se redondea **al peso, no al centavo**: la hoja se
muestra sin centavos, así que si un renglón los tuviera, lo que suma el cliente
con la calculadora no daría el total impreso. Un presupuesto cuyos renglones no
suman el total es un presupuesto que no se firma.

### 4. Se clona y corre, sin una cuenta en ningún lado

La base de desarrollo es **un archivo SQLite**, y `npm run db:seed` deja tres
cotizaciones de ejemplo listas para abrir. Un proyecto que solo arranca si
primero te creás una cuenta en la nube y esperás que te den una connection
string es un proyecto que nadie clona.

Que eso sea posible no es suerte, es una restricción de diseño: **el modelo no
usa un solo tipo propio de un motor.** El pedido se guarda como texto y no como
`Json`, la plata son enteros y no hay atributos `@db.` de Postgres. Pasar a
Postgres es cambiar el `provider` del schema y el adapter en
[`db.ts`](src/server/db.ts) — dos líneas, cero cambios en el resto de la app.

Y los totales del seed **no están escritos a mano**: salen de `cotizar()`, el
mismo código que usa la app. Un seed con números a mano miente en cuanto cambia
una regla.

### 5. Las reglas del oficio están separadas del cálculo

[`src/dominio/reglas.ts`](src/dominio/reglas.ts) tiene los números que salen de
cómo se arma un cerco, no de cómo está escrito el programa: postes cada 3 m,
rollos de 10 m, 3% de solape, hilos de tensión según la altura, bases más
profundas en los esquineros. El cálculo no cambia nunca; estos números cambian
cuando cambia el proveedor o la forma de trabajar, y se cambian en un archivo
sin abrir el otro.

> Las reglas y los precios de este repo son **plausibles pero inventados**. Es
> un proyecto de demostración público: no lleva la lista de precios ni los
> criterios de obra de ninguna empresa.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Tipos | TypeScript en `strict` · Zod para los límites |
| API | tRPC 11 — tipada de punta a punta, sin generar cliente |
| Datos | Prisma 7 · SQLite en desarrollo, PostgreSQL en producción |
| Estilos | Tailwind CSS 4, con los colores como tokens |
| Tests | Vitest sobre el dominio |
| CI | GitHub Actions: lint, typecheck y tests en cada push |

Dos cosas que **no** están y es a propósito:

- **No hay librería de PDF.** El PDF es la página impresa por el navegador, con
  `@media print` en [`globals.css`](src/app/globals.css). Un presupuesto es una
  hoja con una tabla y un total: pagar cientos de kB para volver a dibujar lo
  que el navegador ya dibuja sería al revés.
- **No hay librería de formularios.** El pedido es un objeto en `useState` y el
  mismo schema de Zod valida el formulario y la request. El navegador se puede
  saltear; el servidor, no.

## Cómo se corre

```bash
npm install
cp .env.example .env        # ya viene apuntado a un archivo SQLite local
npm run db:push             # crea las tablas
npm run db:seed             # 3 cotizaciones de ejemplo
npm run dev                 # y entrá a /c/K7M2QX
```

No hace falta ningún servidor de base de datos, ni Docker, ni una cuenta en la
nube.

```bash
npm test                    # los tests del dominio
npm run typecheck
npm run lint
```

## Estructura

```
src/
  dominio/          el cálculo y las reglas — código puro, sin framework
    reglas.ts       los números del oficio
    cotizar.ts      la función pura
    cotizar.test.ts los 25 tests
    pedido.ts       el schema de Zod, compartido entre cliente y servidor
  server/           tRPC, Prisma y el generador de códigos
  components/       las piezas de UI
  app/              las rutas: / y /c/[codigo]
```

## Lo que falta

- Desplegarlo con Postgres (Neon) para que haya demo pública.
- Catálogo de precios editable desde la app (hoy están en el código).
- Reabrir una cotización guardada en el formulario para cotizar una variante.
- Otros tipos de cerco: alambrado rural de hilos, olímpico, media sombra.

---

Hecho por [Alejo Di Pietro](https://alejodipietro.github.io).
