import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Booking, RestaurantTable } from '../../models';
import { BookingService } from '../../services/booking.service';
import { TableService } from '../../services/table.service';
import { ToastService } from '../../services/toast.service';

// Custom validator: the date must not be in the past.
export function notInPastValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  const today = new Date().toISOString().substring(0, 10);
  if (value < today) {
    return { pastDate: true };
  }
  return null;
}

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [NgFor, NgIf, TitleCasePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css',
})
export class BookingsComponent implements OnInit {
  bookings: Booking[] = [];
  tables: RestaurantTable[] = [];
  loading = false;
  showForm = false;
  editingId: number | null = null;

  // Filter values
  filterDate = '';
  filterStatus = '';
  filterSearch = '';

  private fb = inject(FormBuilder);

  form = this.fb.group({
    table_id: [null as number | null, Validators.required],
    guest_name: ['', [Validators.required, Validators.minLength(2)]],
    guest_email: ['', [Validators.required, Validators.email]],
    guest_phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    party_size: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    booking_date: ['', [Validators.required, notInPastValidator]],
    booking_time: ['', Validators.required],
    status: ['confirmed', Validators.required],
    notes: [''],
  });

  constructor(
    private bookingService: BookingService,
    private tableService: TableService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBookings();
    this.tableService.getAll({ status: 'available' }).subscribe({
      next: (data) => (this.tables = data),
      error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
    });
  }

  loadBookings(): void {
    this.loading = true;
    this.bookingService
      .getAll({ date: this.filterDate, status: this.filterStatus, search: this.filterSearch })
      .subscribe({
        next: (data) => {
          this.bookings = data;
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.toast.fromHttpError(err);
        },
      });
  }

  clearFilters(): void {
    this.filterDate = '';
    this.filterStatus = '';
    this.filterSearch = '';
    this.loadBookings();
  }

  filterToday(): void {
    this.filterDate = new Date().toISOString().substring(0, 10);
    this.loadBookings();
  }

  getConfirmedCount(): number {
    return this.bookings.filter((b) => b.status === 'confirmed').length;
  }

  getTodayCount(): number {
    const today = new Date().toISOString().substring(0, 10);
    return this.bookings.filter((b) => b.booking_date === today).length;
  }

  getTotalGuests(): number {
    return this.bookings.reduce((sum, b) => sum + (Number(b.party_size) || 0), 0);
  }

  getInitials(name: string): string {
    if (!name) return 'G';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  openAdd(): void {
    this.editingId = null;
    this.form.reset({
      table_id: null,
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      party_size: 2,
      booking_date: '',
      booking_time: '',
      status: 'confirmed',
      notes: '',
    });
    this.showForm = true;
  }

  openEdit(b: Booking): void {
    this.editingId = b.id as number;
    this.form.reset({
      table_id: b.table_id,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone,
      party_size: b.party_size,
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      status: b.status,
      notes: b.notes || '',
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value as unknown as Booking;

    if (this.editingId === null) {
      this.bookingService.create(payload).subscribe({
        next: () => {
          this.toast.success('Booking created');
          this.cancelForm();
          this.loadBookings();
        },
        error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
      });
    } else {
      this.bookingService.update(this.editingId, payload).subscribe({
        next: () => {
          this.toast.success('Booking updated');
          this.cancelForm();
          this.loadBookings();
        },
        error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
      });
    }
  }

  remove(b: Booking): void {
    const ok = confirm(`Delete booking for ${b.guest_name}?`);
    if (!ok) {
      return;
    }
    this.bookingService.delete(b.id as number).subscribe({
      next: () => {
        this.toast.success('Booking deleted');
        this.loadBookings();
      },
      error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
    });
  }
}
