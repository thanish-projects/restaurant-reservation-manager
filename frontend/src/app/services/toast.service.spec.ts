import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    service = new ToastService();
  });

  it('shows the server message for an API error', () => {
    service.fromHttpError(new HttpErrorResponse({ status: 409, error: { message: 'Already booked' } }));
    expect(service.toasts[0].text).toBe('Already booked');
    expect(service.toasts[0].type).toBe('error');
  });

  it('joins validation errors', () => {
    service.fromHttpError(
      new HttpErrorResponse({ status: 400, error: { message: 'Validation failed', errors: ['a', 'b'] } })
    );
    expect(service.toasts[0].text).toBe('a, b');
  });

  it('shows a friendly message when the server is unreachable', () => {
    service.fromHttpError(new HttpErrorResponse({ status: 0 }));
    expect(service.toasts[0].text).toContain('Cannot reach the server');
  });
});
