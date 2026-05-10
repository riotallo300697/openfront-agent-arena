# OpenFront Agent Arena — Project Plan & Working Agreement

> Цель документа: дать пошаговый план реализации проекта через OpenAI Codex: от подготовки рабочего пространства до полноценной платформы, где пользователи могут подключать автономных агентов к соревновательным матчам OpenFront и наблюдать за ними в реальном времени.

---

## 0. Краткое описание идеи

**OpenFront Agent Arena** — это соревновательная платформа для автономных агентов на базе игры OpenFront.

Идея проекта:

1. Есть сервер, который запускает матч OpenFront без участия человека.
2. Каждый игрок в матче — это не человек, а внешний автономный агент.
3. Агент получает описание текущей игровой ситуации в понятном машинном формате.
4. Агент отправляет действия: атаковать, расширяться, строить, защищаться, заключать союз и т.п.
5. Сервер проверяет действия, применяет их к симуляции и считает результат.
6. После матча сохраняются replay, статистика и рейтинг агентов.
7. Позже появляется веб-интерфейс, где пользователи могут регистрировать агентов, запускать матчи, смотреть матчи в реальном времени, смотреть replay и сравнивать агентов по рейтингу.

---

# Part A — Working Agreement

## 1. Роли

### Человек

Человек выполняет роль координатора проекта.

Человек:

- принимает архитектурные решения;
- говорит, какие функции важны;
- проверяет результат глазами пользователя;
- решает, когда переходить к следующему этапу;
- задает ограничения: проще, сложнее, дешевле, надежнее, быстрее;
- утверждает изменения, которые влияют на архитектуру проекта.

### Codex

Codex выполняет роль разработчика-исполнителя.

Codex:

- изучает кодовую базу;
- предлагает технические варианты;
- объясняет их простым языком;
- пишет код;
- создает тесты;
- исправляет ошибки;
- обновляет документацию;
- готовит pull request или коммит;
- не принимает крупные архитектурные решения без согласования.

---

## 2. Общий стиль работы

Codex должен работать по принципу:

> Человек координирует и высказывает пожелания — Codex реализует.

Это означает:

- человек не обязан глубоко понимать код;
- Codex должен объяснять, что делает и зачем;
- Codex должен избегать лишней технической сложности;
- Codex должен предлагать понятные варианты, если есть развилка;
- Codex должен двигаться вперед по `PROJECT_PLAN.md` автономными проверяемыми пакетами;
- Codex не должен спрашивать подтверждение на изменение каждого файла, если пакет следует текущему плану и не попадает в раздел 4.

---

## 3. Требования к объяснениям Codex

На каждом этапе Codex должен объяснять:

1. Что будет сделано.
2. Зачем это нужно.
3. Какие файлы будут изменены.
4. Как проверить результат.
5. Какие риски или ограничения есть.

Объяснение должно быть коротким и понятным для не программиста.

Пример хорошего объяснения:

```text
Я добавлю отдельный модуль arena-runner. Он нужен, чтобы запускать игровую логику OpenFront без браузера. Пока он не будет управлять настоящей игрой, а только проверит, что мы можем импортировать core-модули OpenFront из Node.js.
```

Пример плохого объяснения:

```text
Я сделаю refactor dependency graph, чтобы decouple runtime primitives from side-effectful Pixi rendering layer.
```

---

## 4. Когда Codex обязан спросить мнение человека

Codex должен остановиться и спросить мнение перед решениями, которые влияют на будущее проекта.

Это закрытый список категорий для обязательного согласования. Если изменение не попадает в этот список и не является крупной архитектурной развилкой, Codex должен действовать сам и уведомить человека после выполнения.

Обычные изменения кода в рамках текущего этапа, тесты, smoke checks и документация не требуют предварительного согласия. В том числе Codex должен сам обновлять напрямую связанные документы и `docs/DEVELOPMENT_LOG.md`, если это нужно для фиксации завершенного пакета.

К таким решениям относятся:

- менять ли структуру репозитория;
- создавать ли отдельный пакет;
- менять ли существующий код OpenFront;
- выбирать REST или WebSocket как основной API;
- выбирать формат observation;
- выбирать формат action;
- менять правила игры;
- добавлять базу данных;
- добавлять очередь задач;
- добавлять авторизацию;
- добавлять Docker;
- добавлять frontend framework;
- добавлять MCP adapter;
- менять лицензионные или attribution-файлы;
- делать публичный endpoint;
- запускать пользовательский код на сервере.

---

## 5. Как Codex должен предлагать архитектурные развилки

Формат:

```md
## Решение: как подключать агентов?

### Вариант A — REST API
Простее реализовать, легче отлаживать, но хуже подходит для real-time.

### Вариант B — WebSocket API
Лучше подходит для матчей в реальном времени, но сложнее.

### Моя рекомендация
Начать с REST для MVP, затем добавить WebSocket.

### Вопрос к человеку
Согласны ли вы начать с REST API для MVP?
```

---

## 6. Рабочий цикл Codex

Каждая задача должна выполняться в таком цикле:

1. Прочитать релевантные файлы.
2. Кратко объяснить план.
3. Внести связанный пакет изменений.
4. Запустить тесты или проверку.
5. Показать, что изменилось.
6. Предложить следующий разумный шаг, чтобы человеку не нужно было спрашивать отдельно.

Правило продолжения: после каждого завершенного шага Codex сразу предлагает следующий конкретный шаг. Предложение должно быть коротким и практичным.

---

## 7. Ограничение на размер изменений

Codex не должен делать огромные изменения за один раз.

Предпочтительный размер задачи — связанный проверяемый пакет, который можно понять и проверить целиком:

- 1 новая функция;
- или 1-2 новых модуля, если они обслуживают одну цель;
- или небольшой refactor вместе с тестами, которые доказывают его безопасность;
- или несколько тестовых сценариев для одной зоны поведения;
- или документация, которая прямо относится к текущему пакету.

