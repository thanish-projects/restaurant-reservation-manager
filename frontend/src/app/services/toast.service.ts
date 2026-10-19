import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: Toast[] = [];
  private nextId = 1;

  success(text: string): void {
    this.add('success', text);
  }

  error(text: string): void {
    this.add('error', text);
  }

  // Turns any HTTP error into a readable message for the user.
  fromHttpError(err: HttpErrorResponse): void {
    let text = 'Something went wrong. Please try again.';

    if (err.status === 0) {
      text = 'Cannot reach the server. Is the backend running?';
    } else if (err.error && err.error.errors && err.error.errors.length > 0) {
      text = err.error.errors.join(', ');
    } else if (err.error && err.error.message) {
      text = err.error.message;
    }
    this.error(text);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private add(type: 'success' | 'error', text: string): void {
    const id = this.nextId++;
    this.toasts.push({ id, type, text });
    setTimeout(() => this.dismiss(id), 4000);
  }
}
