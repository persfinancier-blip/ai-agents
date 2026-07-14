// Вектор·OS — демо-данные двух экранов (панель управления + карточка цели).
// Контент соответствует утверждённым дизайн-рендерам. Реальны только Decisions
// из API (счётчик в нижнем баре); Goal Entity придёт на бэкенде в M6–M8.

export interface RailBlock {
  id: string
  name: string
  hp: string
  tone?: 'on' | 'warn' | 'risk' | 'off'
  icon: string // ключ иконки
}

export const RAIL_ACTIVE: RailBlock[] = [
  { id: 'strategy', name: 'Стратегия и цели', hp: '74', tone: 'on', icon: 'hex' },
  { id: 'finance', name: 'Финансы', hp: '68', tone: 'warn', icon: 'chart' },
  { id: 'people', name: 'Персонал', hp: '52', tone: 'risk', icon: 'person' },
  { id: 'sales', name: 'Продажи · CRM', hp: '77', icon: 'house' },
  { id: 'ops', name: 'Операции', hp: '61', tone: 'warn', icon: 'clock' },
  { id: 'univ', name: 'Университет', hp: '70', icon: 'grad' },
  { id: 'risks', name: 'Риски', hp: '64', tone: 'warn', icon: 'tri' },
]

export const RAIL_OFF: RailBlock[] = [
  { id: 'mkt', name: 'Маркетинг', hp: '—', tone: 'off', icon: 'mega' },
  { id: 'proc', name: 'Закупки', hp: '—', tone: 'off', icon: 'box' },
  { id: 'acc', name: 'Бухгалтерия', hp: '—', tone: 'off', icon: 'doc' },
]

/* карта целей: цепочка-процесс */

export interface MapGoal {
  id: string
  code: string
  kind: string
  name: string
  pct: number
  tone: 'done' | 'warn' | 'risk' | 'next'
  ft: [string, string]
  x: number
  y: number
  w: number
}

export const MAP_GOALS: MapGoal[] = [
  {
    id: 'g16',
    code: 'GOAL-016',
    kind: 'внутренняя работа',
    name: 'Найм 6 инженеров',
    pct: 25,
    tone: 'risk',
    ft: ['25% · риск', 'отв. Соколова М.'],
    x: 20,
    y: 56,
    w: 250,
  },
  {
    id: 'g13',
    code: 'GOAL-013',
    kind: 'продукт',
    name: 'Запуск «Атлас 2.0»',
    pct: 34,
    tone: 'warn',
    ft: ['34% · заблокирована', 'отв. Козлов Д.'],
    x: 320,
    y: 56,
    w: 265,
  },
  {
    id: 'g12',
    code: 'GOAL-012',
    kind: 'завершена 28.05',
    name: 'Юнит-экономика стабильна',
    pct: 100,
    tone: 'done',
    ft: ['✓ 100%', '2 хода'],
    x: 20,
    y: 292,
    w: 230,
  },
  {
    id: 'g18',
    code: 'GOAL-018',
    kind: 'планируется',
    name: 'Выход в enterprise-сегмент',
    pct: 0,
    tone: 'next',
    ft: ['после GOAL-014', 'отв. —'],
    x: 780,
    y: 292,
    w: 245,
  },
]

export interface FocusStage {
  n: string
  name: string
  who: string
  whoKind: 'human' | 'ai' | 'none'
  st: string
  state: 'done' | 'act' | 'wait'
}

export const FOCUS_GOAL = {
  code: 'GOAL-014',
  name: 'Выручка 120 млн ₽ / год',
  sub: 'GOAL-014 · активная цель · владелец Смирнова А.',
  pct: 58,
  x: 280,
  y: 196,
  w: 430,
  stages: [
    { n: '✓', name: 'Пересмотр тарифной сетки', who: 'Волкова Е.', whoKind: 'human', st: 'готово', state: 'done' },
    { n: '2', name: 'Внедрение CRM · 3 подпроцесса', who: 'Атлас-CRM + Смирнова', whoKind: 'ai', st: '● в работе', state: 'act' },
    { n: '3', name: 'Усиление отдела продаж', who: 'Соколова М.', whoKind: 'human', st: 'ожидает', state: 'wait' },
    { n: '4', name: 'Пилоты в enterprise-сегменте', who: 'не назначен', whoKind: 'none', st: 'ожидает', state: 'wait' },
  ] as FocusStage[],
  ft: { res: '2,4 млн ₽/кв', team: '3 чел + 2 AI', dec: '2' },
}

