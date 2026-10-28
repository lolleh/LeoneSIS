# LeoneSIS

A complete, containerised **multi-school management system (LeoneSIS)**. One platform
administrator can create schools, provision their administrator accounts and
grant module privileges. Each school then runs its own enrollment, attendance,
library, messaging, grading and school-fees workflows with parent and student
portals. Every fee charge and payment is kept in an auditable ledger with
printable receipts.

The application is a Spring Boot service with a plain HTML/CSS/JavaScript
front end served from the same origin, a PostgreSQL 16 database, and Python and
shell helpers for operations and smoke testing.

---

## Quick start

Requirements: Docker Engine with Compose v2.

```bash
cd LeoneSIS                 # repository folder
cp .env.example .env        # optional, defaults work out of the box
docker compose up --build -d
```

Open **http://localhost:8080** (or the `APP_PORT` set in `.env`; this
deployment uses **8081** to avoid a port clash). The default in `.env.example`
is 8080 — change it if that port is already in use.

Or use the helper, which also waits for the health check:

```bash
./scripts/start.sh
```

Stop the stack with `docker compose down` (add `-v` to delete the database and
uploaded files).

### Platform administrator

| Username | Password |
| --- | --- |
| `vlolleh` | `password` |

### Seeded demo accounts

All demo accounts use the password `password`.

| Username | Role | Scope |
| --- | --- | --- |
| `vlolleh` | Platform administrator | All schools |
| `greenwoodadmin` | School administrator | Greenwood Academy |
| `teacher1` | Teacher | Greenwood Academy |
| `librarian` | Staff (library) | Greenwood Academy |
| `parent1` | Parent | Greenwood Academy |
| `student1` | Student | Greenwood Academy |

Demo seed data includes **Greenwood Academy** (`GRN`), **12 students** across
JSS 1A/2A/3A and SSS 1A/1B/2A/3A, staff, attendance history with absences and
parent notifications, four assessments with published grades, three library
texts, sample messages, and a **48-entry fee ledger** (40 charges and 8
payments). Seeding is idempotent and is controlled by `APP_SEED_DEMO_DATA`
(default `true`).

---

## What it does

### Platform administration
- Create schools with a unique code, profile and optional first administrator.
- Edit school profiles, deactivate and reactivate schools.
- Switch the active school from the top bar; "All schools" gives a platform view.

### Accounts and access
- Create portal logins for administrators, teachers, staff, parents and students.
- Every role has sensible default modules; extra modules can be granted per user.
- Link accounts to student or staff records, and link parents to their children.
- Reset passwords, deactivate and reactivate accounts.
- The platform administrator is not pinned to a school and can manage all schools.

### Enrollment
- Student enrollment with form, level (JSS 1–3 and SSS 1–3), guardian details and optional
  parent/student portal accounts.
- Staff directory with positions, departments, employment details and optional
  portal logins.
- Guardian linking and unlinking from the student record.

### Attendance
- Daily register with Present / Absent / Late / Excused statuses and comments.
- Mark-all-present shortcut, live summary and form filtering.
- **Marking a student absent automatically notifies every linked parent** with a
  deduplicated notification per student per day.
- Parents and students see their own attendance history.

### Fees and receipts
- Record charges for tuition, development, examinations, transport, uniform,
  books, boarding, library and other school costs.
- Record full or part payments with cash, bank transfer, card, mobile money,
  cheque or other methods, including a payment reference and term.
- Every entry is an auditable `CHARGE` or `PAYMENT` row. Balances are computed
  from posted rows; posted transactions are never deleted.
- Voiding preserves the original transaction and its reason, shows it as
  `VOID` in the ledger and receipt, and immediately recalculates balances.
- Families see their own children's charges, payments, outstanding balance and
  print-ready receipts. Administrators manage the ledger; teachers and staff
  can do so only when explicitly granted the **Fees & charges** privilege.
