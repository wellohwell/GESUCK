import dayjs from "dayjs";

export const PASARAN = ["Wage", "Kliwon", "Legi", "Pahing", "Pon"];
export const DAYS_INDONESIA = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Calculates the Javanese Pasaran for a given date.
 * We use 2024-01-01 (Monday Pahing) as reference.
 * Wait, let's use a more conventional reference:
 * 1970-01-01 was Thursday Wage.
 */
export function getJavaneseDate(date: Date) {
  const reference = dayjs("1970-01-01"); // Thursday Wage
  const target = dayjs(date);
  const diffDays = Math.floor(target.diff(reference, "day"));
  
  // 1970-01-01 was Wage (index 0 in our PASARAN list)
  const pasaranIndex = ((diffDays % 5) + 5) % 5;
  const pasaran = PASARAN[pasaranIndex];
  
  const dayIndex = target.day();
  const dayName = DAYS_INDONESIA[dayIndex];
  
  return {
    dayName,
    pasaran,
    fullDate: target.format("DD MMMM YYYY"),
    isoDate: target.format("YYYY-MM-DD")
  };
}

/**
 * Returns the "Active Date" for the system.
 * Before 17:00 -> Today
 * After 17:00 -> Tomorrow
 */
export function getActiveSystemDate() {
  const now = dayjs();
  const cutoff = dayjs().hour(17).minute(0).second(0).millisecond(0);
  
  const targetDate = now.isAfter(cutoff) ? now.add(1, "day") : now;
  const isTomorrow = now.isAfter(cutoff);
  
  return {
    ...getJavaneseDate(targetDate.toDate()),
    isTomorrow
  };
}