/* советники: настраиваемые слоты */

export interface ChatMsg {
  who: 'ai' | 'me'
  meta: string
  html: string
}

export interface AdvisorSlot {
  id: string
  name: string
  role: string
  chat: ChatMsg[]
  quick: string[]
}

export const ADVISOR_SLOTS: AdvisorSlot[] = [
  {
    id: 'cfo',
    name: 'Финансист',
    role: 'CFO-профиль',
    chat: [
      {
        who: 'ai',
        meta: 'ФИНАНСИСТ · вчера 18:20',
        html: 'Кассовый разрыв прогнозируется через <b class="hl">6 недель</b>, если найм шести инженеров пойдёт по плану. Рекомендую сдвинуть два выхода на сентябрь.',
      },
      {
        who: 'me',
        meta: 'ВЫ · вчера 18:24',
        html: 'А если ускорить этап CRM и поднять конверсию — закроем разрыв выручкой?',
      },
      {
        who: 'ai',
        meta: 'ФИНАНСИСТ · вчера 18:25',
        html: 'Частично. CRM даст эффект не раньше чем через 5 недель — останется разрыв <b class="hl">≈1,1 млн ₽</b>. Комбинация «сдвиг одного выхода + ускорение CRM» закрывает его полностью. <span class="lnk">→ черновик решения Д-043</span>',
      },
      {
        who: 'ai',
        meta: 'ФИНАНСИСТ · сегодня 09:12',
        html: 'Обновил прогноз по GOAL-014: этап 2 идёт с опережением на 4 дня, вероятность достижения 120 млн выросла до <b class="hl">71%</b>.',
      },
    ],
    quick: ['прогноз по цели', 'что с кассой?', 'создать решение'],
  },
  {
    id: 'strat',
    name: 'Стратег',
    role: 'оргструктура',
    chat: [
      {
        who: 'ai',
        meta: 'СТРАТЕГ · сегодня 08:40',
        html: 'Под цель «Выход в enterprise-сегмент» нет должности аналитика рынка. Предлагаю добавить её в коммерческий отдел — подготовил профиль и KPI.',
      },
      {
        who: 'ai',
        meta: 'СТРАТЕГ · вчера 17:05',
        html: 'Найм шести инженеров перегружает Соколову М. — на этапах требуется <b class="hl">70%</b> её времени при выделенных 50%. Вариант: передать скрининг агенту.',
      },
    ],
    quick: ['предложи структуру', 'кто перегружен?'],
  },
]

/* оверлей разговора (дизайн v2, промпт №20): демо-темы, привязанные к целям */

export interface AdvisorTopic {
  id: string
  title: string
  meta: string
}

export const ADVISOR_TOPICS: AdvisorTopic[] = [
  { id: 't-cash', title: 'Касса и найм', meta: 'сегодня · GOAL-014' },
  { id: 't-forecast', title: 'Прогноз выручки', meta: 'вчера · GOAL-014' },
  { id: 't-unit', title: 'Юнит-экономика', meta: '28.05 · GOAL-012' },
]

/* карточка цели GOAL-014 */

