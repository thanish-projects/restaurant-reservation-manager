import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config';
import { LoginResponse } from '../models';

const TOKEN_KEY = 'rrm_token';
const USER_KEY = 'rrm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { username, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, res.user.username);
      })
    );
  }

  logout(): void {
    // Tell the server (for logging), then clear local state regardless of result.
    this.http.post(`${API_URL}/auth/logout`, {}).subscribe({
      next: () => this.clearAndRedirect(),
      error: () => this.clearAndRedirect(),
    });
  }

  clearAndRedirect(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUsername(): string {
    return localStorage.getItem(USER_KEY) || '';
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }
}
