"""Сид демо-целей для карты целей (промпт №17, dev-утилита — не импортировать из приложения).

Запуск из backend/ (venv-лаунчеры битые, только так):

    python -m scripts.seed_demo_goals

Идемпотентность по-простому: если в БД уже есть цели — выходим, ничего не создавая.
Содержимое — по мотивам демо-контента frontend/src/os/data.ts: 1 корень с двумя
KPI-таргетами, 4 ребёнка (один без owner и без KPI — увидим туман; один с KPI без
target — тоже туман), 1 отдельный корень.
"""

import asyncio

from app.db.session import SessionLocal
from app.schemas.goal import GoalCreate, GoalKpi
from app.services import goal_service


async def seed() -> None:
    async with SessionLocal() as session:
        existing = await goal_service.list_goals(session)
        if existing:
            print(f"В БД уже есть цели ({len(existing)}) — сид не требуется, ничего не создаю.")
            return

        root_entity, _goal, _kpis = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Выручка 120 млн ₽ / год",
                owner="Смирнова А.",
                description="Главная внешняя цель года.",
                kpis=[
                    GoalKpi(name="Выручка за год", target=120, unit="млн ₽"),
                    GoalKpi(name="Средний чек", target=185, unit="тыс ₽"),
                ],
            ),
        )

        children = [
            GoalCreate(
                name="Внедрение CRM",
                owner="Атлас-CRM",
                parent_id=root_entity.id,
                kpis=[GoalKpi(name="Конверсия воронки", target=12, unit="%")],
            ),
            GoalCreate(
                name="Усиление отдела продаж",
                owner="Соколова М.",
                parent_id=root_entity.id,
                kpis=[GoalKpi(name="Наняты менеджеры", target=2, unit="чел")],
            ),
            # Туман войны: ни владельца, ни KPI.
            GoalCreate(name="Пилоты в enterprise-сегменте", owner="", parent_id=root_entity.id),
            # Туман войны: владелец есть, но KPI без числового таргета.
            GoalCreate(
                name="Партнёрский канал",
                owner="Смирнова А.",
                parent_id=root_entity.id,
                kpis=[GoalKpi(name="Региональные партнёры", target=None, unit="шт")],
            ),
        ]
        for payload in children:
            await goal_service.create_goal(session, payload)

        await goal_service.create_goal(
            session,
            GoalCreate(
                name="Найм 6 инженеров",
                owner="Соколова М.",
                description="Отдельный корень: внутренняя работа под «Атлас 2.0».",
                kpis=[GoalKpi(name="Инженеры в штате", target=6, unit="чел")],
            ),
        )

        print("Создано 6 демо-целей: корень с 4 детьми (двое — в тумане) + отдельный корень.")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
