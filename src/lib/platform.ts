import type { AppSettings } from "@/lib/types";

/**
 * QuantumMine AI platform rules. These mirror `public.app_settings` in the
 * database, which is the authority — these constants are the fallback the UI
 * renders with before settings load, and the defaults a fresh install starts from.
 */

export const BRAND_NAME = "QuantumMine AI";
export const COMPANY_NAME = "QuantumMine AI";
export const COMPANY_SLUG = "quantummine";
export const BRAND_TAGLINE = "Trade Smarter · Earn Bigger";
export const FOUNDED = "October 2026";

/** Fallback used when a product does not carry its own daily income or term. */
export const DAILY_RATE_PERCENT = 10;
export const TERM_DAYS = 20;
/** Returns are credited at 20:00 Africa/Kampala — "8PM daily". */
export const PAYOUT_HOUR = 20;

/** Commission paid to the upline when a downline member activates a product. */
export const REFERRAL_RATES = [10, 1] as const;

/** Saturday and Sunday, Africa/Kampala. Investments strictly above this amount. */
export const WEEKEND_CASHBACK_MIN = 100_000;
export const WEEKEND_CASHBACK_RATE = 0.05;

export const SIGNUP_BONUS = 1000;
export const MIN_DEPOSIT = 5000;
export const MAX_DEPOSIT = 10_000_000;
export const MIN_WITHDRAW = 3000;
export const MAX_WITHDRAW = 5_000_000;
export const WITHDRAW_FEE_RATE = 0.15;

export const TELEGRAM_CHANNEL_URL = "https://t.me/+x70pBloGZDNmYjg0";
export const TELEGRAM_SUPPORT_URL = "https://t.me/+x70pBloGZDNmYjg0";
export const SUPPORT_HANDLE = "QuantumMine AI";

export const PRODUCTS_IMAGE = "/brand/products_image.jpg";

export const ABOUT_PARAGRAPHS = [
  "QuantumMine AI is presented as an AI-powered trading platform that uses automated trading robots to analyze market information and identify potential trading opportunities.",
  "Our trading robots are designed to use algorithmic analysis, market trends, and sentiment signals to support automated trading decisions. The goal is to make trading more systematic and reduce the need for users to monitor markets manually.",
];

export const ABOUT_VISION =
  "To make trading more systematic and reduce the need for users to monitor markets manually.";
export const ABOUT_MISSION =
  "To use algorithmic analysis, market trends, and sentiment signals in support of automated trading decisions.";
export const ABOUT_STRAPLINE = "QuantumMine AI — Trade smarter with automated analysis.";

function resolveSiteUrl() {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://quantummine.ai";
}

export const SITE_URL = resolveSiteUrl();

export const DEFAULT_WELCOME_MESSAGE = `Welcome to QuantumMine AI!

Deposit to your wallet, activate a trading product, and your returns arrive at 8PM every day for that product's term.

On weekends, each investment above UGX 100,000 receives 5% cashback.

Tap Channel for updates and Support if you need help.`;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  welcome_message: DEFAULT_WELCOME_MESSAGE,
  telegram_channel_url: TELEGRAM_CHANNEL_URL,
  telegram_support_url: TELEGRAM_SUPPORT_URL,
  about_text: ABOUT_PARAGRAPHS[0],
  payout_hour: PAYOUT_HOUR,
  daily_rate_percent: DAILY_RATE_PERCENT,
  term_days: TERM_DAYS,
  signup_bonus: SIGNUP_BONUS,
  deposit_min: MIN_DEPOSIT,
  deposit_max: MAX_DEPOSIT,
  withdraw_min: MIN_WITHDRAW,
  withdraw_max: MAX_WITHDRAW,
  withdraw_fee_rate: WITHDRAW_FEE_RATE,
  withdraw_start: "08:00",
  withdraw_end: "20:00",
  withdraw_auto: true,
  frozen: false,
};

/** What actually reaches the member's phone after the withdrawal fee. */
export function withdrawNet(amount: number, feeRate = WITHDRAW_FEE_RATE) {
  return Math.round(amount * (1 - feeRate) * 100) / 100;
}

export function withdrawFee(amount: number, feeRate = WITHDRAW_FEE_RATE) {
  return Math.round(amount * feeRate * 100) / 100;
}

export function normalizeTime(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "08:00";
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function mergeAppSettings(row?: Partial<AppSettings> | null): AppSettings {
  const d = DEFAULT_APP_SETTINGS;
  return {
    welcome_message: (row?.welcome_message ?? d.welcome_message).trim() || d.welcome_message,
    telegram_channel_url:
      (row?.telegram_channel_url ?? d.telegram_channel_url).trim() || d.telegram_channel_url,
    telegram_support_url:
      (row?.telegram_support_url ?? d.telegram_support_url).trim() || d.telegram_support_url,
    about_text: (row?.about_text ?? d.about_text).trim() || d.about_text,
    payout_hour: Number(row?.payout_hour ?? d.payout_hour),
    daily_rate_percent: Number(row?.daily_rate_percent ?? d.daily_rate_percent),
    term_days: Number(row?.term_days ?? d.term_days),
    signup_bonus: Number(row?.signup_bonus ?? d.signup_bonus),
    deposit_min: Number(row?.deposit_min ?? d.deposit_min) || d.deposit_min,
    deposit_max: Number(row?.deposit_max ?? d.deposit_max) || d.deposit_max,
    withdraw_min: Number(row?.withdraw_min ?? d.withdraw_min) || d.withdraw_min,
    withdraw_max: Number(row?.withdraw_max ?? d.withdraw_max) || d.withdraw_max,
    withdraw_fee_rate: Number(row?.withdraw_fee_rate ?? d.withdraw_fee_rate),
    withdraw_start: normalizeTime(row?.withdraw_start),
    withdraw_end: normalizeTime(row?.withdraw_end),
    withdraw_auto: row?.withdraw_auto ?? d.withdraw_auto,
    frozen: row?.frozen ?? d.frozen,
  };
}

function kampalaMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string) {
  const [hour, minute] = normalizeTime(value).split(":").map(Number);
  return hour * 60 + minute;
}

export function isWithdrawWindowOpen(start: string, end: string) {
  const now = kampalaMinutes();
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from === to) return true;
  if (from < to) return now >= from && now < to;
  return now >= from || now < to;
}

export function formatWithdrawWindow(start: string, end: string) {
  return `${normalizeTime(start)} – ${normalizeTime(end)} (Africa/Kampala)`;
}

/** Kampala weekend: Saturday or Sunday. */
export function isKampalaWeekend(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Kampala",
    weekday: "short",
  }).format(date);
  return weekday === "Sat" || weekday === "Sun";
}

/** 5% of the price on a weekend, and only when the price is above UGX 100,000. */
export function weekendCashback(price: number, date = new Date()) {
  if (price <= WEEKEND_CASHBACK_MIN || !isKampalaWeekend(date)) return 0;
  return Math.round(price * WEEKEND_CASHBACK_RATE);
}

/** "8PM" from payout hour 20, for copy that must match the marketing. */
export function payoutClockLabel(hour = PAYOUT_HOUR) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}
