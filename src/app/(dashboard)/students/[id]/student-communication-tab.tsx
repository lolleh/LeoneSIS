"use client";

import { useState } from "react";
import { api } from "@/client/lib/trpc";
import { formatDate } from "@/client/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Label } from "@/client/components/ui/label";
import { Mail, MessageSquare, Plus, Send } from "lucide-react";

interface StudentCommunicationTabProps {
  student: any;
}

export function StudentCommunicationTab({ student }: StudentCommunicationTabProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState("direct");

  const emails = (student.personalEmails as string[]) ?? [];
  const phones = (student.personalPhones as string[]) ?? [];
  const familyMembers = student.familyMembers ?? [];
  const familyEmails = familyMembers.filter((fm: any) => fm.email).map((fm: any) => fm.email);

  const allRecipients = [...emails, ...familyEmails].filter(Boolean);

  const { data: messages, isLoading: messagesLoading } =
    api.communication.getMessages.useQuery({
      search: `${student.firstName} ${student.lastName}`,
      pageSize: 20,
    });

  const sendMessage = api.communication.sendMessage.useMutation({
    onSuccess: () => {
      setIsComposeOpen(false);
      setSubject("");
      setBody("");
    },
  });

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) return;
    sendMessage.mutate({
      subject,
      body,
      recipientIds: allRecipients.map(() => student.userId).filter(Boolean) as string[],
      messageType: messageType as any,
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Contact Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </span>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Recipients</Label>
                    <p className="text-sm text-muted-foreground">
                      {allRecipients.length > 0
                        ? allRecipients.join(", ")
                        : "No email addresses on file"}
                    </p>
                  </div>
                  <div>
                    <Label>Message Type</Label>
                    <Select value={messageType} onValueChange={setMessageType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct Message</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject"
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Enter your message"
                      rows={5}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={!subject.trim() || !body.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Student Emails</p>
              {emails.length === 0 ? (
                <p className="text-sm">—</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {emails.map((email, i) => (
                    <li key={i} className="text-sm">
                      {email}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone Numbers</p>
              {phones.length === 0 ? (
                <p className="text-sm">—</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {phones.map((phone, i) => (
                    <li key={i} className="text-sm">
                      {phone}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Guardian Emails</p>
              {familyEmails.length === 0 ? (
                <p className="text-sm">—</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {familyEmails.map((email, i) => (
                    <li key={i} className="text-sm">
                      {email}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Guardian Phones</p>
              {familyMembers.filter((fm: any) => fm.phone).length === 0 ? (
                <p className="text-sm">—</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {familyMembers
                    .filter((fm: any) => fm.phone)
                    .map((fm: any, i: number) => (
                      <li key={i} className="text-sm">
                        {fm.firstName} {fm.lastName}: {fm.phone}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !messages || messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg: any) => (
                  <TableRow key={msg.id}>
                    <TableCell>{formatDate(msg.createdAt)}</TableCell>
                    <TableCell className="font-medium">{msg.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{msg.messageType}</Badge>
                    </TableCell>
                    <TableCell>
                      {msg.recipients?.some((r: any) => r.readAt) ? (
                        <Badge variant="default">Read</Badge>
                      ) : (
                        <Badge variant="secondary">Unread</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