- Amounts are displayed in Sierra Leonean leones (`Le`). Receipts are generated
  server-side as printable HTML at `/api/fees/{id}/receipt?token=…`.

### Grades
- Teachers create assessments (quiz, test, exam, assignment, project), enter
  scores and publish or unpublish results.
- Grades are visible to students and to their linked parents once published.
- Grade posting triggers a notification; form averages and letter grades are
  calculated by the API.

### Library
- Staff upload PDF, EPUB, plain-text and Markdown resources up to 25 MB.
- Alternatively paste text content to publish an online reading item.
- Everyone can search by title, author or category, read online and download.

### Messaging
- Staff send messages to individual users, groups, whole forms or all parents.
- Recipients are materialised per user with read tracking.
- Inbox, sent items, unread counts and notification badges.

### Notifications
- Absence alerts, grade updates, welcome messages and system notices.
- Filter unread/all, mark read, mark all read, dismiss and deep-link to context.

---

## Architecture

```
SchoolMS/                         # checkout folder; product name is LeoneSIS
├── docker-compose.yml          # PostgreSQL 16 + application
├── .env.example                # ports and database credentials
├── backend/
│   ├── Dockerfile              # multi-stage Maven build → non-root JRE image
│   ├── pom.xml                 # Spring Boot 3.2.5, Java 17
│   └── src/main/
│       ├── java/com/schoolms/
│       │   ├── config/         # app config and demo data seeder
│       │   ├── model/          # JPA entities
│       │   ├── repo/           # Spring Data repositories
│       │   ├── security/       # bearer-token filter and request context
│       │   ├── service/        # auth, access control, notifications, messaging
│       │   └── web/            # REST controllers and error handling
│       └── resources/
│           ├── application.yml
│           └── static/         # HTML, CSS and JavaScript front end
├── frontend/README.md          # notes on the served static app
├── db/README.md                # database operations
└── scripts/
    ├── start.sh                # build, start, wait for health
    ├── smoke-test.sh           # end-to-end API smoke test
    └── manage.py               # health, smoke, demo, up, down, ps, logs
```

### Security model

- Passwords are BCrypt-hashed. Login issues an opaque random bearer token stored
  in the `session_tokens` table; tokens expire after 7 days.
- API requests use `Authorization: Bearer <token>`. Downloads and print views
  opened in a new tab may alternatively pass `?token=<token>`.
- Module access = role defaults ∪ per-user extra privileges. Finance posting
  additionally requires the `fees` privilege for non-administrator staff.
- School-scoped users are pinned to their own school by the API regardless of
  what the client sends. The platform administrator may target any school.
- Only `/api/auth/login` and `/api/health` are public.

### Roles and default modules

| Role | Default modules |
| --- | --- |
| `SUPER_ADMIN` | All modules, all schools |
| `ADMIN` | Overview, accounts, students, staff, attendance, library, messages, grades, fees, notifications |
| `TEACHER` | Overview, students, attendance, library, messages, grades, notifications |
| `STAFF` | Overview, students, attendance, library, messages, notifications |
| `PARENT` | Overview, attendance, library, messages, grades, fees, notifications |
| `STUDENT` | Overview, attendance, library, messages, grades, fees, notifications |

Extra privileges are additive only — role defaults cannot be removed. Finance
posting and voiding are limited to administrators and to `TEACHER`/`STAFF`
accounts that have `fees` explicitly granted; parents and students can only
view their own family ledger.

---

## Configuration

Compose reads these variables from `.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_PORT` | `8080` | Host port for the web app |
| `POSTGRES_DB` | `schoolms` | Database name |
| `POSTGRES_USER` | `schoolms` | Database user |
| `POSTGRES_PASSWORD` | `schoolms` | Database password |
| `APP_SEED_DEMO_DATA` | `true` | Seed demo school, accounts and content |
| `JAVA_OPTS` | container-aware JVM flags | JVM tuning |

