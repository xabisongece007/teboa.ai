import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";
import styles from "./booking.module.css";
import { getBookingPerson } from "../../../lib/bookingConfig";
import { getTodayInSast } from "../../../lib/bookingUtils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ person: string }>;
}) {
  const { person } = await params;
  const bookingPerson = getBookingPerson(person);

  if (!bookingPerson) {
    return {
      title: "Booking",
    };
  }

  return {
    title: `Book with ${bookingPerson.name}`,
    description: `Book a ${bookingPerson.meetingDuration}-minute TeboaTech meeting with ${bookingPerson.name}, ${bookingPerson.role}.`,
    alternates: {
      canonical: `https://teboatech.com/bookings/${person}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ person: string }>;
}) {
  const { person } = await params;
  const bookingPerson = getBookingPerson(person);

  if (!bookingPerson) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Link className={styles.brand} href="/" aria-label="Go to TeboaTech homepage">
          <img src="/assets/images/teboa-logo.png" alt="TeboaTech logo" width="52" height="52" />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>TeboaTech</span>
            <span className={styles.brandSub}>Meeting Booking</span>
          </span>
        </Link>

        <section className={styles.card}>
          <aside className={styles.personPanel}>
            <span className={styles.eyebrow}>TeboaTech booking</span>
            <img
              src={bookingPerson.avatar}
              alt={bookingPerson.name}
              className={styles.personAvatar}
              width="136"
              height="136"
            />
            <h1>{bookingPerson.name}</h1>
            <p className={styles.personRole}>{bookingPerson.role}</p>
            <p className={styles.personCopy}>
              Book a focused TeboaTech session for strategy, implementation, support, or
              next-step planning. Your invite will include a Google Meet link automatically.
            </p>

            <div className={styles.personMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Duration</span>
                <span className={styles.metaValue}>
                  {bookingPerson.meetingDuration} minutes
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Timezone</span>
                <span className={styles.metaValue}>09:00 - 21:30 SAST</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Email</span>
                <span className={styles.metaValue}>{bookingPerson.email}</span>
              </div>
            </div>
          </aside>

          <BookingForm
            person={bookingPerson}
            personSlug={person}
            todayInSast={getTodayInSast()}
          />
        </section>
      </div>
    </main>
  );
}