Если задача затрагивает много файлов, но остается в рамках текущего этапа и не попадает в раздел 4, Codex может выполнить ее без отдельного подтверждения. Перед подтверждением нужно останавливаться только на крупных архитектурных развилках, изменениях из раздела 4 или когда риск явно выходит за рамки текущего плана.

---

## 8. Правило “сначала доказательство, потом усложнение”

Перед созданием полноценной системы нужно доказать каждый ключевой риск.

Порядок доказательств:

1. Можно ли запустить OpenFront core без браузера?
2. Можно ли провести матч двух простых ботов?
3. Можно ли сохранить replay?
4. Можно ли подключить внешнего агента через API?
5. Можно ли наблюдать матч в реальном времени?
6. Можно ли безопасно подключить MCP/OpenClaw?
7. Можно ли сделать рейтинг и турниры?

---

## 9. Правило документации

После каждого этапа Codex должен обновлять документацию.

Минимум:

- `docs/PROJECT_PLAN.md`;
- `docs/WORKING_AGREEMENT.md`;
- `docs/ARCHITECTURE.md`;
- `docs/AGENT_RULES.md`;
- `docs/AGENT_API.md`;
- `docs/DEVELOPMENT_LOG.md`.

Если этап был длинным или сложным, Codex также должен добавить в `docs/DEVELOPMENT_LOG.md` короткий handoff-блок для возможного нового чата.

---

## 9.1. Правило коммитов

Коммит должен быть смысловой точкой возврата в разработке, а не обязательным действием после каждой мелкой правки.

Codex должен предлагать commit, когда готов один из вариантов:

- завершенный code package с проверкой;
- значимый milestone этапа;
- связанный пакет документации, который закрывает этап или нужен для handoff;
- изменение, к которому полезно иметь отдельную точку отката.

Мелкие documentation-only изменения можно не коммитить сразу. Их можно оставить до следующего значимого пакета, если они не нужны для handoff, закрытия этапа или фиксации проектного решения.

Когда Codex предлагает commit, он должен коротко объяснить, почему это полезная точка возврата.

---

## 10. Правило проверки

Для каждого изменения Codex должен указать команду проверки.

Если менялась только документация, запускать `npm.cmd run arena:check` не нужно. В этом случае Codex должен прямо указать, что проверка не запускалась, потому что код и команды не менялись.

Примеры:

```bash
npm run test
npm run lint
npm run arena:local
npm run arena:smoke
npm run dev
```

Если автоматическая проверка пока невозможна, Codex должен объяснить, как проверить вручную.

---
## 11. Правило управления контекстом Codex

Codex должен следить за тем, не становится ли текущий чат слишком длинным для эффективной работы.

Контекстное окно — это объем информации, который модель может учитывать одновременно: текущие инструкции, историю чата, релевантные файлы, вывод команд, diff, документацию и внутренние заметки. Чем больше контекст, тем выше шанс, что работа станет медленнее, дороже по лимитам и менее точной.

### Когда Codex должен предложить новый чат

Codex должен предложить начать новый чат в рамках проекта, если выполняется одно или несколько условий:

1. Завершен крупный этап из `PROJECT_PLAN.md`.
2. В чате накопилось много технических деталей, логов, ошибок и исправлений.
3. Codex начинает часто пересказывать старые решения вместо выполнения текущей задачи.
4. Codexу приходится перечитывать большой объем файлов на каждом шаге.
5. Ответы становятся заметно медленнее.
6. Codex сам сообщает, что контекст близок к пределу.
7. Начинается новая архитектурная тема: например, после headless runner начинается Agent API, после Agent API начинается frontend, после frontend начинается MCP adapter.
8. Завершена задача, после которой нужен чистый старт: например, большой refactor, миграция структуры проекта или смена backend/frontend подхода.

### Что Codex должен сделать перед новым чатом

Перед тем как предложить новый чат, Codex должен подготовить короткий handoff-блок:

```md
## Handoff Summary

### Project
OpenFront Agent Arena

### Current stage
[номер и название этапа]

### What was completed
[короткий список завершенных задач]

### Current repository state
[ветка, важные файлы, новые команды запуска]

### Key decisions already made
[архитектурные решения, которые не нужно обсуждать заново]

### Known issues
[ошибки, ограничения, незакрытые вопросы]

### Next task
[следующий маленький шаг]

### Files the next Codex chat should read first
[список файлов]

### Suggested prompt for the new chat
[готовый промпт]
```

### Какой промпт Codex должен генерировать для нового чата

Codex должен подготовить готовый текст, который человек сможет скопировать в новый чат:

```md
Ты продолжаешь работу над проектом OpenFront Agent Arena на базе форка OpenFrontIO.

Работай по правилам из:
- docs/PROJECT_PLAN.md
- docs/WORKING_AGREEMENT.md
- docs/DEVELOPMENT_LOG.md

Текущий этап:
[название этапа]

Что уже сделано:
[краткое резюме]

Важные решения:
[список решений]

Текущая задача:
[следующая конкретная задача]

Перед началом:
1. Прочитай указанные файлы.
2. Кратко объясни, что понял.
3. Перечисли файлы, которые планируешь изменить.
4. Если есть архитектурная развилка, предложи варианты и спроси мое мнение.

Не делай крупных изменений без согласования. Объясняй простым языком, что и зачем делаешь.
```

### Важное правило

Новый чат не должен начинаться “с нуля”. Он должен начинаться с:

1. `PROJECT_PLAN.md`;
2. `WORKING_AGREEMENT.md`;
3. `DEVELOPMENT_LOG.md`;
4. handoff summary из прошлого чата;
5. текущего состояния репозитория.

### Как часто начинать новый чат

Рекомендуемая практика:

- один крупный этап — один чат;
- если этап короткий, можно объединить 2–3 маленьких этапа;
- если этап сложный, например headless runner или frontend live mode, лучше разбить его на несколько чатов;
- не нужно ждать полного исчерпания контекста: лучше начать новый чат раньше, чем продолжать работу в перегруженном.

---


# Part B — Project Plan

## 12. Общая структура будущего проекта

На раннем этапе лучше не создавать отдельный монорепозиторий. Проще начать с форка OpenFrontIO и добавить внутри него отдельную папку для арены.

