const { isValidEmail, isValidPhone, isValidDate, isValidTime } = require('../src/utils/validators');

describe('validators', () => {
  test('accepts a valid email', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
  });

  test('rejects an invalid email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('phone must be exactly 10 digits', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('98765abcde')).toBe(false);
  });

  test('date must be YYYY-MM-DD', () => {
    expect(isValidDate('2026-10-20')).toBe(true);
    expect(isValidDate('20-10-2026')).toBe(false);
  });

  test('time must be HH:MM', () => {
    expect(isValidTime('19:30')).toBe(true);
    expect(isValidTime('25:00')).toBe(false);
  });
});
