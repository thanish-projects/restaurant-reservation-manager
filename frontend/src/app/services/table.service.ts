import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { RestaurantTable } from '../models';

@Injectable({ providedIn: 'root' })
export class TableService {
  private url = `${API_URL}/tables`;

  constructor(private http: HttpClient) {}

  getAll(filters: { location?: string; status?: string; minCapacity?: string } = {}): Observable<RestaurantTable[]> {
    let params = new HttpParams();
    if (filters.location) {
      params = params.set('location', filters.location);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.minCapacity) {
      params = params.set('minCapacity', filters.minCapacity);
    }
    return this.http.get<RestaurantTable[]>(this.url, { params });
  }

  create(table: RestaurantTable): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(this.url, table);
  }

  update(id: number, table: RestaurantTable): Observable<RestaurantTable> {
    return this.http.put<RestaurantTable>(`${this.url}/${id}`, table);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