Предлагаемая структура:

```text
OpenFrontIO/
  docs/
    PROJECT_PLAN.md
    WORKING_AGREEMENT.md
    ARCHITECTURE.md
    AGENT_RULES.md
    AGENT_API.md
    DEVELOPMENT_LOG.md

  src/
    core/
    client/
    server/

  arena/
    runner/
      src/
        index.ts
        matchRunner.ts
        matchConfig.ts
        observationBuilder.ts
        actionValidator.ts
        replayWriter.ts

    agents/
      random-agent/
      expand-agent/
      defensive-agent/
      balanced-agent/

    sdk/
      typescript/
      python/

    mcp/
      openfront-arena-mcp/

    web/
      frontend/

    replays/
      .gitkeep
```

На позднем этапе можно будет вынести arena в отдельный пакет или отдельный репозиторий.

---

# Этап 1 — подготовка рабочего пространства

## Цель этапа

Подготовить локальную рабочую среду, GitHub-репозиторий и базовую документацию проекта.

Этот этап ничего не меняет в логике игры.

## 1.1. Создать папку для проекта

Windows:

```powershell
mkdir D:\Projects
cd D:\Projects
```

Linux/macOS:

```bash
mkdir -p ~/Projects
cd ~/Projects
```

## 1.2. Форкнуть OpenFrontIO на GitHub

1. Открыть `https://github.com/openfrontio/OpenFrontIO`.
2. Нажать `Fork`.
3. Создать fork в своем GitHub-аккаунте.
4. Желательное имя fork: `openfront-agent-arena`.

## 1.3. Склонировать fork

```bash
git clone https://github.com/YOUR_USERNAME/openfront-agent-arena.git
cd openfront-agent-arena
```

Если fork называется `OpenFrontIO`:

```bash
git clone https://github.com/YOUR_USERNAME/OpenFrontIO.git openfront-agent-arena
cd openfront-agent-arena
```

## 1.4. Подключить upstream

```bash
git remote add upstream https://github.com/openfrontio/OpenFrontIO.git
git remote -v
```

Смысл:

- `origin` — ваш fork;
- `upstream` — оригинальный OpenFront.

## 1.5. Установить зависимости

Проверить Node.js:

```bash
node -v
npm -v
```

Установить зависимости:

```bash
npm run inst
```

Важно: для OpenFront рекомендуется использовать `npm run inst`, а не `npm install`.

## 1.6. Запустить OpenFront локально

```bash
npm run dev
```

Дополнительно могут быть полезны:

```bash
npm run start:client
npm run start:server-dev
```

## 1.7. Создать рабочую ветку

```bash
git checkout -b feature/agent-arena-foundation
```

## 1.8. Создать первые папки проекта

Linux/macOS:

```bash
mkdir -p docs
mkdir -p arena/runner/src
mkdir -p arena/agents
mkdir -p arena/sdk
mkdir -p arena/mcp
mkdir -p arena/web
mkdir -p arena/replays
touch arena/replays/.gitkeep
```

Windows PowerShell:

```powershell
mkdir docs
mkdir arena
mkdir arena\runner
mkdir arena\runner\src
mkdir arena\agents
mkdir arena\sdk
mkdir arena\mcp
mkdir arena\web
mkdir arena\replays
New-Item arena\replays\.gitkeep -ItemType File
```

## 1.9. Добавить базовые документы

Создать файлы:

```text
docs/PROJECT_PLAN.md
docs/WORKING_AGREEMENT.md
docs/ARCHITECTURE.md
docs/AGENT_RULES.md
docs/AGENT_API.md
docs/DEVELOPMENT_LOG.md
```

## 1.10. Первый коммит

```bash
git add .
git commit -m "Add initial agent arena project structure"
git push -u origin feature/agent-arena-foundation
```

## Задача для Codex на этап 1

```md
Изучи текущую структуру репозитория OpenFrontIO и подготовь проект к разработке OpenFront Agent Arena.

Нужно:
1. Не менять игровую логику.
2. Создать папки docs/ и arena/.
3. Добавить документы PROJECT_PLAN.md, WORKING_AGREEMENT.md, ARCHITECTURE.md, AGENT_RULES.md, AGENT_API.md и DEVELOPMENT_LOG.md.
4. В ARCHITECTURE.md кратко описать предполагаемую архитектуру: headless runner, Agent API, SDK, MCP adapter, frontend.
5. Проверить, что существующая игра по-прежнему запускается.
6. Объяснить простыми словами, что было сделано и зачем.

Перед изменениями покажи список файлов, которые планируешь создать.
```

---

# Этап 2 — техническая разведка OpenFront core

## Цель этапа

Понять, можно ли запустить игровую логику OpenFront без браузера.

## Что нужно выяснить

Codex должен найти ответы на вопросы:

1. Где создается игровая симуляция?
2. Где находится главный game loop?
3. Где описаны игроки?
4. Где описаны игровые действия?
5. Где действия игроков превращаются в изменения игрового состояния?
6. Где определяется победитель?
7. Есть ли replay или журнал событий?
8. Какие файлы зависят от браузера, canvas, PixiJS или DOM?
9. Можно ли импортировать core-модули из Node.js?
10. Какие части core полностью независимы от UI?

## Ожидаемый результат

Codex должен создать документ:

```text
docs/OPENFRONT_CORE_RESEARCH.md
```

Структура:

```md
# OpenFront Core Research

## Main findings

## Relevant files

## Game loop

## Player intents

## Game state

## Win condition

## Browser/UI dependencies

## Can we run this headlessly?

## Blockers

## Recommended next step
```

## Архитектурная развилка

После исследования Codex должен ответить:

```text
Можно ли напрямую использовать OpenFront core для headless runner?
```

Варианты:

- A — можно использовать почти напрямую;
- B — можно использовать, но нужны небольшие adapter/shim-файлы;
- C — core сильно связан с UI, нужен refactor или упрощенный MVP.

## Задача для Codex

