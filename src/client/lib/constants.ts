import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  UserPlus,
  MessageSquare,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  FileText,
  Shield,
  ScrollText,
  Radio,
  Swords,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

export interface NavCategory {
  label: string;
  items: NavItem[];
}

export const NAV_ITEMS: NavCategory[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Students", href: "/students", icon: Users },
      { title: "Staff", href: "/staff", icon: Users },
      { title: "Admissions", href: "/admissions", icon: UserPlus },
    ],
  },
  {
    label: "Academic",
    items: [
      { title: "Courses", href: "/courses", icon: BookOpen },
      { title: "Sections", href: "/sections", icon: FileText },
      { title: "Scheduling", href: "/scheduling", icon: Calendar },
      { title: "Attendance", href: "/attendance", icon: ClipboardCheck },
      { title: "Grades", href: "/grades", icon: GraduationCap },
      { title: "Lesson Plans", href: "/lesson-plans", icon: ScrollText },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Calendar", href: "/calendar", icon: Calendar },
      { title: "Notices", href: "/notices", icon: Bell },
      { title: "Communication", href: "/communication", icon: MessageSquare },
      { title: "Broadcast", href: "/broadcast", icon: Radio },
      { title: "Billing & Fees", href: "/billing", icon: CreditCard },
      { title: "Discipline", href: "/discipline", icon: Swords },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Profiles & RBAC", href: "/settings/profiles", icon: Shield },
    ],
  },
];

export const MENU_KEY_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/students": "students",
  "/staff": "staff",
  "/courses": "courses",
  "/scheduling": "scheduling",
  "/attendance": "attendance",
  "/grades": "grades",
  "/admissions": "admissions",
  "/communication": "communication",
  "/billing": "billing",
  "/reports": "reports",
  "/settings": "settings",
  "/calendar": "calendar",
  "/notices": "notices",
  "/lesson-plans": "lesson-plans",
  "/discipline": "discipline",
  "/sections": "sections",
  "/rooms": "rooms",
  "/periods": "periods",
  "/grade-levels": "grade-levels",
  "/profiles": "profiles",
  "/permissions": "permissions",
  "/rollover": "rollover",
  "/system-logs": "system-logs",
  "/broadcast": "broadcast",
  "/export": "export",
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
};

export const SCHOOL_NAME = "LeoneSIS";
export const SCHOOL_SHORT_NAME = "LSIS";

// Sierra Leone 6-3-3-4 Education System
export const GRADE_DIVISIONS = {
  PRIMARY: { label: "Primary", grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"], code: "PRIMARY" },
  JSS: { label: "Junior Secondary (JSS)", grades: ["Grade 7", "Grade 8", "Grade 9"], code: "JSS" },
  SSS: { label: "Senior Secondary (SSS)", grades: ["Grade 10", "Grade 11", "Grade 12"], code: "SSS" },
} as const;

// Official ages for each grade level (age at start of academic year)
export const GRADE_AGE_MAP: Record<string, number> = {
  "Grade 1": 6, "Grade 2": 7, "Grade 3": 8, "Grade 4": 9, "Grade 5": 10, "Grade 6": 11,
  "Grade 7": 12, "Grade 8": 13, "Grade 9": 14,
  "Grade 10": 15, "Grade 11": 16, "Grade 12": 17,
};

// Standard exam progression
export const EXAM_LEVELS = {
  NPSE: { name: "National Primary School Examination", grade: "Grade 6", nextLevel: "JSS" },
  BECE: { name: "Basic Education Certificate Examination", grade: "Grade 9", nextLevel: "SSS" },
  WASSCE: { name: "West African Senior School Certificate Examination", grade: "Grade 12", nextLevel: "UNIVERSITY" },
} as const;
