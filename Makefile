.PHONY: help up down logs ps restart \
        db-migrate db-reset db-seed \
        backend-dev backend-test backend-typecheck backend-install \
        frontend-dev frontend-test frontend-typecheck frontend-build frontend-install \
        test typecheck install \
        k8s-apply k8s-delete \
        ci clean \
        docker-build docker-push

.DEFAULT_GOAL := help

# ─── Variables ────────────────────────────────────────────
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
K8S_DIR      := k8s
DOCKER_COMPOSE := docker compose

# ─── Help ─────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ─── Infrastructure (Docker Compose) ──────────────────────
up: ## Start all 8 services
	$(DOCKER_COMPOSE) up -d
	@echo "Services starting... wait a moment, then run: make db-migrate"

down: ## Stop all services
	$(DOCKER_COMPOSE) down

restart: ## Restart all services
	$(DOCKER_COMPOSE) restart

logs: ## Tail logs for all services
	$(DOCKER_COMPOSE) logs -f

logs-%: ## Tail logs for a specific service (e.g. make logs-api)
	$(DOCKER_COMPOSE) logs -f $*

ps: ## Show running services status
	$(DOCKER_COMPOSE) ps

shell-%: ## Open shell in a service container (e.g. make shell-api)
	$(DOCKER_COMPOSE) exec $* sh

# ─── Database ─────────────────────────────────────────────
db-migrate: ## Run database migrations
	$(DOCKER_COMPOSE) exec api npx tsx src/db/migrate.ts

db-reset: ## Drop and recreate all tenant schemas (dev only)
	$(DOCKER_COMPOSE) exec postgres psql -U geostack -d geostack \
		-c "DROP SCHEMA IF EXISTS tenant_demo_telecom CASCADE;"
	$(DOCKER_COMPOSE) exec postgres psql -U geostack -d geostack \
		-c "DROP TABLE IF EXISTS public.users CASCADE;"
	$(DOCKER_COMPOSE) exec postgres psql -U geostack -d geostack \
		-c "DROP TABLE IF EXISTS public.organizations CASCADE;"
	$(MAKE) db-migrate

db-seed: ## Re-run seed scripts
	$(DOCKER_COMPOSE) exec postgres psql -U geostack -d geostack \
		-f /docker-entrypoint-initdb.d/02_seed.sql

db-psql: ## Open psql console
	$(DOCKER_COMPOSE) exec postgres psql -U geostack -d geostack

# ─── Backend ──────────────────────────────────────────────
backend-install: ## Install backend dependencies
	cd $(BACKEND_DIR) && pnpm install

backend-dev: ## Start backend dev server (local, needs infra up)
	cd $(BACKEND_DIR) && pnpm dev

backend-test: ## Run backend tests
	cd $(BACKEND_DIR) && pnpm test

backend-test-watch: ## Run backend tests in watch mode
	cd $(BACKEND_DIR) && pnpm test:watch

backend-typecheck: ## TypeScript check backend
	cd $(BACKEND_DIR) && npx tsc --noEmit

# ─── Frontend ─────────────────────────────────────────────
frontend-install: ## Install frontend dependencies
	cd $(FRONTEND_DIR) && pnpm install

frontend-dev: ## Start frontend dev server (local, needs infra up)
	cd $(FRONTEND_DIR) && pnpm dev

frontend-test: ## Run frontend tests
	cd $(FRONTEND_DIR) && pnpm test

frontend-test-watch: ## Run frontend tests in watch mode
	cd $(FRONTEND_DIR) && pnpm test:watch

frontend-typecheck: ## TypeScript check frontend
	cd $(FRONTEND_DIR) && npx tsc --noEmit

frontend-build: ## Build frontend for production
	cd $(FRONTEND_DIR) && pnpm build

# ─── All-In-One ───────────────────────────────────────────
install: backend-install frontend-install ## Install all dependencies

test: backend-test frontend-test ## Run all tests

test-watch: ## Run all tests in watch mode (two terminals recommended)
	@echo "Run in separate terminals: make backend-test-watch & make frontend-test-watch"

typecheck: backend-typecheck frontend-typecheck ## TypeScript check everything

ci: typecheck test ## Full CI check (type + test), same as GitHub Actions
	@echo "✅ CI check passed"

# ─── Docker Build ─────────────────────────────────────────
docker-build: ## Build Docker images for backend and frontend
	docker build -t geostack-api:latest -f docker/backend.Dockerfile .
	docker build -t geostack-web:latest -f docker/frontend.Dockerfile .
	@echo "Images built: geostack-api:latest, geostack-web:latest"

# ─── Kubernetes ───────────────────────────────────────────
k8s-apply: ## Apply all Kubernetes manifests
	kubectl apply -k $(K8S_DIR)/

k8s-delete: ## Delete all Kubernetes resources
	kubectl delete -k $(K8S_DIR)/

k8s-status: ## Show Kubernetes resources status
	kubectl -n geostack get all,ingress,pvc,configmap,secret

k8s-logs-%: ## Tail logs for a K8s deployment (e.g. make k8s-logs-api)
	kubectl -n geostack logs -f deployment/$*

# ─── Cleanup ──────────────────────────────────────────────
clean: ## Remove all containers, volumes, and node_modules
	$(DOCKER_COMPOSE) down -v --remove-orphans
	rm -rf $(BACKEND_DIR)/node_modules $(FRONTEND_DIR)/node_modules
	@echo "Cleaned containers, volumes, and node_modules"

clean-docker: ## Remove Docker images
	docker rmi geostack-api:latest geostack-web:latest 2>/dev/null; true

# ─── Setup (First Time) ───────────────────────────────────
setup: install up db-migrate ## Full first-time setup
	@echo ""
	@echo "============================================"
	@echo "  Geostack is running!"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  API:       http://localhost:3000"
	@echo "  MinIO:     http://localhost:9001"
	@echo "  Keycloak:  http://localhost:8081/admin"
	@echo "  GeoServer: http://localhost:8080/geoserver"
	@echo "============================================"
