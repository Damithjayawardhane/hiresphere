# HireSphere — Viva Code Flow & Likely Questions

**Purpose:** Sir අහන **file → code → call** ප්‍රශ්නවලට සූදානම.  
**Related:** [VIVA-SPEECH-SCRIPT-30MIN.md](VIVA-SPEECH-SCRIPT-30MIN.md) · [VIVA-DEMO-GUIDE.md](VIVA-DEMO-GUIDE.md) · [VS-CODE-DEMO.md](VS-CODE-DEMO.md)

---

## 1. මුළු system — කොහෙද වෙන්නේ?

```
Browser (React on AWS Amplify)
    ↓ HTTPS  (VITE_API_URL)
API Gateway (AWS)  →  ALB  →  nginx api-gateway  :80
    ├─ /auth/*        → auth-service      :5001  → RDS
    ├─ /bookings/*    → booking-service   :5002  → RDS
    ├─ /packages      → booking-service
    ├─ /feedback/*    → interview-service :5003  → RDS
    ├─ /submissions   → interview-service
    ├─ /messages      → interview-service
    ├─ /ratings/*     → interview-service
    └─ /socket.io/*   → interview-service (WebSocket / live session)
```

| Layer | File / resource |
|-------|-----------------|
| Route rules | `nginx/nginx.conf` |
| Cloud deploy | `cloudformation/hiresphere-ecs-services.yaml` |
| Local deploy | `docker-compose.yml` |
| Baseline AWS | `cloudformation/hiresphere-stack.yaml` |

---

## 2. Frontend — file map

| Step | File | What happens |
|------|------|----------------|
| App start | `frontend/src/main.jsx` | Router, `ThemeProvider`, `AuthProvider` |
| URL routes | `frontend/src/App.jsx` | `/login`, `/interviewers`, `/bookings`, … |
| HTTP client | `frontend/src/api.js` | `axios`, `API_BASE`, `setApiAuthToken` |
| Auth state | `frontend/src/context/AuthContext.jsx` | Cognito or local JWT |
| Cognito config | `frontend/src/amplify-config.js` | Pool ID, client ID |
| Private pages | `App.jsx` → `PrivateRoute` | No `user` → redirect `/login` |

### Main pages → files

| Page | File |
|------|------|
| Login / Register | `pages/Login.jsx`, `pages/Register.jsx` |
| Dashboard | `pages/Dashboard.jsx` |
| Find interviewers | `pages/Interviewers.jsx` |
| Book session | `pages/BookSession.jsx` |
| My bookings | `pages/MyBookings.jsx` |
| Live session | `pages/LiveSession.jsx` |
| Feedback | `pages/FeedbackForm.jsx` |
| Submissions | `pages/Submissions.jsx` |
| Messages | `pages/Messages.jsx` |
| Packages | `pages/Packages.jsx` |

---

## 3. Login flow (call chain)

### Cloud — Amazon Cognito

```
Login.jsx
  → AuthContext.signIn()
  → aws-amplify signIn()                    [Cognito User Pool]
  → fetchAuthSession()                        [ID token]
  → setApiAuthToken(token)                    [api.js — Authorization header]
  → POST /auth/cognito-sync
       → nginx /auth/
       → auth-service/app.py → cognito_sync()
       → cognito_jwt.py → verify_bearer_token()
       → User row INSERT/UPDATE in RDS
  → setUser() → navigate /dashboard
```

**Key files:**
- `frontend/src/pages/Login.jsx`
- `frontend/src/context/AuthContext.jsx` — `cognitoSignIn`, `syncCognitoProfile`
- `auth-service/app.py` — `cognito_sync()` (~line 122)
- `auth-service/cognito_jwt.py`

### Local — JWT (no Cognito env)

```
Login.jsx → POST /auth/login
  → auth-service/app.py → login()
  → returns { token, user }
  → localStorage: hs_token, hs_user
```

---

## 4. Find interviewers

```
Interviewers.jsx (mount)
  → api.js → fetchInterviewers()
      → GET /auth/users?role=interviewer
      → GET /ratings/interviewers
  → merge ratings into users
  → UI filters (domain, type, level from DB data)
```

| Backend | Function | File |
|---------|----------|------|
| List interviewers | `list_users()` | `auth-service/app.py` |
| Ratings map | ratings route | `interview-service/app.py` |

**Model:** `User` (auth-service)

---

## 5. Book session + payment

```
BookSession.jsx
  → GET /auth/users/:interviewerId
  → POST /bookings
  → POST /bookings/:id/pay
  → navigate /bookings
```

### Create booking

