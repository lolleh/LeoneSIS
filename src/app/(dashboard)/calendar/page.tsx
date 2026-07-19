"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Pencil,
  Trash2,
  X,
  Bell,
  Layers,
} from "lucide-react";
import { api } from "@/client/lib/api";
import { cn } from "@/client/lib/utils";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";

const EVENT_TYPES = [
  { value: "HOLIDAY", label: "Holiday", color: "#ef4444" },
  { value: "BREAK", label: "Break", color: "#f97316" },
  { value: "EXAM", label: "Exam", color: "#8b5cf6" },
  { value: "ASSESSMENT", label: "Assessment", color: "#06b6d4" },
  { value: "MEETING", label: "Meeting", color: "#10b981" },
  { value: "TRAINING", label: "Training", color: "#3b82f6" },
  { value: "EVENT", label: "Event", color: "#f59e0b" },
  { value: "OTHER", label: "Other", color: "#6b7280" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getEventTypeColor(type: string) {
  return EVENT_TYPES.find((t) => t.value === type)?.color ?? "#6b7280";
}

function toTimeInputValue(date: Date | string) {
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  calendars,
  selectedCalendars,
  onDayClick,
}: {
  year: number;
  month: number;
  events: any[];
  calendars: any[];
  selectedCalendars: Set<string>;
  onDayClick: (date: string) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const cells = useMemo(() => {
    const result: { day: number; date: string; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      const d = prevMonthDays - firstDay + i + 1;
      const dt = new Date(year, month - 1, d);
      result.push({ day: d, date: formatDateStr(dt), isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      result.push({ day: d, date: formatDateStr(dt), isCurrentMonth: true });
    }

    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      result.push({ day: d, date: formatDateStr(dt), isCurrentMonth: false });
    }

    return result;
  }, [year, month, daysInMonth, firstDay, prevMonthDays]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach((ev) => {
      if (!selectedCalendars.has(ev.calendarId)) return;
      const start = formatDateStr(new Date(ev.startDate));
      const end = formatDateStr(new Date(ev.endDate));
      let cur = new Date(start);
      const endD = new Date(end);
      while (cur <= endD) {
        const key = formatDateStr(cur);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events, selectedCalendars]);

  const today = formatDateStr(new Date());

  return (
    <div className="grid grid-cols-7 border-t border-l">
      {DAY_LABELS.map((label) => (
        <div
          key={label}
          className="border-b border-r bg-muted/50 py-2 text-center text-xs font-semibold text-muted-foreground"
        >
          {label}
        </div>
      ))}
      {cells.map((cell, i) => {
        const dayEvents = eventsByDate[cell.date] ?? [];
        return (
          <div
            key={i}
            onClick={() => cell.isCurrentMonth && onDayClick(cell.date)}
            className={cn(
              "min-h-[80px] border-b border-r p-1 transition-colors",
              cell.isCurrentMonth
                ? "cursor-pointer bg-background hover:bg-primary/5"
                : "bg-muted/20 text-muted-foreground",
              cell.date === today && "ring-2 ring-inset ring-primary/40"
            )}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                cell.date === today && "bg-primary text-primary-foreground"
              )}
            >
              {cell.day}
            </span>
            <div className="mt-0.5 flex flex-col gap-0.5">
              {dayEvents.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="truncate rounded px-1 py-px text-[10px] font-medium text-white"
                  style={{ backgroundColor: ev.color ?? getEventTypeColor(ev.eventType) }}
                  title={ev.title}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{dayEvents.length - 3} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  startDate,
  events,
  selectedCalendars,
}: {
  startDate: Date;
  events: any[];
  selectedCalendars: Set<string>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM – 8 PM

  const eventsByDateAndHour = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {};
    events.forEach((ev) => {
      if (!selectedCalendars.has(ev.calendarId)) return;
      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);
      const dateKey = formatDateStr(start);
      const hour = start.getHours();
      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][hour]) map[dateKey][hour] = [];
      map[dateKey][hour].push(ev);
    });
    return map;
  }, [events, selectedCalendars]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-[60px_repeat(7,1fr)]">
        <div className="border-b border-r bg-muted/50" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn(
              "border-b border-r bg-muted/50 py-2 text-center text-xs font-semibold text-muted-foreground",
              formatDateStr(d) === formatDateStr(new Date()) && "text-primary"
            )}
          >
            {DAY_LABELS[d.getDay()]} {d.getDate()}
          </div>
        ))}

        {hours.map((hour) => (
          <>
            <div
              key={`h-${hour}`}
              className="border-b border-r bg-muted/30 px-1 py-2 text-right text-[10px] text-muted-foreground"
            >
              {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
            </div>
            {days.map((d) => {
              const dateKey = formatDateStr(d);
              const hourEvents = eventsByDateAndHour[dateKey]?.[hour] ?? [];
              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className="border-b border-r p-0.5"
                >
                  {hourEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="mb-0.5 truncate rounded px-1 py-px text-[10px] font-medium text-white"
                      style={{
                        backgroundColor: ev.color ?? getEventTypeColor(ev.eventType),
                      }}
                      title={`${ev.title} (${ev.eventType})`}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  date,
  events,
  selectedCalendars,
}: {
  date: Date;
  events: any[];
  selectedCalendars: Set<string>;
}) {
  const dateKey = formatDateStr(date);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const dayEvents = useMemo(() => {
    const map: Record<number, any[]> = {};
    events.forEach((ev) => {
      if (!selectedCalendars.has(ev.calendarId)) return;
      const evDate = formatDateStr(new Date(ev.startDate));
      if (evDate === dateKey) {
        const hour = new Date(ev.startDate).getHours();
        if (!map[hour]) map[hour] = [];
        map[hour].push(ev);
      }
    });
    return map;
  }, [events, selectedCalendars, dateKey]);

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-[60px_1fr]">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r bg-muted/30 px-1 py-3 text-right text-[10px] text-muted-foreground">
              {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
            </div>
            <div className="min-h-[40px] border-b p-1">
              {(dayEvents[hour] ?? []).map((ev) => (
                <div
                  key={ev.id}
                  className="mb-0.5 flex items-center gap-2 rounded px-2 py-1 text-xs font-medium text-white"
                  style={{
                    backgroundColor: ev.color ?? getEventTypeColor(ev.eventType),
                  }}
                >
                  <span>{ev.title}</span>
                  <Badge variant="outline" className="border-white/30 text-[10px] text-white">
                    {ev.eventType}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Event Form Dialog ───────────────────────────────────────────────────────

function EventDialog({
  open,
  onOpenChange,
  calendars,
  initialDate,
  editingEvent,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendars: any[];
  initialDate?: string;
  editingEvent?: any;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(editingEvent?.title ?? "");
  const [description, setDescription] = useState(editingEvent?.description ?? "");
  const [eventType, setEventType] = useState(editingEvent?.eventType ?? "EVENT");
  const [calendarId, setCalendarId] = useState(
    editingEvent?.calendarId ?? calendars[0]?.id ?? ""
  );
  const [startDate, setStartDate] = useState(
    editingEvent ? toTimeInputValue(editingEvent.startDate) : initialDate ? `${initialDate}T08:00` : ""
  );
  const [endDate, setEndDate] = useState(
    editingEvent ? toTimeInputValue(editingEvent.endDate) : initialDate ? `${initialDate}T15:00` : ""
  );
  const [isAllDay, setIsAllDay] = useState(editingEvent?.isAllDay ?? false);
  const [location, setLocation] = useState(editingEvent?.location ?? "");
  const [color, setColor] = useState(editingEvent?.color ?? "");

  const typeInfo = EVENT_TYPES.find((t) => t.value === eventType);

  const handleSubmit = () => {
    onSave({
      title,
      description: description || undefined,
      eventType,
      calendarId,
      startDate: new Date(startDate).toISOString(),
      endDate: isAllDay ? new Date(startDate).toISOString() : new Date(endDate).toISOString(),
      isAllDay,
      location: location || undefined,
      color: color || typeInfo?.color,
      ...(editingEvent ? { id: editingEvent.id } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {editingEvent ? "Update event details below." : "Fill in the details for a new event."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Calendar</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? startDate?.split("T")[0] : startDate}
                onChange={(e) =>
                  isAllDay ? setStartDate(e.target.value) : setStartDate(e.target.value)
                }
              />
            </div>
            {!isAllDay && (
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              All day
            </label>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Optional location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setColor(t.color)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                    (color || typeInfo?.color) === t.color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: t.color }}
                  title={t.label}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !calendarId || isSaving}>
            {isSaving ? "Saving…" : editingEvent ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bell Schedule Dialog ────────────────────────────────────────────────────

function BellScheduleDialog({
  open,
  onOpenChange,
  editingSchedule,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingSchedule?: any;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(editingSchedule?.name ?? "");
  const [isDefault, setIsDefault] = useState(editingSchedule?.isDefault ?? false);
  const [periods, setPeriods] = useState<
    { periodNumber: number; periodName: string; startTime: string; endTime: string; isHalfDay: boolean }[]
  >(
    editingSchedule?.periods?.length
      ? editingSchedule.periods.map((p: any) => ({
          periodNumber: p.periodNumber,
          periodName: p.periodName,
          startTime: toTimeInputValue(p.startTime).slice(11, 16),
          endTime: toTimeInputValue(p.endTime).slice(11, 16),
          isHalfDay: p.isHalfDay,
        }))
      : [
          { periodNumber: 1, periodName: "Period 1", startTime: "08:00", endTime: "08:50", isHalfDay: false },
          { periodNumber: 2, periodName: "Period 2", startTime: "08:55", endTime: "09:45", isHalfDay: false },
          { periodNumber: 3, periodName: "Period 3", startTime: "09:50", endTime: "10:40", isHalfDay: false },
          { periodNumber: 4, periodName: "Period 4", startTime: "10:45", endTime: "11:35", isHalfDay: false },
          { periodNumber: 5, periodName: "Lunch", startTime: "11:40", endTime: "12:20", isHalfDay: false },
          { periodNumber: 6, periodName: "Period 5", startTime: "12:25", endTime: "13:15", isHalfDay: false },
          { periodNumber: 7, periodName: "Period 6", startTime: "13:20", endTime: "14:10", isHalfDay: false },
        ]
  );

  const addPeriod = () => {
    setPeriods((prev) => [
      ...prev,
      {
        periodNumber: prev.length + 1,
        periodName: `Period ${prev.length + 1}`,
        startTime: "14:15",
        endTime: "15:05",
        isHalfDay: false,
      },
    ]);
  };

  const updatePeriod = (index: number, field: string, value: any) => {
    setPeriods((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const removePeriod = (index: number) => {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSave({
      ...(editingSchedule ? { id: editingSchedule.id } : {}),
      name,
      isDefault,
      periods: periods.map((p) => ({
        ...p,
        startTime: new Date(`2000-01-01T${p.startTime}:00`).toISOString(),
        endTime: new Date(`2000-01-01T${p.endTime}:00`).toISOString(),
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingSchedule ? "Edit Bell Schedule" : "Create Bell Schedule"}</DialogTitle>
          <DialogDescription>
            Define periods with their start and end times.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g. Regular Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Set as default
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Periods</Label>
              <Button variant="outline" size="sm" onClick={addPeriod} type="button">
                <Plus className="mr-1 h-3 w-3" />
                Add Period
              </Button>
            </div>
            <div className="space-y-2">
              {periods.map((period, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border p-2"
                >
                  <span className="w-6 text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Input
                    placeholder="Name"
                    value={period.periodName}
                    onChange={(e) => updatePeriod(idx, "periodName", e.target.value)}
                    className="w-32"
                  />
                  <Input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => updatePeriod(idx, "startTime", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => updatePeriod(idx, "endTime", e.target.value)}
                    className="w-32"
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={period.isHalfDay}
                      onChange={(e) => updatePeriod(idx, "isHalfDay", e.target.checked)}
                      className="h-3 w-3 rounded border-input"
                    />
                    Half
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removePeriod(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || periods.length === 0 || isSaving}>
            {isSaving ? "Saving…" : editingSchedule ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [dayViewDate, setDayViewDate] = useState(new Date());

  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [allCalendarsSelected, setAllCalendarsSelected] = useState(true);

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDialogDate, setEventDialogDate] = useState<string | undefined>();
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const [bellScheduleDialogOpen, setBellScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const [dayTypeDialogOpen, setDayTypeDialogOpen] = useState(false);
  const [dayTypeCalendarId, setDayTypeCalendarId] = useState<string>("");
  const [dayTypeName, setDayTypeName] = useState("");
  const [dayTypeDayCode, setDayTypeDayCode] = useState("");

  const [assignDates, setAssignDates] = useState<Record<string, string>>({});

  // ── Queries ──
  const { data: calendars = [], isLoading: loadingCalendars } =
    api.calendar.listCalendars.useQuery();
  const { data: events = [], isLoading: loadingEvents } =
    api.calendar.listEvents.useQuery({
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
    });

  const selectedCalendarIds = useMemo(() => {
    if (allCalendarsSelected || selectedCalendars.size === 0) {
      return calendars.map((c: any) => c.id);
    }
    return Array.from(selectedCalendars);
  }, [allCalendarsSelected, selectedCalendars, calendars]);

  const { data: weekEvents = [] } = api.calendar.listEvents.useQuery({
    calendarIds: selectedCalendarIds,
    startDate: weekStart.toISOString(),
    endDate: new Date(weekStart.getTime() + 6 * 86400000).toISOString(),
  });

  const { data: dayEvents = [] } = api.calendar.listEvents.useQuery({
    calendarIds: selectedCalendarIds,
    startDate: new Date(dayViewDate.getFullYear(), dayViewDate.getMonth(), dayViewDate.getDate()).toISOString(),
    endDate: new Date(dayViewDate.getFullYear(), dayViewDate.getMonth(), dayViewDate.getDate(), 23, 59, 59).toISOString(),
  });

  const { data: allEvents = [] } = api.calendar.listEvents.useQuery({
    calendarIds: selectedCalendarIds,
  });

  const { data: bellSchedules = [], refetch: refetchBellSchedules } =
    api.calendar.listBellSchedules.useQuery(
      { calendarId: calendars[0]?.id ?? "" },
      { enabled: !!calendars[0]?.id }
    );

  const { data: dayTypes = [], refetch: refetchDayTypes } =
    api.calendar.listDayTypes.useQuery(
      { calendarId: calendars[0]?.id ?? "" },
      { enabled: !!calendars[0]?.id }
    );

  // ── Mutations ──
  const createEvent = api.calendar.createEvent.useMutation({
    onSuccess: () => {
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
  });
  const updateEvent = api.calendar.updateEvent.useMutation({
    onSuccess: () => {
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
  });
  const deleteEvent = api.calendar.deleteEvent.useMutation();

  const createBellSchedule = api.calendar.createBellSchedule.useMutation({
    onSuccess: () => {
      setBellScheduleDialogOpen(false);
      setEditingSchedule(null);
      refetchBellSchedules();
    },
  });
  const deleteBellSchedule = api.calendar.deleteBellSchedule.useMutation({
    onSuccess: () => refetchBellSchedules(),
  });

  const createDayType = api.calendar.createDayType.useMutation({
    onSuccess: () => {
      setDayTypeDialogOpen(false);
      setDayTypeName("");
      setDayTypeDayCode("");
      refetchDayTypes();
    },
  });
  const assignDayType = api.calendar.assignDayType.useMutation({
    onSuccess: () => refetchDayTypes(),
  });
  const removeDayTypeAssignment = api.calendar.removeDayTypeAssignment.useMutation({
    onSuccess: () => refetchDayTypes(),
  });
  const deleteDayType = api.calendar.deleteDayType.useMutation({
    onSuccess: () => refetchDayTypes(),
  });

  // ── Calendar selection ──
  const toggleCalendar = useCallback(
    (id: string) => {
      setSelectedCalendars((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        setAllCalendarsSelected(next.size === 0 || next.size === calendars.length);
        return next;
      });
    },
    [calendars.length]
  );

  const selectAllCalendars = useCallback(() => {
    setAllCalendarsSelected(true);
    setSelectedCalendars(new Set());
  }, []);

  // ── Navigation ──
  const prevMonth = () =>
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  const nextMonth = () =>
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });

  const prevWeek = () =>
    setWeekStart((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 7);
      return nd;
    });
  const nextWeek = () =>
    setWeekStart((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 7);
      return nd;
    });

  const prevDay = () =>
    setDayViewDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  const nextDay = () =>
    setDayViewDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });

  // ── Event handlers ──
  const handleDayClick = (date: string) => {
    setEventDialogDate(date);
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const handleEventSave = (data: any) => {
    if (data.id) {
      updateEvent.mutate(data);
    } else {
      createEvent.mutate(data);
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Delete this event?")) {
      deleteEvent.mutate({ id });
    }
  };

  // ── Bell schedule handlers ──
  const handleBellScheduleSave = (data: any) => {
    if (data.calendarId) {
      createBellSchedule.mutate(data);
    } else if (data.id) {
      // update only name/isDefault for editing
    } else {
      createBellSchedule.mutate({ ...data, calendarId: calendars[0]?.id });
    }
  };

  const handleDeleteBellSchedule = (id: string) => {
    if (confirm("Delete this bell schedule?")) {
      deleteBellSchedule.mutate({ id });
    }
  };

  // ── Day type handlers ──
  const handleCreateDayType = () => {
    if (dayTypeCalendarId && dayTypeName && dayTypeDayCode) {
      createDayType.mutate({
        calendarId: dayTypeCalendarId,
        name: dayTypeName,
        dayCode: dayTypeDayCode,
      });
    }
  };

  const handleAssignDayType = (dayTypeId: string, date: string) => {
    assignDayType.mutate({ dayTypeId, dates: [date] });
  };

  const handleRemoveDayTypeAssignment = (dayTypeId: string, date: string) => {
    removeDayTypeAssignment.mutate({ dayTypeId, date });
  };

  const isLoading = loadingCalendars || loadingEvents;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Manage school events, bell schedules, and day types"
        actions={
          <Button onClick={() => { setEventDialogDate(undefined); setEditingEvent(null); setEventDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        }
      />

      {/* Calendar Legend / Selection */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Calendars:</span>
            <button
              onClick={selectAllCalendars}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                allCalendarsSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Layers className="h-3 w-3" />
              All
            </button>
            {calendars.map((cal: any) => {
              const isActive = allCalendarsSelected || selectedCalendars.has(cal.id);
              return (
                <button
                  key={cal.id}
                  onClick={() => toggleCalendar(cal.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isActive ? "hsl(142.1 76.2% 36.3%)" : "#d1d5db" }}
                  />
                  {cal.name}
                  <span className="text-[10px] text-muted-foreground">
                    {cal._count?.events ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="month">
            <CalendarIcon className="mr-1 h-3.5 w-3.5" />
            Month
          </TabsTrigger>
          <TabsTrigger value="week">
            <Clock className="mr-1 h-3.5 w-3.5" />
            Week
          </TabsTrigger>
          <TabsTrigger value="day">
            <CalendarIcon className="mr-1 h-3.5 w-3.5" />
            Day
          </TabsTrigger>
          <TabsTrigger value="events">
            Events
          </TabsTrigger>
          <TabsTrigger value="bell">
            <Bell className="mr-1 h-3.5 w-3.5" />
            Bell Schedule
          </TabsTrigger>
          <TabsTrigger value="daytypes">
            Day Types
          </TabsTrigger>
        </TabsList>

        {/* ── Month Tab ── */}
        <TabsContent value="month">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-bold">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <MonthView
                  year={currentDate.getFullYear()}
                  month={currentDate.getMonth()}
                  events={events}
                  calendars={calendars}
                  selectedCalendars={allCalendarsSelected ? new Set(calendars.map((c: any) => c.id)) : selectedCalendars}
                  onDayClick={handleDayClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Week Tab ── */}
        <TabsContent value="week">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-bold">
                Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - d.getDay());
                    setWeekStart(d);
                  }}
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <WeekView
                startDate={weekStart}
                events={weekEvents}
                selectedCalendars={allCalendarsSelected ? new Set(calendars.map((c: any) => c.id)) : selectedCalendars}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Day Tab ── */}
        <TabsContent value="day">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-bold">
                {dayViewDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDayViewDate(new Date())}
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DayView
                date={dayViewDate}
                events={dayEvents}
                selectedCalendars={allCalendarsSelected ? new Set(calendars.map((c: any) => c.id)) : selectedCalendars}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Events Tab ── */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>All Events</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEventDialogDate(undefined);
                  setEditingEvent(null);
                  setEventDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Event
              </Button>
            </CardHeader>
            <CardContent>
              {allEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-1 text-lg font-semibold">No events</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your first event to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Calendar</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEvents.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: ev.color ?? getEventTypeColor(ev.eventType) }}
                            />
                            <span className="font-medium">{ev.title}</span>
                            {ev.isAllDay && (
                              <Badge variant="secondary" className="text-[10px]">
                                All Day
                              </Badge>
                            )}
                          </div>
                          {ev.location && (
                            <div className="ml-[18px] text-xs text-muted-foreground">
                              {ev.location}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ev.eventType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ev.calendar?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(ev.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(ev.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingEvent(ev);
                                setEventDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEvent(ev.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bell Schedule Tab ── */}
        <TabsContent value="bell">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Bell Schedules</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSchedule(null);
                  setBellScheduleDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Schedule
              </Button>
            </CardHeader>
            <CardContent>
              {bellSchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-1 text-lg font-semibold">No bell schedules</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a bell schedule to define period times.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bellSchedules.map((schedule: any) => (
                    <div key={schedule.id} className="rounded-lg border">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{schedule.name}</h4>
                          {schedule.isDefault && (
                            <Badge variant="default" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setBellScheduleDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBellSchedule(schedule.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">#</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Half Day</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedule.periods?.map((period: any) => {
                              const start = new Date(period.startTime);
                              const end = new Date(period.endTime);
                              const durationMs = end.getTime() - start.getTime();
                              const durationMin = Math.round(durationMs / 60000);
                              return (
                                <TableRow key={period.id}>
                                  <TableCell className="font-medium">
                                    {period.periodNumber}
                                  </TableCell>
                                  <TableCell>{period.periodName}</TableCell>
                                  <TableCell className="text-sm">
                                    {start.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {end.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {durationMin} min
                                  </TableCell>
                                  <TableCell>
                                    {period.isHalfDay && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Half Day
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Day Types Tab ── */}
        <TabsContent value="daytypes">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Day Types (A-Day / B-Day)</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setDayTypeCalendarId(calendars[0]?.id ?? "");
                  setDayTypeName("");
                  setDayTypeDayCode("");
                  setDayTypeDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Day Type
              </Button>
            </CardHeader>
            <CardContent>
              {dayTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-1 text-lg font-semibold">No day types defined</h3>
                  <p className="text-sm text-muted-foreground">
                    Create day types like A-Day and B-Day to assign them to dates.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {dayTypes.map((dt: any) => (
                    <div key={dt.id} className="rounded-lg border">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{dt.name}</h4>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {dt.dayCode}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {dt.assignments?.length ?? 0} date{dt.assignments?.length !== 1 ? "s" : ""} assigned
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete day type "${dt.name}"?`)) {
                                deleteDayType.mutate({ id: dt.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Input
                            type="date"
                            className="w-44"
                            id={`assign-${dt.id}`}
                            placeholder="Select date"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById(
                                `assign-${dt.id}`
                              ) as HTMLInputElement | null;
                              if (input?.value) {
                                handleAssignDayType(dt.id, input.value);
                                input.value = "";
                              }
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Assign Date
                          </Button>
                        </div>
                        {dt.assignments?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {dt.assignments.map((a: any) => (
                              <Badge
                                key={a.id}
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                {new Date(a.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                <button
                                  onClick={() =>
                                    handleRemoveDayTypeAssignment(dt.id, formatDateStr(new Date(a.date)))
                                  }
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No dates assigned yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        calendars={calendars}
        initialDate={eventDialogDate}
        editingEvent={editingEvent}
        onSave={handleEventSave}
        isSaving={createEvent.isPending || updateEvent.isPending}
      />

      <BellScheduleDialog
        open={bellScheduleDialogOpen}
        onOpenChange={setBellScheduleDialogOpen}
        editingSchedule={editingSchedule}
        onSave={handleBellScheduleSave}
        isSaving={createBellSchedule.isPending}
      />

      <Dialog open={dayTypeDialogOpen} onOpenChange={setDayTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Day Type</DialogTitle>
            <DialogDescription>
              Define a day type like A-Day or B-Day for your bell schedule rotation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Calendar</Label>
              <Select value={dayTypeCalendarId} onValueChange={setDayTypeCalendarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day Type Name</Label>
              <Input
                placeholder="e.g. A-Day"
                value={dayTypeName}
                onChange={(e) => setDayTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Day Code</Label>
              <Input
                placeholder="e.g. A"
                value={dayTypeDayCode}
                onChange={(e) => setDayTypeDayCode(e.target.value)}
                className="w-24 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDayType}
              disabled={!dayTypeCalendarId || !dayTypeName || !dayTypeDayCode || createDayType.isPending}
            >
              {createDayType.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
