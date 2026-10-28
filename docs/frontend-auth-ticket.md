# Тикет: Интеграция аутентификации и изоляции тредов (Web & Mobile)

> **Статус:** Готов к интеграции на клиентах  
> **Команды:** Frontend (`apps/web`), Mobile (`apps/mobile`)  
> **Backend Ветка:** `feature/auth-and-thread-isolation`

---

## 1. Обзор архитектуры

Бэкенд переведён на модель строгой аутентификации на основе **Bearer JWT** с изоляцией диалогов (**Thread Ownership**):
1. **Stateless гостевой вход:** Пользователи без аккаунта начинают сессию как гости (`POST /auth/guest`). Токен генерируется мгновенно без записи в базу данных.
2. **Изоляция тредов:** Каждый созданный `thread_id` привязывается к пользователю. При попытке доступа к чужому треду (`/invoke`, `/stream`, `/history`, `/agui/run`) бэкенд возвращает `404 Not Found`.
3. **Бесшовная миграция тредов:** При регистрации (`/auth/register`) или входе (`/auth/login`) передаётся текущий `guest_token`. Бэкенд криптографически проверяет подпись токена и перепривязывает все диалоги гостя к постоянному профилю пользователя.
4. **Защита от брутфорса:** Эндпоинт `/auth/login` защищён скользящим Rate Limiter (максимум 5 попыток в минуту по IP/email, при превышении отдаётся `HTTP 429 Too Many Requests`).

---

## 2. Спецификация API эндпоинтов

### 2.1. `POST /auth/guest` — Получение гостевого токена
- **Назначение:** Инициализация сессии для неавторизованного пользователя.
- **Заголовки:** Не требуются.
- **Тело запроса:** Пустое.
- **Ответ (HTTP 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "guest_550e8400-e29b-41d4-a716-446655440000",
    "email": "",
    "full_name": "Гость",
    "phone": null,
    "is_guest": true,
    "created_at": "2026-10-28T14:00:00.000000+00:00"
  }
}
```

---

### 2.2. `POST /auth/register` — Регистрация
- **Назначение:** Создание нового аккаунта с миграцией гостевых диалогов.
- **Тело запроса (`RegisterRequest`):**
```json
{
  "email": "traveler@ostrovok.ru",
  "password": "StrongPassword123!",
  "full_name": "Алексей Смирнов",
  "phone": "+79991234567",
  "guest_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // необязательно
}
```
- **Ответ (HTTP 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "email": "traveler@ostrovok.ru",
    "full_name": "Алексей Смирнов",
    "phone": "+79991234567",
    "is_guest": false,
    "created_at": "2026-10-28T14:05:00.000000+00:00"
  }
}
```
- **Ошибки:**
  - `400 Bad Request` — пользователь с таким email уже зарегистрирован.

---

### 2.3. `POST /auth/login` — Вход
- **Назначение:** Авторизация существующего пользователя с переносом текущих диалогов гостя.
- **Тело запроса (`LoginRequest`):**
```json
{
  "email": "traveler@ostrovok.ru",
  "password": "StrongPassword123!",
  "guest_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // необязательно
}
```
- **Ответ (HTTP 200):** Аналогично `POST /auth/register`.
- **Ошибки:**
  - `401 Unauthorized` — неверный логин или пароль.
  - `429 Too Many Requests` — превышен лимит попыток входа (более 5 в минуту).

---

### 2.4. `GET /auth/me` — Текущий профиль
- **Заголовок:** `Authorization: Bearer <token>`
- **Ответ (HTTP 200):**
```json
{
  "id": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "traveler@ostrovok.ru",
  "full_name": "Алексей Смирнов",
  "phone": "+79991234567",
  "is_guest": false,
  "created_at": "2026-10-28T14:05:00.000000+00:00"
}
```
- **Ошибки:**
  - `401 Unauthorized` — токен отсутствует, истёк или недействителен.

---

### 2.5. Защищённые эндпоинты сервиса
Все следующие эндпоинты требуют заголовок `Authorization: Bearer <token>`:
- `POST /invoke` и `POST /{agent_id}/invoke`
- `POST /stream` и `POST /{agent_id}/stream`
- `POST /history` и `POST /{agent_id}/history`
- `GET /threads` и `GET /{agent_id}/threads` (параметр `user_id` больше не требуется, треды фильтруются строго по токену!)
- `POST /agui/run` и `POST /agui/{agent_id}/run`

При отсутствии токена возвращается `HTTP 401 Unauthorized`.  
При попытке передать `thread_id`, принадлежащий другому пользователю, возвращается `HTTP 404 Not Found`.

---

## 3. Рекомендации по реализации на клиентах (Web & Mobile)

### 3.1. Синглтон инициализации сессии (защита от race condition)
Чтобы избежать множественных запросов `/auth/guest` при ререндерах React 19 (StrictMode):

```typescript
// packages/shared/src/client/authStorage.ts
let initPromise: Promise<string> | null = null;

export async function ensureAuthToken(apiBaseUrl: string): Promise<string> {
  const existingToken = localStorage.getItem("corvax_auth_token");
  if (existingToken) {
    return existingToken;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/guest`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to get guest session");
        const data = await res.json();
        localStorage.setItem("corvax_auth_token", data.token);
        localStorage.setItem("corvax_user", JSON.stringify(data.user));
        return data.token;
      } finally {
        initPromise = null;
      }
    })();
  }
  return initPromise;
}
```

### 3.2. Автоматическая передача заголовка в `TravelApiClient`
В клиенте API добавить перехватчик/заголовок:

```typescript
// packages/shared/src/client/travelApi.ts
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("corvax_auth_token");
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  return fetch(url, { ...options, headers });
}
```

### 3.3. Сценарий логина / регистрации с миграцией
Когда пользователь вводит логин/пароль в модальном окне:

```typescript
export async function handleLogin(email: string, pass: string) {
  const currentToken = localStorage.getItem("corvax_auth_token");
  const currentUser = JSON.parse(localStorage.getItem("corvax_user") || "{}");

  const guestToken = currentUser.is_guest ? currentToken : undefined;

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: pass,
      guest_token: guestToken,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      alert("Слишком много попыток. Пожалуйста, подождите минуту.");
      return;
    }
    throw new Error("Invalid credentials");
  }

  const { token, user } = await res.json();
  localStorage.setItem("corvax_auth_token", token);
  localStorage.setItem("corvax_user", JSON.stringify(user));
  // Все треды гостя автоматически перенесены бэкендом!
}
```

---

## 4. Чек-лист приёмки (Acceptance Criteria)
- [x] Бэкенд генерирует гостевой токен через `POST /auth/guest` без записей в БД.
- [x] При регистрации или логине с `guest_token` треды гостя переходят в профиль пользователя.
- [x] При попытке доступа к чужому `thread_id` возвращается `404 Not Found`.
- [x] 6-я попытка неверного логина в течение минуты возвращает `429 Too Many Requests`.
- [x] Все методы API корректно валидируют `Authorization: Bearer <token>`.
