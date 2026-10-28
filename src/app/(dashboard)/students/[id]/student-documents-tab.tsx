"use client";

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
import { FileText, Download, Upload } from "lucide-react";

interface StudentDocumentsTabProps {
  student: any;
}

export function StudentDocumentsTab({ student }: StudentDocumentsTabProps) {
  const documents = student.documents ?? [];

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "birth_certificate":
        return "default";
      case "medical_record":
        return "secondary";
      case "report_card":
        return "outline";
      case "transcript":
        return "outline";
      case "photo":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Student Documents
            </span>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Upload documents like birth certificates, medical records, or report cards.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.fileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryColor(doc.category)}>
                        {doc.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
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
