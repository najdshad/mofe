export interface Settings {
  nameFa: string;
  nameEn: string | null;
  welcomeMessage: string | null;
  metaDescription: string | null;
  logoDataUrl: string | null;
}

export interface Venue extends Settings {
  id: number;
  slug: string;
}

export interface VenueSummary {
  id: number;
  slug: string;
  nameFa: string;
  nameEn: string | null;
}

export type UserRole = "admin" | "user";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  venueId: number | null;
  sessionVersion: number;
}

export interface ManagedUser {
  id: number;
  name: string;
  venueId: number | null;
  venueName: string | null;
}

export interface UserInput {
  name: string;
  venueId: number | null;
}

export interface Variant {
  id: number;
  nameFa: string;
  nameEn: string | null;
  priceDelta: number;
  sortOrder: number;
}

export interface Item {
  id: number;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceToman: number;
  isSoldOut: boolean;
  sortOrder: number;
  variants: Variant[];
}

export interface Category {
  id: number;
  nameFa: string;
  sortOrder: number;
  items: Item[];
}

export interface MenuData {
  venue: Venue;
  categories: Category[];
}

export interface VariantInput {
  nameFa: string;
  nameEn: string | null;
  priceDelta: number;
}

export interface ItemInput {
  categoryId: number;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceToman: number;
  isSoldOut: boolean;
  variants: VariantInput[];
}

export type SettingsInput = Settings;

export interface VenueInput extends SettingsInput {
  slug: string;
}

export interface Env {
  DB: D1Database;
  ADMIN_IDENTIFIER?: string;
  SESSION_SECRET?: string;
}
