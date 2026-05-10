# WhatsApp CRM - Complete Project Documentation

A full-featured SaaS customer communication platform built with **Spring Boot 3.2** (Java 17) and **React** (TypeScript). Inspired by Chatwoot, it supports multi-channel messaging (WhatsApp, Email, Web Widget, API), team collaboration, automation, reporting, and customer satisfaction tracking.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - [Running with Docker (Local or Server)](#running-with-docker-local-or-server)
2. [Feature 1: Authentication & Account Management](#2-feature-1-authentication--account-management)
3. [Feature 2: Contact Management](#3-feature-2-contact-management)
4. [Feature 3: Conversations & Messaging](#4-feature-3-conversations--messaging)
5. [Feature 4: Inbox Management (Channels)](#5-feature-4-inbox-management-channels)
6. [Feature 5: Labels](#6-feature-5-labels)
7. [Feature 6: Canned Responses](#7-feature-6-canned-responses)
8. [Feature 7: Teams](#8-feature-7-teams)
9. [Feature 8: Real-time Search](#9-feature-8-real-time-search)
10. [Feature 9: Contact Notes & Activity Logs](#10-feature-9-contact-notes--activity-logs)
11. [Feature 10: Notifications](#11-feature-10-notifications)
12. [Feature 11: Reports & Analytics](#12-feature-11-reports--analytics)
13. [Feature 12: Automation Rules](#13-feature-12-automation-rules)
14. [Feature 13: CSAT (Customer Satisfaction)](#14-feature-13-csat-customer-satisfaction)
15. [Feature 14: Email Channel Integration](#15-feature-14-email-channel-integration)
16. [Feature 15: WhatsApp Channel Integration (Meta Business API)](#16-feature-15-whatsapp-channel-integration-meta-business-api)
17. [Feature 16: File & Attachment Support](#17-feature-16-file--attachment-support)
18. [API Reference](#18-api-reference)
19. [Tech Stack & Architecture](#19-tech-stack--architecture)

---

## 1. Getting Started

### Prerequisites

- **Java 17+** (Spring Boot 3.2 requires it)
- **Node.js 18+** and npm
- **PostgreSQL** running on localhost:5432
- **Maven** for backend builds

### Database Setup

```bash
# Connect to PostgreSQL (on Mac, default user is your OS username)
psql -U sridhar -d postgres

# Create the database
CREATE DATABASE whatsappcrm;
\q
```

### Backend Setup

```bash
cd backend

# Configure database in src/main/resources/application.yml
# Default: localhost:5432, database: whatsappcrm, user: sridhar, no password

# Build and run
mvn spring-boot:run
```

The backend starts on **http://localhost:8080**.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend starts on **http://localhost:3000**.

### First Steps After Starting

1. Open **http://localhost:3000** in your browser
2. Click **Sign Up** to create your first account
3. You'll be logged in automatically as an **Admin**
4. Start configuring your inboxes, teams, and labels

---

### Running with Docker (Local or Server)

The repo ships with a multi-service `docker-compose.yml` at the project root that builds and runs the full stack — **PostgreSQL + Spring Boot backend + React frontend behind Nginx**. This is the recommended path for both quick local trials and server deployments.

#### Prerequisites

- **Docker Engine 24+**
- **Docker Compose v2** (bundled with modern Docker Desktop; on Linux servers install the `docker-compose-plugin` package)

Verify:
```bash
docker --version
docker compose version
```

#### Services

The stack defined in [docker-compose.yml](../docker-compose.yml):

| Service | Image / Build | Container | Port (host) | Purpose |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `whatsappcrm-db` | `5432` | Primary database |
| `backend` | builds [backend/Dockerfile](../backend/Dockerfile) | `whatsappcrm-backend` | `8080` | Spring Boot API + WebSocket |
| `frontend` | builds [frontend/Dockerfile](../frontend/Dockerfile) | `whatsappcrm-frontend` | `80` | React SPA + Nginx reverse proxy |

The frontend container's Nginx reverse-proxies `/api` and `/ws` to the backend, so the browser only ever talks to port `80` (same-origin) — no CORS gymnastics.

#### 1. Configure environment

Copy the example env file at the repo root and edit secrets:

```bash
cp .env.example .env
```

Edit `.env`:

```ini
# Database
DB_USERNAME=whatsappcrm
DB_PASSWORD=<a-strong-password>

# JWT Secret — must be 256+ bits (32+ chars). Change for any non-trivial deploy.
JWT_SECRET=<long-random-string>

# Mail (optional — only if you use the Email channel)
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
```

Compose reads `.env` automatically; values flow into `postgres` and `backend` via `${VAR}` substitution in `docker-compose.yml`.

#### 2. Build and start

From the repo root:

```bash
# Build images and start everything in the background
docker compose up -d --build

# Watch logs (Ctrl-C to detach; containers keep running)
docker compose logs -f
```

First build downloads Maven and npm dependencies — expect 3–5 min. Subsequent builds use the layer cache and are much faster.

#### 3. Verify

```bash
docker compose ps          # all three should be "running" / "healthy"
curl http://localhost/      # frontend HTML
curl http://localhost:8080/actuator/health  # backend (if actuator enabled)
```

Open **http://localhost** in your browser and sign up.

#### 4. Common operations

```bash
# Stop everything (preserves volumes / data)
docker compose down

# Stop AND wipe DB + uploads (destructive — fresh start)
docker compose down -v

# Rebuild a single service after code changes
docker compose up -d --build backend
docker compose up -d --build frontend

# Tail logs for one service
docker compose logs -f backend

# Open a shell in a running container
docker compose exec backend sh
docker compose exec postgres psql -U whatsappcrm -d whatsappcrm
```

#### 5. Persistence

Two named volumes survive `docker compose down`:

| Volume | Mounted at | Holds |
|---|---|---|
| `pgdata` | `/var/lib/postgresql/data` (postgres) | All DB tables |
| `uploads` | `/app/uploads` (backend) | Message attachments |

To back up the DB:
```bash
docker compose exec postgres pg_dump -U whatsappcrm whatsappcrm > backup.sql
```

#### 6. Running on a server

The same `docker compose up -d --build` works on any Linux host with Docker installed. A turnkey AWS path is provided:

```bash
# Provisions an EC2 instance with Docker pre-installed via user-data
./deploy/aws-setup.sh <your-key-pair-name> [region] [aws-profile]
```

See [deploy/aws-setup.sh](../deploy/aws-setup.sh). After SSH-ing in:

```bash
git clone <your-repo-url> whatsappcrm
cd whatsappcrm
cp .env.example .env && nano .env       # set strong DB_PASSWORD and JWT_SECRET
docker compose up -d --build
```

The frontend will be reachable on `http://<server-public-ip>` (port 80).

##### TLS / HTTPS

For WhatsApp webhooks and any production use you need HTTPS. The repo includes [deploy/init-ssl.sh](../deploy/init-ssl.sh) for issuing Let's Encrypt certs. The general flow:

1. Point a DNS A-record at the server's public IP.
2. Run `./deploy/init-ssl.sh <your-domain>` to obtain certs.
3. Update Nginx config / compose to terminate TLS on port 443.

For local development against Meta's WhatsApp webhook, use `ngrok http 80` instead of provisioning real TLS.

#### 7. Production notes

- Set a real `JWT_SECRET` (≥ 32 random chars) and `DB_PASSWORD` — never ship the example values.
- Set `spring.jpa.hibernate.ddl-auto=validate` (currently `update`) once the schema is stable. Override via `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` in `.env` and add it to the backend service `environment:` block in `docker-compose.yml`.
- Don't expose Postgres port `5432` to the internet — drop the `ports:` mapping under the `postgres` service for server deploys (containers still reach it over the compose network).
- Put the stack behind a reverse proxy / load balancer that terminates TLS, or extend the frontend Nginx config to listen on `443`.
- Use a managed mail provider (SES, SendGrid, Mailgun) for the Email channel rather than `localhost:1025`.

---

## 2. Feature 1: Authentication & Account Management

### What It Does

Multi-user authentication with JWT tokens. Each user belongs to an Account with role-based access (Admin or Agent).

### How to Use in the UI

#### Sign Up (Create Account)

1. Go to **http://localhost:3000/signup**
2. Fill in:
   - **Name** - Your display name
   - **Email** - Login email
   - **Password** - Minimum 6 characters
   - **Account Name** - Your organization name (e.g., "Acme Support")
3. Click **Sign Up**
4. You're automatically logged in as Admin of your new account

#### Log In

1. Go to **http://localhost:3000/login**
2. Enter your **Email** and **Password**
3. Click **Log In**

#### Invite Team Members (Admin Only)

1. Navigate to **Dashboard** (first item in left sidebar)
2. You'll see the **Team Members** list
3. Click **Invite User** button (top right)
4. Enter the new user's **Email** and select their **Role**:
   - **Agent** - Can handle conversations, view contacts
   - **Admin** - Full access including settings, reports, team management
5. Click **Invite**
6. The invited user can log in with their email (a temporary password is set)

#### Manage Team Members

- **Change Role**: Click the role badge next to a user to toggle between Agent and Admin
- **Remove User**: Click the red **Remove** button next to a user (Admin only)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account + user |
| POST | `/api/v1/auth/login` | Get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user info |

---

## 3. Feature 2: Contact Management

### What It Does

Centralized contact database with search, custom attributes, and activity tracking. Contacts are the customers/people you communicate with across all channels.

### How to Use in the UI

#### View Contacts

1. Click **Contacts** in the left sidebar
2. You'll see a paginated list of all contacts
3. Each contact card shows: Name, Email, Phone, Company

#### Search Contacts

1. Use the **search bar** at the top of the Contacts page
2. Type a name, email, or phone number
3. Results filter in real-time

#### Create a Contact

1. Click the **+ New Contact** button (top right)
2. Fill in:
   - **Name** (required)
   - **Email**
   - **Phone Number**
   - **Company**
   - **Description**
3. Click **Create Contact**

#### Edit a Contact

1. Click on any contact card to open the detail view
2. Click **Edit** button
3. Modify any fields
4. Click **Save**

#### Delete a Contact

1. Click on a contact to open detail view
2. Click **Delete** (red button)
3. Confirm the deletion

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts/{id}/contacts` | List contacts (paginated) |
| GET | `/api/v1/accounts/{id}/contacts/{contactId}` | Get single contact |
| POST | `/api/v1/accounts/{id}/contacts` | Create contact |
| PUT | `/api/v1/accounts/{id}/contacts/{contactId}` | Update contact |
| DELETE | `/api/v1/accounts/{id}/contacts/{contactId}` | Delete contact |

---

## 4. Feature 3: Conversations & Messaging

### What It Does

The core of the CRM. Three-column layout for managing customer conversations with real-time messaging via WebSocket.

### How to Use in the UI

#### Conversations Page Layout

The page has **3 columns**:
1. **Left Sidebar** - Conversation list with status filters
2. **Center** - Message thread (chat area)
3. **Right Panel** - Contact details, notes, and activity

#### Filter Conversations by Status

At the top of the left sidebar, click the status tabs:
- **Open** - Active conversations needing attention
- **Pending** - Waiting on customer response
- **Resolved** - Completed conversations
- **Snoozed** - Temporarily paused

The count next to each status shows how many conversations are in that state.

#### Create a New Conversation

1. Click **+ New** button in the conversation sidebar
2. In the modal:
   - **Select Inbox** - Choose which channel (Web Widget, Email, WhatsApp, API)
   - **Select Contact** - Pick an existing contact
   - **Subject** (optional) - Conversation topic
   - **Initial Message** - First message content
3. Click **Create**

#### Send a Message

1. Click on a conversation in the left sidebar
2. Type your message in the text input at the bottom
3. Press **Enter** or click the **Send** button
4. Message appears instantly in the chat thread

#### Private/Internal Notes

1. Toggle the **Private** checkbox before sending
2. Private messages are only visible to agents, not the customer
3. Private messages appear with a different background color

#### Use Canned Responses

1. While typing a message, type `/` to trigger canned response search
2. A dropdown appears with matching canned responses
3. Click a response to insert it into the message box

#### Change Conversation Status

1. Open a conversation
2. Click the **Status** dropdown (top of chat area)
3. Select: Open, Pending, Resolved, or Snoozed

#### Assign to Agent

1. Open a conversation
2. Click the **Assignee** dropdown
3. Select an agent from the list
4. The agent will be notified

#### Assign to Team

1. Open a conversation
2. Click the **Team** dropdown
3. Select a team

#### Add/Remove Labels

1. Open a conversation
2. In the right panel or header area, click **Labels**
3. Check/uncheck labels to apply or remove them

#### Real-time Updates

- New incoming messages appear automatically (via WebSocket)
- Typing indicators show when someone is typing
- Conversation list updates in real-time

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../conversations` | List conversations (filterable) |
| GET | `.../conversations/counts` | Status counts |
| POST | `.../conversations` | Create conversation |
| PATCH | `.../conversations/{id}` | Update status/assignee/team |
| GET | `.../conversations/{id}/messages` | Get messages (paginated) |
| POST | `.../conversations/{id}/messages` | Send message |

---

## 5. Feature 4: Inbox Management (Channels)

### What It Does

Inboxes represent communication channels. Each inbox connects to a specific channel type (Web Widget, Email, WhatsApp, or API) and has its own configuration.

### How to Use in the UI

#### View Inboxes

1. Click **Inboxes** in the left sidebar
2. You'll see cards for each inbox showing: Channel type badge, Name, Configuration summary

#### Create a New Inbox

1. Click **+ New Inbox** (top right)
2. Fill in:
   - **Inbox Name** - e.g., "Website Chat", "Support Email", "WhatsApp Business"
   - **Channel Type** - Select from:
     - **Web Widget (Live Chat)** - Embeddable chat widget
     - **API Channel** - For custom integrations
     - **Email** - Email-based conversations
     - **WhatsApp (Meta Business API)** - WhatsApp messaging
3. Fill in channel-specific settings (see channel sections below)
4. Optionally add a **Greeting Message** (auto-sent on new conversations)
5. Click **Create Inbox**

#### View Inbox Details

1. Click on any inbox card
2. A detail panel shows:
   - Inbox token (for API/widget integration)
   - Auto-assignment status
   - Channel-specific configuration
   - Webhook setup instructions (for WhatsApp)
   - Widget embed script (for Web Widget)

#### Delete an Inbox

1. Open the inbox detail panel
2. Click **Delete Inbox** (red button at bottom)
3. Confirm the deletion

---

## 6. Feature 5: Labels

### What It Does

Color-coded labels to categorize and organize conversations. Labels can be applied to multiple conversations for filtering and reporting.

### How to Use in the UI

#### View Labels

1. Click **Labels** in the left sidebar
2. You'll see all labels with their colors, descriptions, and conversation counts

#### Create a Label

1. Click **+ New Label** (top right)
2. Fill in:
   - **Title** (required) - e.g., "Bug", "Feature Request", "VIP"
   - **Description** (optional) - What this label is for
   - **Color** - Pick from 10 preset colors (red, blue, green, yellow, purple, pink, indigo, teal, orange, gray)
   - **Show in Sidebar** - Toggle to show/hide in the main navigation
3. Click **Create**

#### Edit a Label

1. Click the **Edit** (pencil) icon on any label
2. Modify the fields
3. Click **Update**

#### Delete a Label

1. Click the **Delete** (trash) icon on any label
2. Confirm the deletion

#### Apply Labels to Conversations

1. Open a conversation on the **Conversations** page
2. Look for the Labels section in the conversation header or right panel
3. Check/uncheck labels to apply or remove them

---

## 7. Feature 6: Canned Responses

### What It Does

Pre-written message templates with short codes for quick access. Type `/shortcode` in the message box to quickly insert a full response.

### How to Use in the UI

#### View Canned Responses

1. Click **Canned Responses** in the left sidebar
2. You'll see all saved responses with their short codes

#### Create a Canned Response

1. Click **+ New Response** (top right)
2. Fill in:
   - **Short Code** (required) - e.g., "greeting", "closing", "refund_policy"
   - **Content** (required) - The full response text
3. Click **Create**

#### Use in Conversations

1. Go to the **Conversations** page
2. Open any conversation
3. In the message input, type `/` followed by the short code
4. A dropdown appears showing matching canned responses
5. Click on a response to insert it into the message box
6. Edit the message if needed, then send

**Example:**
- Short code: `greeting`
- Content: "Hi there! Thank you for reaching out. How can I help you today?"
- Type `/greeting` in the message box to insert it

#### Search Canned Responses

Use the search bar on the Canned Responses page to find responses by short code or content.

---

## 8. Feature 7: Teams

### What It Does

Group agents into teams for organized assignment and collaboration. Conversations can be assigned to teams, and teams can have auto-assignment enabled.

### How to Use in the UI

#### View Teams

1. Click **Teams** in the left sidebar
2. You'll see all teams with their member count and auto-assign status

#### Create a Team

1. Click **+ New Team** (top right)
2. Fill in:
   - **Team Name** (required) - e.g., "Sales", "Technical Support", "Billing"
   - **Description** (optional)
   - **Auto Assign** - Toggle to automatically assign conversations to team members
3. Click **Create**

#### Manage Team Members

1. Click on a team card to open the detail view
2. You'll see current team members
3. **Add Members**: Click **Add Members**, select agents from the dropdown, click **Add**
4. **Remove Members**: Click the **X** button next to a member's name

#### Assign Conversations to Teams

1. Go to the **Conversations** page
2. Open a conversation
3. Click the **Team** dropdown
4. Select the team
5. If auto-assign is enabled, the conversation will be automatically assigned to an available team member

---

## 9. Feature 8: Real-time Search

### What It Does

Global search across conversations, contacts, and messages from anywhere in the app.

### How to Use in the UI

1. Look for the **Search bar** in the top header (visible on all pages)
2. Type at least **2 characters** to start searching
3. Results appear in a dropdown grouped by type:
   - **Conversations** - Shows conversation number, subject, status
   - **Contacts** - Shows name, email, phone
   - **Messages** - Shows message preview with conversation context
4. Click on any result to navigate directly to it
5. Press **Escape** or click outside to close the search dropdown

---

## 10. Feature 9: Contact Notes & Activity Logs

### What It Does

Add internal notes to contacts and track all activity (status changes, assignments, label changes) for both contacts and conversations.

### How to Use in the UI

#### View Contact Panel

1. Go to **Conversations** page
2. Open a conversation
3. The **right panel** shows the contact's info with two tabs:
   - **Notes** tab
   - **Activity** tab

#### Add a Note

1. In the right panel, click the **Notes** tab
2. Type your note in the text area at the top
3. Click **Add Note**
4. Notes appear in reverse chronological order with timestamps

#### Edit a Note

1. Click the **Edit** (pencil) icon on an existing note
2. Modify the text
3. Click **Save**

#### Delete a Note

1. Click the **Delete** (trash) icon on a note
2. The note is removed immediately

#### View Activity Log

1. In the right panel, click the **Activity** tab
2. You'll see a chronological list of all actions:
   - Conversation created
   - Status changes (e.g., "Status changed from open to resolved")
   - Assignee changes
   - Team assignments
   - Label additions/removals
3. Each activity shows the action type, description, and timestamp

---

## 11. Feature 10: Notifications

### What It Does

Real-time notifications for agents when they're assigned conversations, receive new messages, or other important events occur.

### How to Use in the UI

#### Notification Bell

1. Look for the **Bell icon** in the top-right corner of the header
2. A **red badge** shows the count of unread notifications
3. Click the bell to open the notification dropdown

#### View Notifications

1. Click the bell icon
2. You'll see a list of recent notifications showing:
   - Notification title (e.g., "New message in #42")
   - Preview text
   - Timestamp
   - Read/unread status (unread have a blue dot)

#### Mark as Read

- **Single notification**: Click on any notification to mark it as read and navigate to the related conversation
- **All notifications**: Click **Mark all as read** at the top of the dropdown

#### Filter Unread

1. In the notification dropdown, toggle **Unread only**
2. Only unread notifications will be shown

#### Notification Types

You'll receive notifications for:
- Being assigned to a conversation
- New messages in conversations you're assigned to
- Team assignment changes
- CSAT survey submissions

> Notifications auto-refresh every **30 seconds** via polling.

---

## 12. Feature 11: Reports & Analytics

### What It Does

Comprehensive analytics dashboard with metrics on conversations, agent performance, channel usage, response times, and trends.

### How to Use in the UI

#### Access Reports

1. Click **Reports** in the left sidebar
2. The reports page loads with default last **30 days** of data

#### Set Date Range

1. At the top of the reports page, you'll see **Start Date** and **End Date** fields
2. Click on either field to pick a date
3. Click **Apply** to refresh the report

#### Overview Metrics (Top Row)

Six metric cards showing:
- **Total Conversations** - Total in the date range
- **Open** - Currently open conversations
- **Resolved** - Completed conversations
- **Pending** - Awaiting response
- **Messages Sent** - Total messages
- **New Contacts** - Contacts created in the period

#### Response Time Metrics

- **Average First Response Time** - How quickly agents reply to new conversations
- **Average Resolution Time** - How long it takes to resolve conversations

#### Trend Charts

- **Conversations Over Time** - Bar chart showing daily conversation counts
- **Messages Over Time** - Bar chart showing daily message volume

#### Agent Performance

A table showing each agent's:
- Name
- Assigned conversations
- Resolved conversations
- Average response time

#### Inbox Breakdown

Shows conversation distribution across inboxes/channels:
- Web Widget, Email, WhatsApp, API
- Total and resolved counts per inbox

#### Status Distribution

Visual breakdown of conversation statuses (Open, Pending, Resolved, Snoozed).

#### Top Labels

Which labels are most frequently used, with conversation counts.

#### Team Performance

Each team's conversation and resolution metrics.

---

## 13. Feature 12: Automation Rules

### What It Does

Event-driven automation engine that triggers actions automatically based on conversation and message events. Rules run asynchronously to avoid blocking the main workflow.

### How to Use in the UI

#### Access Automations

1. Click **Automations** in the left sidebar
2. You'll see all automation rules with their event type, conditions, actions, and active status

#### Create an Automation Rule

1. Click **+ New Rule** (top right)
2. Fill in:

   **Basic Info:**
   - **Rule Name** (required) - e.g., "Auto-assign VIP conversations"
   - **Description** (optional)
   - **Event** - When should this rule trigger:
     - `conversation_created` - When a new conversation is created
     - `conversation_updated` - When a conversation is updated (status, assignee, etc.)
     - `message_created` - When a new message is received

   **Conditions (When):**
   - Click **+ Add Condition**
   - Select an **Attribute** (e.g., status, channel_type, content)
   - Select an **Operator** (equals, not_equals, contains, not_contains)
   - Enter a **Value**
   - Add multiple conditions (all must match - AND logic)

   **Actions (Then):**
   - Click **+ Add Action**
   - Select an **Action Type**:
     - `assign_agent` - Auto-assign to a specific agent (enter user ID)
     - `assign_team` - Auto-assign to a team (enter team ID)
     - `add_label` - Apply a label (enter label title)
     - `send_message` - Auto-send a message (enter message content)
     - `change_status` - Change conversation status (enter: open/pending/resolved/snoozed)

3. Click **Create**

#### Example Automation Rules

**Auto-assign WhatsApp conversations to the sales team:**
```
Event: conversation_created
Condition: channel_type equals WHATSAPP
Action: assign_team → 1 (Sales team ID)
```

**Auto-label conversations containing "refund":**
```
Event: message_created
Condition: content contains refund
Action: add_label → refund
```

**Send auto-reply on new conversations:**
```
Event: conversation_created
Condition: status equals open
Action: send_message → "Thank you for contacting us! An agent will be with you shortly."
```

#### Toggle Rule Active/Inactive

- Click the toggle switch next to any rule to enable or disable it
- Inactive rules will not trigger

#### Edit a Rule

1. Click the **Edit** button on any rule
2. Modify conditions, actions, or settings
3. Click **Update**

#### Delete a Rule

1. Click the **Delete** button on a rule
2. Confirm the deletion

---

## 14. Feature 13: CSAT (Customer Satisfaction)

### What It Does

Send customer satisfaction surveys after resolving conversations. Customers rate their experience on a 1-5 scale with optional feedback text.

### How to Use in the UI

#### Send a CSAT Survey

1. Go to **Conversations** page
2. Open a **Resolved** conversation (status must be "resolved")
3. You'll see a **Send CSAT Survey** button in the conversation header or chat area
4. Click it to generate a survey link
5. The survey link is sent to the customer (or can be shared manually)

#### Customer Survey Experience

When a customer opens the survey link (`/survey/{token}`):
1. They see the conversation context
2. They select a rating from 1-5 (with emoji faces):
   - 1 = Terrible
   - 2 = Bad
   - 3 = Okay
   - 4 = Good
   - 5 = Excellent
3. They can optionally add feedback text
4. They click **Submit**
5. No login required - it's a public page

#### View CSAT Reports

1. Click **CSAT** in the left sidebar
2. **Report Tab** shows:
   - **Average Rating** - Overall score out of 5
   - **Satisfaction Score** - Percentage of ratings 4 or 5
   - **Total Responses** - How many surveys were completed
   - **Pending Surveys** - Surveys that haven't been answered yet
   - **Rating Distribution** - Bar chart showing count per rating level
   - **Agent CSAT Scores** - Each agent's average rating and response count

3. **Responses Tab** shows:
   - Paginated list of individual survey responses
   - Each showing: rating, feedback text, agent name, submission date

#### Filter CSAT Data

- Use **Start Date** and **End Date** to filter the report period
- Use **Agent** filter to see specific agent's CSAT scores

---

## 15. Feature 14: Email Channel Integration

### What It Does

Full email channel support with SMTP (sending) and IMAP (receiving) configuration per inbox. Incoming emails auto-create conversations and contacts.

### How to Use in the UI

#### Create an Email Inbox

1. Go to **Inboxes** page
2. Click **+ New Inbox**
3. Select **Email** as the channel type
4. Fill in:

   **Email Address** (required):
   - `support@yourcompany.com` - The email address for this inbox

   **SMTP Settings (Outgoing Mail)** (required):
   - **SMTP Host** - e.g., `smtp.gmail.com`, `smtp.office365.com`
   - **SMTP Port** - Usually `587` (TLS) or `465` (SSL)
   - **SMTP Username** - Email login username
   - **SMTP Password** - Email password or app-specific password
   - **Enable TLS** - Check for most modern email servers

   **IMAP Settings (Incoming Mail)** (optional):
   - **IMAP Host** - e.g., `imap.gmail.com`
   - **IMAP Port** - Usually `993` (SSL)
   - **IMAP Username/Password** - Same as SMTP or different
   - **Enable SSL** - Check for secure connection

   **Additional Settings:**
   - **Forward To Email** - Optional forwarding address
   - **Email Signature** - Auto-appended to outgoing emails (HTML supported)

5. Click **Create Inbox**

#### Test SMTP Connection

1. Click on an Email inbox card to open details
2. Click **Test SMTP Connection** button (green)
3. Result shows success or failure message

#### Send Email Replies

When a conversation is on an Email inbox:
1. Type your reply in the message box
2. The reply is sent as an email to the contact's email address
3. Your email signature is auto-appended

#### Receive Incoming Emails

Incoming emails can be received via:
- **Webhook**: Forward emails from services like SendGrid or Mailgun to:
  ```
  POST /public/email/incoming/{inboxToken}
  ```
- **IMAP Polling** (if configured): The system checks for new emails periodically

Incoming emails automatically:
- Create a new contact if the sender is unknown
- Thread into existing open conversations from the same contact
- Create a new conversation if no open conversation exists

#### Gmail Setup Example

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP TLS: Enabled
IMAP Host: imap.gmail.com
IMAP Port: 993
IMAP SSL: Enabled
Username: your-email@gmail.com
Password: (use App Password, not regular password)
```

> **Note**: For Gmail, you need to generate an **App Password** at https://myaccount.google.com/apppasswords

---

## 16. Feature 15: WhatsApp Channel Integration (Meta Business API)

### What It Does

Full WhatsApp Business API integration via Meta Cloud API. Send and receive WhatsApp messages, process incoming webhooks, support template messages for initiating conversations outside the 24-hour window.

### Prerequisites

Before setting up, you need:

1. A **Meta Business Account** - https://business.facebook.com
2. A **Meta Developer Account** - https://developers.facebook.com
3. A **WhatsApp Business App** created in the Meta Developer Dashboard
4. A **Phone Number** registered with WhatsApp Business
5. A **Permanent Access Token** (System User token)

### How to Get Meta API Credentials

1. Go to https://developers.facebook.com/apps
2. Create a new app or select existing one
3. Add the **WhatsApp** product
4. Go to **WhatsApp > API Setup**
5. Note down:
   - **Phone Number ID** - Shown on the API Setup page
   - **WhatsApp Business Account ID (WABA ID)** - In Business Settings
6. Create a **System User** in Business Manager:
   - Go to Business Settings > Users > System Users
   - Create a system user with `whatsapp_business_messaging` permission
   - Generate a **Permanent Access Token**

### How to Use in the UI

#### Create a WhatsApp Inbox

1. Go to **Inboxes** page
2. Click **+ New Inbox**
3. Select **WhatsApp (Meta Business API)** as the channel type
4. Fill in:

   **WhatsApp Phone Number** (required):
   - e.g., `+1234567890` - Your registered WhatsApp Business number

   **Meta API Configuration:**
   - **Phone Number ID** (required) - e.g., `1234567890123456`
   - **WhatsApp Business Account ID** - Your WABA ID
   - **Permanent Access Token** (required) - System user token starting with `EAA...`

   **Business Details:**
   - **Business Name** - Your business display name
   - **API Base URL** - Default: `https://graph.facebook.com/v21.0`

5. Click **Create Inbox**

#### Configure the Webhook (Required for Incoming Messages)

After creating the inbox, you need to configure the webhook in Meta Developer Dashboard:

1. Click on your WhatsApp inbox card to open details
2. Note the **Webhook URL** and **Verify Token** shown in the detail panel
3. Go to **Meta Developer Dashboard > WhatsApp > Configuration**
4. Set the **Callback URL** to:
   ```
   https://your-domain.com/public/whatsapp/webhook
   ```
   > For local development, use a tunneling tool like ngrok:
   > ```bash
   > ngrok http 8080
   > # Use the ngrok URL as callback: https://xxxx.ngrok.io/public/whatsapp/webhook
   > ```
5. Set the **Verify Token** to the value shown in the inbox detail panel
6. **Subscribe** to these webhook fields:
   - `messages`
   - `message_deliveries`
   - `message_reads`

#### Sending Messages

When a conversation is on a WhatsApp inbox:
1. Type your message in the message box
2. Click **Send**
3. The message is sent via Meta Cloud API to the customer's WhatsApp

#### Template Messages

WhatsApp has a **24-hour messaging window** - you can only send free-form messages within 24 hours of the customer's last message. After that, you must use **approved template messages**.

To send a template:
```
POST /api/v1/accounts/{accountId}/conversations/{conversationId}/whatsapp_template
Body: {
  "templateName": "hello_world",
  "languageCode": "en_US",
  "senderId": 1
}
```

#### Incoming Messages

When a customer sends a WhatsApp message:
1. Meta delivers it to your webhook endpoint
2. The system automatically:
   - Creates a contact if the phone number is new
   - Finds or creates a conversation
   - Creates an incoming message
   - Notifies the assigned agent
   - Triggers any matching automation rules
3. The message appears in real-time on the Conversations page

#### Supported Message Types

| Type | Display |
|------|---------|
| Text | Full message content |
| Image | `[Image] caption` |
| Video | `[Video] caption` |
| Audio | `[Audio message]` |
| Document | `[Document: filename]` |
| Location | `[Location: lat, lng]` |
| Contacts | `[Contact card shared]` |
| Sticker | `[Sticker]` |
| Reaction | `[Reaction: emoji]` |
| Interactive | Button/list reply title |

---

## 17. Feature 16: File & Attachment Support

### What It Does

Send and receive file attachments (images, documents, audio, video) in conversation messages. Files are stored on the server and served via authenticated download URLs. Images display inline in the chat; other files show as downloadable links.

### Supported File Types

| Category | Types |
|----------|-------|
| **Images** | JPEG, PNG, GIF, WebP, SVG, BMP |
| **Documents** | PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), Plain text, CSV |
| **Audio** | MP3, WAV, OGG, WebM |
| **Video** | MP4, WebM, QuickTime |
| **Archives** | ZIP, RAR, GZIP |

### Limits

- **Max file size**: 10 MB per file (configurable via `MAX_FILE_SIZE_MB` env var)
- **Max files per message**: 5
- **Max request size**: 25 MB (total across all files)

### How to Use in the UI

#### Sending Files

1. Open a conversation on the **Conversations** page
2. Click the **📎 (paperclip)** button next to the message input
3. Select one or more files from your computer
4. A **preview bar** appears above the message input showing:
   - Thumbnail (for images) or file type icon
   - File name
   - File size
   - **×** button to remove individual files
5. Optionally type a text message to accompany the files
6. Click **Send** (the button shows the file count, e.g., "Send (2 files)")

#### Viewing Attachments

In the chat thread:
- **Images** display inline as thumbnails (max 240×180px). Click to open full size in a new tab.
- **Documents, audio, video** show as clickable links with:
  - File type icon (📎 for documents, 🎵 for audio, 🎬 for video)
  - File name
  - File size
- Click any attachment to download or open it

#### Sending Files Without Text

You can send files without any text message — just select files and click Send.

### File Storage

Files are stored locally in the `uploads/` directory (configurable via `UPLOAD_DIR` env var), organized by:
```
uploads/
  account_1/
    2026-03/
      uuid-filename.pdf
      uuid-filename.jpg
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `.../messages/with-attachments` | Send message with file attachments (multipart/form-data) |
| GET | `/api/v1/attachments/{id}/download` | Download/view an attachment |

### Configuration (application.yml)

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 25MB

app:
  file-storage:
    upload-dir: uploads          # Directory for file storage
    max-file-size-mb: 10         # Max file size in MB
```

---

## 18. API Reference

### Authentication

All API endpoints (except `/api/v1/auth/**`, `/public/**`, `/ws/**`) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

Tokens expire after **24 hours**. Use the refresh token (valid for **7 days**) to get a new access token:

```
POST /api/v1/auth/refresh
Body: { "refreshToken": "your-refresh-token" }
```

### Complete Endpoint List

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account and user |
| POST | `/api/v1/auth/login` | Login, returns JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |

#### Account Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts/{id}/users` | List account users |
| POST | `/api/v1/accounts/{id}/users/invite` | Invite user |
| PATCH | `/api/v1/accounts/{id}/users/{userId}/role` | Update role |
| DELETE | `/api/v1/accounts/{id}/users/{userId}` | Remove user |

#### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts/{id}/contacts?page=0&size=20&search=query` | List contacts |
| GET | `/api/v1/accounts/{id}/contacts/{contactId}` | Get contact |
| POST | `/api/v1/accounts/{id}/contacts` | Create contact |
| PUT | `/api/v1/accounts/{id}/contacts/{contactId}` | Update contact |
| DELETE | `/api/v1/accounts/{id}/contacts/{contactId}` | Delete contact |

#### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../conversations?status=open&assigneeId=1&inboxId=1&labelId=1` | List conversations |
| GET | `.../conversations/counts` | Get status counts |
| GET | `.../conversations/{id}` | Get conversation |
| POST | `.../conversations` | Create conversation |
| PATCH | `.../conversations/{id}` | Update conversation |

#### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../conversations/{id}/messages?page=0&size=50` | Get messages |
| POST | `.../conversations/{id}/messages` | Send message |

#### Inboxes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../inboxes` | List inboxes |
| GET | `.../inboxes/{id}` | Get inbox |
| POST | `.../inboxes` | Create inbox |
| PATCH | `.../inboxes/{id}` | Update inbox |
| DELETE | `.../inboxes/{id}` | Delete inbox |

#### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../labels` | List labels |
| POST | `.../labels` | Create label |
| PATCH | `.../labels/{id}` | Update label |
| DELETE | `.../labels/{id}` | Delete label |
| GET | `.../conversations/{id}/labels` | Get conversation labels |
| POST | `.../conversations/{id}/labels` | Set conversation labels |

#### Canned Responses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../canned_responses?search=query` | List/search canned responses |
| POST | `.../canned_responses` | Create canned response |
| PATCH | `.../canned_responses/{id}` | Update canned response |
| DELETE | `.../canned_responses/{id}` | Delete canned response |

#### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../teams` | List teams |
| POST | `.../teams` | Create team |
| PATCH | `.../teams/{id}` | Update team |
| DELETE | `.../teams/{id}` | Delete team |
| POST | `.../teams/{id}/members` | Add members |
| PUT | `.../teams/{id}/members` | Set members |
| DELETE | `.../teams/{id}/members` | Remove members |

#### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../agents` | List agents |

#### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../search?q=query` | Global search (min 2 chars) |

#### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../contacts/{contactId}/notes` | List notes |
| POST | `.../contacts/{contactId}/notes` | Create note |
| PATCH | `.../contacts/{contactId}/notes/{noteId}` | Update note |
| DELETE | `.../contacts/{contactId}/notes/{noteId}` | Delete note |

#### Activity Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../activity_logs` | All activity logs |
| GET | `.../contacts/{contactId}/activity_logs` | Contact activity |
| GET | `.../conversations/{conversationId}/activity_logs` | Conversation activity |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../reports?startDate=2024-01-01&endDate=2024-12-31` | Get report data |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../notifications?unreadOnly=true&page=0&size=20` | List notifications |
| GET | `.../notifications/unread_count` | Get unread count |
| POST | `.../notifications/{id}/read` | Mark as read |
| POST | `.../notifications/read_all` | Mark all as read |

#### Automation Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `.../automation_rules` | List rules |
| POST | `.../automation_rules` | Create rule |
| PATCH | `.../automation_rules/{id}` | Update rule |
| DELETE | `.../automation_rules/{id}` | Delete rule |
| POST | `.../automation_rules/{id}/toggle` | Toggle active/inactive |

#### CSAT
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `.../conversations/{id}/csat` | Create survey |
| GET | `.../csat/responses` | List responses |
| GET | `.../csat/report` | Get report |
| GET | `/public/csat/{token}` | Get survey (public) |
| POST | `/public/csat/{token}` | Submit survey (public) |

#### Email Channel
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `.../conversations/{id}/email_reply` | Send email reply |
| POST | `.../inboxes/{id}/test_smtp` | Test SMTP |
| POST | `/public/email/incoming/{inboxToken}` | Receive email webhook |

#### WhatsApp Channel
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/whatsapp/webhook` | Meta webhook verification |
| POST | `/public/whatsapp/webhook` | Receive WhatsApp events |
| POST | `.../conversations/{id}/whatsapp_reply` | Send WhatsApp message |
| POST | `.../conversations/{id}/whatsapp_template` | Send template message |

#### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8080/ws` | WebSocket connection (STOMP over SockJS) |
| `/topic/accounts/{id}/conversations` | Conversation updates |
| `/topic/accounts/{id}/conversations/{id}/messages` | New messages |
| `/topic/users/{id}/notifications` | User notifications |

---

## 19. Tech Stack & Architecture

### Backend

| Technology | Purpose |
|------------|---------|
| Spring Boot 3.2.3 | Application framework |
| Java 17 | Programming language |
| Spring Data JPA | Database access (Hibernate) |
| PostgreSQL | Primary database |
| Spring Security | Authentication & authorization |
| JWT (jjwt 0.12.5) | Token-based authentication |
| Spring WebSocket | Real-time messaging (STOMP/SockJS) |
| Spring Mail | Email sending (SMTP) |
| Lombok | Boilerplate reduction |
| Jackson | JSON processing |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| SockJS + STOMP | WebSocket client |
| CSS-in-JS (inline styles) | Styling |

### Architecture Patterns

- **JWT Authentication**: 24-hour access tokens, 7-day refresh tokens
- **Polymorphic Channels**: Inbox.channelId references channel-specific config tables (ChannelWebWidget, ChannelEmail, ChannelWhatsapp)
- **Async Automation**: `@Async` annotation for non-blocking automation rule execution
- **Real-time Updates**: WebSocket (STOMP over SockJS) for instant message delivery and notifications
- **JSONB Columns**: PostgreSQL JSONB for flexible metadata storage (custom attributes, content attributes, settings)
- **Native SQL Queries**: EntityManager native SQL for complex analytics and reporting
- **Public Endpoints**: Token-based public endpoints for CSAT surveys and channel webhooks (no auth required)

### Database Schema (Key Tables)

```
accounts
  └── users (via account_users join table)
  └── contacts
  └── inboxes
  │     └── channel_web_widgets
  │     └── channel_emails
  │     └── channel_whatsapps
  └── conversations
  │     └── messages
  │     └── labels (many-to-many)
  │     └── csat_responses
  └── labels
  └── canned_responses
  └── teams
  │     └── team_members (join table)
  └── automation_rules
  └── notifications
  └── activity_logs
  └── notes (on contacts)
```

### Running in Production

1. Set `spring.jpa.hibernate.ddl-auto` to `validate` (not `update`)
2. Use environment variables for sensitive config:
   ```
   DATABASE_URL, JWT_SECRET, WHATSAPP_VERIFY_TOKEN
   ```
3. Set up a reverse proxy (nginx) with SSL for WhatsApp webhook
4. Configure CORS allowed origins for your production domain
5. Use a proper mail service (SendGrid, SES) for email channels

---

*Generated for WhatsApp CRM Project - Built with Spring Boot + React*
