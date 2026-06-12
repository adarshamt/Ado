const pad = (value: number) => String(value).padStart(2, "0");

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeKey(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateAndTime(dateKey: string, timeKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = timeKey.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function formatDateLabel(dateKey: string) {
  return fromDateAndTime(dateKey, "00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatTimeLabel(timeKey: string) {
  return fromDateAndTime(toDateKey(new Date()), timeKey).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function isToday(dateKey: string) {
  return dateKey === toDateKey(new Date());
}

export function isUpcoming(dateKey: string, timeKey: string) {
  return fromDateAndTime(dateKey, timeKey).getTime() >= Date.now();
}

export function isPast(dateKey: string, timeKey: string) {
  return fromDateAndTime(dateKey, timeKey).getTime() < Date.now();
}
