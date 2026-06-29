import { google } from "googleapis";
import {
  addMinutesToTime,
  BOOKING_TIME_ZONE,
  buildDailySlots,
  createSlotsWithAvailability,
  isValidDateForBooking,
  parseTimeToMinutes,
  toUtcDate,
} from "./bookingUtils";

function getPrivateKey() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }

  return privateKey.replace(/\\n/g, "\n");
}

function getCalendarAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!clientEmail) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function getCalendarClient() {
  return google.calendar({
    version: "v3",
    auth: getCalendarAuth(),
  });
}

export async function getAvailableSlots(calendarId: string, date: string) {
  if (!isValidDateForBooking(date)) {
    throw new Error("Invalid booking date.");
  }

  const calendar = getCalendarClient();
  const dayStart = toUtcDate(date, "00:00").toISOString();
  const dayEnd = toUtcDate(date, "23:59").toISOString();

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      items: [{ id: calendarId }],
      timeMax: dayEnd,
      timeMin: dayStart,
      timeZone: BOOKING_TIME_ZONE,
    },
  });

  const busy = freeBusyResponse.data.calendars?.[calendarId]?.busy ?? [];
  const unavailableTimes = new Set<string>();
  const allSlots = buildDailySlots();

  for (const slot of allSlots) {
    const slotStart = toUtcDate(date, slot.time);
    const slotEnd = toUtcDate(date, addMinutesToTime(slot.time, 30));

    const overlapsBusyWindow = busy.some((window) => {
      if (!window.start || !window.end) {
        return false;
      }

      const busyStart = new Date(window.start);
      const busyEnd = new Date(window.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (overlapsBusyWindow) {
      unavailableTimes.add(slot.time);
    }
  }

  return createSlotsWithAvailability(unavailableTimes);
}

export async function isCalendarSlotAvailable(
  calendarId: string,
  date: string,
  time: string,
  duration: number
) {
  const availableSlots = await getAvailableSlots(calendarId, date);
  const requiredEndMinutes = parseTimeToMinutes(time) + duration;

  return availableSlots.some((slot) => {
    if (!slot.available || slot.time !== time) {
      return false;
    }

    const slotEndMinutes = parseTimeToMinutes(slot.time) + 30;
    return slotEndMinutes >= requiredEndMinutes;
  });
}

type CreateBookingEventInput = {
  calendarId: string;
  clientEmail: string;
  clientName: string;
  companyName?: string;
  date: string;
  meetingType: string;
  message?: string;
  personEmail: string;
  personName: string;
  phoneNumber: string;
  time: string;
  duration: number;
};

export async function createBookingEvent(input: CreateBookingEventInput) {
  const calendar = getCalendarClient();
  const startDate = toUtcDate(input.date, input.time);
  const endDate = toUtcDate(input.date, addMinutesToTime(input.time, input.duration));

  const details = [
    `Client: ${input.clientName}`,
    `Email: ${input.clientEmail}`,
    `Phone: ${input.phoneNumber}`,
    input.companyName ? `Company: ${input.companyName}` : null,
    input.message ? `Message: ${input.message}` : null,
    `Assigned Teboa host: ${input.personName} (${input.personEmail})`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await calendar.events.insert({
    calendarId: input.calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: `${input.meetingType} with ${input.clientName} - TeboaTech`,
      description: details,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: BOOKING_TIME_ZONE,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: BOOKING_TIME_ZONE,
      },
      conferenceData: {
        createRequest: {
          requestId: `teboatech-${input.calendarId}-${input.date}-${input.time}`.replace(
            /[^a-zA-Z0-9-]/g,
            "-"
          ),
        },
      },
    },
  });

  return {
    eventId: response.data.id ?? "",
    htmlLink: response.data.htmlLink ?? "",
    meetLink:
      response.data.hangoutLink ??
      response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")
        ?.uri ??
      "",
  };
}
