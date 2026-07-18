"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { api } from "@/client/lib/trpc";
import {
  Mail,
  Send,
  Bell,
  Megaphone,
  Loader2,
  MailOpen,
  Circle,
  Plus,
} from "lucide-react";

function ComposeForm({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const sendMessage = api.communication.sendMessage.useMutation({
    onSuccess: () => {
      utils.communication.getMessages.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    subject: "",
    body: "",
    recipientIds: [] as string[],
    priority: "normal" as "low" | "normal" | "high",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage.mutate({
      subject: form.subject,
      body: form.body,
      recipientIds: form.recipientIds,
      priority: form.priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient IDs</Label>
        <Input
          id="recipient"
          placeholder="Enter recipient user IDs (comma-separated)"
          value={form.recipientIds.join(", ")}
          onChange={(e) =>
            setForm({
              ...form,
              recipientIds: e.target.value
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={form.priority}
          onValueChange={(value) =>
            setForm({ ...form, priority: value as "low" | "normal" | "high" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Message</Label>
        <textarea
          id="body"
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          placeholder="Write your message..."
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={sendMessage.isPending}>
          {sendMessage.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Send className="mr-2 h-4 w-4" />
          Send Message
        </Button>
      </DialogFooter>
    </form>
  );
}

function CreateNoticeForm({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const createNotice = api.communication.createNotice.useMutation({
    onSuccess: () => {
      utils.communication.getNotices.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    targetRole: "" as string,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNotice.mutate({
      title: form.title,
      content: form.content,
      category: form.category || undefined,
      targetRole: (form.targetRole as any) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="noticeTitle">Title *</Label>
        <Input
          id="noticeTitle"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="noticeContent">Content *</Label>
        <textarea
          id="noticeContent"
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="noticeCategory">Category</Label>
          <Input
            id="noticeCategory"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g., General, Academic, Event"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="noticeTargetRole">Target Audience</Label>
          <Select
            value={form.targetRole}
            onValueChange={(value) => setForm({ ...form, targetRole: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrators</SelectItem>
              <SelectItem value="TEACHER">Teachers</SelectItem>
              <SelectItem value="PARENT">Parents</SelectItem>
              <SelectItem value="STUDENT">Students</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createNotice.isPending}>
          {createNotice.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Publish Notice
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function CommunicationPage() {
  const [inboxPage, setInboxPage] = useState(1);
  const [notifPage, setNotifPage] = useState(1);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);

  const inboxQuery = api.communication.getMessages.useQuery({
    folder: "inbox",
    page: inboxPage,
    pageSize: 25,
  });

  const notifQuery = api.communication.getNotifications.useQuery({
    page: notifPage,
    pageSize: 25,
  });

  const noticeQuery = api.communication.getNotices.useQuery({
    page: noticePage,
    pageSize: 25,
  });

  const markNotifRead = api.communication.markNotificationRead.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        description="Messages, notifications, and school announcements"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Communication" },
        ]}
      />

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Mail className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="notices" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Notices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboxQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !inboxQuery.data?.messages.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No messages in your inbox.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inboxQuery.data.messages.map((msg) => {
                      const isUnread = !msg.recipients?.some(
                        (r: any) => r.readAt
                      );
                      return (
                        <TableRow
                          key={msg.id}
                          className={isUnread ? "bg-muted/30" : ""}
                        >
                          <TableCell>
                            {isUnread ? (
                              <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                            ) : (
                              <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell
                            className={
                              isUnread
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {msg.sender?.name ?? "Unknown"}
                          </TableCell>
                          <TableCell className={isUnread ? "font-semibold" : ""}>
                            {msg.subject}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {msg.priority === "high" && (
                              <Badge variant="destructive" className="mr-2">
                                High Priority
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {inboxQuery.data && inboxQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {inboxQuery.data.page} of {inboxQuery.data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={inboxPage <= 1}
                  onClick={() => setInboxPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={inboxPage >= inboxQuery.data.totalPages}
                  onClick={() => setInboxPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>
                Send a new message to staff, parents, or students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComposeForm onClose={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !notifQuery.data?.notifications.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No notifications.
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifQuery.data.notifications.map((notif) => (
                      <TableRow
                        key={notif.id}
                        className={!notif.isRead ? "bg-muted/30" : ""}
                      >
                        <TableCell>
                          {!notif.isRead ? (
                            <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                          ) : (
                            <div className="h-2.5 w-2.5" />
                          )}
                        </TableCell>
                        <TableCell className={notif.isRead ? "" : "font-semibold"}>
                          {notif.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground line-clamp-1">
                          {notif.body}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {!notif.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                markNotifRead.mutate({ id: notif.id })
                              }
                            >
                              Mark Read
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {notifQuery.data && notifQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {notifQuery.data.page} of {notifQuery.data.totalPages}
                {notifQuery.data.unreadCount > 0 && (
                  <span className="ml-2">
                    ({notifQuery.data.unreadCount} unread)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notifPage <= 1}
                  onClick={() => setNotifPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notifPage >= notifQuery.data.totalPages}
                  onClick={() => setNotifPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notices" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              School-wide announcements and notices
            </p>
            <Button size="sm" onClick={() => setNoticeDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Notice
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noticeQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !noticeQuery.data?.notices.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No active notices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    noticeQuery.data.notices.map((notice) => (
                      <TableRow key={notice.id}>
                        <TableCell className="font-medium">
                          {notice.title}
                        </TableCell>
                        <TableCell>
                          {notice.category ? (
                            <Badge variant="secondary">{notice.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notice.targetRole ?? "Everyone"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(notice.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {notice.endDate
                            ? new Date(notice.endDate).toLocaleDateString()
                            : "No end date"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Notice</DialogTitle>
            <DialogDescription>
              Publish a school-wide announcement or notice.
            </DialogDescription>
          </DialogHeader>
          <CreateNoticeForm onClose={() => setNoticeDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
