# CRM Consulting Backend

A comprehensive CRM system backend with social media customer discovery features built with Node.js, Express, PostgreSQL, and Sequelize.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 👥 User management with role-based access control
- 🏢 Company and contact management
- 💼 Sales pipeline and opportunity tracking
- 📊 Activity logging and task management
- 🌐 Social media profile integration
- 📈 Analytics and reporting dashboard
- 🔍 Lead discovery from social media (mock implementation)
- 🛡️ Security middleware and input validation
- 🚀 RESTful API with comprehensive error handling

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator, joi
- **Security**: helmet, cors, bcryptjs
- **Rate Limiting**: express-rate-limit
- **Environment**: dotenv

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── app.js           # Main application file
├── migrations/          # Database migrations
├── seeders/            # Database seeders
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 16 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials and other configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=crm_consulting_dev
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   
   # JWT Secrets
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_REFRESH_SECRET=your_refresh_secret_key_here
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb crm_consulting_dev
   
   # Run migrations
   npm run migrate
   
   # Seed default data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## API Documentation

### Base URL
```
Development: http://localhost:3000/api/v1
```

### Authentication Endpoints

#### POST /auth/login
Login with email and password
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /auth/refresh
Refresh access token
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### POST /auth/logout
Logout user (requires authentication)

#### GET /auth/profile
Get current user profile (requires authentication)

### Core Endpoints

- **Companies**: `/api/v1/companies`
- **Contacts**: `/api/v1/contacts`
- **Social Media**: `/api/v1/social`
- **Analytics**: `/api/v1/analytics`

### Example Requests

#### Create a Company
```bash
curl -X POST http://localhost:3000/api/v1/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Corp",
    "domain": "techcorp.com",
    "industry": "Technology",
    "size": "medium"
  }'
```

#### Get Dashboard Analytics
```bash
curl -X GET "http://localhost:3000/api/v1/analytics/dashboard?period=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

The database includes the following main entities:

- **Users**: System users with role-based access
- **Companies**: Business organizations
- **Contacts**: Individual contacts/leads
- **Opportunities**: Sales pipeline items
- **Activities**: Tasks and interactions
- **Pipeline Stages**: Customizable sales stages
- **Social Profiles**: Social media profile links
- **User Sessions**: JWT refresh token management

## Security Features

- Password hashing with bcryptjs
- JWT access and refresh tokens
- Rate limiting
- Input sanitization
- SQL injection prevention
- XSS protection
- Role-based access control
- Secure headers with Helmet

## Scripts

```bash
# Start server
npm start

# Development mode with auto-reload
npm run dev

# Run database migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Run database seeders
npm run seed

# Undo database seeders
npm run seed:undo

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3000 |
| `HOST` | Server host | localhost |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | crm_consulting_dev |
| `DB_USERNAME` | Database username | postgres |
| `DB_PASSWORD` | Database password | |
| `JWT_SECRET` | JWT signing secret | |
| `JWT_REFRESH_SECRET` | JWT refresh secret | |
| `JWT_EXPIRES_IN` | Access token expiry | 1h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |

## API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": [
      // Additional error details if applicable
    ]
  }
}
```

## Rate Limiting

- Default: 1000 requests per hour per IP
- Configurable via environment variables
- Different limits can be set for different endpoints

## Social Media Integration

The system includes mock implementations for social media lead discovery:

- **Platforms**: LinkedIn, Twitter, Facebook, Instagram
- **Features**: Profile linking, engagement tracking, lead discovery
- **Lead Scoring**: Automated scoring based on social activity

*Note: This is a mock implementation. Production use would require integration with actual social media APIs.*

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.