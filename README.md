# О!дин запрос (Трек: «О!дин запрос — AI-агент Ostrovok»)

Подбор путешествий (билеты + отель + трансфер) по запросу на естественном языке с обязательным объяснением компромиссов и рисков.

- ссылка на видео-скринкаст (обязательно): [Ссылка на скринкаст (Яндекс.Диск / Google Drive)](https://disk.yandex.ru/)

## Быстрый старт

```bash
git clone https://github.com/ostrovok-hackathon-2026/corvax-plan.git
cd corvax-plan
cp .env.example .env   # указать GIGACHAT_CREDENTIALS
docker compose up --build -d
# открыть http://localhost:8080
```

Управление через `Makefile`:
```bash
make up     # запуск контейнеров в фоне
make logs   # логи сервисов
make down   # остановка контейнеров
```

## Зависимости и переменные окружения

Рекомендованные ресурсы:
- 2 CPU cores
- 4 GB RAM

Зависимости:
- Postgres 16 (в `docker-compose.yml` как `db`)
- Провайдер LLM: GigaChat (модель: `GigaChat-2` / `GigaChat-Max`)

Переменные окружения со значениями по умолчанию:
- `PORT` (по умолчанию `8080`)
- `HOST` (по умолчанию `0.0.0.0`)
- `MODE` (по умолчанию `production`)
- `GIGACHAT_CREDENTIALS` (ключ API GigaChat для жюри)
- `DEFAULT_MODEL` (по умолчанию `GigaChat-2`)
- `DATABASE_TYPE` (по умолчанию `postgres`)
- `POSTGRES_HOST` (по умолчанию `db`)
- `POSTGRES_PORT` (по умолчанию `5432`)
- `POSTGRES_USER` (по умолчанию `postgres`)
- `POSTGRES_PASSWORD` (по умолчанию `postgres`)
- `POSTGRES_DB` (по умолчанию `agent_service`)
- `AUTH_SECRET` (по умолчанию `corvax-hackathon-secret-key-2026`)

## Сидирование

Сидирование базы данных выполняется автоматически при старте контейнера `agent_service` из `data/*.json` (направления, отели, рейсы, поезда, трансферы).

Ручной перезапуск сидирования:
```bash
docker compose exec agent_service python -c "import asyncio; from memory.db_storage import init_db_and_seed; asyncio.run(init_db_and_seed())"
# или:
make seed
```

## Маршруты/доступ

- `/` — UI (React SPA)
- `/health` — 200 OK, JSON `{ "status": "ok" }`
- `/agui/` и `/travel_agent/stream` — SSE-стриминг генерации вариантов тура
- `/auth/guest` и `/auth/login` — сессии пользователей
- Тестовый пользователь: гостевая сессия создается автоматически при входе на `/`; для прямого доступа к API: заголовок `Authorization: Bearer <AUTH_SECRET>`

## Функционал

1. **Тур «под ключ»:** связка транспорта (авиа / ж/д), трансфера и отеля с расчетом стыковок и времени заселения.
2. **Объяснение компромиссов и рисков (требование трека):**
   - **Почему подходит:** соответствие запросу, попадание в бюджет, рейтинг;
   - **Компромиссы:** расстояние до центра, ранние вылеты, пересадки;
   - **Риски:** невозвратные тарифы, короткие стыковки, погодные условия.
3. **Диалоговый консьерж:** замена компонентов маршрута, изменение дат и консультация по поездке в чате.

## Шифрование секретов (rules-encryption.md)

Секреты передаются в зашифрованном файле `secrets.env.age` в корне репозитория:
```bash
age -r age1932fu7f70rwyfhaxflyfszz4gf6avxwc95wc0yjwm6zns9tspycqpgdnc0 -o secrets.env.age .env
```
Открытый файл `.env` добавлен в `.gitignore` и в репозиторий не попадает.