```md
Изучи код OpenFrontIO и подготовь технический отчет о том, как запустить игровую логику без браузера.

Нужно:
1. Найти основные файлы, отвечающие за game loop, game state, player actions/intents и win condition.
2. Объяснить простыми словами, как данные проходят через игру.
3. Отдельно отметить, какие части зависят от браузера или графики.
4. Не менять код, кроме добавления документа docs/OPENFRONT_CORE_RESEARCH.md.
5. В конце дать рекомендацию: можно ли делать headless runner прямо сейчас, или сначала нужен refactor.

Перед выводом рекомендации покажи 2-3 возможных варианта и спроси мое мнение, если есть существенная развилка.
```

---

# Этап 3 — минимальный headless runner

## Цель этапа

Сделать первый запуск игровой логики без браузера.

## Что должен делать runner

Минимальный runner:

1. Загружает карту или тестовую карту.
2. Создает двух игроков.
3. Запускает симуляцию.
4. Выполняет ограниченное количество ticks.
5. Выводит базовую информацию в консоль.
6. Завершается без ошибок.

## Команда запуска

```bash
npm run arena:smoke
```

Пример вывода:

```text
OpenFront Agent Arena smoke test
Map: test-map
Players: red, blue
Ticks simulated: 100
Status: OK
```

## Возможное изменение package.json

```json
{
  "scripts": {
    "arena:smoke": "tsx arena/runner/src/smoke.ts"
  }
}
```

## Ожидаемые файлы

```text
arena/runner/src/smoke.ts
arena/runner/src/matchConfig.ts
arena/runner/src/matchRunner.ts
```

## Задача для Codex

```md
Сделай минимальный smoke-test для headless runner.

Цель:
Проверить, что мы можем запустить часть игровой логики OpenFront без браузера.

Требования:
1. Не делать полноценную арену.
2. Не добавлять внешних агентов.
3. Создать минимальные файлы в arena/runner/src/.
4. Добавить npm script arena:smoke, если это действительно нужно.
5. Команда npm run arena:smoke должна запускаться и завершаться понятным результатом.
6. Если прямой импорт core невозможен, не делай большой refactor. Сначала объясни проблему и предложи варианты.

Объясняй каждый шаг простым языком.
```

---

# Этап 4 — локальный матч двух baseline-агентов

## Цель этапа

Провести первый матч между двумя простыми ботами внутри локального процесса.

## Baseline agents

Первый набор:

1. `RandomAgent` — выбирает случайное допустимое действие.
2. `ExpandAgent` — старается расширять территорию.
3. `DefensiveAgent` — чаще защищается.
4. `RushAgent` — рано атакует ближайшего противника.

## Интерфейс агента

```ts
export interface ArenaAgent {
  id: string;
  name: string;
  decide(observation: AgentObservation): Promise<AgentAction[]>;
}
```

## Минимальный observation

```json
{
  "tick": 100,
  "playerId": "red",
  "population": 1000,
  "territoryTiles": 50,
  "knownEnemies": ["blue"],
  "availableActions": ["expand", "attack", "wait"]
}
```

## Минимальный action

```json
{
  "type": "expand",
  "params": {
    "direction": "nearest_free"
  }
}
```

или:

```json
{
  "type": "wait",
  "params": {}
}
```

## Команда запуска

```bash
npm run arena:local
```

Пример вывода:

```text
Match started
Agent red: ExpandAgent
Agent blue: RandomAgent
Winner: red
Ticks: 2500
Replay saved: arena/replays/match_001.jsonl
```

## Задача для Codex

```md
Добавь локальный матч двух простых baseline-агентов.

Требования:
1. Создать общий интерфейс ArenaAgent.
2. Создать типы AgentObservation и AgentAction.
3. Добавить RandomAgent и ExpandAgent.
4. Создать локальный match loop, который вызывает decide() у каждого агента.
5. Действия пока могут быть минимальными: expand, attack, wait.
6. Сохранить простой replay в JSONL-файл.
7. Добавить команду npm run arena:local.
8. Объяснить, как запустить и как понять результат.

Если для настоящего OpenFront core пока не хватает данных, сделай временный adapter, но явно пометь его как временный.
```

---

# Этап 5 — replay и журнал матча

## Цель этапа

Сохранять все важные события матча, чтобы потом можно было отлаживать агентов, пересматривать игру, строить статистику и делать frontend replay viewer.

## Формат JSONL

Пример:

```json
{"type":"match_started","matchId":"m1","seed":123,"players":["red","blue"]}
{"type":"observation","tick":1,"playerId":"red","observation":{}}
{"type":"action","tick":1,"playerId":"red","action":{"type":"expand"}}
{"type":"action_rejected","tick":2,"playerId":"blue","reason":"invalid_target"}
{"type":"match_ended","winner":"red","ticks":2500}
```

## Задача для Codex

```md
Добавь ReplayWriter для сохранения журнала матча в JSONL.

Требования:
1. Создать arena/runner/src/replayWriter.ts.
2. Записывать match_started, observation, action, action_rejected, tick_summary и match_ended.
3. Каждый replay должен сохраняться в arena/replays/.
4. Имя файла должно включать match id или timestamp.
5. Добавить простую проверку, что replay-файл создается.
6. Обновить docs/AGENT_API.md или docs/ARCHITECTURE.md с описанием формата replay.
```

---

# Этап 6 — формализация Agent API внутри проекта

## Цель этапа

Сделать строгий контракт между игрой и агентом.

## Что нужно описать

1. `AgentObservation`
2. `AgentAction`
3. `ActionResult`
4. `MatchConfig`
5. `MatchResult`

## JSON Schema

Добавить:

```text
arena/schemas/agent-observation.schema.json
arena/schemas/agent-action.schema.json
arena/schemas/match-config.schema.json
arena/schemas/match-result.schema.json
```

## Задача для Codex

```md
Формализуй внутренний Agent API.

Требования:
1. Создать TypeScript-типы для AgentObservation, AgentAction, ActionResult, MatchConfig и MatchResult.
2. Создать JSON Schema для observation, action, match config и match result.
3. Добавить валидацию AgentAction через JSON Schema.
4. Если действие невалидное, оно должно отклоняться и попадать в replay как action_rejected.
5. Обновить docs/AGENT_API.md простым описанием каждого поля.
6. Не усложнять observation: сначала только минимально нужные поля.
```

