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
    ],
  },
  {
    label: "Academic",
    items: [
      { title: "Courses", href: "/courses", icon: BookOpen },
      { title: "Scheduling", href: "/scheduling", icon: Calendar },
      { title: "Attendance", href: "/attendance", icon: ClipboardCheck },
      { title: "Grades", href: "/grades", icon: GraduationCap },
      { title: "Lesson Plans", href: "/lesson-plans", icon: ScrollText },
      { title: "Sections", href: "/sections", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Calendar", href: "/calendar", icon: Calendar },
      { title: "Notices", href: "/notices", icon: Bell },
      { title: "Admissions", href: "/admissions", icon: UserPlus },
      { title: "Communication", href: "/communication", icon: MessageSquare },
      { title: "Broadcast", href: "/broadcast", icon: Radio },
      { title: "Billing", href: "/billing", icon: CreditCard },
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
