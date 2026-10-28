# Database

LeoneSIS uses PostgreSQL 16. Schema management is handled by Hibernate
(`spring.jpa.hibernate.ddl-auto=update`), so no manual SQL migration is required
for a fresh installation.

The Docker Compose stack creates and persists the database in the named volume
`schoolms-db`. To start over with a clean database:

```bash
docker compose down -v
./scripts/start.sh
```

You can add one-off SQL files here for reporting or maintenance, for example:

```bash
docker compose exec -T db psql -U schoolms -d schoolms < db/report.sql
```
