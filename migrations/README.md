# Migraciones de la base de datos

Cada archivo `NNN_nombre.sql` es un cambio de la base de datos. El ejecutor (`scripts/migrate.js`) aplica solo los que
aún no se han aplicado en la base de destino y los apunta en la tabla `schema_migrations`.

**Reglas de oro**

- Una migración **solo añade o rellena**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `INSERT` que comprueba
  antes si ya hay datos, `UPDATE` que solo toca columnas vacías. Nunca `DROP`, `TRUNCATE` ni `DELETE` sobre datos de la tienda.
- Debe poder ejecutarse dos veces sin romper nada.
- No se edita una migración ya aplicada: se crea una nueva con el siguiente número.
- Nunca se copia la base local entera sobre producción: en producción hay datos que no están en local.

**Uso** (desde `back/`)

```bash
npm run migrate -- --status      # qué está aplicado y qué falta
npm run migrate -- --dry-run     # lo aplica todo y lo deshace al final: sirve para ver el informe
npm run migrate                  # aplica los pendientes (base local)
npm run migrate -- --yes         # igual, pero sobre una base remota (Neon)
```

Destino: si existe `DATABASE_URL` (Neon) se usa esa; si no, las variables `DB_*` del `.env` (local).
Sobre una base remota el ejecutor exige `--yes` para aplicar de verdad.

**Orden para desplegar**: 1) copia de seguridad, 2) `--dry-run` en Neon, 3) migrar Neon, 4) subir el back (Render),
5) subir el front (Vercel). Como las migraciones solo añaden, la web antigua sigue funcionando entre un paso y otro.

**Migraciones actuales**

| Archivo | Qué hace |
|---|---|
| `001_blog.sql` | Tablas del blog (artículos e imágenes) |
| `002_product_barcode.sql` | Columna `products.barcode` (código de barras, solo admin) |
| `003_seed_blog_articles.sql` | Carga los 6 artículos iniciales, solo si el blog está vacío |
| `004_seed_product_barcodes.sql` | Rellena los códigos de barras del TPV por nombre (o nombre+precio) cuando no hay duda |
