const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  console.error(
    "\n[ERRORE] DATABASE_URL non è definita nel file backend/.env.\n",
  );

  process.exit(1);
}

const prisma = new PrismaClient({
  log: ["error"],
});

function hasColumn(columns, tableName, columnName) {
  return columns.some(
    (column) =>
      column.table_name === tableName &&
      column.column_name === columnName,
  );
}

function hasTable(tables, tableName) {
  return tables.some((table) => table.table_name === tableName);
}

function printCheck(label, condition) {
  const symbol = condition ? "OK" : "MANCANTE";

  console.log(`${condition ? "✅" : "❌"} ${label}: ${symbol}`);
}

async function main() {
  console.log("\n==============================================");
  console.log(" MANCA IL DECIMO - DATABASE HEALTH CHECK");
  console.log("==============================================\n");

  const databaseInfo = await prisma.$queryRaw`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS database_user,
      current_setting('server_version') AS server_version
  `;

  const info = databaseInfo[0];

  console.log("Connessione PostgreSQL riuscita:");
  console.log(`- Database: ${info.database_name}`);
  console.log(`- Schema: ${info.schema_name}`);
  console.log(`- Utente DB: ${info.database_user}`);
  console.log(`- PostgreSQL: ${info.server_version}`);
  console.log("");

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  const columns = await prisma.$queryRaw`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  console.log("Tabelle presenti nello schema public:");
  console.log(
    tables.length > 0
      ? tables.map((table) => `- ${table.table_name}`).join("\n")
      : "- Nessuna tabella trovata",
  );

  console.log("\nControlli strutturali principali:\n");

  printCheck(
    "Tabella delle migrazioni Prisma",
    hasTable(tables, "_prisma_migrations"),
  );

  printCheck("Tabella User", hasTable(tables, "User"));
  printCheck("Tabella SportsCenter", hasTable(tables, "SportsCenter"));
  printCheck("Tabella Field", hasTable(tables, "Field"));
  printCheck("Tabella Match", hasTable(tables, "Match"));
  printCheck("Tabella Booking", hasTable(tables, "Booking"));

  console.log("\nConfronto con lo schema Prisma attuale:\n");

  printCheck(
    "SportsCenter.isOnboarded",
    hasColumn(columns, "SportsCenter", "isOnboarded"),
  );

  printCheck(
    "SportsCenter.stripeAccountId",
    hasColumn(columns, "SportsCenter", "stripeAccountId"),
  );

  printCheck(
    "User.stripeCustomerId",
    hasColumn(columns, "User", "stripeCustomerId"),
  );

  console.log("\nResidui del vecchio progetto accademico:\n");

  printCheck(
    "User.reliabilityScore ancora presente",
    hasColumn(columns, "User", "reliabilityScore"),
  );

  printCheck(
    "Match.depositAmount ancora presente",
    hasColumn(columns, "Match", "depositAmount"),
  );

  printCheck(
    "Match.onlyReliableUsers ancora presente",
    hasColumn(columns, "Match", "onlyReliableUsers"),
  );

  printCheck(
    "Match.minReliabilityScore ancora presente",
    hasColumn(columns, "Match", "minReliabilityScore"),
  );

  printCheck(
    "Booking.depositStatus ancora presente",
    hasColumn(columns, "Booking", "depositStatus"),
  );

  printCheck(
    "Tabella Penalty ancora presente",
    hasTable(tables, "Penalty"),
  );

  if (hasTable(tables, "_prisma_migrations")) {
    const migrations = await prisma.$queryRaw`
      SELECT
        migration_name,
        finished_at,
        rolled_back_at,
        applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY started_at
    `;

    console.log("\nMigrazioni registrate nel database:\n");

    if (migrations.length === 0) {
      console.log("- Nessuna migrazione registrata");
    } else {
      for (const migration of migrations) {
        const status = migration.rolled_back_at
          ? "ROLLBACK"
          : migration.finished_at
            ? "APPLICATA"
            : "INCOMPLETA";

        console.log(`- ${migration.migration_name}: ${status}`);
      }
    }
  }

  console.log("\n==============================================");
  console.log(" Health check completato senza modifiche al DB");
  console.log("==============================================\n");
}

main()
  .catch((error) => {
    console.error("\n==============================================");
    console.error(" DATABASE HEALTH CHECK FALLITO");
    console.error("==============================================\n");

    if (error?.code) {
      console.error(`Codice Prisma: ${error.code}`);
    }

    console.error(error?.message || error);

    console.error(
      "\nIl database non è stato modificato. Non eseguire migrate reset o db push.\n",
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });