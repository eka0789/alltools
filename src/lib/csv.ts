// Minimal RFC 4180 CSV writer used by /admin/export. Values are quoted only
// when needed; newlines and quotes are escaped, and a UTF-8 BOM is prepended
// by the route so Excel opens Indonesian text correctly.

export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Formula-injection guard: a cell starting with = + - @ would execute in
  // spreadsheet apps. Prefix with a single quote (OWASP recommendation).
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
