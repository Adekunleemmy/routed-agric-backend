export type UserRole = 'buyer' | 'farmer' | 'admin';

export type ProduceCategory =
  | 'Vegetables'
  | 'Tubers'
  | 'Grains'
  | 'Fruits'
  | 'Legumes'
  | 'Oil & Spices'
  | 'Livestock'
  | 'Other';

export type ProduceUnit = 'kg' | 'crate' | 'sack' | 'bunch' | 'litre' | 'basket' | 'tonne';

export type ProduceListingStatus = 'available' | 'low_stock' | 'sold_out';

export type OrderStatusType = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export type NegotiationType = 'PRICE_COUNTER' | 'QUANTITY_CHANGE' | 'LOCATION_CHANGE';

export type NegotiationStatusType = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: UserRole;
  state: string;
  lga: string;
  farmName?: string;
  farmLocation?: string;
  description?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateListingDTO {
  productName: string;
  category: string;
  description: string;
  quantityAvailable: number;
  unit: string;
  pricePerUnit: number;
  state: string;
  lga: string;
  harvestDate: string;
  images: string[];
}

export interface UpdateListingDTO {
  productName?: string;
  category?: string;
  description?: string;
  quantityAvailable?: number;
  unit?: string;
  pricePerUnit?: number;
  state?: string;
  lga?: string;
  harvestDate?: string;
  images?: string[];
  status?: ProduceListingStatus;
}

export interface CreateOrderDTO {
  listingId: string;
  quantity: number;
  deliveryState: string;
  deliveryLga: string;
  deliveryAddress: string;
  preferredDate: string;
  buyerNote?: string;
}

export interface ProposeNegotiationDTO {
  type: NegotiationType;
  proposedValue: string | number;
}

export interface RespondNegotiationDTO {
  decision: 'ACCEPTED' | 'DECLINED';
}

export interface DiagnosePestDTO {
  crop: string;
  affectedPart: string;
  startedAgo: string;
  description: string;
  imageUrl?: string;
}

export interface AskKnowledgeDTO {
  category: string;
  question: string;
}
