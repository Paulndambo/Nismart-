# Nissmart Finance App

A micro-savings and payout platform with transaction engine, ledger system, and operational dashboards.

## Project Structure

```
/backend          - Django REST API
/frontend         - React.js application
/docs             - Architecture documentation and flow diagrams
```

## Prerequisites

### For Docker Setup (Recommended)
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Docker Compose v2.0+

### For Manual Setup
- Python 3.8+
- Node.js 16+
- PostgreSQL (or SQLite for development)
- Redis (optional, for caching - falls back to in-memory if not available)
- pip and npm

## Docker Setup (Quick Start)

The easiest way to run the entire application is using Docker Compose:

1. **Clone the repository** (if you haven't already)

2. **Create a `.env` file** in the root directory (optional, defaults are provided):
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
USE_REDIS=True
RATELIMIT_ENABLE=True
```

3. **Build and start all services**:
```bash
docker-compose up --build
```

This will start:
- **PostgreSQL** database on port `5432`
- **Redis** cache on port `6379`
- **Django Backend** API on port `8000`
- **React Frontend** on port `3000`

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/api

5. **Create a superuser with account** (in a new terminal):
```bash
# Using default credentials (username: admin, password: admin123)
docker-compose exec backend python manage.py seed_superuser

# Or with custom credentials
docker-compose exec backend python manage.py seed_superuser --username admin --email admin@example.com --password yourpassword
```

6. **Stop all services**:
```bash
docker-compose down
```

7. **Stop and remove volumes** (clean slate):
```bash
docker-compose down -v
```

### Docker Commands

- **View logs**: `docker-compose logs -f [service_name]`
- **Rebuild a service**: `docker-compose up --build [service_name]`
- **Run migrations**: `docker-compose exec backend python manage.py migrate`
- **Create superuser with account**: `docker-compose exec backend python manage.py seed_superuser`
- **Access backend shell**: `docker-compose exec backend python manage.py shell`
- **Access database**: `docker-compose exec db psql -U nissmart_user -d nissmart`

## Backend Setup

### Quick Setup (Recommended)

**Windows:**
```bash
cd backend
setup.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Create a .env file in the backend directory
cp .env.example .env
# Edit .env with your database credentials (optional for SQLite)
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create a superuser with account (recommended):
```bash
# Using default credentials (username: admin, password: admin123)
python manage.py seed_superuser

# Or with custom credentials
python manage.py seed_superuser --username admin --email admin@example.com --password yourpassword
```

Alternatively, create a superuser without account (legacy):
```bash
python manage.py createsuperuser
```

7. Start the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

**Note:** By default, the app uses SQLite for easy setup. For production, configure PostgreSQL in the `.env` file.

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, API URL is configured in vite.config.js):
```bash
VITE_API_URL=http://localhost:8000/api
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3  # or PostgreSQL connection string
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis Configuration (optional)
REDIS_URL=redis://127.0.0.1:6379/1
USE_REDIS=False  # Set to True to use Redis

# Rate Limiting
RATELIMIT_ENABLE=True
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
```

## API Endpoints

### Authentication (Public)
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login and get JWT tokens
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET /api/auth/profile/` - Get user profile (Authenticated)
- `GET /api/auth/list/` - List users (Admin only)

### Transactions (Authenticated)
- `POST /api/deposit/` - Simulate deposit
- `POST /api/transfer/` - Internal transfer
- `POST /api/withdraw/` - Simulate withdrawal
- `GET /api/balance/<user_id>/` - View balance
- `GET /api/transactions/<user_id>/` - View transaction history

### Admin (Admin Only)
- `GET /api/admin/stats/` - Admin dashboard statistics
- `GET /api/admin/transactions/` - All transactions for admin

**Note:** All transaction endpoints require JWT authentication. Include the token in the Authorization header: `Bearer <token>`

## Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Build
```bash
cd frontend
npm run build
npm run preview  # Preview production build
```


## Features

### Security & Performance
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Rate Limiting**: Protection against abuse with configurable limits per endpoint
- **Caching**: Redis/in-memory caching for improved performance
- **Permission System**: Role-based access control (Customer/Admin)

### Transaction Safety
- **Idempotency**: Prevents duplicate transactions
- **Atomicity**: Database transactions ensure data consistency
- **Row-level Locking**: Prevents race conditions
- **Balance Validation**: Prevents negative balances

## Documentation

- Architecture Document: `/docs/architecture.md`
- Flow Diagrams: `/docs/flow_diagrams.md`
- Project Summary: `/docs/PROJECT_SUMMARY.md`

## License

MIT

# Nismart-