If port 8080 is already taken, set `APP_PORT=8081` (or any free port) in
`.env` before starting the stack and open `http://localhost:8081`. This
workspace's `.env` uses `APP_PORT=8081`. The helper scripts read the same value
from `.env`.

The application also accepts `SPRING_DATASOURCE_URL`,
`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`,
`APP_UPLOAD_DIR` and `SERVER_PORT` directly.

Uploads are stored in the `schoolms-uploads` volume at `/data/uploads`; the
database lives in the `schoolms-db` volume.

---

## Operations

```bash
# wait for health
python3 scripts/manage.py health

# exercise login, dashboards, enrollment, attendance, library, grades,
# messages, fees and parent notifications
python3 scripts/manage.py smoke
./scripts/smoke-test.sh          # wrapper for the same check

# verify all seeded logins
python3 scripts/manage.py demo

# lifecycle
python3 scripts/manage.py up
python3 scripts/manage.py ps
python3 scripts/manage.py logs
python3 scripts/manage.py down
```

The helper uses only the Python standard library. Point it at another instance
with `--url`, `LEONESIS_URL`, or the legacy `SCHOOLMS_URL` environment variable.

### Reset everything

```bash
docker compose down -v
./scripts/start.sh
```

This removes both the database and uploads volumes, then reseeds the demo data.

---

## API overview

All endpoints are under `/api` and require a bearer token unless noted.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login` (public), `POST /auth/logout`, `GET /auth/me` |
| Meta | `GET /meta` — user, modules, schools, forms, subjects |
| Health | `GET /health` (public) |
| Schools | `GET/POST /schools`, `GET/PUT/DELETE /schools/{id}` |
| Accounts | `GET/POST /users`, `PUT/DELETE /users/{id}`, `POST /users/{id}/reset-password` |
| Students | `GET/POST /students`, `GET/PUT/DELETE /students/{id}`, guardian link/unlink |
| Staff | `GET/POST /staff`, `PUT/DELETE /staff/{id}` |
| Attendance | `GET/POST /attendance` |
| Grades | `GET/POST /grades/assessments`, `GET /grades/assessments/{id}`, `POST /grades/assessments/{id}/entries`, `GET /grades/my` |
| Library | `GET/POST /library/books`, `GET /library/books/{id}`, `/content`, `/file`, `DELETE /library/books/{id}` |
| Messages | `GET /messages`, `GET /messages/directory`, `GET /messages/{id}`, `POST /messages` |
| Fees | `GET /fees`, `POST /fees`, `POST /fees/{id}/void`, `GET /fees/{id}/receipt` |
| Notifications | `GET /notifications`, `/count`, `POST /{id}/read`, `POST /read-all`, `DELETE /{id}` |
| Dashboard | `GET /dashboard` |

Super administrators add `?schoolId=<uuid>` to scope a request; omitting it gives
platform-wide results where supported. School users ignore this parameter and
are always scoped to their own school.

---

## Local development without Docker

Requirements: Java 17, Maven 3.9+, PostgreSQL 16.

```bash
createdb schoolms
cd backend
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/schoolms \
SPRING_DATASOURCE_USERNAME=youruser \
SPRING_DATASOURCE_PASSWORD=yourpassword \
APP_UPLOAD_DIR=/tmp/schoolms-uploads \
mvn spring-boot:run
```

Then open http://localhost:8080. The database schema is created automatically by
Hibernate on first start. Set `APP_SEED_DEMO_DATA=false` for an empty database.

---

## Notes

- This is a self-contained demo/education deployment. For production, terminate
  TLS in front of the app, rotate the database password, disable
  `APP_SEED_DEMO_DATA`, and replace the demo administrator password.
- Uploaded files are validated by extension and size but should be scanned by
  your own malware pipeline in a real deployment.
- The front end is plain JavaScript with no build step, so changes under
  `backend/src/main/resources/static` are picked up on the next image build.
