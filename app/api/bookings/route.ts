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
const EMAILJS_TEMPLATE_ID = "template_6ps8xqd";

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

async function sendConfirmationEmail({
  clientEmail,
  clientName,
  date,
  duration,
  meetLink,
  personName,
  time,
}: {
  clientEmail: string;
  clientName: string;
  date: string;
  duration: number;
  meetLink: string;
  personName: string;
  time: string;
}) {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: clientEmail,
        email: clientEmail,
        user_email: clientEmail,
        from_email: "support@teboatech.com",
        from_name: "TeboaTech",
        name: clientName,
        first_name: clientName.split(" ")[0] ?? clientName,
        reply_to: "support@teboatech.com",
        booking_summary: formatBookingSummary(date, time, duration),
        booking_date: date,
        booking_time: `${time} SAST`,
        booking_duration: `${duration} minutes`,
        meeting_with: personName,
        meet_link: meetLink,
        support_email: "support@teboatech.com",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Confirmation email could not be sent.");
  }
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

    let confirmationWarning = "";

    try {
      await sendConfirmationEmail({
        clientEmail: email,
        clientName: fullName,
        date,
        duration: person.meetingDuration,
        meetLink: booking.meetLink,
        personName: person.name,
        time,
      });
    } catch {
      confirmationWarning =
        "The meeting was booked, but the extra confirmation email could not be sent.";
    }

    return NextResponse.json({
      duration: person.meetingDuration,
      eventId: booking.eventId,
      htmlLink: booking.htmlLink,
      meetLink: booking.meetLink,
      person: {
        email: person.email,
        name: person.name,
        role: person.role,
      },
      summary: formatBookingSummary(date, time, person.meetingDuration),
      timeZone: BOOKING_TIME_ZONE,
      warning: confirmationWarning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while booking the meeting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
