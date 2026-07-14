export const TIMEZONE_LABELS: Record<string, string> = {
  "Asia/Tehran": "تهران (UTC+3:30)",
  "Asia/Dubai": "دبی (UTC+4:00)",
  "Asia/Baghdad": "بغداد (UTC+3:00)",
  "Asia/Kabul": "کابل (UTC+4:30)",
  "Asia/Karachi": "کراچی (UTC+5:00)",
  "Asia/Yerevan": "ایروان (UTC+4:00)",
  "Europe/London": "لندن (UTC+1:00)",
  "Europe/Berlin": "برلین (UTC+2:00)",
  "Europe/Istanbul": "استانبول (UTC+3:00)",
  "America/New_York": "نیویورک (UTC-4:00)",
  "America/Los_Angeles": "لس آنجلس (UTC-7:00)",
  "Asia/Tokyo": "توکیو (UTC+9:00)",
  "Australia/Sydney": "سیدنی (UTC+10:00)",
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "مالک",
  manager: "مدیر",
  staff: "کارمند",
};

export const VALID_STATIONS = ["kitchen", "bar"] as const;
export type Station = (typeof VALID_STATIONS)[number];

export const STATION_LABELS: Record<string, string> = {
  kitchen: "آشپزخانه",
  bar: "بار",
};

export const PLAN_LABELS: Record<string, string> = {
  basic: "پایه",
  pro: "حرفه‌ای",
  premium: "پریمیوم",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trial: "دوره آزمایشی",
  active: "فعال",
  past_due: "سررسید شده",
  canceled: "لغو شده",
  expired: "منقضی شده",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  failed: "ناموفق",
  refunded: "بازگشت وجه",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  published: "منتشر شده",
  unpublished: "منتشر نشده",
};

export const DAY_LABELS: Record<number, string> = {
  0: "شنبه",
  1: "یکشنبه",
  2: "دوشنبه",
  3: "سه‌شنبه",
  4: "چهارشنبه",
  5: "پنجشنبه",
  6: "جمعه",
};
