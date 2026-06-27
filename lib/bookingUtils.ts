import { bookingPeople } from "./bookingConfig";

export const BOOKING_TIME_ZONE = "Africa/Johannesburg";
export const SLOT_INTERVAL_MINUTES = 30;
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 17;
const SAST_OFFSET_HOURS = 2;

export type BookingSlot = {
  available: boolean;
  label: string;
  time: string;
};

export function getBookingPeopleEntries() {
  return Object.entries(bookingPeople);
}

export function getTodayInSast() {
  const now = new Date();
  const sastMs = now.getTime() + SAST_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date(sastMs).toISOString().slice(0, 10);
}

export function isWeekdayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function isPastDateInSast(date: string) {
  return date < getTodayInSast();
}

export function isValidDateForBooking(date: string) {
  return Boolean(date) && !isPastDateInSast(date) && isWeekdayDate(date);
}

export function buildDailySlots(): BookingSlot[] {
  const slots: BookingSlot[] = [];

  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      slots.push({
        available: true,
        label: time,
        time,
      });
    }
  }

  return slots;
}

export function createSlotsWithAvailability(unavailableTimes: Set<string>) {
  return buildDailySlots().map((slot) => ({
    ...slot,
    available: !unavailableTimes.has(slot.time),
  }));
}

export function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number) {
  const safeMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutesToAdd: number) {
  return formatMinutesToTime(parseTimeToMinutes(time) + minutesToAdd);
}

export function toUtcDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours - SAST_OFFSET_HOURS, minutes));
}

export function formatBookingDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatBookingSummary(date: string, time: string, duration: number) {
  const endTime = addMinutesToTime(time, duration);
  return `${formatBookingDate(date)} at ${time} - ${endTime} SAST`;
}

export function ensureValidSlotTime(time: string) {
  return buildDailySlots().some((slot) => slot.time === time);
}
