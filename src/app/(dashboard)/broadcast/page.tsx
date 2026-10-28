"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Mail, MessageSquare, Search, Send, Settings } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/client/components/ui/label";
import { cn } from "@/client/lib/utils";

interface BroadcastGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  messageCount: number;
  members?: { id: string; name: string }[];
}

interface BroadcastMessage {
  id: string;
  subject: string;
  groupName: string;
  sentDate: string;
  sentViaEmail: boolean;
  sentViaApp: boolean;
  body: string;
  groupId: string;
}

export default function BroadcastPage() {
  const [tab, setTab] = useState("groups");
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<BroadcastGroup | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<BroadcastGroup | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [groupForm, setGroupForm] = useState({ name: "", description: "", memberIds: [] as string[] });
  const [msgForm, setMsgForm] = useState({ groupId: "", subject: "", body: "", sendEmail: true, sendApp: true });

  const [emailConfig, setEmailConfig] = useState({
    provider: "smtp",
    host: "",
    port: "587",
    username: "",
    password: "",
    senderEmail: "",
    senderName: "",
    tls: true,
    apiKey: "",
    apiSecret: "",
  });

  const { data: groups = [], isLoading: loadingGroups } = api.broadcast?.listGroups?.useQuery() ?? { data: [], isLoading: false };
  const { data: messages = [], isLoading: loadingMessages } = api.broadcast?.listMessages?.useQuery() ?? { data: [], isLoading: false };
  const { data: users = [] } = api.staff?.list?.useQuery({ pageSize: 9999 }) ?? { data: [] };

  const filteredUsers = (users as any[]).filter((u: any) =>
    u.name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcast Communication"
        description="Manage groups and send messages to users"
        actions={
          <Button onClick={() => {
            setMsgForm({ groupId: "", subject: "", body: "", sendEmail: true, sendApp: true });
            setComposeOpen(true);
          }}>
            <Plus className="h-4 w-4" /> New Message
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
            <Button
              size="sm"
              onClick={() => {
                setGroupForm({ name: "", description: "", memberIds: [] });
                setEditGroup(null);
                setGroupFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </div>

          {loadingGroups ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">No groups yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">Create a group to start broadcasting messages.</p>
                <Button onClick={() => { setGroupForm({ name: "", description: "", memberIds: [] }); setGroupFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> Create Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group: BroadcastGroup) => (
                <Card
                  key={group.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:border-primary/50",
                    selectedGroup?.id === group.id && "border-primary"
                  )}
                  onClick={() => setSelectedGroup(group)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{group.description || "No description"}</p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setGroupForm({ name: group.name, description: group.description, memberIds: [] });
                            setEditGroup(group);
                            setGroupFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteGroupConfirm(group.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {group.memberCount} members</span>
                      <span className="flex items-center gap-1"><Send className="h-3.5 w-3.5" /> {group.messageCount} messages</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedGroup && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedGroup.name} - Members</CardTitle>
                <CardDescription>{selectedGroup.memberCount} members in this group</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedGroup.members && selectedGroup.members.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedGroup.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {m.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No members in this group yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMessages ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-1 text-lg font-semibold">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">Compose your first broadcast message.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Via</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg: BroadcastMessage) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.subject}</TableCell>
                        <TableCell>{msg.groupName}</TableCell>
                        <TableCell>{new Date(msg.sentDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {msg.sentViaEmail && <Badge variant="default">Email</Badge>}
                            {msg.sentViaApp && <Badge variant="secondary">App</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteMsgConfirm(msg.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Email Configuration
          </CardTitle>
          <CardDescription>Configure how broadcast emails are sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={emailConfig.provider} onValueChange={(v) => setEmailConfig({ ...emailConfig, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="api">API (SendGrid, Mailgun, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {emailConfig.provider === "smtp" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  placeholder="smtp.example.com"
                  value={emailConfig.host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  placeholder="587"
                  value={emailConfig.port}
                  onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={emailConfig.username}
                  onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEmailConfig({ ...emailConfig, tls: !emailConfig.tls })}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      emailConfig.tls ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        emailConfig.tls ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium">Enable TLS</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  value={emailConfig.apiKey}
                  onChange={(e) => setEmailConfig({ ...emailConfig, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input
                  type="password"
                  value={emailConfig.apiSecret}
                  onChange={(e) => setEmailConfig({ ...emailConfig, apiSecret: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sender Email</Label>
              <Input
                type="email"
                placeholder="noreply@school.com"
                value={emailConfig.senderEmail}
                onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sender Name</Label>
              <Input
                placeholder="School Name"
                value={emailConfig.senderName}
                onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => { /* api.broadcast.saveEmailConfig.mutate(emailConfig) */ }}>
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Group Dialog */}
      <Dialog open={groupFormOpen} onOpenChange={(open) => { if (!open) { setGroupFormOpen(false); setEditGroup(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>{editGroup ? "Update group details." : "Create a new broadcast group."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. All Parents"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Group description..."
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredUsers.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">No users found</p>
                ) : (
                  filteredUsers.map((user: any) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={groupForm.memberIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupForm({ ...groupForm, memberIds: [...groupForm.memberIds, user.id] });
                          } else {
                            setGroupForm({ ...groupForm, memberIds: groupForm.memberIds.filter((id) => id !== user.id) });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGroupFormOpen(false); setEditGroup(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (editGroup) {
                // api.broadcast.updateGroup.mutate({ id: editGroup.id, ...groupForm });
              } else {
                // api.broadcast.createGroup.mutate(groupForm);
              }
              setGroupFormOpen(false);
              setEditGroup(null);
            }}>
              {editGroup ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={(open) => { if (!open) setComposeOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>Send a broadcast message to a group.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={msgForm.groupId} onValueChange={(v) => setMsgForm({ ...msgForm, groupId: v })}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(groups as BroadcastGroup[]).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Message subject"
                value={msgForm.subject}
                onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Write your message..."
                value={msgForm.body}
                onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setMsgForm({ ...msgForm, sendEmail: !msgForm.sendEmail })}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    msgForm.sendEmail ? "bg-primary" : "bg-input"
                  )}
                >
                  <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform", msgForm.sendEmail ? "translate-x-4" : "translate-x-0")} />
                </button>
                <span className="text-sm font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setMsgForm({ ...msgForm, sendApp: !msgForm.sendApp })}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    msgForm.sendApp ? "bg-primary" : "bg-input"
                  )}
                >
                  <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform", msgForm.sendApp ? "translate-x-4" : "translate-x-0")} />
                </button>
                <span className="text-sm font-medium flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> App</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              // api.broadcast.sendMessage.mutate(msgForm);
              setComposeOpen(false);
            }}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog open={!!deleteGroupConfirm} onOpenChange={(open) => { if (!open) setDeleteGroupConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>Are you sure? This will permanently remove the group and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              // api.broadcast.deleteGroup.mutate({ id: deleteGroupConfirm! });
              setDeleteGroupConfirm(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation */}
      <Dialog open={!!deleteMsgConfirm} onOpenChange={(open) => { if (!open) setDeleteMsgConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>Are you sure you want to delete this message?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMsgConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              // api.broadcast.deleteMessage.mutate({ id: deleteMsgConfirm! });
              setDeleteMsgConfirm(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
