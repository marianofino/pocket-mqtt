# PostgreSQL Migrations

This directory contains PostgreSQL-specific migrations for PocketMQTT.

## Setup PostgreSQL

1. Install and start PostgreSQL:
```bash
# On Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# On macOS with Homebrew
brew install postgresql
brew services start postgresql
```

2. Create a database:
```bash
createdb pocket_mqtt
```

3. Configure environment variables:
```bash
export DB_ADAPTER=postgres
export DATABASE_URL="postgresql://username:password@localhost:5432/pocket_mqtt"
```

4. Run migrations:
```bash
# Apply migration manually
psql -d pocket_mqtt -f drizzle-pg/0000_initial.sql

# Or use Drizzle Kit (if configured)
npx drizzle-kit push --config=drizzle.config.pg.ts
```

## Switching Between SQLite and PostgreSQL

The system automatically selects the correct database adapter based on the `DB_ADAPTER` environment variable:

- **SQLite (default)**: `DB_ADAPTER=sqlite` or unset
- **PostgreSQL**: `DB_ADAPTER=postgres`

## Notes

- PostgreSQL provides better scalability for production deployments
- SQLite is simpler for development and testing
- Both databases use the same Repository Pattern interface
