process.env.DELIVERY_SLOTS = "09:00-12:00,12:00-15:00,15:00-18:00,18:00-21:00";
process.env.SLOT_LEAD_MINUTES = "60";
process.env.SLOT_DAYS_AHEAD = "2";
process.env.SERVICE_PINCODES = "452001,452002";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getAvailableSlots, resolveSlot, isServiceable, parseWindows, istNow } = require("../utils/deliverySlots");

// Build a real timestamp from an Indian clock time
const ist = (date, hhmm) => Date.parse(`${date}T${hhmm}:00+05:30`);

test("IST clock is read correctly (UTC evening is already next day in India)", () => {
    const now = istNow(Date.parse("2026-11-05T20:00:00Z")); // 01:30 on the 6th in India
    assert.equal(now.date, "2026-11-06");
    assert.equal(now.minutes, 90);
});

test("slots: a slot closes 60 minutes before it starts", () => {
    const days = getAvailableSlots(ist("2026-11-06", "10:30"));
    assert.equal(days[0].label, "Today");
    assert.deepEqual(days[0].slots.map((s) => s.start), ["12:00", "15:00", "18:00"]); // 09:00 is gone
    // exactly 60 minutes before 12:00 is still bookable, one minute later is not
    assert.ok(getAvailableSlots(ist("2026-11-06", "11:00"))[0].slots.some((s) => s.start === "12:00"));
    assert.ok(!getAvailableSlots(ist("2026-11-06", "11:01"))[0].slots.some((s) => s.start === "12:00"));
});

test("slots: late at night only tomorrow is offered", () => {
    const days = getAvailableSlots(ist("2026-11-06", "23:00"));
    assert.equal(days.length, 1);
    assert.equal(days[0].label, "Tomorrow");
    assert.equal(days[0].date, "2026-11-07");
    assert.equal(days[0].slots.length, 4);
});

test("slots: month and year boundaries roll over correctly", () => {
    const days = getAvailableSlots(ist("2026-12-31", "22:00"));
    assert.equal(days[0].date, "2027-01-01");
});

test("resolveSlot accepts open slots and rejects closed, far-future and garbage ids", () => {
    const now = ist("2026-11-06", "10:30");
    const ok = resolveSlot("2026-11-06|18:00-21:00", now);
    assert.equal(ok.label, "Today, 6 pm - 9 pm");
    assert.equal(resolveSlot("2026-11-06|09:00-12:00", now), null);  // already closed
    assert.equal(resolveSlot("2026-11-09|09:00-12:00", now), null);  // too far ahead
    assert.equal(resolveSlot("2026-11-06|18:00-22:00", now), null);  // not a real window
    assert.equal(resolveSlot("", now), null);
    assert.equal(resolveSlot(undefined, now), null);
});

test("windows: bad entries are ignored and 'off' disables slots", () => {
    assert.equal(parseWindows("off").length, 0);
    assert.equal(parseWindows("").length, 0);
    assert.equal(parseWindows("9:00-12:00, nonsense, 15:00-14:00").length, 1); // end before start is dropped
    assert.equal(parseWindows("9:00-12:00")[0].label, "9 am - 12 pm");
});

test("service area: only listed PIN codes are accepted", () => {
    assert.equal(isServiceable("452001"), true);
    assert.equal(isServiceable(" 452002 "), true);
    assert.equal(isServiceable("110001"), false);
});
