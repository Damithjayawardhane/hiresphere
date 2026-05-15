# HireSphere — SE6020 Cloud Computing Assignment Report

**Student:** Damith Jayawardhane  
**Repository:** https://github.com/Damithjayawardhane/hiresphere  
**AWS region:** us-east-1 · **Stacks:** `hiresphere`, `hiresphere-ecs`  
**Live UI:** https://main.d2vg09g8z6y2es.amplifyapp.com  
**HTTPS API:** CloudFormation output `ApiHttpsUrl` on stack `hiresphere-ecs`

---

## 1. Introduction

HireSphere is a **cloud-native mock interview platform** with **Candidate** and **Interviewer** roles. The system uses **Python Flask microservices**, a **React** SPA on **AWS Amplify**, **Amazon Cognito** authentication, **Docker** containerisation, **Kubernetes** manifests, **AWS CloudFormation** infrastructure, **Amazon RDS PostgreSQL**, and **GitHub Actions** CI/CD.

---

## 2. Architecture diagrams

### 2.1 Logical architecture (microservices)

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Web Browser]
  end
  subgraph frontend [AWS Amplify HTTPS]
    React[React SPA]
  end
  subgraph edge [Edge HTTPS]
    APIGW[API Gateway HTTP API]
  end
  subgraph gateway [API Gateway Layer]
    NGX[Nginx :80]
  end
  subgraph services [Microservices ECS Fargate]
    AUTH[auth-service :5001]
    BOOK[booking-service :5002]
    INT[interview-service :5003]
  end
  subgraph data [Data]
    RDS[(Amazon RDS PostgreSQL)]
    COG[Amazon Cognito]
  end
  Browser --> React
  React --> COG
  React -->|HTTPS API calls| APIGW
  APIGW -->|HTTP| NGX
  NGX --> AUTH
  NGX --> BOOK
  NGX --> INT
  AUTH --> RDS
  BOOK --> RDS
  INT --> RDS
  BOOK -.->|health check| AUTH
```

### 2.2 AWS deployment architecture

```mermaid
flowchart LR
  subgraph internet [Internet]
    User[User]
  end
  subgraph aws [AWS us-east-1]
    AMP[Amplify Hosting]
    COGNITO[Cognito User Pool]
    APIGW2[API Gateway v2 HTTPS]
    ALB[Application Load Balancer]
    ECS[ECS Fargate Task]
    ECR[ECR Images]
    RDS[(RDS PostgreSQL)]
    CFN[CloudFormation]
  end
  User --> AMP
  User --> COGNITO
  AMP --> APIGW2
  APIGW2 --> ALB
  ALB --> ECS
  ECR --> ECS
  ECS --> RDS
  CFN -.->|provisions| AMP
  CFN -.-> COGNITO
  CFN -.-> ALB
  CFN -.-> RDS
  CFN -.-> ECS
```

### 2.3 Kubernetes (local / EKS-style demo)

```mermaid
flowchart TB
  DEV[Developer kubectl]
  subgraph k8s [Namespace hiresphere]
    NP[Service NodePort 30080]
    GW[nginx api-gateway Pod]
    A[auth Pod]
    B[booking Pod]
    I[interview Pod]
  end
  DEV --> NP
  NP --> GW
  GW --> A
  GW --> B
  GW --> I
```

---

## 3. CloudFormation scripts

| Template | Purpose |
|----------|---------|
| `cloudformation/hiresphere-stack.yaml` | VPC, subnets, **Cognito**, **RDS PostgreSQL**, **ALB**, **ECR**, **ECS cluster**, **Amplify** app |
| `cloudformation/hiresphere-ecs-services.yaml` | ECS Fargate (4 containers), **API Gateway HTTPS**, target group, **auto-scaling**, optional CloudFront |

**Deploy (viva):**

```powershell
aws cloudformation deploy --template-file cloudformation/hiresphere-stack.yaml `
  --stack-name hiresphere --capabilities CAPABILITY_IAM `
  --parameter-overrides DBPassword=YourSecurePassword123!

