"use client";

import { api } from "@/client/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Users, BookOpen, ClipboardCheck, UserPlus, Calendar, BarChart3, TrendingUp, School } from "lucide-react";
import Link from "next/link";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
  colorClass,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  colorClass: string;
}) {
  return (
    <Card className={`hover-lift border-0 shadow-md ${colorClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold opacity-80">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-white/50 p-2">
          <Icon className="h-5 w-5 opacity-80" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/30" />
          ) : (
            value
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs opacity-70">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={`h-auto justify-start gap-3 rounded-xl border-2 py-4 font-medium transition-all duration-200 hover-lift ${color}`}
    >
      <Link href={href}>
        <Icon className="h-5 w-5" />
        {title}
      </Link>
    </Button>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } =
    api.stats.getDashboard.useQuery();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="LeoneSIS Logo" className="h-20 w-auto" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here&apos;s an overview of your school.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          isLoading={statsLoading}
          colorClass="stat-card-students"
        />
        <StatCard
          title="Total Staff"
          value={stats?.totalStaff ?? 0}
          icon={School}
          isLoading={statsLoading}
          colorClass="stat-card-staff"
        />
        <StatCard
          title="Active Courses"
          value={stats?.activeCourses ?? 0}
          icon={BookOpen}
          isLoading={statsLoading}
          colorClass="stat-card-courses"
        />
        <StatCard
          title="Attendance Rate"
          value={stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "—"}
          icon={ClipboardCheck}
          description="Today's attendance"
          isLoading={statsLoading}
          colorClass="stat-card-attendance"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded-lg bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No recent activity to display.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-accent/10 p-1.5">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionCard
              title="Add Student"
              icon={UserPlus}
              href="/students/new"
              color="hover:border-primary/30 hover:bg-primary/5"
            />
            <QuickActionCard
              title="Take Attendance"
              icon={ClipboardCheck}
              href="/attendance"
              color="hover:border-accent/30 hover:bg-accent/5"
            />
            <QuickActionCard
              title="View Reports"
              icon={BarChart3}
              href="/reports"
              color="hover:border-yellow-400/30 hover:bg-yellow-50"
            />
            <QuickActionCard
              title="Manage Schedule"
              icon={Calendar}
              href="/scheduling"
              color="hover:border-purple-400/30 hover:bg-purple-50"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
