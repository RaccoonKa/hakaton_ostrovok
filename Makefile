.PHONY: up down seed logs test lint check

up:
	docker compose up --build -d

down:
	docker compose down

seed:
	docker compose exec agent_service python -c "import asyncio; from memory.db_storage import init_db_and_seed; asyncio.run(init_db_and_seed())"

logs:
	docker compose logs -f

test:
	pytest tests/agents/travel/ -v

lint:
	ruff check src/

check: lint
	.venv/bin/pyrefly check