**`booking-service/app.py` → `create_booking()`**
- JWT: role must be `candidate`
- Creates `Booking`: `status='awaiting_payment'`, `payment_status='unpaid'`
- `db.session.commit()` → **RDS**

### Pay (simulated Stripe)

**`pay_booking()`**
- `4242424242424242` → success → `payment_status='paid'`, `status='pending'`
- `4000000000000002` → declined (402)
- Other invalid card → 400

### Interviewer confirms

**`MyBookings.jsx` → `PATCH /bookings/:id/status` → `update_status()`**
- Interviewer sets `confirmed`
- Candidate/interviewer: **Join session** → `/session/:bookingId`

---

## 6. Interviewer actions

| Action | Frontend | Backend |
|--------|----------|---------|
| View bookings | `MyBookings.jsx` | `GET /bookings` — filter by role |
| Confirm / decline | `MyBookings.jsx` | `PATCH /bookings/:id/status` |
| Start live session | `LiveSession.jsx` | Socket.IO (see §9) |
| Give feedback | `FeedbackForm.jsx` | `POST /feedback` |
| Candidate sees feedback | `MyBookings.jsx` | `GET /feedback/booking/:booking_id` |
| Recording URL | `MyBookings.jsx` | `PATCH /bookings/:id/recording` |
| Review submission | `Submissions.jsx` | `PATCH /submissions/:id/annotate` |
| Create package | `Packages.jsx` | `POST /packages` |

---

## 7. Submissions (GitHub / file upload)

```
Submissions.jsx
  → POST /submissions  (multipart FormData)
      → nginx /submissions
      → interview-service → ChallengeSubmission → RDS
```

Interviewer: `PATCH /submissions/:id/annotate` — saves `annotation`, `annotated_at`

---

## 8. Messages

```
Messages.jsx
  → GET /auth/users?role=interviewer|candidate
  → GET /messages?with=<userId>
  → POST /messages  { to_id, body }
```

**Backend:** `interview-service/app.py` — `Message` model

---

## 9. Live session (WebSocket + WebRTC)

**Not REST** — uses Socket.IO:

```
LiveSession.jsx
  → io(VITE_SOCKET_URL or API URL, { path: '/socket.io' })
      → nginx location /socket.io/
      → interview-service (Flask-SocketIO)
```

### Socket events (`interview-service/app.py`)

| Event | Purpose |
|-------|---------|
| `join_session` | Enter room (booking id) |
| `code_change` | Shared code editor sync |
| `chat_message` | Session chat |
| `webrtc_offer` | WebRTC signaling |
| `webrtc_answer` | WebRTC signaling |
| `webrtc_ice` | ICE candidates |

**WebRTC:** `RTCPeerConnection` in `LiveSession.jsx`, STUN: `stun.l.google.com:19302`

---

## 10. nginx routing (API Gateway pattern)

**File:** `nginx/nginx.conf`

| Path | Upstream |
|------|----------|
| `/health` | gateway JSON `{"gateway":"ok"}` |
| `/auth/` | auth-service:5001 |
| `/bookings` | booking-service:5002 |
| `/packages` | booking-service:5002 |
| `/feedback` | interview-service:5003 |
| `/submissions` | interview-service:5003 |
| `/messages` | interview-service:5003 |
| `/ratings/` | interview-service:5003 |
| `/socket.io/` | interview-service:5003 (WebSocket upgrade) |

---

## 11. All backend routes (quick reference)

### auth-service (`auth-service/app.py`)

| Method | Path | Function |
|--------|------|----------|
| GET | `/health` | health |
| POST | `/auth/register` | register |
| POST | `/auth/login` | login |
| POST | `/auth/cognito-sync` | cognito_sync |
| POST | `/auth/verify` | verify |
| GET | `/auth/users` | list_users (`?role=interviewer`) |
| GET | `/auth/users/<id>` | get_user |

### booking-service (`booking-service/app.py`)

| Method | Path | Function |
|--------|------|----------|
| GET | `/health` | health |
| GET | `/bookings` | list_bookings |
| POST | `/bookings` | create_booking |
| POST | `/bookings/<id>/pay` | pay_booking |
| GET | `/bookings/<id>` | get_booking |
| PATCH | `/bookings/<id>/status` | update_status |
| PATCH | `/bookings/<id>/recording` | update recording URL |
| GET | `/packages` | list_packages |
| POST | `/packages` | create_package |

### interview-service (`interview-service/app.py`)

