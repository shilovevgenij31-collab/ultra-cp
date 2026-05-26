# Ultra-CP — Калькулятор юнит-экономики

Веб-сервис для расчёта юнит-экономики IT-проектов и генерации коммерческих предложений с помощью ИИ.

## Стек

- **Backend:** Node.js + Express
- **База данных:** SQLite (better-sqlite3)
- **Аутентификация:** JWT + bcryptjs
- **AI:** Anthropic Claude API (генерация КП)
- **Деплой:** pm2 на VPS

## Функциональность

- Расчёт себестоимости, цены, чистой прибыли и MRR
- Поддержка почасового и фиксированного типов расчёта
- Мультиисполнители с разными ставками и окладами
- Настраиваемые доли распределения (продукт / маркетинг / продажи / адм / налоги / ЧП)
- Генерация КП по текстовому описанию через Claude API
- Сохранение расчётов с историей в боковой панели
- Публичные зашифрованные ссылки на КП для клиентов
- Тёмная и светлая темы на всех страницах
- Роли: администратор и редактор

## Структура проекта

```
ultra-cp/
├── server.js              # Express-приложение, порт 3001
├── db.js                  # SQLite: схема, инициализация, функции
├── middleware/
│   └── auth.js            # JWT middleware, requireAdmin
├── routes/
│   ├── auth.js            # POST /api/auth/login, GET /api/auth/me
│   ├── admin.js           # Настройки и управление пользователями
│   ├── calculations.js    # История расчётов
│   └── kp.js              # Публичные страницы КП
└── public/
    ├── index.html         # Калькулятор
    ├── login.html         # Страница входа
    ├── admin.html         # Панель администратора
    └── theme.js           # Общий модуль тёмной/светлой темы
```

## Запуск локально

```bash
npm install
npm start        # порт 3001
# или
npm run dev      # с автоперезагрузкой
```

Открыть: http://localhost:3001

## Деплой на сервер

```bash
# Скопировать файлы (без node_modules и базы)
rsync -avz --exclude node_modules --exclude calc.db --exclude .git . root@<IP>:/opt/ultra-cp/

# На сервере
cd /opt/ultra-cp
npm install
pm2 start server.js --name ultra-cp
pm2 save
pm2 startup
```

## API

### Аутентификация

```
POST /api/auth/login        { username, password } → { token, user }
GET  /api/auth/me           → { id, username, role, display_name }
```

### Расчёты

```
GET  /api/calculations      → список всех расчётов
POST /api/calculations      { title, client, calc_params, kp_data, price } → { id, slug }
GET  /api/calculations/:id  → полный объект расчёта
```

### Настройки (публичные)

```
GET  /api/settings          → { dist_product, dist_marketing, dist_sales, dist_admin, dist_taxes, dist_profit, base_rate }
```

### Админ (требует role: admin)

```
GET  /api/admin/settings         → все настройки включая api_key и промпт
PUT  /api/admin/settings         { key: value, ... }
GET  /api/admin/users            → список пользователей
PUT  /api/admin/users/:id/password  { password }
PUT  /api/admin/users/:id/name      { display_name }
```

### КП (публичный)

```
GET  /kp/:slug              → HTML страница коммерческого предложения
```

## Учётные данные по умолчанию

| Роль | Логин | Пароль |
|---|---|---|
| Администратор | `admin` | `Admin1234` |
| Редактор 1–6 | `editor1`–`editor6` | `Editor1234` |

> Смените пароли через админ-панель `/admin` перед первым использованием.

## Переменные окружения

Приложение не использует `.env` файл — все константы хранятся в коде:

| Константа | Файл | Описание |
|---|---|---|
| `JWT_SECRET` | `middleware/auth.js` | Секрет для подписи токенов |
| `KP_SLUG_SECRET` | `routes/calculations.js` | Секрет для генерации slug |
| `PORT` | `server.js` | Порт сервера (3001) |

## База данных

SQLite файл `calc.db` создаётся автоматически при первом запуске. Содержит таблицы:

- `users` — пользователи (логин, хэш пароля, роль, имя)
- `settings` — настройки (доли, ставка, API-ключ, промпт)
- `calculations` — сохранённые расчёты и КП

## Лицензия

Приватный проект. Все права защищены.
