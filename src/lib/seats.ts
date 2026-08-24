const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type SeatRow = { letter: string; seats: string[] };

/** Builds a bus-style seat plan: rows of 4 seats (2 + aisle + 2). */
export function buildSeatRows(totalSeats: number): SeatRow[] {
  const total = Math.max(1, Math.min(totalSeats || 44, 104));
  const rows: SeatRow[] = [];
  let placed = 0;
  for (let r = 0; placed < total && r < ROW_LETTERS.length; r += 1) {
    const letter = ROW_LETTERS[r]!;
    const seats: string[] = [];
    for (let i = 1; i <= 4 && placed < total; i += 1) {
      seats.push(`${letter}${i}`);
      placed += 1;
    }
    rows.push({ letter, seats });
  }
  return rows;
}
