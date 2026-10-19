import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('form is invalid when empty', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('requires a password of at least 6 characters', () => {
    component.form.setValue({ username: 'admin', password: '123' });
    expect(component.form.controls.password.errors?.['minlength']).toBeTruthy();
  });

  it('does not call the API when the form is invalid', () => {
    const spy = spyOn(auth, 'login');
    component.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls login with the form values when valid', () => {
    const spy = spyOn(auth, 'login').and.returnValue(of({ token: 't', user: { id: 1, username: 'admin', role: 'admin' } }));
    component.form.setValue({ username: 'admin', password: 'admin123' });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith('admin', 'admin123');
  });

  it('stops loading when login fails', () => {
    spyOn(auth, 'login').and.returnValue(throwError(() => ({ status: 401, error: { message: 'Invalid' } })));
    component.form.setValue({ username: 'admin', password: 'wrongpass' });
    component.onSubmit();
    expect(component.loading).toBeFalse();
  });
});
