import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Booking } from '../models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private url = `${API_URL}/bookings`;

  constructor(private http: HttpClient) {}

  getAll(filters: { date?: string; status?: string; search?: string } = {}): Observable<Booking[]> {
    let params = new HttpParams();
    if (filters.date) {
      params = params.set('date', filters.date);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    return this.http.get<Booking[]>(this.url, { params });
  }

  create(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(this.url, booking);
  }

  update(id: number, booking: Booking): Observable<Booking> {
    return this.http.put<Booking>(`${this.url}/${id}`, booking);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
