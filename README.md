# LeoneSIS

A modern Student Information System (SIS) built with Next.js, tRPC, Prisma, and PostgreSQL.

## Features

- **Student Management** - Student profiles, enrollment, demographics, documents
- **Staff Management** - Staff profiles, employment history, certifications
- **Course Management** - Programs, subjects, courses, sections
- **Scheduling** - Student schedules, course scheduling, schedule requests
- **Attendance** - Daily/period attendance tracking, reports
- **Grading** - Gradebook, assignments, report cards, transcripts, GPA
- **Admissions** - Application management, workflow
- **Communication** - Internal messaging, notifications, announcements
- **Billing** - Fee management, payments, account tracking
- **Reports & Analytics** - Dashboard, enrollment, attendance, academic reports
- **Multi-tenancy** - Support for multiple schools in one installation
- **Role-based Access** - Admin, Teacher, Parent, Student roles

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js v5
- **UI Components**: Radix UI, shadcn/ui pattern
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ (recommended: 20+)
- PostgreSQL 14+
- npm or yarn

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd leonesis
npm install
```

### 2. Set up environment variables

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Update `.env` with your database connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/leonesis?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

### 3. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed the database with demo data
npx tsx prisma/seed.ts
```

### 4. Start the development server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Demo Credentials

After seeding the database, you can log in with:

- **Admin**: admin@lincoln.edu / admin123
- **Teacher**: teacher@lincoln.edu / teacher123

## Project Structure

```
leonesis/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth pages (login)
│   │   ├── (dashboard)/     # Dashboard pages
│   │   ├── api/             # API routes
│   │   └── layout.tsx       # Root layout
│   ├── client/              # Client-side code
│   │   ├── components/      # React components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # UI components (shadcn/ui)
│   │   └── lib/             # Utilities, tRPC client, constants
│   ├── server/              # Server-side code
│   │   ├── api/             # tRPC routers
│   │   │   ├── routers/     # All API routers
│   │   │   ├── root.ts      # Root router
│   │   │   └── trpc.ts      # tRPC setup
│   │   ├── auth.ts          # NextAuth config
│   │   └── db.ts            # Prisma client
│   └── types/               # TypeScript types
├── .env                     # Environment variables
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## API Routes

All API routes are served via tRPC at `/api/trpc`. The main routers are:

- `auth` - Authentication (login, logout, me, changePassword)
- `school` - School management (CRUD, grade levels, marking periods, rooms)
- `student` - Student management (CRUD, enrollment, transfers)
- `staff` - Staff management (CRUD, employment, certifications)
- `course` - Course management (programs, subjects, courses, sections)
- `scheduling` - Schedule management (entries, requests, mass operations)
- `attendance` - Attendance tracking (take, reports, codes)
- `grading` - Grading (gradebook, assignments, report cards, transcripts)
- `admissions` - Admission applications (list, create, status updates)
- `communication` - Messaging and notifications
- `billing` - Fee management and payments
- `reports` - Analytics and reports

## Database Schema

The database schema includes 50+ tables organized into these domains:

- **Identity & Access** - Users, profiles, permissions
- **School Structure** - Schools, grade levels, rooms, marking periods
- **Calendar** - Events, bell schedules
- **Student Management** - Students, enrollments, family members
- **Staff Management** - Staff, employment, certifications
- **Course Management** - Programs, subjects, courses, sections
- **Scheduling** - Schedule entries, requests
- **Attendance** - Codes, records
- **Grading** - Scales, assignments, gradebook entries
- **Report Cards & Transcripts** - Report cards, transcripts
- **Admissions** - Applications
- **Communication** - Messages, notifications, notices
- **Billing** - Fee accounts, transactions
- **System** - Audit logs, documents, settings

## Development

### Adding a new feature

1. Add the database schema changes to `prisma/schema.prisma`
2. Run `npx prisma db push` to update the database
3. Create or update the tRPC router in `src/server/api/routers/`
4. Add the router to `src/server/api/root.ts`
5. Create the page components in `src/app/(dashboard)/`
6. Add navigation items in `src/client/lib/constants.ts`

### Running migrations

```bash
# Create a migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy
```

## License

This project is open source and available under the MIT License.
