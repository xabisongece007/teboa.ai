export type BookingPersonSlug = keyof typeof bookingPeople;

export const bookingPeople = {
  xabiso: {
    name: "Xabiso Ngece",
    role: "Technical Director",
    email: "xabiso@teboatech.com",
    avatar: "/avatars/xabiso.png",
    meetingDuration: 30,
    calendarId: "xabiso@teboatech.com",
  },
  latita: {
    name: "Latita Benya",
    role: "Marketing Director",
    email: "latita@teboatech.com",
    avatar: "/avatars/latita.jpg",
    meetingDuration: 30,
    calendarId: "latita@teboatech.com",
  },
} as const;

export function getBookingPerson(person: string) {
  return bookingPeople[person as BookingPersonSlug] ?? null;
}
