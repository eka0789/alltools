"use client";

import { Printer } from "lucide-react";

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary !py-1.5 text-xs print:hidden"
    >
      <Printer className="h-3.5 w-3.5" />
      Cetak / Simpan PDF
    </button>
  );
}
