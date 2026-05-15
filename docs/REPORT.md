# HireSphere — SE6020 Cloud Computing Assignment Report

**Student project:** HireSphere — microservices platform for mock technical interviews  
**Repository:** https://github.com/Damithjayawardhane/hiresphere  
**AWS region:** us-east-1 · **Stack:** hiresphere  
**Live frontend:** https://main.d2vg09g8z6y2es.amplifyapp.com

---

## 1. Introduction

HireSphere connects **candidates** with **interviewers** for paid mock interviews. The system implements the assignment requirements using a **microservices architecture**, containerisation (Docker), orchestration manifests (Kubernetes), infrastructure as code (CloudFormation), managed authentication (Amazon Cognito), static hosting (AWS Amplify), and CI/CD (GitHub Actions).

---

## 2. System architecture

### 2.1 Logical view

| Service | Responsibility | Port (local) |
|---------|----------------|--------------|
| **auth-service** | Users, roles, JWT/Cognito verification, profile sync | 5001 |
| **booking-service** | Sessions, payments (simulated), packages, recordings | 5002 |
| **interview-service** | Feedback, submissions, messages, ratings, WebSocket/WebRTC signaling | 5003 |
| **API gateway (nginx)** | Single entry point, path-based routing, CORS | 8080 |
| **React frontend** | SPA (Vite), Amplify-hosted in cloud | 3000 |

### 2.2 AWS mapping

| Local | AWS |
|-------|-----|
| docker-compose | ECS Fargate multi-container task (see `cloudformation/hiresphere-ecs-services.yaml`) |
| nginx gateway | Application Load Balancer → gateway container |
| SQLite per service | Amazon RDS PostgreSQL (provisioned; services use SQLite locally for dev simplicity) |
| Cognito env on services | Amazon Cognito User Pool + app client |
| React build | AWS Amplify + GitHub Actions deploy workflow |
| k8s manifests | Alternative orchestration demo (Minikube / EKS-compatible) |

### 2.3 Request flow (example: book session)

1. User signs in via **Cognito** (Amplify Auth) or local JWT.
2. Frontend calls `POST /bookings` through the gateway.
3. Gateway forwards to **booking-service**; booking-service validates token via **Cognito JWT** (or calls auth-service locally).
4. Candidate completes **simulated payment** (`POST /bookings/:id/pay`).
5. Interviewer confirms → live session via **Socket.IO** + optional **WebRTC**.
6. Interviewer submits **feedback** → aggregated into **ratings** for search cards.

---

## 3. Microservices design

### 3.1 Auth service

- REST API for users and `POST /auth/cognito-sync` to mirror Cognito attributes (`custom:role`, skills, rate, badges).
- Supports **USER_PASSWORD_AUTH** and Cognito JWT verification in cloud-aligned deployments.

### 3.2 Booking service

- CRUD for bookings with statuses: `awaiting_payment` → `pending` → `confirmed` → `completed`.
- **Payment simulation** (test card numbers) before interviewer visibility.
- **Interview packages** (`GET/POST /packages`) for bundled sessions.
- **Recording URLs** (`PATCH /bookings/:id/recording`) after sessions.
- **Resilience:** Tenacity retries + circuit breaker on auth-service health checks.

### 3.3 Interview service

- **Feedback reports** with scored dimensions → drives `/ratings/interviewers`.
- **Challenge submissions** (GitHub URL and/or file upload) with **interviewer annotations**.
- **Messaging** between candidates and interviewers.
- **Socket.IO** rooms for collaborative editor + WebRTC signaling.

### 3.4 API gateway

- Centralises routing and CORS; same `nginx.conf` for Docker Compose, K8s ConfigMap, and ECS gateway image (`nginx/Dockerfile` + `nginx-ecs.conf`).

---

## 4. Frontend

- **React + Vite** SPA with role-based routes (candidate vs interviewer).
- **AWS Amplify Auth** when `VITE_COGNITO_*` is set; otherwise local demo JWT.
- **Cloud demo fallback:** if Amplify cannot reach the ALB API (HTTPS/mixed content), interviewer search uses embedded demo data so the UI remains demonstrable.
- **Local full stack:** `VITE_API_URL=http://localhost:8080` via `frontend/.env.local` and `docker compose`.

