.PHONY: dev build up down logs clean restart

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up --build

dev-detached:
	docker-compose -f docker-compose.dev.yml up --build -d

# Production commands  
build:
	docker-compose build

up:
	docker-compose up

up-detached:
	docker-compose up -d

# Utility commands
down:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose logs -f web

logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f web

restart:
	docker-compose restart web

restart-dev:
	docker-compose -f docker-compose.dev.yml restart web

clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f

# Help
help:
	@echo "Available commands:"
	@echo "  dev          - Start development environment with hot reload"
	@echo "  dev-detached - Start development environment in background"
	@echo "  build        - Build production images"
	@echo "  up           - Start production environment"
	@echo "  up-detached  - Start production environment in background"
	@echo "  down         - Stop all services"
	@echo "  logs         - Show production logs"
	@echo "  logs-dev     - Show development logs"
	@echo "  restart      - Restart production web service"
	@echo "  restart-dev  - Restart development web service"
	@echo "  clean        - Clean up containers and images"