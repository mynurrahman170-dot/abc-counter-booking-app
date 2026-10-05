import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { escapeHtml, printDocument } from "@/lib/print";

export type TicketData = {
  ticketNo: string;
  pointName: string;
  route: string;
  date: string;
  time: string;
  vehicle: string;
  seats: string[];
  passengerName: string;
  passengerPhone: string;
  destination?: string;
  farePerSeat: number;
  amount: number;
};

export function TicketDialog({
  ticket,
  onClose,
}: {
  ticket: TicketData | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!ticket) return null;

  const rows: [string, string][] = [
    [t("ticketNo"), ticket.ticketNo],
    [t("bookingPoint"), ticket.pointName],
    [t("route"), ticket.route],
    [t("date"), ticket.date],
    [t("departureTime"), ticket.time],
    [t("vehicleNumber"), ticket.vehicle],
    [t("seats"), ticket.seats.join(", ")],
    [t("passengerName"), ticket.passengerName || "—"],
    [t("passengerPhone"), ticket.passengerPhone || "—"],
    [t("destination"), ticket.destination || "—"],
    [t("farePerSeat"), `৳${ticket.farePerSeat}`],
  ];

  function print() {
    if (!ticket) return;
    const copy = (label: string) => `<div class="ticket"><h1>${escapeHtml(t("appName"))}</h1>
      <div class="copy">${escapeHtml(label)}</div>
      ${rows.map(([k, v]) => `<div class="row"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}
      <div class="row total"><span>${escapeHtml(t("totalAmount"))}</span><span>৳${escapeHtml(ticket.amount)}</span></div>
    </div>`;
    const body = `${copy(t("passengerCopy"))}<div class="cut">✂ - - - - - - - - - - - -</div>${copy(t("officeCopy"))}`;
    printDocument(`${t("ticketReceipt")} ${ticket.ticketNo}`, body, { pos: true });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bookingConfirmed")}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-dashed border-border p-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <span className="text-muted-foreground">{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>{t("totalAmount")}</span>
            <span>৳{ticket.amount}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button onClick={print}>{t("print")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
