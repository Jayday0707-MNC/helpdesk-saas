# Triage

A multi-tenant helpdesk built with React, Express and PostgreSQL. Each organisation gets its own private workspace where customers raise tickets and staff triage, assign and resolve them.

> Portfolio project. Built to practise authentication, role-based access and tenant isolation in a full-stack app.

## Features

- **Workspaces:** registering creates an organisation and its first admin. Data is isolated per organisation.
- **Roles:** `admin`, `agent` and `customer`, each with different permissions.
- **Tickets:** create, filter by status and priority, update, assign to staff, and delete (admin only).
- **Conversation:** comment thread on every ticket.
- **Overview:** live counts by status and priority, plus tickets waiting for an owner.
- **Team management:** admins add agents and customers to their workspace.
- **Responsive UI:** works on desktop and mobile.

## Tech stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Frontend | React, Vite, React Router                            |
| Backend  | Node.js, Express                                     |
| Database | PostgreSQL on Neon (`@neondatabase/serverless`)      |
| Auth     | JWT, bcrypt password hashing                         |

## How tenant isolation works

Every table that holds customer data carries an `org_id`. The server reads the user's `org_id` from their signed JWT, never from the request body, and adds it to every query:

```sql
SELECT * FROM tickets WHERE id = $1 AND org_id = $2;
```

A user from another organisation asking for the same ticket gets a `404`, as if it did not exist. Customers are further limited to tickets they created.

## Permissions

| Action                         | Admin | Agent | Customer       |
| ------------------------------ | :---: | :---: | :------------: |
| Create a ticket                |  Yes  |  Yes  | Yes            |
| View tickets                   |  All  |  All  | Own only       |
| Comment on a ticket            |  Yes  |  Yes  | Own tickets    |
| Change status, priority, owner |  Yes  |  Yes  | No             |
| Delete a ticket                |  Yes  |  No   | No             |
| Add users to the workspace     |  Yes  |  No   | No             |

## API overview

| Method | Endpoint                          | Description                              |
| ------ | --------------------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`              | Create an organisation and its admin     |
| POST   | `/api/auth/login`                 | Log in and receive a token               |
| GET    | `/api/auth/me`                    | Current user and organisation            |
| GET    | `/api/tickets`                    | List tickets (`?status=` and `?priority=`) |
| POST   | `/api/tickets`                    | Create a ticket                          |
| GET    | `/api/tickets/:id`                | Get one ticket                           |
| PATCH  | `/api/tickets/:id`                | Update status, priority or assignee      |
| DELETE | `/api/tickets/:id`                | Delete a ticket (admin)                  |
| GET    | `/api/tickets/stats/summary`      | Counts by status and priority            |
| GET    | `/api/tickets/:id/comments`       | List comments                            |
| POST   | `/api/tickets/:id/comments`       | Add a comment                            |
| GET    | `/api/users`                      | List workspace members (staff)           |
| POST   | `/api/users`                      | Add an agent or customer (admin)         |

## Running it locally

You need Node.js 18 or newer and a free [Neon](https://neon.tech) PostgreSQL database.

### 1. Clone and install

```bash
git clone https://github.com/Jayday0707-MNC/helpdesk-saas.git
cd helpdesk-saas

cd server && npm install
cd ../client && npm install
```

### 2. Create the database tables

Open the Neon SQL Editor and run:

```sql
CREATE TABLE organisations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'customer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by INT NOT NULL REFERENCES users(id),
  assigned_to INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Configure the server

Copy `server/.env.example` to `server/.env` and fill it in:

```
DATABASE_URL=postgresql://user:password@your-host.neon.tech/neondb?sslmode=require
JWT_SECRET=a-long-random-string
PORT=5000
```

### 4. Start both apps

```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

Open the address Vite prints (usually http://localhost:5173) and create a workspace from the register page.

## Project structure

```
helpdesk-saas/
  server/
    index.js            Express app
    db.js               Database pool
    middleware/auth.js  JWT verification
    routes/             auth, tickets, comments, users
  client/
    src/
      api.js            Fetch helper that attaches the token
      Layout.jsx        Sidebar shell
      Tickets.jsx       Ticket list with filters
      TicketDetail.jsx  Ticket page with conversation
      Overview.jsx      Stats page
      AuthPage.jsx      Log in and register
```

## Security notes

- Passwords are hashed with bcrypt and never returned by the API.
- Secrets live in `server/.env`, which is git-ignored.
- All queries are parameterised, which protects against SQL injection.
- Tokens expire after 7 days.

## Roadmap

- [ ] Email notifications when a ticket is assigned or replied to
- [ ] Subscription plans with Stripe test mode
- [ ] Email invitations instead of admin-set passwords
- [ ] Automated tests for the tenant isolation rules
- [ ] Deployment (Vercel + Render + Neon)
