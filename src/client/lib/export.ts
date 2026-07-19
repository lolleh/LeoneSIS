import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel({
  data,
  columns,
  fileName,
  sheetName = "Sheet1",
}: {
  data: Record<string, any>[];
  columns: ExportColumn[];
  fileName: string;
  sheetName?: string;
}) {
  const wsData = [
    columns.map((c) => c.header),
    ...data.map((row) => columns.map((c) => row[c.key] ?? "")),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  if (columns.some((c) => c.width)) {
    ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 15 }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function generateImportTemplate(columns: ExportColumn[], fileName: string) {
  const wsData = [columns.map((c) => c.header)];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  if (columns.some((c) => c.width)) {
    ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 15 }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `${fileName}_template.xlsx`);
}