export const GOAL_CARD = {
  code: 'GOAL-014',
  title: 'Выручка 120 млн ₽ / год',
  sub: 'GOAL-014 · цель · владелец Смирнова А. (EMP-0012) · создана 12.04.2026 ·',
  visibility: '◈ ВИДИМОСТЬ: ТОП-МЕНЕДЖМЕНТ',
  status: 'АКТИВНА · ХОД 14',
  kpis: [
    { l: 'ПРОГРЕСС', v: '58%', c: 'var(--op)' },
    { l: 'ПРОГНОЗ ДОСТИЖЕНИЯ', v: '71%', c: 'var(--gr)' },
    { l: 'СРОК', v: '31.12', c: 'var(--ink)' },
  ],
  chain: {
    prev: {
      id: 'ПРЕДЫДУЩАЯ ЦЕЛЬ · GOAL-012',
      name: 'Юнит-экономика стабильна',
      pct: 100,
      bar: 'var(--gr)',
      ft: ['✓ завершена 28.05', '2 хода'],
      ftColor: 'var(--gr)',
    },
    cur: {
      id: 'ТЕКУЩАЯ ЦЕЛЬ · GOAL-014',
      name: 'Выручка 120 млн ₽ / год',
      pct: 58,
      bar: 'var(--op)',
      ft: ['58% · этап 2 из 4', 'отв. Смирнова А.'],
      ftColor: 'var(--op)',
    },
    next: {
      id: 'СЛЕДУЮЩАЯ ЦЕЛЬ · GOAL-018',
      name: 'Выход в enterprise-сегмент',
      pct: 0,
      bar: 'transparent',
      ft: ['откроется после текущей', 'отв. —'],
      ftColor: 'var(--i40)',
    },
  },
  stages: [
    {
      n: '✓',
      state: 'done',
      name: 'Пересмотр тарифной сетки',
      dsc: 'Новые тарифы утверждены решением Д-041, средний чек вырос на 9%.',
      sub: [
        { t: 'анализ конкурентов ✓' },
        { t: 'модель тарифов ✓' },
        { t: 'утверждение Д-041 ✓' },
      ],
      who: [
        { kind: 'human', name: 'Волкова Е.', role: 'исполнитель' },
        { kind: 'ai', name: 'Атлас-Прогноз', role: 'расчёты' },
      ],
      due: '12.04 — 30.05',
      st: 'ГОТОВО',
    },
    {
      n: '2',
      state: 'act',
      name: 'Внедрение CRM',
      dsc: 'Миграция воронки, автоматизация писем, дашборд конверсии. Опережение графика на 4 дня.',
      sub: [
        { t: 'миграция данных ✓' },
        { t: 'автописьма · в работе', ai: true },
        { t: 'дашборд конверсии' },
      ],
      who: [
        { kind: 'ai', name: 'Атлас-CRM', role: 'исполнитель' },
        { kind: 'human', name: 'Смирнова А.', role: 'приёмка' },
      ],
      due: '01.06 — 15.08',
      st: '● В РАБОТЕ',
    },
    {
      n: '3',
      state: 'wait',
      name: 'Усиление отдела продаж',
      dsc: 'Найм менеджера, аттестация в Университете, персональные планы.',
      sub: [
        { t: 'вакансия менеджера' },
        { t: 'аттестация команды' },
        { t: 'KPI этапа не задан', miss: true },
      ],
      who: [{ kind: 'human', name: 'Соколова М.', role: 'исполнитель' }],
      due: '15.08 — 30.09',
      st: 'ОЖИДАЕТ',
    },
    {
      n: '4',
      state: 'wait',
      name: 'Пилоты в enterprise-сегменте',
      dsc: 'Три пилотных контракта — мост к следующей цели GOAL-018.',
      sub: [{ t: 'шорт-лист клиентов' }, { t: 'пилотные договоры' }],
      who: [],
      due: '01.10 — 15.12',
      st: 'ОЖИДАЕТ',
    },
  ],
  advisorChecks: [
    { tone: 'ok', m: '✓', html: '<b>Измеримость:</b> KPI «выручка 120 млн ₽» с прогнозом 71%' },
    { tone: 'ok', m: '✓', html: '<b>Связность:</b> предыдущая и следующая цели заданы' },
    { tone: 'wr', m: '⚠', html: '<b>Этап 3 без KPI</b> — добавьте метрику найма/аттестации' },
    { tone: 'er', m: '✕', html: '<b>Этап 4 без ответственного</b> — назначьте сотрудника или AI' },
  ],
  security: [
    { id: 'owner', name: 'Собственник', hint: 'только вы' },
    { id: 'mgmt', name: 'Менеджмент', hint: 'все руководители' },
    { id: 'top', name: 'Топ-менеджмент', hint: 'C-level · 4 чел' },
    { id: 'except', name: 'Все, кроме…', hint: 'исключения' },
    { id: 'list', name: 'Все из списка…', hint: 'точечный доступ' },
  ],
  grants: [
    { t: 'Смирнова А. · владелец' },
    { t: 'Волкова Е.' },
    { t: 'Козлов Д.' },
    { t: 'Финансист · советник', ai: true },
  ],
}

