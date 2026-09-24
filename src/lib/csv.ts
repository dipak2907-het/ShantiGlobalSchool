function escapeValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const contents = [headers, ...rows].map((row) => row.map(escapeValue).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
