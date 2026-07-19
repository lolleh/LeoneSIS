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
import { StickyNote, MessageSquare, Plus, Trash2 } from "lucide-react";

interface StudentActivitiesTabProps {
  student: any;
}

export function StudentActivitiesTab({ student }: StudentActivitiesTabProps) {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentCategory, setCommentCategory] = useState("general");
  const [noteType, setNoteType] = useState("activity");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const comments = student.comments ?? [];
  const notes = student.notes ?? [];
  const documents = student.documents ?? [];

  const utils = api.useUtils();

  const addComment = api.student.addComment.useMutation({
    onSuccess: () => {
      setIsCommentOpen(false);
      setCommentText("");
      utils.student.getById.invalidate({ id: student.id });
    },
  });

  const addNote = api.student.addNote.useMutation({
    onSuccess: () => {
      setIsNoteOpen(false);
      setNoteSubject("");
      setNoteBody("");
      utils.student.getById.invalidate({ id: student.id });
    },
  });

  const deleteComment = api.student.deleteComment.useMutation({
    onSuccess: () => utils.student.getById.invalidate({ id: student.id }),
  });

  const deleteNote = api.student.deleteNote.useMutation({
    onSuccess: () => utils.student.getById.invalidate({ id: student.id }),
  });

  return (
    <div className="mt-4 space-y-4">
      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Teacher Comments
            </span>
            <Dialog open={isCommentOpen} onOpenChange={setIsCommentOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Comment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={commentCategory} onValueChange={setCommentCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="behavior">Behavior</SelectItem>
                        <SelectItem value="participation">Participation</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comment</Label>
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Enter your comment"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCommentOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        addComment.mutate({
                          studentId: student.id,
                          comment: commentText,
                          category: commentCategory,
                          isInternal: true,
                        })
                      }
                      disabled={!commentText.trim() || addComment.isPending}
                    >
                      {addComment.isPending ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{comment.category ?? "General"}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {comment.user?.firstName} {comment.user?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteComment.mutate({ id: comment.id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Activity Notes
            </span>
            <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Note Type</Label>
                    <Select value={noteType} onValueChange={setNoteType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activity">Activity</SelectItem>
                        <SelectItem value="intervention">Intervention</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="progress">Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={noteSubject}
                      onChange={(e) => setNoteSubject(e.target.value)}
                      placeholder="Enter subject"
                    />
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Enter your note"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNoteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        addNote.mutate({
                          studentId: student.id,
                          noteType,
                          subject: noteSubject || undefined,
                          body: noteBody,
                        })
                      }
                      disabled={!noteBody.trim() || addNote.isPending}
                    >
                      {addNote.isPending ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note: any) => (
                <div
                  key={note.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{note.noteType}</Badge>
                      {note.subject && (
                        <span className="font-medium text-sm">{note.subject}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        by {note.user?.firstName} {note.user?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNote.mutate({ id: note.id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
