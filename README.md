# Bank Frontend

An AngularJS + jQuery single-page app for the banking system: view accounts, open new ones, deposit, withdraw, transfer, and browse transaction history.

Backend: [bank-backend](https://github.com/<your-username>/bank-backend)

## Features

- Account list with live balances. Click an account to select it.
- Open checking or savings accounts with an optional opening deposit
- Deposit, withdraw, and transfer between accounts
- Per-account transaction history
- Client-side validation that fails fast before a request is sent
- Server errors (insufficient funds, unknown account, and so on) shown as readable messages
- **Mock mode**: a built-in in-memory API, so the UI runs without the backend

## Tech Stack

| Area              | Technology                                                     |
| ----------------- | -------------------------------------------------------------- |
| Framework         | AngularJS 1.8 (controllers, services/factories, `$http`, `$q`) |
| DOM / effects     | jQuery 3.7                                                     |
| Dev server        | http-server (with API proxy)                                   |
| Production server | nginx (serves static files, proxies the API)                   |
| Containers        | Docker, Docker Compose                                         |

## Getting Started

### Prerequisites

- Node.js 18+ (only for the local dev server)

### Option A: Mock mode (no backend needed)

In `src/app/app.config.js`, set:

```javascript
useMockApi: true;
```

Then:

```bash
npm install
npm start
```

The app opens at http://localhost:4200 with a "Mock API" badge, seeded with three sample accounts.

### Option B: With the real backend

1. Start the backend on port 8080 (see the backend README).
2. Make sure `useMockApi: false` is set in `src/app/app.config.js`.
3. Install and start the front end:

```bash
npm install
npm start
```

The dev server forwards `/api` requests to `http://localhost:8080` (the `-P` flag in `package.json`), so the browser sees a single origin, just as it does in production.

## Configuration

`src/app/app.config.js`:

| Setting      | Default | Purpose                                                                     |
| ------------ | ------- | --------------------------------------------------------------------------- |
| `apiBaseUrl` | `/api`  | Where API calls go. Relative URLs use the same server that served the page. |
| `useMockApi` | `false` | `true` swaps in the in-memory mock API                                      |

The config is validated on load. An invalid `apiBaseUrl` throws immediately instead of failing on the first request.

## Architecture

```
index.html
  └── BankController (controllerAs: vm)
        ├── BankApi ──► HttpBankApi  (real REST calls via $http)
        │          └──► MockBankApi  (in-memory, same interface)
        └── FlashService (jQuery fade-in / fade-out messages)
```

- **`BankApi`** chooses its implementation from config, so the controller never knows which one it's using.
- **`HttpBankApi`** and **`MockBankApi`** expose identical methods and response shapes, including the error format (`{ status, data: { message } }`).
- **`BankController`** validates input, calls the API, and routes both synchronous validation errors and rejected promises to a single error display.
- The mock stores money in integer cents to avoid floating-point drift.

## Project Structure

```
src/
├── index.html
├── css/styles.css
└── app/
    ├── app.module.js                 Module definition
    ├── app.config.js                 API settings, validated on load
    ├── controllers/
    │   └── bank.controller.js
    └── services/
        ├── bank-api.service.js       Chooses mock vs real implementation
        ├── http-bank-api.service.js  REST client
        ├── mock-bank-api.service.js  In-memory fake backend
        └── flash.service.js          jQuery-powered notifications
nginx.conf                            Production server and API proxy
Dockerfile
```

## Docker and Deployment

In the container, nginx serves the static files and proxies API traffic to the backend:

```
Browser ──► nginx :80 ──┬── /        → static app
                        ├── /api/... → backend:8080
                        └── /ws      → backend:8080 (SOAP)
```

Because everything goes through one origin, there's no CORS in production, and the backend isn't exposed directly.

### Run the full stack

With both repos cloned side by side, and a `bank-stack/` folder containing `docker-compose.yml` and `.env`:

```bash
cd bank-stack
docker compose up --build
```

Open http://localhost.

### Ship to a server

```bash
# On your machine: build and push the images
docker login
docker compose build
docker compose push

# On the server (only docker-compose.yml and .env are needed)
docker compose pull
docker compose up -d --no-build
```
