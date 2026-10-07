/** Opens a clean print window; the browser's print dialog can save it as PDF. */
export function printDocument(title: string, bodyHtml: string, opts: { pos?: boolean } = {}) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html>
<html lang="bn"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, "Segoe UI", "Noto Sans Bengali", sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 20px 0 8px; }
  .muted { color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; }
  tfoot td { font-weight: 700; background: #f8fafc; }
  .ticket { border: 1px dashed #333; padding: 16px; max-width: 420px; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
  .total { border-top: 1px solid #333; margin-top: 8px; padding-top: 8px; font-weight: 700; }
  @media print { body { margin: 10mm; } }
  ${opts.pos ? `@page { size: 58mm auto; margin: 2mm; }
  html { width: 58mm; }
  body { width: 54mm; margin: 0 auto; font-size: 11px; }
  .ticket { max-width: none; width: 100%; padding: 4px; border: 1px dashed #000; break-inside: avoid; }
  .ticket h1 { font-size: 14px; text-align: center; }
  .copy { text-align: center; font-weight: 700; border: 1px solid #000; padding: 2px; margin: 4px 0; }
  .row { font-size: 11px; gap: 4px; align-items: flex-start; }
  .row > span:first-child { flex: 0 0 42%; }
  .row > strong, .row > span:last-child { min-width: 0; overflow-wrap: anywhere; text-align: right; }
  .cut { border-top: 1px dashed #000; margin: 10px 0; text-align: center; font-size: 10px; }
  @media print { body { margin: 0 auto; } }` : ""}
</style></head><body>${bodyHtml}
<script>window.onload = function(){ window.focus(); window.print(); };</script>
</body></html>`);
  win.document.close();
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
