# Restaurant Reservation Manager

Admin panel to manage restaurant tables and bookings.
Angular + Node.js (Express) + MySQL + JWT, Winston logging, Jest / Jasmine-Karma tests, Swagger API Documentation.

## Setup (VS Code terminal)

### 1. Database
Make sure MySQL is running and the credentials in `.env` match your configuration:
```
DATABASE_URL=mysql://root:root123@localhost:3306/reservation_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=reservation_db
```

### 2. Backend
```
cd backend
npm install
npm run db:init     # creates database, tables + admin user + sample tables
npm run dev         # http://localhost:3000
```
Default login: **admin / admin123**

### 3. Frontend
```
cd frontend
npm install
npm start           # http://localhost:4200
```

## Swagger API Documentation & Testing Sandbox
Interactive Swagger documentation with JWT support is available at:
- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (also `/docs` and `/swagger`)

To test authenticated endpoints in Swagger:
1. Execute `POST /api/auth/login` with `admin` / `admin123`.
2. Copy the returned `token`.
3. Click the green **Authorize 🔓** button at the top right of the Swagger page.
4. Paste the token into the Value field and click **Authorize**.

## Tests
```
cd backend  && npm test          # Jest (22 tests)
cd frontend && npm run test:ci   # Jasmine/Karma, needs Chrome installed
```

## API (all except login need `Authorization: Bearer <token>`)
| Method | Route | Notes |
|---|---|---|
| POST | /api/auth/login | returns JWT |
| POST | /api/auth/logout | logs the action |
| GET/POST | /api/tables | filters: `location`, `status`, `minCapacity` |
| GET/PUT/DELETE | /api/tables/:id | |
| GET/POST | /api/bookings | filters: `date`, `status`, `table_id`, `search` |
| GET/PUT/DELETE | /api/bookings/:id | |

## Where each evaluation point lives
- Angular forms + validation: `frontend/src/app/components/*` (reactive forms, email, 10-digit phone, custom no-past-date validator)
- API integration + error handling: `frontend/src/app/services/*`, `interceptors/auth.interceptor.ts`, `toast.service.ts`
- Backend routes + DB queries: `backend/src/routes`, `backend/src/controllers` (parameterised SQL, double-booking and capacity checks)
- JWT + route protection: `backend/src/middleware/auth.js`, `frontend/src/app/guards/auth.guard.ts`
- Logging: `backend/src/config/logger.js` (console + `backend/logs/`)
- Tests: `backend/tests`, `frontend/src/app/**/*.spec.ts`
