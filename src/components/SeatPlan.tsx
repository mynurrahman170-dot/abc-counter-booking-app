import type { SeatRow } from "@/lib/seats";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Props = {
  rows: SeatRow[];
  bookedMap: Map<string, { point: string; id: string; color?: string | undefined }>;
  selected: string[];
  onToggle: (seat: string) => void;
};

/** Bookable seats flank the aisle; the driver is a display-only position. */
export function SeatPlan({ rows, bookedMap, selected, onToggle }: Props) {
  const { t } = useI18n();
  const hasFrontExtra = rows[0]?.seats[0] === "EX-1";

  return (
    <div className="space-y-3">
      <div className="mx-auto w-fit max-w-full rounded-lg border-2 border-border bg-card/60 p-2 shadow-sm sm:p-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.letter} className="flex items-center gap-1">
              <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground sm:w-6">
                {row.letter}
              </span>
              <div className="grid grid-cols-[repeat(2,2.5rem)_0.75rem_repeat(3,2.5rem)] items-center gap-1 sm:grid-cols-[repeat(2,3rem)_1rem_repeat(3,3rem)] sm:gap-1.5">
              {row.seats.map((seat, idx) => {
                const booked = bookedMap.get(seat);
                const isSelected = selected.includes(seat);
                const isBackRow = row.seats.length === 5;
                const column = row.letter === "EX" ? 1 : isBackRow
                  ? [1, 2, 4, 5, 6][idx]
                  : [1, 2, 5, 6][idx];
                return (
                    <Button
                      key={seat}
                      type="button"
                      aria-label={`${t("seats")} ${seat}${booked ? ` — ${booked.point}` : ""}`}
                      aria-pressed={isSelected}
                      title={booked?.point}
                      onClick={() => onToggle(seat)}
                      disabled={Boolean(booked)}
                      className={`h-10 w-10 rounded-md border p-0 text-[10px] font-semibold transition-colors sm:w-12 sm:text-xs ${
                        booked
                          ? "cursor-not-allowed border-destructive bg-destructive text-destructive-foreground disabled:opacity-100"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:border-primary"
                      }`}
                      style={{ gridColumn: column, ...(booked?.color ? { background: booked.color, borderColor: booked.color, color: "white" } : {}) }}
                    >
                      {seat}
                    </Button>
                );
              })}
              {row.letter === "EX" && hasFrontExtra && (
                <span className="col-start-6 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted px-0.5 text-center text-[9px] font-semibold text-muted-foreground sm:w-12 sm:text-[10px]" aria-label={t("driver")}>
                  {t("driver")}
                </span>
              )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-input" /> {t("free")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary" /> {t("selected")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-destructive" /> {t("booked")}
        </span>
      </div>
    </div>
  );
}
