export interface DatabaseProduct {
  id: string;
  name: string;
  barcode: string;
  article: string;
}

export interface ShipmentItem {
  id: string;
  product: DatabaseProduct;
  quantity: number;
  boxNumber: number;
  createdAt: number; // For keeping the exact chronological order of insertion
}
