# Docker Commands Quick Reference

## Basic Commands

### Start Services
```bash
# Build and start all services
docker-compose up --build

# Start in detached mode (background)
docker-compose up -d --build

# Start specific service
docker-compose up backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean database)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f redis
```

## Database Commands

### Run Migrations
```bash
docker-compose exec backend python manage.py migrate
```

### Create Superuser with Account
```bash
# Using default credentials (username: admin, password: admin123)
docker-compose exec backend python manage.py seed_superuser
```

### Access Database Shell
```bash
# PostgreSQL shell
docker-compose exec db psql -U nissmart_user -d nissmart

# Django shell
docker-compose exec backend python manage.py shell
```

### Reset Database
```bash
# Stop and remove volumes
docker-compose down -v

# Start again (will recreate database)
docker-compose up --build
```

## Development Commands

### Rebuild Specific Service
```bash
docker-compose build backend
docker-compose build frontend
docker-compose up --build backend
```

### Execute Commands in Container
```bash
# Backend commands
docker-compose exec backend python manage.py <command>

# Frontend commands (if using dev mode)
docker-compose exec frontend npm run <command>
```

### Access Container Shell
```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh
```

## Troubleshooting

### Check Service Status
```bash
docker-compose ps
```

### Restart Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### View Resource Usage
```bash
docker stats
```

### Clean Up
```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune

# Full cleanup (careful!)
docker system prune -a
```