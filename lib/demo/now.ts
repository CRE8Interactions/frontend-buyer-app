/**
 * Demo data is dated relative to a reference instant so demo mode always has
 * upcoming events instead of expiring on hardcoded dates.
 *
 * The reference is the real clock in the app and is pinned to
 * `DEMO_FIXTURES_NOW` under test (see vitest.setup.ts), which keeps fixture
 * dates — and anything formatted from them — stable. It lives apart from
 * fixtures.ts so the pin can be set before the fixtures are built.
 */

/** The instant tests pin demo data to: between the two IceDogs games. */
export const DEMO_FIXTURES_NOW = "2026-08-20T12:00:00.000Z";

let reference = new Date();

export function setDemoReferenceNow(instant: string | Date) {
  reference = new Date(instant);
}

export function demoReferenceNow() {
  return new Date(reference);
}

/**
 * ISO instant for a demo date: the reference day shifted by `offset`, at `time`
 * (UTC, `HH:mm` or `HH:mm:ss.SSS`).
 */
export function demoDate(
  offset: { months?: number; days?: number } = {},
  time = "00:00",
) {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number);
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + (offset.months ?? 0),
      reference.getUTCDate() + (offset.days ?? 0),
      hours,
      minutes,
      Math.trunc(seconds),
      Math.round((seconds % 1) * 1000),
    ),
  ).toISOString();
}
