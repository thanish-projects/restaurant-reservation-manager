import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token = auth.getToken();

  let request = req;
  if (token) {
    request = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // An expired/invalid token on a protected call means we must log in again.
      // (The login call itself also returns 401 for bad credentials - don't redirect for that.)
      const isLoginCall = req.url.endsWith('/auth/login');
      if (err.status === 401 && !isLoginCall) {
        toast.error('Session expired. Please log in again.');
        auth.clearAndRedirect();
      }
      return throwError(() => err);
    })
  );
};