---

# Этап 7 — внешний HTTP Agent API

## Цель этапа

Позволить агенту работать как отдельная программа.

## Текущая MVP-модель

На первом MVP Arena сама вызывает HTTP endpoint каждого агента:

```http
POST <agent endpoint>/decide
```

Arena отправляет `{ observation }`, агент возвращает `{ action }`.

Со стороны Arena API уже используется локальный сервер:

```http
GET  /arena/health
POST /arena/matches
GET  /arena/matches/:matchID
GET  /arena/matches/:matchID/result
GET  /arena/matches/:matchID/replay
```

Старая pull-модель, где агент сам запрашивает observation и отправляет action обратно в Arena, остается возможным будущим расширением. Для первого MVP она отложена, потому что требует session state, pending turns и более сложного управления матчем.

## Простая модель работы

1. Пользователь или локальный клиент отправляет `POST /arena/matches`.
2. Запрос содержит двух агентов с localhost HTTP `/decide` endpoints.
3. Arena запускает headless match.
4. На каждом turn Arena отправляет агенту observation и получает action.
5. Arena валидирует action, применяет допустимые intents и пишет replay audit.
6. После завершения матча Arena возвращает result и replay metadata.

## Задача для Codex

```md
Добавь минимальный HTTP Agent API для внешних агентов.

Требования:
1. Использовать простой HTTP API, без авторизации на первом этапе.
2. Использовать текущую MVP-модель: Arena вызывает localhost HTTP `/decide` endpoints агентов.
3. Подключить API к текущему local match runner.
4. Добавить пример внешнего агента, который отвечает на `/decide`.
5. Добавить команду npm run arena:server.
6. Добавить read endpoints для completed match records, result и replay metadata.
7. Добавить smoke checks для успешного матча, invalid request, duplicate matchID и failed/unreachable agent endpoints.
8. Обновить docs/AGENT_API.md и docs/ARENA_API_SERVER_CONTRACT.md с примерами запросов.
9. Перед переходом к pull-style sessions, WebSocket, базе данных или публичному API спросить мнение человека.
```

---

# Этап 8 — WebSocket API для real-time матчей

## Цель этапа

Сделать обмен событиями в реальном времени.

Текущее согласованное направление для MVP: WebSocket добавляется только как spectator/event stream поверх существующего HTTP API. HTTP остается основным способом запускать матч и получать действия агентов через `/decide`. WebSocket на этом этапе не принимает actions от агентов.

## Зачем нужен WebSocket

WebSocket нужен для:

- живого потока observation;
- мгновенной отправки actions;
- spectator mode;
- live frontend;
- будущих турниров.

## Типы событий

```text
agent.connected
match.started
match.tick
observation
action.accepted
action.rejected
match.ended
spectator.connected
```

## Задача для Codex

```md
Добавь WebSocket API для real-time событий матча.

Требования:
1. Не удалять HTTP API.
2. WebSocket должен отправлять события match.started, match.tick, action.accepted, action.rejected и match.ended.
3. Поддержать отдельный режим spectator, где клиент только смотрит и не может отправлять actions.
4. Добавить простой пример WebSocket spectator client.
5. Обновить docs/AGENT_API.md.
6. Объяснить разницу между HTTP API и WebSocket API простым языком.
```

---

# Этап 9 — Python и TypeScript SDK

## Цель этапа

Упростить подключение внешних агентов.

## Python SDK: желаемый вид

```python
from openfront_arena import ArenaClient

client = ArenaClient(
    base_url="http://localhost:3000",
    agent_id="my-agent"
)

while True:
    obs = client.get_observation()
    action = {"type": "expand", "params": {}}
    client.submit_action(action)
```

## TypeScript SDK: желаемый вид

```ts
import { ArenaClient } from "@openfront-arena/sdk";

const client = new ArenaClient({
  baseUrl: "http://localhost:3000",
  agentId: "my-agent",
});

const observation = await client.getObservation();
await client.submitAction({ type: "expand", params: {} });
```

## Задача для Codex

```md
Создай минимальные SDK для Python и TypeScript.

Требования:
1. SDK должны работать с текущим локальным Arena HTTP API.
2. Начать с локальных lightweight helpers внутри `arena/sdk`, без публикации в npm или PyPI.
3. TypeScript helper должен покрывать `health`, `createMatch`, `listMatches`, `getMatch`, `getResult`, `getReplay` и spectator events.
4. Python helper должен сначала покрывать REST methods: `health`, `create_match`, `list_matches`, `get_match`, `get_result`, `get_replay`.
5. Python WebSocket spectator helper оставить отдельным малым срезом после выбора зависимости или REST-only решения.
6. Обновить docs/AGENT_API.md.
```

---

# Этап 10 — AGENT_RULES.md

## Цель этапа

Создать понятные правила для агентов и их разработчиков.

## Структура

```md
# Agent Rules

## Goal

## Match lifecycle

## Observation format

## Action format

## Legal actions

## Illegal actions

## Time limits

## Hidden information

## Scoring

## Penalties

## Anti-cheat rules

## Examples
```

## Задача для Codex

```md
Напиши первую полноценную версию docs/AGENT_RULES.md.

Требования:
1. Объяснить цель игры для агента.
2. Описать жизненный цикл матча.
3. Описать observation и action.
4. Перечислить legal actions.
5. Описать time limits и penalties.
6. Добавить anti-cheat раздел.
7. Добавить 3 примера корректных actions и 3 примера некорректных actions.
8. Писать простым языком.
```

---

# Этап 11 — MCP adapter

## Цель этапа

Позволить MCP-совместимым агентам, включая OpenClaw-подобные системы, подключаться к арене.

## Что должен делать MCP adapter

MCP adapter не должен содержать игровую логику.

Он должен только:

1. Получать правила.
2. Получать observation.
3. Отправлять action.
4. Получать статус матча.
5. Получать результат.

