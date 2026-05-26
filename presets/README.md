# Типовые пресеты КП EdAgency

8 типовых услуг. Для каждой — готовая data-структура, которую
редактор видит в калькуляторе и может только:
1. подставить имя клиента / организации
2. дать скидку
3. выбрать менеджера и telegram

Цифры (цена, часы, срок) **зафиксированы**. Редактор их не меняет.

## Структура пресета

```js
{
  slug:       'course-turnkey',       // машинный id, URL-safe
  label:      'Курс под ключ',        // человеческое имя в списке
  category:   'Программа',            // группировка
  priceFrom:  900000,                 // минимальная цена (для карточки в списке)
  maxDiscount: 20,                    // максимальная допустимая скидка (%)

  data: {                             // data для renderKPPage / renderKPPdf
    title:     '…',
    intro:     '…',
    price:     900000,                // итог без скидки
    durationWeeks: 12,

    concept: {                        // новая секция «01 — Концепция»
      audienceLabel: 'Для кого',
      audience:      'Эксперт…',
      analogy:       '…',
      cards: [
        { label: 'Что мы делаем', title: '…', desc: '…' },
        …
      ],
    },

    screens: {                        // новая секция «02 — Экраны программы»
      tabs: [
        { id:'overview', label:'Обзор', title:'…', desc:'…',
          features:[{title:'…',desc:'…'},…],
          image: '/product-shots/course-overview.png' },  // опционально
        …
      ],
    },

    modules:  [ { name, bullets[], price } ],  // как раньше
    roadmap:  [ { weeks, title, desc } ],
    stages:   [ { title, features[], price, prepay } ],
    // … остальные поля как в текущем data
  },
}
```

## Файлы

| Slug                  | Label                    |
|-----------------------|--------------------------|
| `course-turnkey`      | Курс под ключ            |
| `mentorship`          | Программа-наставничество |
| `marathon`            | Марафон / мини-продукт   |
| `lessons`             | Уроки / короткий курс    |
| `landing`             | Маркетинговый лендинг    |
| `sales-deck`          | Продающая презентация    |
| `webinar`             | Вебинар                  |
| `lead-magnet`         | Лид-магнит               |

## Визуалы программы

Каждый пресет в `screens.tabs[i].image` ожидает путь вида
`/product-shots/<slug>-<tab>.png`. Файлы лежат в
`public/product-shots/`. Если файл не найден — блок рендерится без
изображения (только текстовый контент фич).
