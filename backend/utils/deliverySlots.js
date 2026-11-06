// Delivery windows and the PIN code service area. All rules come from config/settings.js.
// India has one time zone and no daylight saving, so a fixed +05:30 offset is correct.
const settings = require("../config/settings");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const twelveHour = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
};

const parseWindows = (text) => {
    if (!text || text.toLowerCase() === "off") return [];
    return text
        .split(",")
        .map((part) => part.trim())
        .map((part) => part.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/))
        .filter(Boolean)
        .map((m) => {
            const start = `${m[1].padStart(2, "0")}:${m[2]}`;
            const end = `${m[3].padStart(2, "0")}:${m[4]}`;
            return { start, end, label: `${twelveHour(start)} - ${twelveHour(end)}` };
        })
        .filter((w) => toMinutes(w.start) < toMinutes(w.end) && toMinutes(w.end) <= 24 * 60);
};

const slotsEnabled = () => parseWindows(settings.DELIVERY_SLOTS).length > 0;

// "Now" as Indian date (YYYY-MM-DD) and minutes since midnight
const istNow = (nowMs = Date.now()) => {
    const d = new Date(nowMs + IST_OFFSET_MS);
    return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), weekday: d.getUTCDay() };
};

const addDays = (dateStr, n) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return { date: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
};

const slotId = (date, w) => `${date}|${w.start}-${w.end}`;

// Bookable slots for the next few days, grouped by day
const getAvailableSlots = (nowMs = Date.now()) => {
    const windows = parseWindows(settings.DELIVERY_SLOTS);
    if (!windows.length) return [];
    const now = istNow(nowMs);
    const days = [];

    for (let i = 0; i < settings.SLOT_DAYS_AHEAD; i++) {
        const { date, weekday } = addDays(now.date, i);
        const open = windows.filter((w) => i > 0 || now.minutes + settings.SLOT_LEAD_MINUTES <= toMinutes(w.start));
        if (!open.length) continue;
        days.push({
            date,
            label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${DAY_NAMES[weekday]} ${date.slice(8)}/${date.slice(5, 7)}`,
            slots: open.map((w) => ({ id: slotId(date, w), start: w.start, end: w.end, label: w.label })),
        });
    }
    return days;
};

// Returns the slot to store on the order, or null if the id is not bookable right now
const resolveSlot = (id, nowMs = Date.now()) => {
    for (const day of getAvailableSlots(nowMs)) {
        const hit = day.slots.find((s) => s.id === id);
        if (hit) return { date: day.date, start: hit.start, end: hit.end, label: `${day.label}, ${hit.label}` };
    }
    return null;
};

const serviceAreaEnabled = () => settings.SERVICE_PINCODES.length > 0;
const isServiceable = (pin) => !serviceAreaEnabled() || settings.SERVICE_PINCODES.includes(String(pin).trim());

module.exports = { slotsEnabled, getAvailableSlots, resolveSlot, serviceAreaEnabled, isServiceable, parseWindows, istNow };