/* ═══════════ рекурсивное дерево целей (правки 1–3, M5) ═══════════ */

/** Единая рабочая сила (§28): различие юнитов — маркер типа, не логика. */
export type UnitKind = 'human' | 'digital' | 'hybrid' | 'team' | 'dept'

/** Жизненный цикл цели (§14.3). */
export type GoalLifecycle = 'draft' | 'active' | 'review' | 'archived'

export interface OsUnit {
  id: string
  kind: UnitKind
  name: string
  detail: string
}

/** Назначение юнита на узел-цель: доля загрузки и стоимость. */
export interface OsResource {
  unitId: string
  kind: UnitKind
  /** % ёмкости юнита */
  load: number
  /** тыс ₽ / мес */
  cost?: number
}

/** Переход процесса между этапами одной цели (§14.4). */
export interface OsTransition {
  from: string
  to: string
  kind: 'seq' | 'split' | 'join'
  /** видимая метка условия на связи */
  condition?: string
  /** режим слияния: дождаться всех / достаточно любой */
  mode?: 'all' | 'any'
}

/** Цель. Этап цели — сам по себе цель: та же анатомия, рекурсия через stages. */
export interface OsGoal {
  id: string
  code: string
  name: string
  owner: string
  ownerKind: 'human' | 'ai' | 'none'
  lifecycle: GoalLifecycle
  /** прогресс KPI, % (своё значение узла; свёртка считается хелпером) */
  kpi: number
  due?: string
  dsc?: string
  /** подпроцессы-чипы (для листьев без собственных этапов) */
  sub?: { t: string; ai?: boolean; miss?: boolean }[]
  resources?: OsResource[]
  stages?: OsGoal[]
  process?: OsTransition[]
}

export const UNIT_KIND_LABEL: Record<UnitKind, string> = {
  human: 'человек',
  digital: 'цифровой',
  hybrid: 'гибрид',
  team: 'команда',
  dept: 'департамент',
}

export const UNITS: OsUnit[] = [
  { id: 'u-smirnova', kind: 'human', name: 'Смирнова А.', detail: 'коммерческий директор' },
  { id: 'u-volkova', kind: 'human', name: 'Волкова Е.', detail: 'финансы' },
  { id: 'u-sokolova', kind: 'human', name: 'Соколова М.', detail: 'HR · найм' },
  { id: 'u-kozlov', kind: 'human', name: 'Козлов Д.', detail: 'CTO' },
  { id: 'u-atlas-crm', kind: 'digital', name: 'Атлас-CRM', detail: 'наставник — Смирнова А.' },
  { id: 'u-atlas-fc', kind: 'digital', name: 'Атлас-Прогноз', detail: 'наставник — Волкова Е.' },
  { id: 'u-dept-sales', kind: 'dept', name: 'Коммерческий отдел', detail: 'весь департамент' },
]

// прототип: тыс ₽/мес за 1% загрузки — чтобы стоимость жила при изменении доли
export const COST_RATE: Record<UnitKind, number> = {
  human: 1.8,
  digital: 0.2,
  hybrid: 1.0,
  team: 5,
  dept: 8,
}

