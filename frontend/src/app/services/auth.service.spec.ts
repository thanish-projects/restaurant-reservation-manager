import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { API_URL } from '../config';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('stores the token after a successful login', () => {
    service.login('admin', 'admin123').subscribe();

    const req = http.expectOne(`${API_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'abc', user: { id: 1, username: 'admin', role: 'admin' } });

    expect(service.getToken()).toBe('abc');
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.getUsername()).toBe('admin');
  });

  it('is not logged in when no token exists', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('clears the token and goes to /login on logout', () => {
    localStorage.setItem('rrm_token', 'abc');
    const navigateSpy = spyOn(router, 'navigate');

    service.logout();
    http.expectOne(`${API_URL}/auth/logout`).flush({ message: 'ok' });

    expect(service.getToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('still clears the token if the logout call fails', () => {
    localStorage.setItem('rrm_token', 'abc');
    spyOn(router, 'navigate');

    service.logout();
    http.expectOne(`${API_URL}/auth/logout`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(service.getToken()).toBeNull();
  });
});
