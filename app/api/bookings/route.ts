import { NextRequest, NextResponse } from "next/server";
import { getBookingPerson } from "../../../lib/bookingConfig";
import { createBookingEvent, isCalendarSlotAvailable } from "../../../lib/googleCalendar";
import {
  BOOKING_TIME_ZONE,
  ensureValidSlotTime,
  formatBookingSummary,
  isValidDateForBooking,
} from "../../../lib/bookingUtils";

const EMAILJS_PUBLIC_KEY = "lpQfXBJ7ggrYgNwOo";
const EMAILJS_SERVICE_ID = "service_ut221yn";
const EMAILJS_BOOKING_TEMPLATE_ID = process.env.EMAILJS_BOOKING_TEMPLATE_ID?.trim() ?? "";

type BookingPayload = {
  companyName?: string;
  date: string;
  email: string;
  fullName: string;
  meetingType: "Discovery Call" | "Strategy Session" | "Support";
  message?: string;
  person: string;
  phoneNumber: string;
  time: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Google Calendar setup:
 * The service account email in GOOGLE_SERVICE_ACCOUNT_EMAIL must be added to each
 * team member calendar with "Make changes to events" permission, otherwise
 * availability checks and event creation will fail.
 */
export async function POST(request: NextRequest) {
  let payload: BookingPayload;

  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const fullName = payload.fullName?.trim();
  const email = payload.email?.trim().toLowerCase();
  const phoneNumber = payload.phoneNumber?.trim();
  const date = payload.date?.trim();
  const time = payload.time?.trim();
  const meetingType = payload.meetingType;
  const personSlug = payload.person?.trim().toLowerCase();
  const companyName = payload.companyName?.trim() ?? "";
  const message = payload.message?.trim() ?? "";
  const person = getBookingPerson(personSlug);

  if (!person) {
    return NextResponse.json({ error: "Unknown booking person." }, { status: 404 });
  }

  if (!fullName || !email || !phoneNumber || !date || !time || !meetingType) {
    return NextResponse.json(
      { error: "Please complete all required booking fields." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!isValidDateForBooking(date)) {
    return NextResponse.json(
      { error: "Please choose a valid weekday date that is not in the past." },
      { status: 400 }
    );
  }

  if (!ensureValidSlotTime(time)) {
    return NextResponse.json({ error: "Please choose a valid time slot." }, { status: 400 });
  }

  try {
    const slotAvailable = await isCalendarSlotAvailable(
      person.calendarId,
      date,
      time,
      person.meetingDuration
    );

    if (!slotAvailable) {
      return NextResponse.json(
        { error: "That slot has already been taken. Please choose another time." },
        { status: 409 }
      );
    }

    const booking = await createBookingEvent({
      calendarId: person.calendarId,
      clientEmail: email,
      clientName: fullName,
      companyName,
      date,
      duration: person.meetingDuration,
      meetingType,
      message,
      personEmail: person.email,
      personName: person.name,
      phoneNumber,
      time,
    });

    const bookingEmailConfigured = Boolean(EMAILJS_BOOKING_TEMPLATE_ID);
    const bookingEmailWarning = bookingEmailConfigured
      ? ""
      : "The meeting was booked, but the dedicated booking confirmation email is not configured yet.";

    return NextResponse.json({
      duration: person.meetingDuration,
      eventId: booking.eventId,
      htmlLink: booking.htmlLink,
      meetLink: booking.meetLink,
      emailjs: bookingEmailConfigured
        ? {
            publicKey: EMAILJS_PUBLIC_KEY,
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_BOOKING_TEMPLATE_ID,
          }
        : undefined,
      person: {
        email: person.email,
        name: person.name,
        role: person.role,
      },
      summary: formatBookingSummary(date, time, person.meetingDuration),
      timeZone: BOOKING_TIME_ZONE,
      warning: bookingEmailWarning || undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while booking the meeting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