Key pages: interviewer search (filters + ratings), booking + calendar (`datetime-local`), payments, live session, feedback, submissions (annotate), packages, messages, booking history + recordings.

---

## 5. Infrastructure as code

### 5.1 `cloudformation/hiresphere-stack.yaml`

Provisions: VPC, public subnets, **Cognito** (SRP + password auth, `custom:role`), **ECS cluster**, **ECR** repos, **RDS PostgreSQL**, internet-facing **ALB**, **Amplify** app with build spec.

### 5.2 `cloudformation/hiresphere-ecs-services.yaml`

Optional second stack: **Fargate task** running auth + booking + interview + nginx gateway, registered to the ALB target group. Deploy after `scripts/push-ecr.ps1`.

### 5.3 Kubernetes (`k8s/`)

Namespace `hiresphere`, three deployments, nginx gateway **NodePort 30080**, ConfigMap aligned with gateway routes (`/ratings/`, `/packages`). Deploy: `scripts/deploy-k8s.ps1`.

---

## 6. Authentication (Cognito)

- **User Pool:** email sign-in, custom attribute `role` (candidate | interviewer).
- **App client:** `USER_SRP_AUTH`, `USER_PASSWORD_AUTH`, refresh tokens.
- Frontend obtains ID token → `Authorization: Bearer` on API calls; services validate JWT against pool JWKS.
- Profile fields synced post-login via `/auth/cognito-sync`.

---

## 7. CI/CD and repository

- **GitHub:** https://github.com/Damithjayawardhane/hiresphere
- **`.github/workflows/ci.yml`:** build frontend and Docker images on push.
- **`.github/workflows/amplify-deploy.yml`:** deploy `frontend/dist` to existing Amplify app (account limit: one app — use CFN-created `hiresphere-frontend`).

---

## 8. Assignment feature checklist

| Requirement | Implementation |
|-------------|----------------|
| Microservices | 3 Flask services + gateway |
| Docker | Dockerfiles + docker-compose |
| Kubernetes | `k8s/` manifests + deploy script |
| CloudFormation | Baseline + ECS services template |
| Cognito auth | User pool + Amplify Auth |
| Amplify hosting | Live URL + GitHub Actions |
| Interviewer search | Domain, type, experience, text |
| Book + pay | Booking flow + simulated payment |
| Calendar slot | `datetime-local` on book form |
| Live interview | Socket.IO + WebRTC |
| Feedback / ratings | Feedback API + star averages + badges |
| Submissions | Upload + GitHub + annotations |
| Packages | CRUD for interviewers |
| Recordings | URL on completed bookings |
| History | Past bookings section |
| GitHub | Public repo + Actions |

---

## 9. Trade-offs and limitations

1. **RDS vs SQLite:** RDS is provisioned in AWS; microservices still use **SQLite in containers** for simpler local/K8s/ECS demos without schema migration tooling. Production would use one PostgreSQL schema per service or shared RDS with separate databases.
2. **Cloud API on Amplify:** Browser **mixed content** blocks HTTP ALB calls from HTTPS Amplify; frontend uses same-origin demo data unless ALB is exposed via HTTPS or a reverse proxy. **Local Docker** demonstrates full API integration.
3. **Payment:** Simulated card processor for assignment scope, not Stripe production.
4. **ECS:** Multi-container task mirrors docker-compose; production might use separate services with Service Connect.

---

## 10. How to reproduce

```bash
# Local
docker compose up --build -d
cd frontend && cp env.local.example .env.local && npm ci && npm run dev

# Kubernetes
.\scripts\deploy-k8s.ps1 -BuildImages

# AWS (after CLI configure)
aws cloudformation deploy --template-file cloudformation/hiresphere-stack.yaml --stack-name hiresphere --capabilities CAPABILITY_IAM --parameter-overrides DBPassword=***
.\scripts\push-ecr.ps1
# Deploy ecs-services with VPC/ALB parameters from stack outputs
```

---

## 11. Conclusion

HireSphere delivers a **complete microservices codebase** with cloud-aligned auth, gateway routing, container orchestration, IaC, and a hosted React UI. **End-to-end cloud API** on the public ALB is supported via the ECS services stack; **local and K8s** environments provide full feature demonstration for viva and marking.

---

*Submit this document to Moodle as the written component (Task 1) alongside the repository URL and demo video/slides if required.*