.\scripts\push-ecr.ps1
.\scripts\deploy-ecs.ps1 -DbPassword YourSecurePassword123!
```

---

## 4. Microservices (Python)

| Service | Port | Responsibility |
|---------|------|----------------|
| **auth-service** | 5001 | Users, roles, Cognito JWT, `/auth/cognito-sync`, profile badges |
| **booking-service** | 5002 | Bookings, payments (simulated), packages, recordings; **circuit breaker** + retries to auth |
| **interview-service** | 5003 | Feedback, ratings, submissions + annotations, messages, Socket.IO / WebRTC signaling |

All services use **SQLAlchemy** with `DATABASE_URL` → **SQLite** (local/K8s) or **PostgreSQL** (ECS + RDS).

---

## 5. Frontend (React + Amplify + Cognito)

- **Login / register / confirm** via Amplify Auth (`USER_PASSWORD_AUTH`).
- **Candidate:** search interviewers, book, pay, submissions, history, messages, join live session.
- **Interviewer:** bookings, feedback, annotate submissions, packages, recordings.
- **Build:** GitHub Actions resolves `VITE_API_URL` from stack `hiresphere-ecs` output `ApiHttpsUrl`.

---

## 6. Containerisation and Kubernetes

- **Docker:** `Dockerfile` per service; `docker-compose.yml` mirrors cloud topology.
- **K8s:** `k8s/*.yaml` — deployments, services, nginx ConfigMap, NodePort **30080**.
- **Script:** `scripts/deploy-k8s.ps1`

---

## 7. Database (Amazon RDS)

- **Engine:** PostgreSQL 15 on `db.t3.micro` (cost-efficient).
- **Database name:** `hiresphere` (shared; each service runs `db.create_all()` for its tables).
- **Security:** RDS security group allows VPC CIDR; not public.
- **ECS:** `deploy-ecs.ps1 -DbPassword ...` sets `DATABASE_URL=postgresql://hiresphere:...@endpoint:5432/hiresphere`.

*DynamoDB was not used; RDS fits relational booking/user/feedback data.*

---

## 8. Cloud design patterns (scalable, secure, fault-tolerant, cost-efficient)

| Pattern | Implementation |
|---------|----------------|
| **Scalable** | ECS service auto-scaling (CPU target 70%, min 1 max 3); stateless services |
| **Secure** | Cognito JWT; HTTPS API Gateway; SGs; secrets via CFN parameters / env |
| **Fault-tolerant** | ALB health checks; booking → auth circuit breaker (Tenacity); multi-AZ-ready VPC |
| **Cost-efficient** | `t3.micro` RDS, Fargate 1 task default, Amplify free tier, API GW pay-per-request |

---

## 9. Version control and CI/CD

- **GitHub:** https://github.com/Damithjayawardhane/hiresphere  
- **CI:** `.github/workflows/ci.yml` — build frontend + Docker images  
- **Deploy:** `.github/workflows/amplify-deploy.yml` — build with API URL from CFN, upload to Amplify  

---

## 10. Feature checklist (assignment)

| Requirement | Status |
|-------------|--------|
| Architecture report + diagrams + CFN | Yes (this document + templates) |
| Microservices (Python) | Yes (3 services) |
| React + Amplify + Cognito | Yes |
| Login, booking, uploads, history | Yes |
| Docker + Kubernetes | Yes |
| RDS (or DynamoDB) | Yes (RDS PostgreSQL) |
| CloudFormation full deploy | Yes |
| Candidate + Interviewer profiles | Yes |
| GitHub integration | Yes |

---

## 11. Viva demonstration script (10–15 min)

1. **CloudFormation** — show stacks `hiresphere` + `hiresphere-ecs` (CREATE_COMPLETE).  
2. **Cognito** — user pool, app client, test user roles.  
3. **RDS** — instance `hiresphere-db`, endpoint, PostgreSQL.  
4. **ECS** — cluster, service `hiresphere-api`, running task (4 containers).  
5. **API** — `curl https://<ApiHttpsUrl>/health` → `{"gateway":"ok"}`.  
6. **Amplify** — open live URL, login, search/book (cloud).  
7. **Local** — `start.bat` → option 1: full Docker + WebRTC demo.  
8. **K8s** — `kubectl get pods -n hiresphere` (optional).  
9. **GitHub** — Actions workflows green on `main`.

---

## 12. Conclusion

HireSphere implements the full assignment scope: **microservices**, **containers**, **Kubernetes**, **CloudFormation**, **Cognito**, **Amplify**, **RDS**, and **GitHub Actions**, with a clear **HTTPS API** path for the hosted UI and honest documentation of local vs cloud behaviour.

---

*Submit as PDF to Moodle (export this file) with repository link and optional demo video.*
