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

function getCalendarAuth(subject?: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!clientEmail) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/calendar"],
    subject,
  });
}

function getGmailAuth(subject: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!clientEmail) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    subject,
  });
}

function getCalendarClient(subject?: string) {
  return google.calendar({
    version: "v3",
    auth: getCalendarAuth(subject),
  });
}

export async function getAvailableSlots(calendarId: string, date: string) {
  if (!isValidDateForBooking(date)) {
    throw new Error("Invalid booking date.");
  }

  const calendar = getCalendarClient(calendarId);
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

type SendHostBookingNotificationInput = CreateBookingEventInput & {
  htmlLink?: string;
  meetLink?: string;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buildHostNotificationEmail(input: SendHostBookingNotificationInput) {
  const endTime = addMinutesToTime(input.time, input.duration);
  const subject = sanitizeHeaderValue(`New booking: ${input.meetingType} with ${input.clientName}`);
  const clientName = sanitizeHeaderValue(input.clientName);
  const personName = sanitizeHeaderValue(input.personName);
  const clientEmail = sanitizeHeaderValue(input.clientEmail);
  const personEmail = sanitizeHeaderValue(input.personEmail);
  const safeMessage = input.message || "No message provided.";
  const safeCompany = input.companyName || "Not provided.";
  const details = [
    ["Client", input.clientName],
    ["Email", input.clientEmail],
    ["Phone", input.phoneNumber],
    ["Company", safeCompany],
    ["Meeting type", input.meetingType],
    ["Meeting time", `${input.date} at ${input.time} - ${endTime} SAST`],
    ["Google Meet", input.meetLink || "Google Meet link not available yet."],
    ["Calendar event", input.htmlLink || "Calendar event link not available."],
    ["Message", safeMessage],
  ];

  const htmlRows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(
          label
        )}</td><td style="padding:8px 12px;color:#374151;border-bottom:1px solid #e5e7eb">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");

  const textBody = [
    `New TeboaTech booking for ${input.personName}`,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    "This notification is sent immediately when a client books, even before they accept the calendar invite.",
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;background:#f6f3ef;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb">
        <p style="margin:0 0 8px;color:#1D7A4F;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">TeboaTech Booking</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#050505">New booking received</h1>
        <p style="margin:0 0 20px;color:#4b5563">A client booked a meeting with ${escapeHtml(
          input.personName
        )}. This is your immediate host notification.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${htmlRows}</table>
      </div>
    </div>
  `;

  const rawMessage = [
    `From: ${personName} <${personEmail}>`,
    `To: ${personEmail}`,
    `Reply-To: ${clientName} <${clientEmail}>`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="teboatech-booking-boundary"',
    "",
    "--teboatech-booking-boundary",
    "Content-Type: text/plain; charset=utf-8",
    "",
    textBody,
    "",
    "--teboatech-booking-boundary",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
    "",
    "--teboatech-booking-boundary--",
  ].join("\r\n");

  return encodeBase64Url(rawMessage);
}

function buildClientConfirmationEmail(input: SendHostBookingNotificationInput) {
  const endTime = addMinutesToTime(input.time, input.duration);
  const subject = sanitizeHeaderValue(
    `Booking confirmed: ${input.meetingType} with ${input.personName}`
  );
  const clientName = sanitizeHeaderValue(input.clientName);
  const personName = sanitizeHeaderValue(input.personName);
  const clientEmail = sanitizeHeaderValue(input.clientEmail);
  const personEmail = sanitizeHeaderValue(input.personEmail);
  const safeMessage = input.message || "No message provided.";
  const safeCompany = input.companyName || "Not provided.";
  const details = [
    ["Host", `${input.personName} (${input.personEmail})`],
    ["Meeting type", input.meetingType],
    ["Meeting time", `${input.date} at ${input.time} - ${endTime} SAST`],
    ["Google Meet", input.meetLink || "Google Meet link not available yet."],
    ["Calendar event", input.htmlLink || "Calendar event link not available."],
    ["Company", safeCompany],
    ["Message", safeMessage],
  ];

  const htmlRows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(
          label
        )}</td><td style="padding:8px 12px;color:#374151;border-bottom:1px solid #e5e7eb">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");

  const textBody = [
    `Hi ${input.clientName},`,
    "",
    "Your TeboaTech meeting is confirmed.",
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    "If the Google Calendar invite does not appear in your inbox, you can still use the Google Meet link above at the scheduled time.",
  ].join("\n");

  const meetButton = input.meetLink
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(
        input.meetLink
      )}" style="display:inline-block;background:#1D7A4F;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:800">Join Google Meet</a></p>`
    : "";

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;background:#f6f3ef;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb">
        <p style="margin:0 0 8px;color:#1D7A4F;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">TeboaTech Booking</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#050505">Your meeting is confirmed</h1>
        <p style="margin:0 0 20px;color:#4b5563">Hi ${escapeHtml(
          input.clientName
        )}, your booking with ${escapeHtml(input.personName)} is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${htmlRows}</table>
        ${meetButton}
        <p style="margin:20px 0 0;color:#6b7280;font-size:13px">A Google Calendar invite may also arrive separately. If it does not, this email is your confirmation.</p>
      </div>
    </div>
  `;

  const rawMessage = [
    `From: ${personName} <${personEmail}>`,
    `To: ${clientName} <${clientEmail}>`,
    `Reply-To: ${personName} <${personEmail}>`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="teboatech-client-booking-boundary"',
    "",
    "--teboatech-client-booking-boundary",
    "Content-Type: text/plain; charset=utf-8",
    "",
    textBody,
    "",
    "--teboatech-client-booking-boundary",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
    "",
    "--teboatech-client-booking-boundary--",
  ].join("\r\n");

  return encodeBase64Url(rawMessage);
}

export async function sendHostBookingNotificationEmail(
  input: SendHostBookingNotificationInput
) {
  const gmail = google.gmail({
    version: "v1",
    auth: getGmailAuth(input.personEmail),
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: buildHostNotificationEmail(input),
    },
  });
}

export async function sendClientBookingConfirmationEmail(
  input: SendHostBookingNotificationInput
) {
  const gmail = google.gmail({
    version: "v1",
    auth: getGmailAuth(input.personEmail),
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: buildClientConfirmationEmail(input),
    },
  });
}

export async function createBookingEvent(input: CreateBookingEventInput) {
  const calendar = getCalendarClient(input.personEmail);
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
    sendUpdates: "all",
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
      attendees: [
        { email: input.clientEmail, displayName: input.clientName },
        { email: input.personEmail, displayName: input.personName },
      ],
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