/** Дерево целей компании. Ids уникальны по всему дереву. */
export const GOAL_TREE: OsGoal[] = [
  {
    id: 'g12',
    code: 'GOAL-012',
    name: 'Юнит-экономика стабильна',
    owner: 'Волкова Е.',
    ownerKind: 'human',
    lifecycle: 'archived',
    kpi: 100,
    due: '28.05',
    dsc: 'Закрыта за 2 хода: маржинальность выровнена, кассовые разрывы устранены.',
    resources: [{ unitId: 'u-volkova', kind: 'human', load: 20, cost: 36 }],
  },
  {
    id: 'g16',
    code: 'GOAL-016',
    name: 'Найм 6 инженеров',
    owner: 'Соколова М.',
    ownerKind: 'human',
    lifecycle: 'active',
    kpi: 25,
    due: '30.09',
    dsc: 'Внутренняя работа: инженерная команда под «Атлас 2.0».',
    sub: [{ t: 'воронка кандидатов' }, { t: '2 оффера из 6' }, { t: 'онбординг-план', miss: true }],
    resources: [{ unitId: 'u-sokolova', kind: 'human', load: 60, cost: 108 }],
  },
  {
    id: 'g13',
    code: 'GOAL-013',
    name: 'Запуск «Атлас 2.0»',
    owner: 'Козлов Д.',
    ownerKind: 'human',
    lifecycle: 'active',
    kpi: 34,
    due: '15.11',
    dsc: 'Продуктовый релиз. Заблокирована наймом инженеров (GOAL-016).',
    sub: [{ t: 'архитектура ✓' }, { t: 'бета-контур · в работе', ai: true }, { t: 'релиз-план' }],
    resources: [{ unitId: 'u-kozlov', kind: 'human', load: 70, cost: 126 }],
  },
  {
    id: 'g14',
    code: 'GOAL-014',
    name: 'Выручка 120 млн ₽ / год',
    owner: 'Смирнова А.',
    ownerKind: 'human',
    lifecycle: 'active',
    kpi: 58,
    due: '31.12',
    dsc: 'Главная внешняя цель года; двигается решениями Д-041 и Д-043.',
    resources: [
      { unitId: 'u-smirnova', kind: 'human', load: 40, cost: 72 },
      { unitId: 'u-volkova', kind: 'human', load: 30, cost: 54 },
      { unitId: 'u-atlas-crm', kind: 'digital', load: 60, cost: 12 },
      { unitId: 'u-atlas-fc', kind: 'digital', load: 30, cost: 6 },
    ],
    stages: [
      {
        id: 'g14s1',
        code: 'GOAL-014.1',
        name: 'Пересмотр тарифной сетки',
        owner: 'Волкова Е.',
        ownerKind: 'human',
        lifecycle: 'archived',
        kpi: 100,
        due: '12.04 — 30.05',
        dsc: 'Новые тарифы утверждены решением Д-041, средний чек вырос на 9%.',
        sub: [{ t: 'анализ конкурентов ✓' }, { t: 'модель тарифов ✓' }, { t: 'утверждение Д-041 ✓' }],
        resources: [
          { unitId: 'u-volkova', kind: 'human', load: 20, cost: 36 },
          { unitId: 'u-atlas-fc', kind: 'digital', load: 30, cost: 6 },
        ],
      },
      {
        id: 'g14s2',
        code: 'GOAL-014.2',
        name: 'Внедрение CRM',
        owner: 'Атлас-CRM',
        ownerKind: 'ai',
        lifecycle: 'active',
        kpi: 60,
        due: '01.06 — 15.08',
        dsc: 'Миграция воронки, автоматизация писем, дашборд конверсии. Опережение графика на 4 дня.',
        resources: [
          { unitId: 'u-atlas-crm', kind: 'digital', load: 60, cost: 12 },
          { unitId: 'u-smirnova', kind: 'human', load: 30, cost: 54 },
        ],
        stages: [
          {
            id: 'g14s2a',
            code: 'GOAL-014.2.1',
            name: 'Миграция данных воронки',
            owner: 'Атлас-CRM',
            ownerKind: 'ai',
            lifecycle: 'archived',
            kpi: 100,
            due: '01.06 — 20.06',
            dsc: '4 200 сделок перенесены, расхождений нет.',
            sub: [{ t: 'выгрузка ✓' }, { t: 'маппинг полей ✓' }, { t: 'сверка ✓' }],
            resources: [{ unitId: 'u-atlas-crm', kind: 'digital', load: 30, cost: 6 }],
          },
          {
            id: 'g14s2b',
            code: 'GOAL-014.2.2',
            name: 'Автоматизация писем',
            owner: 'Атлас-CRM',
            ownerKind: 'ai',
            lifecycle: 'active',
            kpi: 45,
            due: '20.06 — 25.07',
            dsc: 'Цепочки прогрева и реактивации; приёмка — Смирнова А.',
            sub: [{ t: 'цепочка прогрева · в работе', ai: true }, { t: 'реактивация' }],
            // вместе с g14s2a: Атлас-CRM 30+40 = 70% > 60% на родителе — демо перегруза
            resources: [{ unitId: 'u-atlas-crm', kind: 'digital', load: 40, cost: 8 }],
          },
          {
            id: 'g14s2c',
            code: 'GOAL-014.2.3',
            name: 'Дашборд конверсии',
            owner: 'Волкова Е.',
            ownerKind: 'human',
            lifecycle: 'draft',
            kpi: 0,
            due: '25.07 — 15.08',
            dsc: 'Витрина конверсии по этапам воронки для еженедельного разбора.',
            sub: [{ t: 'метрики этапов' }, { t: 'алерты падения' }],
            resources: [{ unitId: 'u-volkova', kind: 'human', load: 10, cost: 18 }],
          },
        ],
        process: [
          { from: 'g14s2a', to: 'g14s2b', kind: 'seq', condition: 'если миграция сверена' },
          { from: 'g14s2b', to: 'g14s2c', kind: 'seq' },
        ],
      },
      {
        id: 'g14s3',
        code: 'GOAL-014.3',
        name: 'Усиление отдела продаж',
        owner: 'Соколова М.',
        ownerKind: 'human',
        lifecycle: 'draft',
        kpi: 0,
        due: '15.08 — 30.09',
        dsc: 'Найм менеджера, аттестация в Университете, персональные планы.',
        sub: [{ t: 'вакансия менеджера' }, { t: 'аттестация команды' }, { t: 'KPI этапа не задан', miss: true }],
        // Соколова не выделена на родителе GOAL-014 — демо warn-сигнала
        resources: [{ unitId: 'u-sokolova', kind: 'human', load: 40, cost: 72 }],
      },
      {
        id: 'g14s5',
        code: 'GOAL-014.5',
        name: 'Партнёрский канал',
        owner: 'не назначен',
        ownerKind: 'none',
        lifecycle: 'draft',
        kpi: 0,
        due: '15.08 — 30.09',
        dsc: 'Альтернативная ветка: два региональных партнёра вместо расширения штата.',
        sub: [{ t: 'шорт-лист партнёров' }, { t: 'модель комиссии' }],
      },
      {
        id: 'g14s4',
        code: 'GOAL-014.4',
        name: 'Пилоты в enterprise-сегменте',
        owner: 'не назначен',
        ownerKind: 'none',
        lifecycle: 'draft',
        kpi: 0,
        due: '01.10 — 15.12',
        dsc: 'Три пилотных контракта — мост к следующей цели GOAL-018.',
        sub: [{ t: 'шорт-лист клиентов' }, { t: 'пилотные договоры' }],
      },
    ],
    process: [
      { from: 'g14s1', to: 'g14s2', kind: 'seq', condition: 'если тарифы утверждены' },
      { from: 'g14s2', to: 'g14s3', kind: 'split', condition: 'если CRM в проде' },
      { from: 'g14s2', to: 'g14s5', kind: 'split', condition: 'если партнёрская модель' },
      { from: 'g14s3', to: 'g14s4', kind: 'join', mode: 'all' },
      { from: 'g14s5', to: 'g14s4', kind: 'join', mode: 'all' },
    ],
  },
  {
    id: 'g18',
    code: 'GOAL-018',
    name: 'Выход в enterprise-сегмент',
    owner: 'не назначен',
    ownerKind: 'none',
    lifecycle: 'draft',
    kpi: 0,
    dsc: 'Откроется после GOAL-014.',
  },
]

/** Цепочка «предыдущая → текущая → следующая» для корневых целей. */
export const GOAL_CHAIN: Record<string, { prev?: string; next?: string }> = {
  g14: { prev: 'g12', next: 'g18' },
}
