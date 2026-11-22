export type City = {
  id: string;
  name: string;
  country: string;
  currency: string;
  currency_symbol: string;
  image_url: string | null;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number;
  sold: number;
  sales_end: string | null;
  sort: number;
};

export type EventType = "club" | "concierto" | "fiesta";

export type EventItem = {
  id: string;
  club_id: string;
  city_id: string;
  title: string;
  description: string | null;
  lineup: string[];
  type: EventType;
  starts_at: string;
  image_url: string | null;
  min_age: number;
  dress_code: string | null;
  status: "draft" | "published" | "cancelled";
  club: { name: string; area: string | null; address?: string | null; verified: boolean };
  ticket_types: TicketType[];
};

export const TYPE_LABEL: Record<EventType, string> = {
  club: "Club",
  concierto: "Concierto",
  fiesta: "Fiesta",
};

/** Cargo de servicio que paga el comprador, encima del precio. */
export const SERVICE_FEE_RATE = 0.08;
