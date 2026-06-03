# WB App

Приложение для управления отгрузками Wildberries. Позволяет вести базу товаров, формировать списки отгрузок с нумерацией коробок и экспортировать данные в XLSX и PDF.

## Стек технологий

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — сборка и dev-сервер
- [Tailwind CSS 4](https://tailwindcss.com/) — стилизация
- [lucide-react](https://lucide.dev/) — иконки
- [xlsx](https://github.com/SheetJS/sheetjs) — экспорт в Excel
- [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/nicolevanderhoeven/jspdf-autotable) — экспорт в PDF
- [Express](https://expressjs.com/) — бэкенд-сервер (опционально)
- [dotenv](https://github.com/motdotla/dotenv) — переменные окружения

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Копирование переменных окружения
cp .env.example .env
# → отредактируйте .env, подставив свои значения

# Запуск dev-сервера (порт 3000)
npm run dev

# Сборка для продакшена
npm run build

# Превью собранного бандла
npm run preview

# Проверка типов TypeScript
npm run lint
```

## Переменные окружения

| Переменная | Описание                              |
| ---------- | ------------------------------------- |
| `APP_URL`  | URL, на котором развёрнуто приложение |

Файл `.env` не коммитится в Git (см. `.gitignore`). Используйте `.env.example` как шаблон.

## Структура проекта

```
wb_app/
├── .env.example          # Шаблон переменных окружения
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── assets/
├── src/
│   ├── App.tsx           # Корневой компонент, состояние приложения
│   ├── main.tsx          # Точка входа
│   ├── index.css
│   ├── types.ts          # TypeScript-интерфейсы (DatabaseProduct, ShipmentItem)
│   ├── data.ts           # База товаров по умолчанию
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── MainDisplay.tsx
│   │   └── Sidebar.tsx
│   └── utils/
│       └── fileGenerator.ts  # Экспорт в XLSX и PDF
└── ...
```

## Основной функционал

- **База товаров** — добавление, редактирование и удаление товаров (название, штрихкод, артикул)
- **Отгрузки** — формирование списка позиций с автоматической нумерацией коробок
- **Сохранение** — все данные хранятся в `localStorage` браузера
- **Экспорт** — выгрузка отгрузки в `.xlsx` и `.pdf`

## Лицензия

MIT
