import { NextRequest, NextResponse } from "next/server";
import { getBookingPerson } from "../../../../lib/bookingConfig";
import { getAvailableSlots } from "../../../../lib/googleCalendar";
import { isValidDateForBooking } from "../../../../lib/bookingUtils";

export async function GET(request: NextRequest) {
  const personSlug = request.nextUrl.searchParams.get("person")?.toLowerCase() ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const person = getBookingPerson(personSlug);

  if (!person) {
    return NextResponse.json({ error: "Unknown booking person." }, { status: 404 });
  }

  if (!isValidDateForBooking(date)) {
    return NextResponse.json(
      { error: "Please choose a valid weekday date that is not in the past." },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots(person.calendarId, date);
    return NextResponse.json({
      date,
      person: personSlug,
      slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load availability right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
