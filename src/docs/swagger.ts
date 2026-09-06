export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'RUUTED Agricultural Platform API',
    version: '1.0.0',
    description:
      'Production backend services, real-time escrow architecture, AI agronomy, and structured negotiation engine for RUUTED.'
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Server health check',
        responses: {
          200: { description: 'API is healthy' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a new Buyer or Farmer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'phoneNumber', 'role', 'state', 'lga'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  phoneNumber: { type: 'string' },
                  role: { type: 'string', enum: ['buyer', 'farmer'] },
                  state: { type: 'string' },
                  lga: { type: 'string' },
                  farmName: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'User registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user and auto-detect role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Authentication token returned' } }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Current profile' } }
      }
    },
    '/listings': {
      get: {
        summary: 'Search & filter produce marketplace listings',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'List of listings' } }
      },
      post: {
        summary: 'Create produce listing (Farmer only)',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Listing created' } }
      }
    },
    '/orders': {
      get: {
        summary: 'List user orders (purchases or incoming fulfillment)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'List of orders' } }
      },
      post: {
        summary: 'Create an escrow order (Buyer only)',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Order created' } }
      }
    },
    '/orders/{id}/status': {
      patch: {
        summary: 'Update order status (Farmer only: ACCEPTED, REJECTED, COMPLETED)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Status updated' } }
      }
    },
    '/orders/{id}/negotiations': {
      post: {
        summary: 'Submit structured negotiation counter-proposal',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Proposal created' } }
      }
    },
    '/orders/{id}/negotiations/{proposalId}/respond': {
      post: {
        summary: 'Accept or decline structured negotiation proposal',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'proposalId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Proposal resolved and order adjusted' } }
      }
    },
    '/orders/{id}/chat/messages': {
      post: {
        summary: 'Send chat message with server-side Anti-Circumvention masking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Message sent' } }
      }
    },
    '/pest/diagnose': {
      post: {
        summary: 'Submit plant distress symptoms for Gemini AI multimodal vision diagnosis',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Diagnostic report generated' } }
      }
    },
    '/knowledge/ask': {
      post: {
        summary: 'Query AI Agronomy knowledge repository',
        responses: { 200: { description: 'Actionable agronomic advice' } }
      }
    }
  }
};
