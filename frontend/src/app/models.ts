export interface RestaurantTable {
  id?: number;
  table_number: number;
  capacity: number;
  location: 'indoor' | 'outdoor' | 'private';
  status: 'available' | 'maintenance';
}

export interface Booking {
  id?: number;
  table_id: number;
  table_number?: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  party_size: number;
  booking_date: string;
  booking_time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  notes?: string | null;
}

export interface LoginResponse {
  token: string;
  user: { id: number; username: string; role: string };
}
