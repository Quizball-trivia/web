IMPLEMENTATION PLAN (FULLY TYPE-SAFE): QuizBall realtime multiplayer (friendly + ranked) with Socket.IO + Redis

You are implementing real-time multiplayer for QuizBall with these constraints:

NON-NEGOTIABLES
1) Full type safety end-to-end:
   - Backend is source of truth for HTTP API types via Zod -> OpenAPI registry (src/http/openapi/registry.ts)
   - Frontend generates types from backend OpenAPI: openapi-typescript -> src/types/api.generated.ts
   - No `any`, no fake placeholder types, no `Record<string, unknown>`
2) WebSocket contracts must be type-safe too:
   - Define socket event types in a shared TS module and use them on both backend and frontend
   - Validate inbound socket payloads with Zod on backend (runtime safety)
3) Only modes:
   - 'friendly' and 'ranked' (NO casual)
4) Use Redis from day 1:
   - Socket.IO Redis adapter for scaling
   - Redis locks and ranked queue
5) UX:
   - After player answers, they immediately see correct/wrong + highlight correct option + score updates.
   - Do NOT send correct answer in match:question.
   - Instead send PRIVATE 'match:answer_ack' to the answering socket with correctIndex/isCorrect immediately.

--------------------------------------------------------------------------------
A) INFRA + DEPENDENCIES
--------------------------------------------------------------------------------
Backend deps:
- socket.io
- redis
- @socket.io/redis-adapter
Dev:
- socket.io-client (for test scripts)

Frontend deps:
- socket.io-client

docker-compose.yml:
- add redis service:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
- optional redis-commander:8081

.env:
- REDIS_URL=redis://localhost:6379

Update backend config schema (src/core/config.ts):
- Add REDIS_URL optional with Zod validation.

--------------------------------------------------------------------------------
B) TYPE-SAFETY ARCHITECTURE (HTTP + WS)
--------------------------------------------------------------------------------
HTTP TYPES (already existing pattern):
- Backend defines all HTTP schemas in src/http/openapi/registry.ts using Zod + .openapi()
- Frontend generates src/types/api.generated.ts via npm run api:sync:local

WS TYPES (new):
1) Create a shared package/module in repo:
   - /packages/shared/ (recommended) OR /shared/
   - Export:
     - GameStage union type (match frontend stages)
     - LobbyState, DraftState, MatchState DTOs
     - Socket event maps:
        ClientToServerEvents
        ServerToClientEvents
        (Socket.IO supports typed events)
2) Backend uses these types when creating io and handlers:
   const io = new Server<ClientToServerEvents, ServerToClientEvents>(...)
3) Frontend socket client uses the same types:
   const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(...)

