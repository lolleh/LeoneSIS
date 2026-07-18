import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { schoolRouter } from "./routers/school";
import { studentRouter } from "./routers/student";
import { staffRouter } from "./routers/staff";
import { courseRouter } from "./routers/course";
import { schedulingRouter } from "./routers/scheduling";
import { attendanceRouter } from "./routers/attendance";
import { gradingRouter } from "./routers/grading";
import { admissionsRouter } from "./routers/admissions";
import { communicationRouter } from "./routers/communication";
import { billingRouter } from "./routers/billing";
import { reportsRouter } from "./routers/reports";
import { statsRouter } from "./routers/stats";

export const appRouter = router({
  auth: authRouter,
  school: schoolRouter,
  student: studentRouter,
  staff: staffRouter,
  course: courseRouter,
  scheduling: schedulingRouter,
  attendance: attendanceRouter,
  grading: gradingRouter,
  admissions: admissionsRouter,
  communication: communicationRouter,
  billing: billingRouter,
  reports: reportsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
