# HireSphere — Cloud-Native Interview Platform

A full microservices system that **mirrors AWS architecture locally** for development and demonstration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (AWS Amplify equivalent)                    │
│                  localhost:3000                          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    Nginx API Gateway                     │
│           (AWS API Gateway / ALB equivalent)             │
│                   localhost:8080                         │
└────────┬──────────────┬─────────────────┬───────────────┘
         │              │                 │
┌────────▼──────┐ ┌─────▼──────┐ ┌───────▼────────┐
│ Auth Service  │ │  Booking   │ │   Interview    │
│  :5001        │ │  Service   │ │   Service      │
│               │ │  :5002     │ │   :5003        │
│ AWS Cognito   │ │ ECS Fargate│ │ ECS + WS       │
│ equivalent    │ │            │ │                │
└───────────────┘ └────────────┘ └────────────────┘
```

## AWS Mapping

| Local Component | AWS Service |
|----------------|-------------|
| Auth Service (JWT) | AWS Cognito User Pools |
| Nginx API Gateway | AWS API Gateway / ALB |
| Booking Service | ECS Fargate Task |
| Interview Service | ECS Fargate Task (WebSocket) |
| React + Vite | AWS Amplify Hosting |
| docker-compose.yml | CloudFormation Stack |
| SQLite (local) | Amazon RDS PostgreSQL |

---

## Quick Start

### Option A — Docker Compose (recommended)
```bash
docker compose up --build
cd frontend && npm install && npm run dev
```

### Option B — Windows (double-click)
```
Double-click start.bat
```

### Option C — Manual (no Docker)

**Terminal 1 — Auth Service**
```bash
cd auth-service
pip install -r requirements.txt
py app.py
```

**Terminal 2 — Booking Service**
```bash
cd booking-service
pip install -r requirements.txt
py app.py
```

**Terminal 3 — Interview Service**
```bash
cd interview-service
pip install -r requirements.txt
py app.py
```

**Terminal 4 — Frontend**
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000**

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Candidate | candidate@hiresphere.com | password123 |
| Interviewer | alice@hiresphere.com | password123 |
| Interviewer | bob@hiresphere.com | password123 |
| Interviewer | carol@hiresphere.com | password123 |

---

## Features

- **Auth**: Local JWT via auth-service, or **AWS Amplify + Cognito** when `VITE_COGNITO_*` is set; profile sync via `/auth/cognito-sync`
- **Submissions**: GitHub link and/or file upload for coding challenges
- **Messages**: REST messaging between candidates and interviewers
- **Interviewer search**: Domain, interview type, experience level, availability (plus text search)
- **API Gateway**: Nginx routes all traffic to microservices
- **Book + pay flow**: Calendar slot selection, then **payment step** (simulated processor) before the interviewer sees the request as `pending`.
- **Live session**: Collaborative code + chat over **Socket.IO**, plus optional **WebRTC** video (STUN + in-room signaling).
- **Fault tolerance**: Booking service `/health` reports auth-service reachability using **retries (Tenacity)** and a **circuit breaker** when the auth dependency is down.
- **Feedback System**: Interviewers submit scored reports after sessions
- **Ratings & badges**: Average scores from feedback; profile badges on interviewer cards
- **Submission annotations**: Interviewers annotate candidate coding challenge uploads
- **Interview packages**: Interviewers publish bundled session packages
- **Session recordings**: Interviewers attach recording URLs after completed sessions
- **Interview history**: Past sessions section on the bookings page

### Viva demo (recommended order)

1. **AWS Console** — CloudFormation stack `hiresphere`, Cognito user pool, RDS, ALB, Amplify app.
2. **Live URL** — `https://main.d2vg09g8z6y2es.amplifyapp.com` — Cognito login, UI flows (demo interviewer search if ALB API not wired).
3. **Local full stack** — `docker compose up -d` then `cd frontend && npm run dev` with `.env.local` — real search, booking, payment, WebRTC, feedback, annotations.
4. **Kubernetes** — `.\scripts\deploy-k8s.ps1` then `kubectl get pods -n hiresphere` — gateway on NodePort **30080**.

See **`docs/REPORT.md`** for the written assignment report (architecture, trade-offs, deployment).

---

## Cloud Deployment (AWS)

Use the provided CloudFormation template to deploy to real AWS:

