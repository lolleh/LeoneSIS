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
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Admissions", href: "/admissions", icon: UserPlus },
      { title: "Communication", href: "/communication", icon: MessageSquare },
      { title: "Billing", href: "/billing", icon: CreditCard },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  staff: "Staff",
  parent: "Parent",
  student: "Student",
};

export const SCHOOL_NAME = "LeoneSIS";
export const SCHOOL_SHORT_NAME = "LSIS";