Runtime validation:
- Backend must validate ALL client->server socket payloads with Zod schemas (no trusting client).
- Add src/realtime/schemas/*.ts with Zod payload validators for each event.
- Keep Zod schemas aligned with shared TS types. (Preferred: define Zod schema and infer TS type.)

IMPORTANT: HTTP OpenAPI generation does NOT cover socket events.
We still enforce type safety via shared TS and Zod runtime validation.

--------------------------------------------------------------------------------
C) BACKEND STRUCTURE
--------------------------------------------------------------------------------
Modify src/main.ts:
- Attach Socket.IO to an HTTP server:
  import { createServer } from 'http';
  const app = createApp();
  const httpServer = createServer(app);
  initSocketServer(httpServer);
  httpServer.listen(PORT)

Create:
src/realtime/
  socket-server.ts
  socket-auth.ts
  handlers/
    lobby.handler.ts
    draft.handler.ts
    match.handler.ts
  schemas/
    lobby.schemas.ts
    draft.schemas.ts
    match.schemas.ts
  shared/ (or import from packages/shared)

Create backend modules:
src/modules/lobbies/
  lobbies.repo.ts (postgres.js)
  lobbies.service.ts
  index.ts
src/modules/matches/
  matches.repo.ts
  matches.service.ts
  match-questions.service.ts
  index.ts

--------------------------------------------------------------------------------
D) SOCKET SERVER INIT (with Redis adapter)
--------------------------------------------------------------------------------
src/realtime/socket-server.ts:
- Create io with typed event maps.
- Connect Redis pub/sub:
  pub = createClient({ url: REDIS_URL })
  sub = pub.duplicate()
  await pub.connect(); await sub.connect();
  io.adapter(createAdapter(pub, sub))
- io.use(socketAuthMiddleware)
- on connection:
  socket.join(`user:${user.id}`)
  register handlers

socket-auth.ts:
- Extract token from socket.handshake.auth.token OR Authorization header
- Verify via existing authProvider.verifyToken(token)
- Resolve internal user via usersService.getOrCreateFromIdentity(identity)
- store on socket.data.user

--------------------------------------------------------------------------------
E) SOCKET EVENT CONTRACT (ONLY friendly + ranked)
--------------------------------------------------------------------------------
Shared types define:

Client->Server:
- 'lobby:create' { mode: 'friendly' | 'ranked' }
   friendly: create invite lobby
   ranked: join ranked queue
- 'lobby:join_by_code' { inviteCode: string }
- 'lobby:leave' {}
- 'lobby:ready' { ready: boolean }
- 'draft:ban' { categoryId: string }
- 'match:answer' { matchId: string, qIndex: number, selectedIndex: number|null, timeMs: number }

Server->Client:
- 'lobby:state' LobbyState
- 'draft:start' DraftState
- 'draft:banned' { actorId: string, categoryId: string }
- 'draft:complete' { allowedCategoryIds: [string,string] }

- 'match:start' { matchId: string, opponent: OpponentInfo }
- 'match:question' { matchId: string, qIndex: number, total: 10, question: GameQuestionDTO, deadlineAt: string }
- 'match:opponent_answered' { matchId: string, qIndex: number }

- 'match:answer_ack' (PRIVATE to answering socket only):
   { matchId, qIndex, selectedIndex, isCorrect, correctIndex, myTotalPoints, oppTotalPoints, oppAnswered }
- 'match:round_result':
   { matchId, qIndex, correctIndex, players: Record<userId, { selectedIndex, isCorrect, timeMs, pointsEarned, totalPoints }> }
- 'match:final_results':
   { matchId, winnerId: string|null, players: Record<userId, { totalPoints, correctAnswers, avgTimeMs }>, durationMs }

GameQuestionDTO MUST NOT include correctIndex.

--------------------------------------------------------------------------------
F) DATABASE MIGRATION (friendly + ranked only)
--------------------------------------------------------------------------------
Create: supabase/migrations/YYYYMMDDHHMMSS_multiplayer.sql

Tables (ONLY allow 'friendly'|'ranked'):

1) lobbies:
- id uuid pk
- invite_code text unique (nullable)
- mode text check (mode in ('friendly','ranked'))
- host_user_id fk users
- status text check (status in ('waiting','active','closed'))
- created_at/updated_at
CHECK:
- (mode='friendly' AND invite_code IS NOT NULL) OR (mode='ranked' AND invite_code IS NULL)

2) lobby_members:
- lobby_id, user_id, is_ready, joined_at
PK (lobby_id, user_id)

3) lobby_categories:
- lobby_id, slot 1..4, category_id
PK (lobby_id, slot)
Unique (lobby_id, category_id)

4) lobby_category_bans:
- lobby_id, user_id, category_id, banned_at
PK (lobby_id, user_id)
Unique (lobby_id, category_id)

5) matches:
- id uuid pk
- lobby_id fk nullable
- mode check ('friendly','ranked')
- status check ('active','completed','abandoned')
- category_a_id, category_b_id
- current_q_index default 0
- total_questions default 10
- started_at, ended_at
- winner_user_id nullable

6) match_players:
- match_id, user_id
- seat smallint check (1,2)
- total_points int default 0
- correct_answers int default 0
- avg_time_ms nullable
PK (match_id, user_id)
Unique (match_id, seat)

7) match_questions:
- match_id
- q_index 0..9
- question_id
- category_id
- correct_index 0..3 (cached at match creation from question_payloads.options.is_correct)
- shown_at, deadline_at
PK (match_id, q_index)
Unique (match_id, question_id)

8) match_answers:
- match_id, q_index, user_id
- selected_index nullable 0..3
- is_correct bool
- time_ms int
- points_earned int
- answered_at default now()
PK (match_id, q_index, user_id)

Indexes:
- lobbies(invite_code) where mode='friendly' and status='waiting'
- matches(status) where status='active'
- match_questions(match_id)
- match_answers(match_id)

--------------------------------------------------------------------------------
G) REDIS KEYS + LOCKS (NO MIGRATIONS)
--------------------------------------------------------------------------------
Redis key conventions:
- lock:lobby:{lobbyId}  (SET NX PX 3000)
- lock:match:{matchId}  (SET NX PX 3000)

Ranked queue:
- ranked:queue (LIST) + ranked:inqueue:{userId} (SET with TTL to dedupe)
Flow:
- on ranked join:
  if not exists ranked:inqueue:{userId} then setex + rpush
- matchmaking:
  if llen>=2 -> lpop two users -> create ranked lobby + proceed

Optional state cache:
- lobby:state:{lobbyId} JSON TTL 30s
- match:state:{matchId} JSON TTL 2m
(DB remains source of truth)

--------------------------------------------------------------------------------
H) BACKEND LOGIC (DETAILED)
--------------------------------------------------------------------------------
1) lobby:create (friendly)
- Create lobby row with invite_code (8 chars), status=waiting, mode='friendly'
- Insert host into lobby_members
- socket joins room lobby:{lobbyId}
- emit lobby:state to room

2) lobby:join_by_code
- Find waiting friendly lobby by invite_code
- add guest (reject if already 2 players)
- socket joins lobby:{lobbyId}
- emit lobby:state to room

3) lobby:create (ranked)
- Add userId to ranked queue in Redis (dedupe key)
- When two users available:
  - create lobby row mode='ranked', invite_code NULL, status='waiting', host_user_id=user1
  - insert both lobby_members, set is_ready=true for both
  - join both sockets to lobby room via personal room emission:
    emit to user:{id} a "lobby:state" that includes lobbyId and instruct client to join lobby room, OR server tracks sockets and adds them.
  - immediately start draft

4) lobby:ready
- Update lobby_members.is_ready
- If 2 members and both ready:
  - acquire lock:lobby:{lobbyId}
  - set lobby.status=active
  - pick 4 random categories (categories.is_active=true)
  - insert lobby_categories slots 1..4
  - emit draft:start with categories + whose turn first (host first)

5) draft:ban
- validate categoryId belongs to lobby_categories
- validate caller turn (host first then guest)
- insert lobby_category_bans (PK prevents double ban)
- emit draft:banned
- when both bans exist:
  - compute remaining 2 categories
  - emit draft:complete
  - create match

6) create match
- Create matches row (mode inherits lobby.mode)
- Create match_players for both users seat=1(host) seat=2(guest)
- Select 10 questions:
   - 5 random published questions from categoryA
   - 5 random published questions from categoryB
   - shuffle final list and assign q_index 0..9
   - for each question:
     load question_payloads.payload
     compute correct_index = index where options[i].is_correct==true (must be exactly 1)
     insert match_questions with cached correct_index
- Emit match:start to both with opponent info
- Send first match:question with deadlineAt, without correct index

7) match:answer
- Validate payload via Zod
- Load correct_index from match_questions
- Compute is_correct, points_earned (simple MVP):
  if correct: 100 + floor(100*(timeLimitMs - timeMs)/timeLimitMs) clamped 0..100
  else 0
- Insert match_answers (PK ensures one answer)
- Update match_players totals
- Emit PRIVATE match:answer_ack to answering socket
- Emit match:opponent_answered to other player
- If both answered or time expired:
  - emit match:round_result to both
  - advance current_q_index
  - if <10 -> emit next match:question
  - else finalize -> winner -> match:final_results

8) timers
- When emitting match:question, store deadlineAt in match_questions.deadline_at
- Use setTimeout on the instance that emitted the question
- On timeout fire:
   try acquire lock:match:{matchId}
   check if round already resolved; if not:
     insert timeout answers as selected_index NULL for missing players
     emit round_result
     advance

--------------------------------------------------------------------------------
I) FRONTEND (Next.js) TYPE-SAFE INTEGRATION
--------------------------------------------------------------------------------
1) Continue using OpenAPI-generated HTTP types (already set up):
- api.generated.ts is source of truth for HTTP DTOs
- api client attaches bearer and refresh+retry once on 401

2) Add a typed socket client:
- Create src/lib/socket/socket-client.ts
- Import shared socket event types
- Construct:
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(NEXT_PUBLIC_API_URL, { auth:{token}, transports:['websocket'], autoConnect:false })

3) Connect strategy:
- Connect on entering /friend/room/[code] and /play ranked (authenticated only)
- Disconnect on leaving those flows

4) Wire socket events to Zustand gameSession store:
- Replace all simulated multiplayer with real events.
- Ensure no correctIndex is used from REST question endpoint in multiplayer path.

5) Maintain Next.js type discipline:
- no any
- use types from api.generated.ts for HTTP
- use shared socket types for WS

--------------------------------------------------------------------------------
J) TESTING (REQUIRED)
--------------------------------------------------------------------------------
1) Provide scripts/test-redis-adapter.ts:
- Run two backend instances on different ports, same REDIS_URL
- Connect two socket clients to different instances
- Create lobby on A, join on B by inviteCode
- Verify both receive lobby:state

2) Provide scripts/test-friendly-e2e.ts:
- Simulate full flow:
  create friendly lobby -> join -> ready -> bans -> Q0 -> answer -> verify answer_ack and round_result -> finish
- Must pass locally.

DELIVERABLES:
- Migration SQL file
- Shared TS socket types module (+ backend+frontend usage)
- Backend realtime + services + Zod validation
- Redis docker-compose + env config
- Frontend socket client + store wiring
- Test scripts proving cross-instance works


current schema
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  parent_id uuid,
  name jsonb NOT NULL,
  description jsonb,
  icon text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.featured_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT nextval('featured_categories_sort_order_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT featured_categories_pkey PRIMARY KEY (id),
  CONSTRAINT featured_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.question_payloads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_payloads_pkey PRIMARY KEY (id),
  CONSTRAINT question_payloads_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  type text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  prompt jsonb NOT NULL,
  explanation jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.user_identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  subject text NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_identities_pkey PRIMARY KEY (id),
  CONSTRAINT user_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text,
  nickname text,
  country text,
  avatar_url text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['admin'::text, 'user'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);