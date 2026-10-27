// Calendar values use the same explicit Asunción zone already shown by the app.
export function localParts(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: get("hour"),
    minute: get("minute"),
  };
}
export function calendarInstant(
  day: string,
  edge: "from" | "to" | "instant",
  hour = "00",
  minute = "00",
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day
  )
    throw new Error("Seleccioná una fecha válida.");
  const clock =
    edge === "from"
      ? "00:00:00.000"
      : edge === "to"
        ? "23:59:59.999"
        : `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00.000`;
  if (
    edge === "instant" &&
    (!/^\d{1,2}$/.test(hour) ||
      !/^\d{1,2}$/.test(minute) ||
      +hour > 23 ||
      +minute > 59)
  )
    throw new Error("Revisá la hora y los minutos.");
  return new Date(`${day}T${clock}-03:00`).toISOString();
}
export function monthDays(year: number, month: number) {
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month, i - offset + 1));
    return {
      day: d.toISOString().slice(0, 10),
      number: d.getUTCDate(),
      current: d.getUTCMonth() === month,
    };
  });
}