## MCP tools

```text
openfront_get_rules
openfront_join_match
openfront_get_observation
openfront_submit_action
openfront_get_match_status
openfront_get_result
openfront_resign
```

## MCP resources

```text
openfront://rules
openfront://agent-api
openfront://current-match
openfront://latest-result
```

## Задача для Codex

```md
Создай минимальный MCP adapter для OpenFront Agent Arena.

Требования:
1. MCP adapter должен быть отдельным модулем в arena/mcp/openfront-arena-mcp.
2. Он должен использовать существующий HTTP Agent API.
3. Не добавлять прямой доступ к файловой системе, shell-командам или приватным данным пользователя.
4. Реализовать tools: get_rules, join_match, get_observation, submit_action, get_match_status, get_result.
5. Добавить README с примером подключения.
6. Перед выбором MCP SDK объяснить варианты и спросить мое мнение.
```

Утвержденное направление для первого MCP среза:

- использовать официальный TypeScript MCP SDK;
- начать с маленького локального adapter в `arena/mcp/openfront-arena-mcp`;
- первый пакет сделать read-only: `openfront_get_rules` и `openfront://rules`;
- следующий read-only пакет может читать completed match records и results через текущий localhost Arena API server;
- не давать adapter доступ к shell, файловой системе, replay files, private data или `src/core`;
- action/session tools добавить только после отдельного малого среза, потому что текущий Arena API запускает синхронный матч, а не pull-style sessions.

---

# Этап 12 — база данных и хранение результатов

## Цель этапа

Сохранять агентов, матчи, результаты и статистику.

## Когда добавлять базу данных

После того, как уже есть:

- локальные матчи;
- replay;
- Agent API;
- базовые агенты;
- понятный формат результата.

## Рекомендуемая база

```text
PostgreSQL
```

## Основные таблицы

```text
users
agents
matches
match_players
match_results
replays
ratings
api_keys
```

## Задача для Codex

```md
Добавь PostgreSQL для хранения агентов, матчей и результатов.

Требования:
1. Сначала предложить схему таблиц и спросить мое мнение.
2. Добавить docker-compose для локальной PostgreSQL.
3. Добавить миграции.
4. Сохранять match result после завершения матча.
5. Не переносить replay в базу целиком: replay пока хранить файлом, а в базе хранить путь к нему.
6. Обновить docs/ARCHITECTURE.md.
```

---

# Этап 13 — простой backend для платформы

## Цель этапа

Сделать backend, который управляет пользователями, агентами, матчами и результатами.

## Основные функции backend

1. Регистрация агента.
2. Список агентов.
3. Создание матча.
4. Получение результата матча.
5. Получение replay.
6. Таблица лидеров.
7. API keys для агентов.

## Auth на первом этапе

На первом этапе:

```text
admin token для локальной разработки
```

Позже:

```text
GitHub OAuth
```

## Задача для Codex

```md
Создай первый backend платформы для OpenFront Agent Arena.

Требования:
1. Добавить сущности Agent, Match, MatchResult.
2. Добавить endpoints для регистрации агента, списка агентов, создания матча и получения результата.
3. Добавить простую защиту через API key.
4. Не добавлять сложную пользовательскую регистрацию.
5. Обновить docs/AGENT_API.md.
6. Перед выбором backend framework или интеграцией в существующий OpenFront server спросить мое мнение.
```

---

# Этап 14 — frontend MVP

## Цель этапа

Создать простой web-интерфейс для просмотра платформы.

## Страницы frontend MVP

```text
/
  Главная страница проекта

/agents
  Список зарегистрированных агентов

/matches
  Список матчей

/matches/:id
  Страница конкретного матча

/leaderboard
  Таблица лидеров

/docs
  Документация для подключения агента
```

## Что не нужно делать в первом frontend MVP

Не нужно сразу делать:

- сложный дизайн;
- личные кабинеты;
- платежи;
- загрузку Docker images;
- полноценный турнирный движок;
- сложный replay viewer.

## Задача для Codex

```md
Создай frontend MVP для OpenFront Agent Arena.

Требования:
1. Перед выбором frontend stack предложить варианты и спросить мое мнение.
2. Добавить страницы: home, agents, matches, match detail, leaderboard, docs.
3. Данные можно получать из backend API.
4. Дизайн должен быть простой и понятный.
5. На странице матча показать статус, игроков, победителя и ссылку на replay.
6. Обновить docs/ARCHITECTURE.md.
```

---

# Этап 15 — live spectator mode

## Цель этапа

Позволить пользователям смотреть матч агентов в реальном времени.

## Как должен работать spectator mode

1. Пользователь открывает страницу матча.
2. Frontend подключается к WebSocket.
3. Сервер отправляет события матча.
4. Frontend обновляет состояние игры на экране.
5. Пользователь видит ход матча почти в реальном времени.

## Первый вариант визуализации

Не нужно сразу встраивать полный renderer OpenFront.

Первый вариант может быть простым:

- список событий;
- текущий tick;
- территории игроков в процентах;
- население;
- график изменения score;
- текстовая карта или упрощенная карта.

## Поздний вариант визуализации

На позднем этапе можно встроить визуальный renderer OpenFront или сделать отдельный replay viewer.

## Задача для Codex

```md
Добавь live spectator mode.

Требования:
1. Использовать WebSocket events из arena server.
2. Добавить страницу /matches/:id/live.
3. Показывать текущий tick, статус матча, игроков, последние события и базовые метрики.
4. Не пытаться сразу рисовать полноценную карту OpenFront, если это требует большого refactor.
5. Если есть возможность безопасно переиспользовать существующий renderer OpenFront, сначала опиши варианты и спроси мое мнение.
```

---

# Этап 16 — replay viewer

## Цель этапа

Позволить смотреть завершенные матчи.

## Минимальный replay viewer

Первый replay viewer:

- читает JSONL replay;
- показывает timeline;
- позволяет переходить по ticks;
- показывает события;
- показывает score/territory/population.

## Расширенный replay viewer

Позже:

