import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RestaurantTable } from '../../models';
import { TableService } from '../../services/table.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [NgFor, NgIf, TitleCasePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css',
})
export class TablesComponent implements OnInit {
  tables: RestaurantTable[] = [];
  loading = false;
  showForm = false;
  editingId: number | null = null;
  viewMode: 'table' | 'grid' = 'table';

  // Filter values
  filterLocation = '';
  filterStatus = '';
  filterMinCapacity = '';

  private fb = inject(FormBuilder);

  form = this.fb.group({
    table_number: [null as number | null, [Validators.required, Validators.min(1)]],
    capacity: [null as number | null, [Validators.required, Validators.min(1), Validators.max(20)]],
    location: ['indoor', Validators.required],
    status: ['available', Validators.required],
  });

  constructor(
    private tableService: TableService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables(): void {
    this.loading = true;
    this.tableService
      .getAll({
        location: this.filterLocation,
        status: this.filterStatus,
        minCapacity: this.filterMinCapacity,
      })
      .subscribe({
        next: (data) => {
          this.tables = data;
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.toast.fromHttpError(err);
        },
      });
  }

  clearFilters(): void {
    this.filterLocation = '';
    this.filterStatus = '';
    this.filterMinCapacity = '';
    this.loadTables();
  }

  setViewMode(mode: 'table' | 'grid'): void {
    this.viewMode = mode;
  }

  getTotalCapacity(): number {
    return this.tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  }

  getAvailableCount(): number {
    return this.tables.filter((t) => t.status === 'available').length;
  }

  getMaintenanceCount(): number {
    return this.tables.filter((t) => t.status === 'maintenance').length;
  }

  getLocationIcon(loc: string): string {
    switch (loc) {
      case 'outdoor': return '🌿';
      case 'private': return '🍷';
      default: return '🏛️';
    }
  }

  openAdd(): void {
    this.editingId = null;
    this.form.reset({ table_number: null, capacity: null, location: 'indoor', status: 'available' });
    this.showForm = true;
  }

  openEdit(table: RestaurantTable): void {
    this.editingId = table.id as number;
    this.form.reset({
      table_number: table.table_number,
      capacity: table.capacity,
      location: table.location,
      status: table.status,
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

    const payload = this.form.value as RestaurantTable;

    if (this.editingId === null) {
      this.tableService.create(payload).subscribe({
        next: () => {
          this.toast.success('Table added');
          this.cancelForm();
          this.loadTables();
        },
        error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
      });
    } else {
      this.tableService.update(this.editingId, payload).subscribe({
        next: () => {
          this.toast.success('Table updated');
          this.cancelForm();
          this.loadTables();
        },
        error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
      });
    }
  }

  remove(table: RestaurantTable): void {
    const ok = confirm(`Delete table ${table.table_number}? Its bookings will also be deleted.`);
    if (!ok) {
      return;
    }
    this.tableService.delete(table.id as number).subscribe({
      next: () => {
        this.toast.success('Table deleted');
        this.loadTables();
      },
      error: (err: HttpErrorResponse) => this.toast.fromHttpError(err),
    });
  }
}
