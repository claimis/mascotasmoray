// Aplica los scripts de back/migrations que aún no se han aplicado en la base de datos de destino.
// Nunca borra ni reemplaza datos: cada script solo añade (y se puede repetir sin romper nada).
//
//   node scripts/migrate.js --status           qué hay aplicado y qué falta
//   node scripts/migrate.js --dry-run          lo aplica todo y lo DESHACE al final (para ver el informe)
//   node scripts/migrate.js                    aplica los pendientes (en local)
//   node scripts/migrate.js --yes              igual, pero permitido sobre una base remota (Neon)
//
// Destino: DATABASE_URL si existe (Neon); si no, las variables DB_* de back/.env (local).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const statusOnly = args.has('--status');
const confirmed = args.has('--yes');
const dir = path.join(__dirname, '..', 'migrations');

const url = process.env.DATABASE_URL;
const config = url
  ? { connectionString: url, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
const target = url ? `${new URL(url).host}${new URL(url).pathname}` : `${config.host}:${config.port}/${config.database}`;
const isRemote = url ? !/^(localhost|127\.0\.0\.1)/.test(new URL(url).hostname) : !/^(localhost|127\.0\.0\.1)$/.test(config.host);

const checksum = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

async function main() {
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  console.log(`Base de datos: ${target}${isRemote ? '  (REMOTA)' : ''}`);

  if (isRemote && !statusOnly && !dryRun && !confirmed) {
    console.error('Es una base remota: añade --yes para aplicar de verdad (o usa --dry-run para probar sin cambiar nada).');
    process.exit(1);
  }

  const client = new Client(config);
  client.on('notice', (n) => console.log('   ·', n.message));
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const applied = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((r) => [r.name, r.checksum]));

    const pending = [];
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      if (applied.has(file)) {
        const changed = applied.get(file) !== checksum(sql);
        console.log(`  ya aplicada  ${file}${changed ? '   ⚠ el archivo cambió después de aplicarse' : ''}`);
      } else {
        console.log(`  PENDIENTE    ${file}`);
        pending.push({ file, sql });
      }
    }
    if (statusOnly) return;
    if (!pending.length) return console.log('\nNo hay nada pendiente.');

    // Todo en una sola transacción: si algo falla, no queda nada a medias.
    await client.query('BEGIN');
    try {
      for (const { file, sql } of pending) {
        console.log(`\n▶ ${file}`);
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum(sql)]);
      }
      await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
      console.log(dryRun ? '\nPRUEBA terminada: se ha deshecho todo, la base de datos no ha cambiado.' : `\nListo: ${pending.length} migración(es) aplicada(s).`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`\nFALLÓ y se deshizo todo: ${error.message}`);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