| Method | Path | Function |
|--------|------|----------|
| GET | `/health` | health |
| POST | `/feedback` | submit_feedback |
| GET | `/feedback/<candidate_id>` | get_feedback |
| GET | `/feedback/booking/<booking_id>` | feedback_by_booking |
| GET | `/ratings/interviewers` | interviewer ratings |
| GET/POST | `/submissions` | list / create |
| PATCH | `/submissions/<id>/annotate` | annotate |
| GET/POST | `/messages` | thread / send |
| Socket | `join_session`, `code_change`, `chat_message`, `webrtc_*` | live session |

---

## 12. Fault tolerance

**File:** `booking-service/resilience.py`

Circuit breaker when calling auth-service — if auth is down, booking service degrades gracefully instead of crashing.

**Say in viva:** “Fault-tolerant pattern — circuit breaker on cross-service calls.”

---

## 13. Database

| Item | Detail |
|------|--------|
| Engine | Amazon RDS PostgreSQL |
| Cloud connection | `DATABASE_URL` on ECS task (from `deploy-ecs.ps1`) |
| Local | SQLite in `/tmp` if no URL, else Postgres |
| Init script | `scripts/init-rds-db.ps1` — creates `hiresphere` database |
| Models | `User` (auth), `Booking`, `InterviewPackage` (booking), `FeedbackReport`, `ChallengeSubmission`, `Message` (interview) |

Assignment allows RDS **or** DynamoDB — this project uses **RDS** for relational data.

---

## 14. Deploy & CI/CD files

| Task | File |
|------|------|
| VPC, Cognito, RDS, ALB, Amplify | `cloudformation/hiresphere-stack.yaml` |
| ECS, API Gateway, auto-scaling | `cloudformation/hiresphere-ecs-services.yaml` |
| Docker → ECR | `scripts/push-ecr.ps1` |
| Deploy ECS + RDS | `scripts/deploy-ecs.ps1` |
| Kubernetes | `k8s/*.yaml`, `scripts/deploy-k8s.ps1` |
| Amplify deploy on push | `.github/workflows/amplify-deploy.yml` |
| Build CI | `.github/workflows/ci.yml` |

---

## 15. Booking status flow (diagram)

```
create_booking  →  awaiting_payment
       ↓ pay (4242…)
     pending  →  interviewer PATCH confirmed  →  confirmed
       ↓ live session / complete
     completed

(any time)  →  cancelled
```

---

## 16. Likely viva questions + short answers

| Question | Answer (mention file) |
|----------|----------------------|
| Where is the API gateway? | `nginx/nginx.conf`; one container in ECS task |
| How many microservices? | Three Flask apps: auth, booking, interview |
| How does auth work in cloud? | Cognito + `AuthContext.jsx` + `POST /auth/cognito-sync` |
| Where is data stored? | RDS PostgreSQL; SQLAlchemy models in each `app.py` |
| How does payment work? | Simulated in `pay_booking()` — test card numbers |
| Why API Gateway HTTPS? | Amplify is HTTPS; cannot call HTTP ALB (mixed content) |
| Where is WebRTC? | `LiveSession.jsx` + Socket.IO handlers in `interview-service/app.py` |
| Kubernetes vs ECS? | `k8s/` for K8s requirement; ECS Fargate for cloud production |
| CI/CD? | GitHub Actions `amplify-deploy.yml` reads API URL from CloudFormation |
| JWT validation? | `cognito_jwt.py`; `get_current_user()` in booking/interview services |
| Who can book? | Only `role=candidate` — checked in `create_booking()` |
| Circuit breaker? | `booking-service/resilience.py` |
| Frontend env for API? | `VITE_API_URL` set by Amplify / GitHub Actions build |

---

## 17. Memory trick: **NABI**

- **N**ginx (gateway)
- **A**uth → `/auth/*`
- **B**ooking → `/bookings`, `/packages`
- **I**nterview → `/feedback`, `/submissions`, `/messages`, `/ratings`, `/socket.io`

---

## 18. Recommended “show code” order in viva

1. `docs/REPORT.md` — architecture diagram  
2. `nginx/nginx.conf`  
3. `auth-service/app.py` — login, cognito-sync, users  
4. `booking-service/app.py` — bookings, pay, packages  
5. `booking-service/resilience.py` — if asked fault tolerance  
6. `interview-service/app.py` — feedback, submissions, socketio  
7. `frontend/src/App.jsx` + `AuthContext.jsx`  
8. Live browser demo (Amplify URL)  
9. `cloudformation/` or `k8s/` — if time  

---

## 19. Live URLs

- UI: https://main.d2vg09g8z6y2es.amplifyapp.com  
- API health: https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health  
- Repo: https://github.com/Damithjayawardhane/hiresphere  

---

*Keep this file open in VS Code during the viva alongside `VIVA-SPEECH-SCRIPT-30MIN.md`.*
