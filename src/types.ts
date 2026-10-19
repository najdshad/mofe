export interface Settings {
  nameFa: string;
  nameEn: string | null;
  welcomeMessage: string | null;
  metaDescription: string | null;
  logoDataUrl: string | null;
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
  settings: Settings;
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

export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}
