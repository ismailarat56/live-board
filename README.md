**English** · [Türkçe](README.tr.md)

<div align="center">

# Live Board

**Live task board: a card change made on one screen appears at once, over WebSocket, on the other screens that have the same board open.**

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.18%2B-5FA04E?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-2ea44f)

[Highlights](#highlights) · [Setup](#setup-and-running) · [API summary](#api-summary) · [Architecture](#architecture) · [Tests](#tests)

</div>

Cards are moved between columns (to do, in progress, done); changes are delivered to every screen connected to the same board. The server is written with Node.js and Express, the front end with React; cards are stored in PostgreSQL, and Redis carries events between multiple servers. The project is developed in TypeScript, with tests written from the first day.

The user interface is in Turkish. The detailed documents under `docs/` and `notes/` are in Turkish.

## Highlights

- **Live updates:** card create, move, edit and delete events are published over WebSocket to the sockets connected to the board.
- **Version check:** every card has a `version`; an edit or delete that arrives with an old version gets `409 VERSION_CONFLICT`.
- **The draft is kept on a conflict:** when a `409` arrives, the front end does not discard the draft and shows the current state of the card.
- **Two stores, one interface:** `CardStore` is implemented in memory and on PostgreSQL; the store is selected with the `STORE` variable.
- **Multiple servers:** with `PUBSUB=redis`, events are distributed to all servers through Redis.
- **Who is on the board:** the connections on the board are listed with their names; records expire after 15 seconds and are refreshed every 5 seconds.
- **Automatic reconnect:** when the connection drops, the front end retries with a wait that grows from 1 second to 30 seconds and fetches the board again from scratch.
- **Shared schemas:** card, event and message schemas are written once with zod in the `shared` package; types are derived with `z.infer`.
- **Runtime validation:** the request body, the connection URL, the database row, the API response and the Redis message are validated against a schema.
- **Contract tests:** the version and member store contracts run against both the in-memory store and PostgreSQL and Redis.
- **Graceful shutdown:** on `SIGTERM` or `SIGINT`, the sockets are closed with `1001`, then the HTTP server, the pool and the Redis connections are closed.

## Requirements

- Node.js 22.18 or later. Node runs `.ts` files directly by stripping their types.
- npm (workspaces). `npm install` is run only in the root.
- Docker, for the persistent store and for multiple servers: `compose.yaml` starts PostgreSQL 18 (`127.0.0.1:5433`) and Redis 8.8 (`127.0.0.1:6380`).

## Setup and running

Commands are run in the root folder.

**Without a database.** If `server/.env` does not exist, the server uses the in-memory store and port `4000`; cards are lost when the server stops.

```bash
npm install
npm run dev:server
npm run dev:web # In another terminal; http://localhost:5173
```

**With PostgreSQL and Redis.** First create the environment files:

```bash
cp .env.db.example .env.db
cp server/.env.example server/.env
```

Fill in the `POSTGRES_PASSWORD` value in `.env.db` (`openssl rand -hex 16`). In the `DATABASE_URL` value in `server/.env`, replace `PAROLA` ("password") with the same password. `.env` files are not tracked by git. Then:

```bash
docker compose up -d
npm run db:migrate -w @live-board/server
npm run dev:server
npm run dev:web # In another terminal; http://localhost:5173
```

Vite forwards `/api`, `/health` and `/ws` requests to the server on `localhost:4000`; the target port can be changed with `API_PORT`.

Running with two servers and two front ends, all commands and database details: [docs/KURULUM.md](docs/KURULUM.md)

## API summary

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health status of the server. |
| GET | `/api/boards/:boardId/cards` | Cards on the board, ordered by column and position. |
| GET | `/api/boards/:boardId/members` | Connections on the board, sorted by name. |
| POST | `/api/boards/:boardId/cards` | Creates a card; returns `201`. |
| PATCH | `/api/cards/:cardId/move` | Moves the card; returns all cards of the board. |
| PATCH | `/api/cards/:cardId` | Edits the card; requires `expectedVersion`. |
| DELETE | `/api/cards/:cardId?expectedVersion=N` | Deletes the card; returns `204` with no body. |

JSON responses have the form `{ success: true, data }` or `{ success: false, error: { code, message } }`.

WebSocket connection URL: `ws://localhost:4000/ws?boardId=1&name=Ali`. The server sends `welcome`, `event`, `pong` and `error` messages; the client sends `ping`.

Request bodies, message formats and version conflict rules: [docs/API.md](docs/API.md)

## Architecture

An event is published only after the write has succeeded; a rejected request produces no event.

```text
PUBSUB=local: HTTP request --> store (persistent write) --> hub.publish(boardId, event) --> sockets connected to that board on that server

PUBSUB=redis: HTTP request --> store (persistent write) --> relay.publish --> Redis: PUBLISH board:<id> <event JSON>
              Redis --> subscriber connection of every server (PSUBSCRIBE board:*) --> JSON + BoardEventSchema --> hub.publish --> sockets of that server
```

- `STORE=memory` selects the temporary in-memory store, `STORE=postgres` the persistent PostgreSQL store.
- The PostgreSQL store uses parameterized queries; move and delete run inside a transaction, with the rows locked by `FOR UPDATE`.
- With `PUBSUB=redis`, the server also receives its own event back from Redis and distributes it; all tabs see the events in the same order.
- Redis carries the events and holds the expiring member records; the cards stay in PostgreSQL.

Stores, the Redis relay, the member list, validation points and TypeScript settings: [docs/MIMARI.md](docs/MIMARI.md)

## Folder structure

```text
package.json         npm workspaces definition that joins the shared, server and web packages
compose.yaml         PostgreSQL 18 and Redis 8.8 (Docker)
shared/src/          zod schemas and types; moveCard, removeCard, applyBoardEvent
server/
  src/domain/        board definition, move and event tests
  src/http/          error class and zod validation of incoming data
  src/realtime/      hub, WebSocket server, Redis connections and relay, member stores
  src/store/         CardStore interface, in-memory and PostgreSQL stores, diffCards
  src/db/            connection pool, connection check, migration runner
  migrations/        sequentially numbered SQL files
  playground/        TypeScript, connection pool, zod and WebSocket exercises
web/src/             React front end (Vite); tests of the pure functions are in *.test.ts files
notes/               development logs and implementation guide
docs/                setup, API, architecture and known limitations
```

## Tests

In the root folder:

```bash
npm run typecheck
npm test
npm run test:db -w @live-board/server
npm run test:redis -w @live-board/server
```

- `npm test`: the server's business rule, HTTP and WebSocket tests, plus the pure function tests on the web side. Does not need a database.
- `npm run test:db`: tests the PostgreSQL store. PostgreSQL must be running, `server/.env` must be configured and the migrations must be applied.
- `npm run test:redis`: runs the member store contract against a real Redis. It uses Redis database number 1.

The tests run with Node's own test runner (`node --test`). Details: [docs/KURULUM.md](docs/KURULUM.md#testler)

## Known limitations

- There is no authentication; any client that knows the URL can listen to the board and enter any name it wants.
- There is a single board (id `1`).
- Events have no sequence number; if two people move cards at the same time, the order can end up different on the two screens.
- An event published while Redis is disconnected is lost; the clients resynchronize when the subscriber comes back.
- The front end only has tests for the pure functions; the components are tried by hand in the browser.

Full list and next steps: [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md)

## License

The code is released under the [MIT license](LICENSE).