- визуальная карта;
- ускорение/замедление;
- пауза;
- фильтр событий;
- сравнение действий агентов;
- показ “что видел агент” в конкретный момент.

## Задача для Codex

```md
Добавь минимальный replay viewer.

Требования:
1. Добавить страницу /matches/:id/replay.
2. Читать replay из JSONL.
3. Показывать timeline и список событий.
4. Показывать ключевые метрики по игрокам.
5. Добавить возможность выбрать tick.
6. Не делать сложную визуальную карту на первом этапе.
```

---

# Этап 17 — рейтинг агентов

## Цель этапа

Сравнивать агентов между собой.

## Простые метрики

```text
matches_played
wins
losses
win_rate
avg_survival_ticks
avg_territory_share
invalid_action_rate
avg_decision_latency_ms
```

## Рейтинг

Для MVP:

```text
Elo
```

Позже:

```text
Glicko-2 или TrueSkill
```

## Задача для Codex

```md
Добавь базовый рейтинг агентов.

Требования:
1. Считать wins, losses, win_rate и Elo.
2. Обновлять рейтинг после каждого матча.
3. Показывать рейтинг на странице /leaderboard.
4. Хранить историю результатов.
5. Описать формулу простым языком в docs/RATING.md.
```

---

# Этап 18 — турниры

## Цель этапа

Проводить серии матчей между агентами.

## Типы турниров

Первый набор:

```text
1v1 round-robin
single elimination
fixed-seed challenge
multi-seed challenge
free-for-all
```

## Почему multi-seed важен

Если матч всегда идет на одной карте и одном seed, агент может быть переобучен под конкретные условия.

Поэтому честная проверка должна включать несколько seed.

## Задача для Codex

```md
Добавь минимальную систему турниров.

Требования:
1. Сначала предложить формат турнира и спросить мое мнение.
2. Начать с round-robin 1v1.
3. Каждый pair агентов должен играть несколько матчей с разными seed.
4. Сохранять результаты каждого матча.
5. Показывать страницу турнира во frontend.
6. Не добавлять сложные призовые, платежи или публичную регистрацию.
```

---

# Этап 19 — безопасность

## Цель этапа

Сделать платформу безопаснее перед публичным запуском.

## Что нужно защитить

1. Agent API.
2. MCP adapter.
3. Backend API.
4. Replay storage.
5. Database.
6. WebSocket spectator mode.
7. Match runner.
8. Возможные пользовательские endpoints.

## Минимальные меры

```text
API keys
rate limits
timeouts
JSON Schema validation
max actions per tick
max payload size
replay audit
separate env variables
no shell access from MCP adapter
no local file access from MCP adapter
no execution of user code on server in early versions
```

## Задача для Codex

```md
Проведи security hardening для Agent Arena.

Требования:
1. Составить список текущих рисков.
2. Добавить rate limiting.
3. Добавить max payload size.
4. Проверить, что все agent actions проходят validation.
5. Проверить, что MCP adapter не имеет доступа к shell и файловой системе.
6. Добавить docs/SECURITY.md.
7. Перед любыми сложными изменениями спросить мое мнение.
```

---

# Этап 20 — Docker и локальный запуск одной командой

## Цель этапа

Сделать так, чтобы проект можно было поднять одной командой.

## Что должно запускаться

```text
arena backend
match runner
PostgreSQL
frontend
```

## Команда

```bash
docker compose up --build
```

## Задача для Codex

```md
Добавь Docker Compose для локального запуска OpenFront Agent Arena.

Требования:
1. Поднять backend, frontend, database и match runner.
2. Добавить .env.example.
3. Не добавлять реальные секреты.
4. Обновить README с инструкцией запуска.
5. Проверить, что новый разработчик может запустить проект по инструкции.
```

---

# Этап 21 — публичный MVP

## Цель этапа

Подготовить первую публичную версию.

## Что должно быть готово

```text
локальный и серверный запуск
регистрация агентов
запуск матчей
результаты матчей
leaderboard
replay viewer
live spectator mode
документация для агентов
MCP adapter
SDK examples
security basics
```

## Что можно не делать

```text
платежи
публичный marketplace агентов
hosted Docker agents
GPU inference hosting
сложные турниры
мобильный интерфейс
премиум-аккаунты
```

## Задача для Codex

```md
Подготовь публичный MVP checklist.

Требования:
1. Проверить README.
2. Проверить docs.
3. Проверить .env.example.
4. Проверить команды запуска.
5. Проверить, что нет секретов в репозитории.
6. Проверить базовые тесты.
7. Проверить один полный сценарий: зарегистрировать агента → запустить матч → получить результат → посмотреть replay.
8. Составить список оставшихся ограничений.
```

---

# Этап 22 — поздние расширения

## Hosted agents

Пользователь загружает Docker image агента, а платформа запускает его в sandbox.

Плюсы:

- проще для турниров;
- воспроизводимые условия;
- не нужно держать endpoint агента онлайн.

Минусы:

- безопасность;
- расходы;
- изоляция;
- лимиты CPU/GPU;
- риск вредоносного кода.

Решение нужно принимать отдельно.

## Полноценный визуальный renderer

Позже можно использовать существующий renderer OpenFront для:

- live spectator mode;
- replay viewer;
- highlights;
- анализ матча.

Но это может потребовать серьезной интеграции с клиентским кодом.

## Лиги и сезоны

Возможные функции:

```text
daily matches
weekly tournaments
seasonal leaderboard
map-specific leaderboard
agent version history
```

## Agent versioning

Важно хранить не только агента, но и версию агента.

Пример:

```text
Agent: BalancedBot
Version: 1.0.0
Commit: abc123
Created: 2026-05-08
```

Иначе рейтинг будет нечестным: агент мог измениться после матчей.

## Аналитика поведения агентов

Позже можно добавить:

- heatmap атак;
- частота действий;
- среднее время принятия решений;
- сравнение observation/action;
- объяснение решений агента;
- detected strategy tags: rush, turtle, expansionist, diplomatic.

## Human vs Agent mode

Можно добавить режим, где человек играет против агента.

