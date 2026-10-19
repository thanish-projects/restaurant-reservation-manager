import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { BookingsComponent, notInPastValidator } from './bookings.component';
import { BookingService } from '../../services/booking.service';
import { TableService } from '../../services/table.service';
import { FormControl } from '@angular/forms';

describe('BookingsComponent', () => {
  let fixture: ComponentFixture<BookingsComponent>;
  let component: BookingsComponent;
  let bookingService: BookingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    bookingService = TestBed.inject(BookingService);
    spyOn(bookingService, 'getAll').and.returnValue(of([]));
    spyOn(TestBed.inject(TableService), 'getAll').and.returnValue(of([]));

    fixture = TestBed.createComponent(BookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads bookings on init', () => {
    expect(bookingService.getAll).toHaveBeenCalled();
  });

  it('rejects an invalid email', () => {
    component.form.controls.guest_email.setValue('not-an-email');
    expect(component.form.controls.guest_email.errors?.['email']).toBeTruthy();
  });

  it('rejects a phone number that is not 10 digits', () => {
    component.form.controls.guest_phone.setValue('12345');
    expect(component.form.controls.guest_phone.errors?.['pattern']).toBeTruthy();
    component.form.controls.guest_phone.setValue('9876543210');
    expect(component.form.controls.guest_phone.errors).toBeNull();
  });

  it('rejects party size above 20', () => {
    component.form.controls.party_size.setValue(25);
    expect(component.form.controls.party_size.errors?.['max']).toBeTruthy();
  });

  it('does not submit an invalid form', () => {
    const createSpy = spyOn(bookingService, 'create');
    component.save();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('submits a valid form', () => {
    const createSpy = spyOn(bookingService, 'create').and.returnValue(of({} as any));
    component.form.setValue({
      table_id: 1,
      guest_name: 'Ravi Kumar',
      guest_email: 'ravi@example.com',
      guest_phone: '9876543210',
      party_size: 2,
      booking_date: '2999-01-01',
      booking_time: '19:00',
      status: 'confirmed',
      notes: '',
    });
    component.save();
    expect(createSpy).toHaveBeenCalled();
  });

  it('notInPastValidator flags past dates only', () => {
    expect(notInPastValidator(new FormControl('2000-01-01'))).toEqual({ pastDate: true });
    expect(notInPastValidator(new FormControl('2999-01-01'))).toBeNull();
  });
});
