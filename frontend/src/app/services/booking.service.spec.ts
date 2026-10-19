import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookingService } from './booking.service';
import { API_URL } from '../config';

describe('BookingService', () => {
  let service: BookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BookingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends filters as query params', () => {
    service.getAll({ date: '2026-11-01', status: 'confirmed', search: 'ravi' }).subscribe();

    const req = http.expectOne((r) => r.url === `${API_URL}/bookings`);
    expect(req.request.params.get('date')).toBe('2026-11-01');
    expect(req.request.params.get('status')).toBe('confirmed');
    expect(req.request.params.get('search')).toBe('ravi');
    req.flush([]);
  });

  it('leaves out empty filters', () => {
    service.getAll({ date: '', status: '' }).subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/bookings`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('calls DELETE for a booking', () => {
    service.delete(3).subscribe();
    const req = http.expectOne(`${API_URL}/bookings/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Booking deleted' });
  });
});
