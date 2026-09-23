import type { SeatRow } from "@/lib/seats";
import { useI18n } from "@/lib/i18n";

type Props = {
  rows: SeatRow[];
  bookedMap: Map<string, { point: string; id: string; color?: string }>;
  selected: string[];
  onToggle: (seat: string) => void;
};

/** Bus-shaped seat plan: 2 + aisle + 2 per row, booked seats in red for everyone. */
export function SeatPlan({ rows, bookedMap, selected, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("driver")}
        </span>
      </div>

      <div className="mx-auto w-fit rounded-[2rem] border-2 border-border bg-card/60 p-4 shadow-sm">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.letter} className="flex items-center gap-1.5">
              <span className="w-5 text-center text-[11px] font-semibold text-muted-foreground">
                {row.letter}
              </span>
              {row.seats.map((seat, idx) => {
                const booked = bookedMap.get(seat);
                const isSelected = selected.includes(seat);
                return (
                  <span key={seat} className="flex items-center">
                    {idx === 2 && (
                      <span className="mx-1 w-4 text-center text-xs text-muted-foreground">⋮</span>
                    )}
                    <button
                      type="button"
                      aria-label={`${t("seats")} ${seat}${booked ? ` — ${booked.point}` : ""}`}
                      aria-pressed={isSelected}
                      title={booked?.point}
                      onClick={() => onToggle(seat)}
                      disabled={Boolean(booked)}
                      style={booked?.color ? { background: booked.color, borderColor: booked.color, color: "white" } : undefined}
                      className={`h-10 w-12 rounded-lg border text-xs font-semibold transition-colors ${
                        booked
                          ? "cursor-not-allowed border-destructive bg-destructive text-destructive-foreground"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      {seat}
                    </button>
                  </span>
                );
              })}
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
