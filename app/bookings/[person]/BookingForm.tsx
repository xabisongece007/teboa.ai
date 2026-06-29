"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./booking.module.css";

type PersonConfig = {
  email: string;
  meetingDuration: number;
  name: string;
  role: string;
};

type Slot = {
  available: boolean;
  label: string;
  time: string;
};

type BookingFormProps = {
  person: PersonConfig;
  personSlug: string;
  todayInSast: string;
};

type BookingResponse = {
  eventId: string;
  meetLink: string;
  person: {
    name: string;
    role: string;
  };
  summary: string;
  warning?: string;
};

const MEETING_TYPES = ["Discovery Call", "Strategy Session", "Support"] as const;
const COUNTRY_CODES = [
  { code: "+27", label: "ZA (+27)" },
  { code: "+1", label: "US (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+91", label: "IN (+91)" },
  { code: "+971", label: "UAE (+971)" },
];

function isWeekday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export default function BookingForm({ person, personSlug, todayInSast }: BookingFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+27");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [meetingType, setMeetingType] =
    useState<(typeof MEETING_TYPES)[number]>("Discovery Call");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(todayInSast);
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<BookingResponse | null>(null);

  const dateIsValid = useMemo(() => date >= todayInSast && isWeekday(date), [date, todayInSast]);

  useEffect(() => {
    if (!dateIsValid) {
      setSlots([]);
      setSelectedTime("");
      return;
    }

    let active = true;

    async function loadSlots() {
      setLoadingSlots(true);
      setError("");

      try {
        const response = await fetch(
          `/api/bookings/availability?person=${encodeURIComponent(personSlug)}&date=${encodeURIComponent(
            date
          )}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Could not load available time slots.");
        }

        if (!active) {
          return;
        }

        setSlots(payload.slots || []);
        setSelectedTime((current) =>
          payload.slots?.some((slot: Slot) => slot.available && slot.time === current)
            ? current
            : ""
        );
      } catch (slotError) {
        if (!active) {
          return;
        }

        setSlots([]);
        setSelectedTime("");
        setError(slotError instanceof Error ? slotError.message : "Could not load slots.");
      } finally {
        if (active) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, [date, dateIsValid, personSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!dateIsValid) {
      setError("Please choose a weekday date that is not in the past.");
      return;
    }

    if (!selectedTime) {
      setError("Please choose an available time slot.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          date,
          email,
          fullName,
          meetingType,
          message,
          person: personSlug,
          phoneNumber: `${countryCode} ${phoneNumber}`.trim(),
          time: selectedTime,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Booking failed. Please try again.");
      }

      setSuccess(payload);
      setSelectedTime("");
      setMessage("");
      setCompanyName("");
      setPhoneNumber("");
      setCountryCode("+27");
      setEmail("");
      setFullName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Booking failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.formPanel}>
      <div className={styles.formHeader}>
        <h2>Book a meeting</h2>
        <p>
          Pick a weekday slot between 09:00 and 17:00 SAST. Once confirmed, both of
          you will receive a Google Calendar invite with a Google Meet link.
        </p>
      </div>

      {success ? (
        <div className={styles.alertSuccess}>
          <strong>Meeting confirmed.</strong>
          <br />
          {success.summary}
          <br />
          Meeting with {success.person.name}.
          {success.meetLink ? (
            <>
              <br />
              Google Meet:{" "}
              <a href={success.meetLink} target="_blank" rel="noreferrer">
                {success.meetLink}
              </a>
            </>
          ) : null}
          {success.warning ? (
            <>
              <br />
              {success.warning}
            </>
          ) : null}
        </div>
      ) : null}

      {error ? <div className={styles.alertError}>{error}</div> : null}

      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <div className={styles.rowTwo}>
          <div className={styles.field}>
            <label htmlFor="booking-full-name">Full name</label>
            <input
              id="booking-full-name"
              required
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="booking-email">Email</label>
            <input
              id="booking-email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.rowTwo}>
          <div className={styles.field}>
            <label htmlFor="booking-phone">Phone number</label>
            <div className={styles.phoneField}>
              <select
                aria-label="Country code"
                className={styles.countryCodeSelect}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                id="booking-phone"
                className={styles.phoneInput}
                required
                type="tel"
                inputMode="tel"
                placeholder="83 744 0236"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="booking-company">Company name</label>
            <input
              id="booking-company"
              type="text"
              placeholder="Optional"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.rowTwo}>
          <div className={styles.field}>
            <label htmlFor="booking-meeting-type">Meeting type</label>
            <div className={styles.selectWrap}>
              <select
                id="booking-meeting-type"
                value={meetingType}
                onChange={(event) =>
                  setMeetingType(event.target.value as (typeof MEETING_TYPES)[number])
                }
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="booking-date">Meeting date</label>
            <input
              id="booking-date"
              min={todayInSast}
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="booking-message">Message / what to discuss</label>
          <textarea
            id="booking-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div>
          <div className={styles.slotHeader}>Choose a time slot</div>

          {!dateIsValid ? (
            <div className={styles.alertInfo}>
              Please choose a weekday date that is not in the past.
            </div>
          ) : loadingSlots ? (
            <div className={styles.alertInfo}>Loading available slots...</div>
          ) : slots.length === 0 ? (
            <div className={styles.alertInfo}>
              No slots are available on that date right now.
            </div>
          ) : (
            <div className={styles.slotGrid}>
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const classNames = [
                  styles.slotButton,
                  isSelected ? styles.slotButtonSelected : "",
                  !slot.available ? styles.slotButtonDisabled : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={slot.time}
                    className={classNames}
                    disabled={!slot.available}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className={styles.submit} disabled={submitting || loadingSlots} type="submit">
          {submitting ? "Booking..." : "Book Meeting"}
        </button>

        <p className={styles.supportText}>
          {person.meetingDuration}-minute meeting with {person.name}. Need help instead? Email{" "}
          <a href="mailto:support@teboatech.com">support@teboatech.com</a>.
        </p>
      </form>
    </div>
  );
}
