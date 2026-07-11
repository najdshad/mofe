export interface TableInfo {
  tableNumber: number;
  tableId: string;
  status: "free" | "active" | "ready" | "settled";
  label?: string;
}

export type TableStatus = "free" | "active" | "ready" | "settled";

export interface VariantData {
  id: string;
  nameFa: string;
  nameEn?: string;
  priceModifier: number;
}

export interface MenuItemData {
  id: string;
  nameFa: string;
  nameEn?: string;
  priceToman: number;
  station: string;
  isSoldOut: boolean;
  variants: VariantData[];
}

export interface CategoryData {
  id: string;
  nameFa: string;
  items: MenuItemData[];
}

export interface OrderItemData {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  station: string;
  status: string;
  notes?: string;
}

export interface OrderData {
  id: string;
  tableNumber?: string;
  status: string;
  subtotal: number;
  total: number;
  items: OrderItemData[];
  createdAt: string;
  createdBy: string;
}

export interface TableData {
  id: string;
  number: number;
  label?: string;
  status: string;
  isActive?: boolean;
}
