import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync } from "node:fs";

// Dump seluruh tabel Turso produksi ke satu file JSON. Dipakai workflow
// backup-db.yml (harian) yang mengunggah hasilnya sebagai artifact GitHub
// (retensi 90 hari) — data order/entitlement adalah data uang, jadi harus
// ada salinan di luar database hidup.

const url = process.env.ALLTOOLS_DB_URL;
const token = process.env.ALLTOOLS_DB_AUTH_TOKEN;
if (!url || !token) {
  console.error("ALLTOOLS_DB_URL / ALLTOOLS_DB_AUTH_TOKEN are required");
  process.exit(1);
}

const db = createClient({
  url: url.includes("authToken=") ? url : `${url}?authToken=${token}`,
});

const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
const dump = {
  generatedAt: new Date().toISOString(),
  tables: {} as Record<string, unknown[]>,
};
for (const row of tables.rows) {
  const name = String(row.name);
  const result = await db.execute(`SELECT * FROM "${name}"`);
  dump.tables[name] = result.rows;
  console.log(`${name}: ${result.rows.length} rows`);
}

mkdirSync("backups", { recursive: true });
const file = `backups/alltools-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(`written: ${file}`);
