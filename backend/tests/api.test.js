process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const app = require('../src/app');

const token = jwt.sign({ id: 1, username: 'admin' }, 'test_secret');
const auth = { Authorization: `Bearer ${token}` };

const validBooking = {
  table_id: 1,
  guest_name: 'Ravi Kumar',
  guest_email: 'ravi@example.com',
  guest_phone: '9876543210',
  party_size: 2,
  booking_date: '2026-11-01',
  booking_time: '19:00',
};

beforeEach(() => {
  db.query.mockReset();
});

describe('auth', () => {
  test('login fails without credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('login fails for unknown user', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ username: 'x', password: 'y' });
    expect(res.status).toBe(401);
  });

  test('login succeeds and returns a token', async () => {
    const hash = await bcrypt.hash('admin123', 4);
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', role: 'admin', password_hash: hash }] });
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('route protection', () => {
  test('tables route rejects requests without a token', async () => {
    const res = await request(app).get('/api/tables');
    expect(res.status).toBe(401);
  });

  test('bookings route rejects a bad token', async () => {
    const res = await request(app).get('/api/bookings').set('Authorization', 'Bearer abc');
    expect(res.status).toBe(401);
  });
});

describe('tables', () => {
  test('GET /api/tables returns rows', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, table_number: 1 }] });
    const res = await request(app).get('/api/tables').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('GET /api/tables applies filters to the query', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/tables?location=indoor&minCapacity=4').set(auth);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(params).toEqual(['indoor', 4]);
  });

  test('POST /api/tables validates input', async () => {
    const res = await request(app).post('/api/tables').set(auth).send({ table_number: -1, capacity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('POST /api/tables creates a table', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 9, table_number: 9, capacity: 4 }] });
    const res = await request(app).post('/api/tables').set(auth).send({ table_number: 9, capacity: 4 });
    expect(res.status).toBe(201);
  });

  test('duplicate table number returns 409', async () => {
    db.query.mockRejectedValueOnce({ code: '23505', message: 'duplicate' });
    const res = await request(app).post('/api/tables').set(auth).send({ table_number: 1, capacity: 2 });
    expect(res.status).toBe(409);
  });

  test('DELETE unknown table returns 404', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/tables/99').set(auth);
    expect(res.status).toBe(404);
  });
});

describe('bookings', () => {
  test('rejects invalid email and phone', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth)
      .send({ ...validBooking, guest_email: 'bad', guest_phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining(['guest_email is not a valid email', 'guest_phone must be exactly 10 digits'])
    );
  });

  test('rejects party larger than table capacity', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, table_number: 1, capacity: 2, status: 'available' }] });
    const res = await request(app)
      .post('/api/bookings')
      .set(auth)
      .send({ ...validBooking, party_size: 5 });
    expect(res.status).toBe(409);
  });

  test('rejects a double booking', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, table_number: 1, capacity: 4, status: 'available' }] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] });
    const res = await request(app).post('/api/bookings').set(auth).send(validBooking);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already booked/);
  });

  test('creates a booking when the slot is free', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, table_number: 1, capacity: 4, status: 'available' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 5, ...validBooking }] });
    const res = await request(app).post('/api/bookings').set(auth).send(validBooking);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5);
  });

  test('GET /api/bookings builds filters', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/bookings?date=2026-11-01&status=confirmed&search=ravi').set(auth);
    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual(['2026-11-01', 'confirmed', '%ravi%']);
  });

  test('unexpected DB failure returns 500 with a safe message', async () => {
    db.query.mockRejectedValueOnce(new Error('connection lost'));
    const res = await request(app).get('/api/bookings').set(auth);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});
