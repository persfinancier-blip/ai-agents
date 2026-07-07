---
paths:
  - "frontend/**"
---

# Frontend-правила

- Стек: React 19 + TypeScript + Vite, линтер `oxlint`. API-клиент — `src/api.ts`, общие типы — `src/types.ts`. Прототип игровой панели — `src/os/` (`CommandPanel.tsx`, `GoalCard.tsx`, `ProcessMap.tsx`, данные `data.ts`/`goals.ts`).
- **Все строки UI — на русском** (устоявшиеся техтермины и коды — как есть: API, KPI, GOAL-014).
- Цвета и типографика — только токены из `src/index.css :root`; новые цвета не заводить, компоненты сперва переиспользовать из классов `src/os/os.css`. Канон — бренд-бук: `docs/full-vision/09_Design_System/Visual_Reference.md`, Часть II (D2 токены, D5 каталог, D6 семантика состояний, D9 правила применения).
- Семантику состояний не переназначать: зелёный = выполнено/ok, жёлтый = активно/внимание, красный = риск/дефицит, пунктир = черновик/будущее/нет данных.
- Анимации — только `os-pulse`/`os-flow`; любая новая обязана гаситься `prefers-reduced-motion`.
- Перед PR: `npm run build` и `npm run lint` проходят.