```bash
aws cloudformation deploy \
  --template-file cloudformation/hiresphere-stack.yaml \
  --stack-name hiresphere \
  --parameter-overrides DBPassword=YourSecurePassword \
  --capabilities CAPABILITY_IAM
```

This provisions: Cognito, ECS cluster, ECR repositories, RDS PostgreSQL, internet-facing ALB, and an Amplify app.

**ECS + HTTPS API (fixes Amplify mixed-content):**

```powershell
# One command: build/push images, deploy ECS, create CloudFront HTTPS URL, update Amplify
.\scripts\deploy-ecs.ps1
```

Or from `start.bat` → option **6**.

- **CloudFront** provides `https://xxxxx.cloudfront.net` → ALB (HTTP) → ECS (nginx + 3 services).
- Script sets Amplify `VITE_API_URL` / `VITE_SOCKET_URL` to the CloudFront URL and triggers a rebuild.
- Optional custom domain on ALB: pass `-AcmCertificateArn arn:aws:acm:...` (ACM cert in **us-east-1**).

### AWS Amplify + Cognito (frontend)

Set these Vite environment variables for the hosted build (Amplify console or `EnvironmentVariables` in the template):

- `VITE_API_URL` — base URL of your API (ALB, API Gateway, or `kubectl` NodePort gateway URL).
- `VITE_COGNITO_USER_POOL_ID` — Cognito user pool ID from stack outputs.
- `VITE_COGNITO_CLIENT_ID` — App client ID (see stack output `CognitoClientId`).
- `VITE_AWS_REGION` — AWS region (e.g. `us-east-1`).

When the pool and client IDs are set, the React app uses **AWS Amplify Auth** (`aws-amplify`) against Cognito and syncs extended profile fields to the auth service via `POST /auth/cognito-sync`. Without them, the app uses the local JWT auth service (demo accounts).

---

## Kubernetes (assignment: microservices + API Gateway)

Manifests live in `k8s/`. They deploy the three Flask services, an **nginx API gateway** (same routing idea as local Docker), and a **NodePort** service on **30080**.

1. Build images (example tags):

   ```bash
   docker build -t hiresphere/auth-service:latest ./auth-service
   docker build -t hiresphere/booking-service:latest ./booking-service
   docker build -t hiresphere/interview-service:latest ./interview-service
   ```

2. Load images into your cluster if needed (e.g. minikube: `minikube image load hiresphere/auth-service:latest` for each image).

3. Create the namespace, secret, ConfigMap, workloads, and services:

   ```bash
   kubectl apply -f k8s/00-namespace.yaml
   kubectl apply -f k8s/01-secret.example.yaml
   kubectl apply -f k8s/nginx-configmap.yaml
   kubectl apply -f k8s/auth-deployment.yaml -f k8s/auth-service.yaml
   kubectl apply -f k8s/booking-deployment.yaml -f k8s/booking-service.yaml
   kubectl apply -f k8s/interview-deployment.yaml -f k8s/interview-service.yaml
   kubectl apply -f k8s/api-gateway-deployment.yaml -f k8s/api-gateway-service.yaml
   ```

4. Point the React app at the gateway, e.g. `VITE_API_URL=http://<node-ip>:30080` (and the same base for `VITE_SOCKET_URL` so WebRTC signaling reaches the interview service through the gateway).

For **Amazon Cognito JWTs** in the cluster, set `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, and `AWS_REGION` on each deployment (see YAML env placeholders).

---

## Project Structure

```
hiresphere/
├── auth-service/          # Cognito-equivalent auth microservice
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── booking-service/       # Session booking microservice
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── interview-service/     # Live session + feedback microservice
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/              # React app (AWS Amplify)
│   ├── src/
│   │   ├── context/AuthContext.jsx   # Cognito SDK equivalent
│   │   ├── pages/
│   │   └── components/
│   ├── package.json
│   └── vite.config.js
├── nginx/
│   └── nginx.conf         # API Gateway config
├── .github/workflows/ci.yml   # GitHub Actions: frontend build + Docker images
├── cloudformation/
│   └── hiresphere-stack.yaml  # AWS baseline (VPC, Cognito, RDS, ALB, Amplify, ECR)
├── docker-compose.yml     # Local CloudFormation equivalent
├── start.bat              # Windows launcher
└── README.md
```
