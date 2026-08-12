# Cotizador de cercos

Calcula lo que cuesta cerrar un terreno con tejido romboidal: los metros de cada
lado entran, y sale la lista de materiales, la mano de obra y el total con IVA.
La cotización se guarda y queda en un link para mandar por WhatsApp, o se
imprime como PDF. La lista de precios se edita desde la app.

**Demo:** **[cotizador-cercos.vercel.app](https://cotizador-cercos.vercel.app)** · **Código:** este repo.

No es un CRUD de ejemplo. La parte difícil de un cotizador no es la pantalla: es
que la cuenta esté bien, que un presupuesto que ya se mandó no cambie después, y
que se pueda remarcar la lista un martes sin que se caiga nada. Casi todas las
decisiones de este repo salen de ahí.

## Las seis decisiones que explican el código

### 1. El cálculo es una función pura, y es lo único con tests

[`src/dominio/cotizar.ts`](src/dominio/cotizar.ts) no toca la base, no sabe que
existe React y no lee la hora: entran un pedido y una lista de precios, sale un
presupuesto. Eso permite las dos cosas que importan.

**Corre en los dos lados.** El navegador la ejecuta mientras se escribe, así el
número cambia sin esperar una request. El servidor la vuelve a ejecutar al
guardar y **descarta los totales que manda el cliente**: si el total viajara
desde el navegador, cualquiera podría guardar 200 m de cerco con un total de $1 y
venir a reclamarlo. No es duplicación, es el mismo módulo importado dos veces.

**Se puede probar de verdad.** Los [34 tests](src/dominio/cotizar.test.ts) no
verifican que el código corra: verifican la cuenta. Cada caso es un error que se
comete cotizando a mano.

```
✓ un tramo de 30 m lleva 9 intermedios, no 10
✓ un cerco justo de 30 m necesita 4 rollos por el solape
✓ un perímetro cerrado no tiene terminales: todas las puntas son esquineros
✓ el portón no lleva tejido: le resta metros al rollo
✓ la columna de subtotales suma exactamente el total que se lee abajo
✓ cambiar el precio de un material que no se usa no mueve el total
✓ vender al costo deja ganancia cero
```

### 2. Los precios son datos, no constantes

Los precios cambian todas las semanas; las reglas de obra, casi nunca. Son dos
cosas distintas y viven separadas: las reglas siguen en el código
([`reglas.ts`](src/dominio/reglas.ts)) y **los precios están en la base y se
editan desde `/productos`**.

Por eso `cotizar()` **recibe la lista de precios como argumento** en vez de
importarla. Es lo que permite que los precios cambien sin que el cálculo deje de
ser una función pura: la misma entrada da siempre la misma salida, y cuando sube
el tejido, lo que cambia es la entrada. Sin eso, editar precios significaría leer
la base desde el dominio, y ahí se termina el poder probarlo.

La lista guarda **costo y precio de venta**. El costo no sale impreso en ninguna
cotización: existe para que la pantalla pueda decir cuánto deja el trabajo. Un
cotizador que no sabe el costo puede cerrar una obra a pérdida y no enterarse
hasta que hay que pagar los materiales.

También se puede remarcar la lista entera un porcentaje. No se remarca un
artículo, se remarca la lista: a mano son doce renglones y doce oportunidades de
equivocarse.

### 3. Una cotización guardada no se recalcula

Guarda el pedido, pero también **cada renglón y cada precio del día** en que se
hizo ([`prisma/schema.prisma`](prisma/schema.prisma)). Si mañana sube el tejido,
el link que le mandé al cliente la semana pasada tiene que seguir diciendo lo
mismo: es una oferta con la que puede venir a reclamar.

Es la misma razón por la que una factura no consulta la lista de precios, la
congela. Un cotizador que recalcula al abrir el link es un cotizador que le
cambia el precio al cliente sin avisarle.

**Se comprueba en dos minutos, en la demo:** anotá el total en
[la home](https://cotizador-cercos.vercel.app), cambiá el precio del tejido en
[`/productos`](https://cotizador-cercos.vercel.app/productos) y volvé. El total
nuevo cambió; [`/c/K7M2QX`](https://cotizador-cercos.vercel.app/c/K7M2QX) sigue
diciendo exactamente lo mismo. Si dejaste la lista rara, el botón "volver a la
lista de referencia" la devuelve a su lugar.

Por eso `Item.codigo` es un `String` y no una relación al catálogo: si mañana se
deja de vender un artículo, el renglón de una cotización vieja tiene que seguir
existiendo igual.

### 4. La plata son enteros de centavos

En pesos, `0.1 + 0.2` no da `0.3`, y ese error se arrastra hasta el último dígito
del total. Todos los precios son `Int` en centavos y recién se dividen para
mostrarlos, en un solo lugar ([`pesos()`](src/dominio/cotizar.ts)).

Y todo lo que se imprime se redondea **al peso, no al centavo**: la hoja se
muestra sin centavos, así que si un renglón los tuviera, lo que suma el cliente
con la calculadora no daría el total impreso. Un presupuesto cuyos renglones no
suman el total es un presupuesto que no se firma.

El margen se mide **sobre el precio de venta, no sobre el costo**. Vender a $100
lo que costó $70 es 30% de margen y 43% de recargo; confundirlos es como se
termina vendiendo más barato de lo que se cree.

### 5. El modelo no usa un solo tipo propio de un motor

Empecé con SQLite en un archivo, para poder clonar el repo y correrlo sin
esperar que una nube me diera una connection string. Cuando llegó el momento de
desplegarlo, el salto a PostgreSQL costó exactamente lo que había dicho que iba a
costar: **dos líneas** — el `provider` del schema y el adapter en
[`db.ts`](src/server/db.ts) —. Ni un modelo, ni un campo, ni una consulta, ni un
test.

Eso no fue suerte, era la restricción: el pedido se guarda como **texto** y no
como `Json` —que no existe en todos los motores—, la plata son enteros, y no hay
un solo atributo `@db.` de Postgres en el schema. Escribir así cuesta un poco más
el primer día y ahorra un rediseño el día que la base cambia.

Los totales del seed tampoco están escritos a mano: salen de `cotizar()` con la
lista que quedó en la base. Un seed con números a mano miente en cuanto cambia
una regla o un precio.

### 6. El dibujo explica la cuenta

La pantalla de cotizar dibuja el cerco a escala
([`Alzado.tsx`](src/components/Alzado.tsx)): los postes donde van a estar, los
hilos de tensión que se cobran, el rombo del tejido elegido, y lo que queda
enterrado bajo la línea de tierra —que es por qué un poste de un cerco de 1,80 m
se paga como si midiera 2,40 m—. Es un alzado desarrollado, no un plano: los
ángulos del terreno no los sabe nadie, y dibujarlos sería inventar.

Es SVG escrito a mano, sin librería de gráficos: son cuatro `line` y un
`pattern`.

## Stack

|           |                                                                       |
| --------- | --------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router) · React 19                                    |
| Tipos     | TypeScript en `strict` · Zod para los límites                         |
| API       | tRPC 11 — tipada de punta a punta, sin generar cliente                |
| Datos     | Prisma 7 · PostgreSQL (Neon)                                          |
| Estilos   | Tailwind CSS 4 · los colores son tokens, y de ahí sale el tema oscuro |
| Tests     | Vitest sobre el dominio                                               |
| CI        | GitHub Actions: formato, lint, tipos y tests en cada push             |

Tres cosas que **no** están y es a propósito:

- **No hay librería de PDF.** El PDF es la página impresa por el navegador, con
  `@media print` en [`globals.css`](src/app/globals.css). Un presupuesto es una
  hoja con una tabla y un total: pagar cientos de kB para volver a dibujar lo que
  el navegador ya dibuja sería al revés. Al imprimir, los colores se fuerzan a
  claro aunque el navegador esté en tema oscuro.
- **No hay librería de formularios.** El pedido es un objeto en `useState` y el
  mismo schema de Zod valida el formulario y la request. El navegador se puede
  saltear; el servidor, no.
- **No hay sistema de usuarios.** Cambiar precios pide un PIN
  (`procedimientoAdmin` en [`trpc.ts`](src/server/api/trpc.ts)) para que una
  demo pública no quede inservible. Es un PIN en una variable de entorno
  comparado en el servidor, y no pretende ser más que eso: la diferencia con no
  tener nada es que el límite existe y está en un solo lugar.

## Cómo se corre

```bash
npm install
cp .env.example .env        # y poné una DATABASE_URL de Postgres
npm run db:push             # crea las tablas
npm run db:seed             # lista de precios + 3 cotizaciones de ejemplo
npm run dev                 # y entrá a /c/K7M2QX o a /productos
```

Cualquier Postgres sirve; una base gratuita de [Neon](https://neon.com) tarda dos
minutos. Sin `ADMIN_PIN` configurado, la lista de precios se edita sin clave: en
tu propia máquina, pedir un PIN es solo molestia.

En Vercel el deploy se ocupa solo de la base: el script `vercel-build` crea las
tablas y siembra la lista **antes** de compilar, porque una base recién creada
arranca vacía. El seed es idempotente y no pisa precios ya editados, así que
volver a desplegar no deshace lo que alguien cambió desde `/productos`.

```bash
npm test                    # los tests del dominio
npm run typecheck
npm run lint
npm run format              # Prettier
```

## Estructura

```
src/
  dominio/          el cálculo y las reglas — código puro, sin framework
    reglas.ts       las reglas de obra y la lista de precios de referencia
    cotizar.ts      la función pura
    cotizar.test.ts los 34 tests
    pedido.ts       el schema de Zod, compartido entre cliente y servidor
  server/           tRPC, Prisma, el PIN y el generador de códigos
    precios.ts      la única pieza que une la base con el cálculo
  components/       las piezas de UI, incluido el dibujo del cerco
  app/              las rutas: /, /productos y /c/[codigo]
```

## Lo que falta

- **Una cotización guardada no recuerda su costo**, solo lo que se cobró. Se ve
  el margen mientras se cotiza, pero no se puede volver a una obra cerrada y
  preguntar a qué margen se cerró. Falta guardar el costo por renglón, y una
  pantalla propia para verlo: en el link que recibe el cliente no va nunca.
- Historial de precios: hoy se guarda solo el anterior, no la serie.
- Reabrir una cotización guardada en el formulario para cotizar una variante.
- Otros tipos de cerco: alambrado rural de hilos, olímpico, media sombra.

---

Hecho por [Alejo Di Pietro](https://alejodipietro.github.io).
