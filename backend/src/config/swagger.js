const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Gusto Reserve - Restaurant Reservation Manager API',
    version: '1.0.0',
    description: `
Interactive API documentation and testing sandbox for **Gusto Reserve**.

### How to test JWT Authentication:
1. Go to **Auth** &rarr; **POST /api/auth/login**.
2. Click **Try it out**, ensure credentials are \`admin\` and \`admin123\`, and click **Execute**.
3. Copy the \`token\` value from the response body.
4. Click the green **Authorize 🔓** button at the top right of the page.
5. Paste the token into the **Value** box and click **Authorize**.
6. All protected routes (Tables, Bookings, Logout) are now unlocked and can be tested directly!
    `,
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from POST /api/auth/login',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'admin123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              username: { type: 'string', example: 'admin' },
              role: { type: 'string', example: 'admin' },
            },
          },
        },
      },
      Table: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          table_number: { type: 'integer', example: 5 },
          capacity: { type: 'integer', example: 4 },
          location: {
            type: 'string',
            enum: ['indoor', 'outdoor', 'private'],
            example: 'indoor',
          },
          status: {
            type: 'string',
            enum: ['available', 'maintenance'],
            example: 'available',
          },
          created_at: { type: 'string', example: '2026-10-16T13:47:00.000Z' },
        },
      },
      TableInput: {
        type: 'object',
        required: ['table_number', 'capacity'],
        properties: {
          table_number: { type: 'integer', example: 6 },
          capacity: { type: 'integer', example: 4 },
          location: {
            type: 'string',
            enum: ['indoor', 'outdoor', 'private'],
            example: 'outdoor',
          },
          status: {
            type: 'string',
            enum: ['available', 'maintenance'],
            example: 'available',
          },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          table_id: { type: 'integer', example: 1 },
          table_number: { type: 'integer', example: 2 },
          guest_name: { type: 'string', example: 'Ravi Kumar' },
          guest_email: { type: 'string', example: 'ravi@example.com' },
          guest_phone: { type: 'string', example: '9876543210' },
          party_size: { type: 'integer', example: 2 },
          booking_date: { type: 'string', format: 'date', example: '2026-11-20' },
          booking_time: { type: 'string', example: '19:30' },
          status: {
            type: 'string',
            enum: ['confirmed', 'cancelled', 'completed'],
            example: 'confirmed',
          },
          notes: { type: 'string', example: 'Window seat preferred' },
        },
      },
      BookingInput: {
        type: 'object',
        required: [
          'table_id',
          'guest_name',
          'guest_email',
          'guest_phone',
          'party_size',
          'booking_date',
          'booking_time',
        ],
        properties: {
          table_id: { type: 'integer', example: 1 },
          guest_name: { type: 'string', example: 'Ravi Kumar' },
          guest_email: { type: 'string', example: 'ravi@example.com' },
          guest_phone: { type: 'string', example: '9876543210' },
          party_size: { type: 'integer', example: 2 },
          booking_date: { type: 'string', format: 'date', example: '2026-11-20' },
          booking_time: { type: 'string', example: '19:30' },
          status: {
            type: 'string',
            enum: ['confirmed', 'cancelled', 'completed'],
            example: 'confirmed',
          },
          notes: { type: 'string', example: 'Window seat preferred' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Error description' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'System Health Check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'API is running normally',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Admin Login',
        description: 'Authenticates credentials and returns a signed JWT token.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful. Returns JWT token.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: {
            description: 'Username or password missing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        description: 'Logs the logout event for the authenticated user.',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Logged out successfully' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (token missing or invalid)',
          },
        },
      },
    },
    '/api/tables': {
      get: {
        summary: 'List Restaurant Tables',
        description: 'Get all tables with optional filters (location, status, minCapacity). Requires JWT.',
        tags: ['Tables'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'location',
            in: 'query',
            description: 'Filter by dining area',
            schema: { type: 'string', enum: ['indoor', 'outdoor', 'private'] },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by table status',
            schema: { type: 'string', enum: ['available', 'maintenance'] },
          },
          {
            name: 'minCapacity',
            in: 'query',
            description: 'Filter by minimum guest capacity',
            schema: { type: 'integer', example: 4 },
          },
        ],
        responses: {
          200: {
            description: 'List of restaurant tables',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Table' },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create New Table',
        description: 'Add a new restaurant dining table.',
        tags: ['Tables'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TableInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Table created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Table' },
              },
            },
          },
          400: { description: 'Validation failed' },
          409: { description: 'Duplicate table number' },
        },
      },
    },
    '/api/tables/{id}': {
      get: {
        summary: 'Get Table by ID',
        tags: ['Tables'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Table details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Table' },
              },
            },
          },
          404: { description: 'Table not found' },
        },
      },
      put: {
        summary: 'Update Table',
        tags: ['Tables'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TableInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Table updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Table' },
              },
            },
          },
          404: { description: 'Table not found' },
        },
      },
      delete: {
        summary: 'Delete Table',
        tags: ['Tables'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Table deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Table deleted' },
                  },
                },
              },
            },
          },
          404: { description: 'Table not found' },
        },
      },
    },
    '/api/bookings': {
      get: {
        summary: 'List Bookings',
        description: 'Get all guest bookings with filters (date, status, table_id, search). Requires JWT.',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'date',
            in: 'query',
            description: 'Filter by reservation date (YYYY-MM-DD)',
            schema: { type: 'string', format: 'date', example: '2026-11-20' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by status (confirmed, cancelled, completed)',
            schema: { type: 'string', enum: ['confirmed', 'cancelled', 'completed'] },
          },
          {
            name: 'table_id',
            in: 'query',
            description: 'Filter by table ID',
            schema: { type: 'integer' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search by guest name or email',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of bookings',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Booking' },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create New Booking',
        description: 'Create a reservation. Checks table existence, capacity, availability and prevents double bookings.',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Booking' },
              },
            },
          },
          400: { description: 'Validation failed' },
          409: { description: 'Table capacity exceeded or slot already booked' },
        },
      },
    },
    '/api/bookings/{id}': {
      get: {
        summary: 'Get Booking by ID',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Booking details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Booking' },
              },
            },
          },
          404: { description: 'Booking not found' },
        },
      },
      put: {
        summary: 'Update Booking',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Booking updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Booking' },
              },
            },
          },
          404: { description: 'Booking not found' },
          409: { description: 'Conflict with another reservation' },
        },
      },
      delete: {
        summary: 'Delete Booking',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Booking deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Booking deleted' },
                  },
                },
              },
            },
          },
          404: { description: 'Booking not found' },
        },
      },
    },
  },
};

module.exports = { swaggerUi, swaggerDocument };