Это полезно для демонстрации, но не должно быть первым MVP.

---

# Part C — компактный список задач для Codex

## Task 1

```md
Подготовь структуру проекта OpenFront Agent Arena внутри форка OpenFrontIO. Не меняй игровую логику. Создай docs/ и arena/ с базовыми markdown-файлами. Объясняй изменения простым языком.
```

## Task 2

```md
Изучи OpenFront core и напиши docs/OPENFRONT_CORE_RESEARCH.md. Цель — понять, можно ли запустить симуляцию без браузера. Код пока не меняй.
```

## Task 3

```md
Сделай минимальный npm run arena:smoke, который проверяет возможность headless-запуска или объясняет, какие зависимости мешают. Не делай большой refactor без согласования.
```

## Task 4

```md
Добавь локальный матч двух baseline-агентов с минимальным observation/action интерфейсом. Сохрани replay в JSONL.
```

## Task 5

```md
Формализуй AgentObservation и AgentAction через TypeScript-типы и JSON Schema. Добавь validation и action_rejected в replay.
```

## Task 6

```md
Добавь HTTP Agent API и пример внешнего агента. Сначала без авторизации, только локально.
```

## Task 7

```md
Добавь WebSocket events для real-time матча и spectator client example.
```

## Task 8

```md
Создай Python и TypeScript SDK для подключения внешних агентов.
```

## Task 9

```md
Напиши полноценный docs/AGENT_RULES.md для людей и LLM-агентов.
```

## Task 10

```md
Создай минимальный MCP adapter поверх HTTP Agent API. Он не должен иметь доступа к shell, файловой системе или приватным данным.
```

## Task 11

```md
Добавь PostgreSQL и сохранение результатов матчей. Replay пока храни файлами.
```

## Task 12

```md
Создай backend endpoints для агентов, матчей, результатов и leaderboard.
```

## Task 13

```md
Создай простой frontend MVP: home, agents, matches, match detail, leaderboard, docs.
```

## Task 14

```md
Добавь live spectator mode через WebSocket. Сначала показывай текстовые события и метрики, без полноценной карты.
```

## Task 15

```md
Добавь минимальный replay viewer по JSONL.
```

## Task 16

```md
Добавь Elo leaderboard и docs/RATING.md.
```

## Task 17

```md
Добавь round-robin турниры с несколькими seed.
```

## Task 18

```md
Проведи security hardening: API keys, rate limits, payload limits, action validation, SECURITY.md.
```

## Task 19

```md
Добавь Docker Compose и .env.example для запуска проекта одной командой.
```

## Task 20

```md
Подготовь публичный MVP checklist и проверь полный сценарий: агент → матч → результат → replay.
```

---

# Part D — шаблон сообщения для Codex

```md
Ты работаешь над проектом OpenFront Agent Arena на базе форка OpenFrontIO.

Главное правило:
Объясняй все простым языком для не программиста. Не делай крупные архитектурные изменения без моего согласования.

Текущая задача:
[описать задачу]

Перед началом:
1. Прочитай релевантные файлы.
2. Кратко объясни, что ты собираешься сделать.
3. Перечисли файлы, которые планируешь изменить.
4. Если есть архитектурная развилка, предложи варианты и спроси мое мнение.

После выполнения:
1. Покажи, что изменилось.
2. Объясни, зачем это нужно.
3. Дай команды для проверки.
4. Обнови документацию, если нужно.
5. Предложи следующий маленький шаг.
6. Делай это после каждого завершенного шага, даже если человек не спросил отдельно.
```

---

# Part E — главные риски проекта

## Headless runner может оказаться сложнее, чем кажется

Если OpenFront core сильно связан с browser/client кодом, потребуется refactor.

Что делать:

- не переписывать сразу весь core;
- сначала сделать исследование;
- затем минимальный adapter;
- только потом полноценный runner.

## Observation может быть слишком большим

Если агент получает слишком много данных, LLM будет работать медленно и нестабильно.

Что делать:

- начинать с маленького observation;
- добавлять поля постепенно;
- логировать, какие поля реально нужны агентам.

## Агенты могут отправлять мусорные действия

Что делать:

- JSON Schema validation;
- action_rejected;
- penalties;
- replay audit;
- clear examples.

## Real-time frontend может стать слишком сложным

Что делать:

- сначала текстовый live viewer;
- потом графики;
- только потом карта.

## MCP может отвлечь от главного

Что делать:

- MCP только после HTTP Agent API;
- MCP как тонкий adapter;
- не добавлять в MCP лишние разрешения.

---

# Part F — Definition of Done для MVP

MVP можно считать готовым, если:

1. Проект запускается локально.
2. Есть headless match runner.
3. Есть минимум 2 baseline-агента.
4. Можно провести матч.
5. Матч сохраняет replay.
6. Есть Agent API.
7. Есть пример внешнего агента.
8. Есть AGENT_RULES.md.
9. Есть простая таблица результатов.
10. Есть понятная инструкция запуска.
11. Есть хотя бы минимальный spectator или replay viewer.
12. Codex может продолжать работу по документации без постоянного восстановления контекста.

---

# Первый конкретный шаг после создания этого файла

Передавать Codex лучше не весь проект сразу, а первую задачу:

```md
Начинаем проект OpenFront Agent Arena.

Прочитай docs/PROJECT_PLAN.md и docs/WORKING_AGREEMENT.md.

Выполни только Этап 1:
- подготовь структуру папок;
- добавь базовые docs;
- не меняй игровую логику;
- проверь, что OpenFront запускается как раньше.

Перед изменениями покажи, какие файлы создашь.
После изменений дай команды проверки.
```

---

# Reference links

- OpenFrontIO repository: https://github.com/openfrontio/OpenFrontIO
- OpenFront development setup: https://openfrontio-openfrontio.mintlify.app/development/setup
- OpenFront contributing guide: https://github.com/openfrontio/OpenFrontIO/blob/main/CONTRIBUTING.md
- OpenAI Codex: https://openai.com/codex/
- Codex app documentation: https://developers.openai.com/codex/app
