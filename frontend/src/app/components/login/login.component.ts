import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loading = false;

  private fb = inject(FormBuilder);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    // Already logged in? Go straight to the app.
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/bookings']);
    }
  }

  fillDemo(): void {
    this.form.patchValue({ username: 'admin', password: 'admin123' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { username, password } = this.form.value;

    this.auth.login(username as string, password as string).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Welcome back!');
        this.router.navigate(['/bookings']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.toast.fromHttpError(err);
      },
    });
  }
}
