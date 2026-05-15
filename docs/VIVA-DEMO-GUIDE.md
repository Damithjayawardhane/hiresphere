# HireSphere — Viva Demo Guide + Speaker Notes (සිංහල)

**Student:** Damith Jayawardhane  
**Date:** හෙට 2:00 PM  
**Duration:** ~15–20 minutes  
**Live UI:** https://main.d2vg09g8z6y2es.amplifyapp.com  
**API health:** `https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health`  
**GitHub:** https://github.com/Damithjayawardhane/hiresphere  

---

## හෙට උදේ පරීක්ෂණයට පෙර (5 min checklist)

```powershell
aws cloudformation describe-stacks --stack-name hiresphere --region us-east-1 --query "Stacks[0].StackStatus"
aws cloudformation describe-stacks --stack-name hiresphere-ecs --region us-east-1 --query "Stacks[0].StackStatus"
curl https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health
```

- [ ] `hiresphere` → `CREATE_COMPLETE`
- [ ] `hiresphere-ecs` → `UPDATE_COMPLETE` (හෝ `CREATE_COMPLETE`)
- [ ] health → `{"gateway":"ok"}`
- [ ] Amplify URL browser එකේ open වෙනවා
- [ ] Cognito users දෙන්න ready (candidate + interviewer)
- [ ] `docs/REPORT.md` PDF එක laptop එකේ තියෙනවා
- [ ] Docker Desktop ON (local demo ඕන නම්)

---

# SECTION 1 — හැඳින්වීම (1 min)

## පෙන්වන්න
- `docs/REPORT.md` — පළමු Mermaid diagram එක

## Speaker note (කියන්න මෙහෙම)

> “මම present කරන්නේ **HireSphere** කියන cloud-native mock interview platform එක. මෙහි **Candidates** ලා industry interviewers ලා සම්බන්ධ වෙලා paid mock interviews book කරනවා.  
> Architecture එක **microservices** — Python Flask එකේ services තුනක්, **nginx API gateway** එකක්, **React frontend** එක **AWS Amplify** උයි, authentication **Amazon Cognito**, database **Amazon RDS PostgreSQL**, infrastructure **AWS CloudFormation** එකෙන් deploy කරලා. Containers **ECS Fargate** උයි, assignment requirement එකට **Kubernetes manifests** local demo එකටත් තියෙනවා.”

---

# SECTION 2 — Architecture Report + Diagrams (2 min)

## පෙන්වන්න
| File | මොකද තියෙන්නේ |
|------|----------------|
| `docs/REPORT.md` | සම්පූර්ණ report + 3 diagrams |
| `cloudformation/hiresphere-stack.yaml` | Main AWS stack |
| `cloudformation/hiresphere-ecs-services.yaml` | ECS + API Gateway + RDS connection |
| `docker-compose.yml` | Local = cloud mapping |

## Speaker note

> “Assignment එකේ **Architecture Report** එක `docs/REPORT.md` file එකේ. මෙහි **logical diagram** එකෙන් browser → Amplify → API Gateway → nginx → microservices → RDS පෙන්වනවා.  
> **CloudFormation scripts** repo එකේ `cloudformation` folder එකේ — `hiresphere-stack.yaml` VPC, Cognito, RDS, ALB, Amplify create කරනවා. `hiresphere-ecs-services.yaml` microservices ECS උයි HTTPS API Gateway එකත් deploy කරනවා.  
> `docker-compose.yml` එකෙන් local development එක same architecture එක mirror කරනවා — lecturerට පෙන්වන්න පුළුවන් cloud mapping එක code එකෙන්ම.”

---

# SECTION 3 — GitHub / Version Control (2 min)

## පෙන්වන්න
- Browser: https://github.com/Damithjayawardhane/hiresphere
- Folder structure (root)
- **Actions** tab — green workflows

## Files to mention
| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Build test — frontend + Docker |
| `.github/workflows/amplify-deploy.yml` | Amplify deploy — API URL CloudFormation එකෙන් ගන්නවා |

## Speaker note

> “Version control **GitHub** එකෙන්. Repository public කරලා තියෙනවා. Push කළාම **GitHub Actions** automatically frontend build කරලා **AWS Amplify** එකට deploy කරනවා.  
> `ci.yml` microservices images validate කරනවා. `amplify-deploy.yml` CloudFormation stack එකෙන් **HTTPS API URL** එක read කරලා React build එකට inject කරනවා — mixed content problem එක solve කරන්න. මෙයින් **CI/CD integration** demonstrate වෙනවා.”

---

# SECTION 4 — Microservices Code Walkthrough (3 min)

## පෙන්වන්න (IDE එකේ files open කරලා තියාගන්න)

### Auth Service — port 5001
| File | කියන්න |
|------|--------|
| `auth-service/app.py` | Users, roles, Cognito sync |
| `auth-service/cognito_jwt.py` | JWT validation |
| `auth-service/Dockerfile` | Container |

**Speaker note:**  
> “**Auth microservice** — user profiles, interviewer/candidate roles, Cognito login එකෙන් පස්සේ `/auth/cognito-sync` endpoint එකෙන් profile data database එකට save කරනවා.”

### Booking Service — port 5002
| File | කියන්න |
|------|--------|
| `booking-service/app.py` | Bookings, payment, packages, recordings |
| `booking-service/resilience.py` | Circuit breaker — fault tolerant |
| `booking-service/Dockerfile` | Container |

**Speaker note:**  
> “**Booking service** — session book කිරීම, simulated payment, interview packages, session recording URLs. `resilience.py` එකෙන් auth service down නම් circuit breaker — **fault-tolerant pattern** එක.”

### Interview Service — port 5003
| File | කියන්න |
|------|--------|
| `interview-service/app.py` | Feedback, ratings, submissions, messages, WebSocket |
| `interview-service/Dockerfile` | Container |

**Speaker note:**  
> “**Interview service** — feedback reports, interviewer ratings, coding challenge submissions with annotations, messaging, live session සඳහා **Socket.IO** සහ WebRTC signaling.”

### API Gateway
| File | කියන්න |
|------|--------|
| `nginx/nginx.conf` | Routes: `/auth`, `/bookings`, `/feedback`, `/submissions` |

**Speaker note:**  
> “සියලු traffic එක **nginx API gateway** එකට එනවා — local, Docker, ECS, Kubernetes සියල්ලෙම same routing idea එක.”

---

# SECTION 5 — AWS CloudFormation (3 min)

## පෙන්වන්න (AWS Console — region **us-east-1**)

1. **CloudFormation** → Stacks  
2. **`hiresphere`** — CREATE_COMPLETE  
3. **`hiresphere-ecs`** — CREATE_COMPLETE / UPDATE_COMPLETE  
4. Stack **Outputs** tab — URLs, Cognito IDs  

## Terminal (optional quick)
```powershell
aws cloudformation describe-stacks --stack-name hiresphere-ecs --region us-east-1 --query "Stacks[0].Outputs"
```

## Speaker note

> “Viva requirement අනුව **මුළු infrastructure එක CloudFormation** එකෙන් deploy කරලා තියෙනවා.  
> පළමු stack `hiresphere` — VPC, **Cognito User Pool**, **RDS PostgreSQL**, Application Load Balancer, ECR repositories, ECS cluster, Amplify app.  
> දෙවැනි stack `hiresphere-ecs` — Flask microservices තුනත් nginx gateway එකත් **ECS Fargate** task එකක් ලෙස run වෙනවා, **API Gateway HTTPS** front එක, **auto-scaling** CPU 70%ට.  
> Templates repo එකේ තියෙනවා — reproducible deploy.”

---

# SECTION 6 — Amazon Cognito (2 min)

## පෙන්වන්න
- Cognito → **User pools** → hiresphere pool  
- **App client** — auth flows  
- **Users** — candidate / interviewer (`custom:role`)  

## Code link
- `frontend/src/context/AuthContext.jsx`

## Speaker note

> “Authentication **Amazon Cognito** — industry standard managed auth. Users email/password. Custom attribute **`role`** — candidate හෝ interviewer.  
> Frontend `AuthContext.jsx` එකෙන් Amplify Auth library use කරනවා. Login වෙලා JWT token එක microservices වලට Authorization header එකෙන් යනවා. Passwords Cognito manage කරනවා — secure pattern.”

---

# SECTION 7 — RDS + ECS + API (3 min)

## RDS
- RDS → Databases → **`hiresphere-db`**  
- Engine: PostgreSQL, VPC ඇතුළේ  

**Speaker note:**  
> “Database **Amazon RDS PostgreSQL** — assignment එක RDS හෝ DynamoDB කිව්වා. අපි PostgreSQL use කරනවා relational bookings/users/feedback data සඳහා. ECS tasks connect වෙන්නේ deploy script එකෙන් `DATABASE_URL` set කරලා.”

## ECS
- ECS → Clusters → **`hiresphere-cluster`**  
- Services → **`hiresphere-api`**  
- Tasks → 4 containers: auth, booking, interview, api-gateway  

**Speaker note:**  
> “Microservices **Amazon ECS Fargate** උයි run වෙන්නේ — serverless containers. එක task එකක containers හතර — අපේ docker-compose layout එකම cloud එකේ.”

## API Health
```powershell
curl https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health
```
Output: `{"gateway":"ok"}`

**Speaker note:**  
> “HTTPS **API Gateway** එකෙන් ALB එකට proxy — browser mixed content issue නැතිව Amplify frontend එක API call කරන්න පුළුවන්.”

---

# SECTION 8 — LIVE Demo — Cloud UI (5–7 min) ⭐ වැදගත්ම කොටස

## URL
https://main.d2vg09g8z6y2es.amplifyapp.com

---

### Flow A — Candidate (රැකියා සොයන්නා)

| Step | UI එකේ මොකද කරන්නේ | File (lecturer අහනව නම්) |
|------|---------------------|-------------------------|
| 1 | **Login** — Cognito candidate user | `Login.jsx`, `AuthContext.jsx` |
| 2 | **Find Interviewers** — search, filters, star ratings | `Interviewers.jsx` |
| 3 | **Book Session** — date/time, continue to payment | `BookSession.jsx` |
| 4 | Card: `4242424242424242` — pay | `BookSession.jsx` / `MyBookings.jsx` |
| 5 | **My Sessions** — booking status | `MyBookings.jsx` |
| 6 | **Submissions** — GitHub link හෝ file upload | `Submissions.jsx` |
| 7 | **Messages** | `Messages.jsx` |

**Speaker note (flow එකට):**

> “දැන් **live system** එක demo කරනවා. Candidate ලෙස login වෙනවා.  
> **Find Interviewers** — domain, experience level, name search — ratings backend API එකෙන් එනවා.  
> **Book Session** — calendar slot pick කරලා, payment step — simulated Stripe-style test card.  
> **My Sessions** — booking status, interview **history** පෙන්වනවා — assignment requirement.  
> **Submissions** — coding challenge GitHub link හෝ file upload.  
> **Messages** — candidate සහ interviewer අතර communicate කරන්න පුළුවන්.”

---

### Flow B — Interviewer (සම්මුඛ පරීක්ෂක)

| Step | UI | File |
|------|-----|------|
| 1 | Login — interviewer user | `AuthContext.jsx` |
| 2 | **Bookings** — pending request confirm | `MyBookings.jsx` |
| 3 | **Review Submissions** — annotation add | `Submissions.jsx` |
| 4 | **Packages** — bundle create | `Packages.jsx` |
| 5 | **Give Feedback** after session | `FeedbackForm.jsx` |
| 6 | Recording URL add (completed booking) | `MyBookings.jsx` |

**Speaker note:**

> “Interviewer role එකෙන් login වෙලා **bookings** approve කරනවා.  
> **Submissions review** — candidate code එකට annotation දානවා.  
> **Interview packages** — bundled sessions publish කරනවා.  
> Session එකට පස්සේ **feedback report** සහ **recording link** attach කරනවා.”

---

# SECTION 9 — Local Demo (optional — WebRTC) (3–5 min)

## Run
```powershell
cd "C:\Users\ChathuraJayawardhane\Desktop\hiresphere new 01\hiresphere"
.\start.bat
# Option 1 — Local full stack
```

හෝ:
```powershell
docker compose up -d
cd frontend
copy env.local.example .env.local
npm run dev
```

**URL:** http://localhost:3000

## Demo logins (local only)
| Role | Email | Password |
|------|-------|----------|
| Candidate | candidate@hiresphere.com | password123 |
| Interviewer | alice@hiresphere.com | password123 |

## Speaker note

> “Cloud එකේ full API තියෙනවා. **Live video session** WebRTC සඳහා local Docker stack එක හොඳයි — `start.bat` option 1.  
> Gateway localhost:8080, frontend :3000. Same microservices — lecturerට end-to-end flow පෙන්වන්න පුළුවන් including **Join Session** live room.”

**File:** `frontend/src/pages/LiveSession.jsx`

---

# SECTION 10 — Kubernetes (1–2 min)

## Run (Docker Desktop ON)
```powershell
.\scripts\deploy-k8s.ps1 -BuildImages
kubectl get pods -n hiresphere
kubectl get svc -n hiresphere
```

## පෙන්වන්න
- `k8s/` folder — deployments, services, nginx configmap  
- NodePort **30080**

## Speaker note

> “Assignment එක **Kubernetes cluster එකක deploy** කරන්න කිව්වා. අපි `k8s/` manifests provide කරනවා — `kubectl apply` කරලා namespace `hiresphere` එකේ pods deploy කරනවා.  
> Cloud production **ECS** use කරනවා cost සහ simplicity සඳහා. EKS cluster අපේ project එකේ නැහැ — local/minikube style demo.”

---

# SECTION 11 — Design Patterns (lecturer අහනව නම්) (1 min)

## Speaker note (ඉක්මන් summary)

> “**Scalable** — ECS auto-scaling 1 to 3 tasks.  
> **Secure** — Cognito, HTTPS API, security groups, JWT on every request.  
> **Fault-tolerant** — ALB health checks, booking service circuit breaker.  
> **Cost-efficient** — db.t3.micro RDS, single Fargate task default, Amplify hosting.  
> Patterns: microservices, API gateway, containerisation, IaC, managed auth, managed database.”

---

# File Map — ඉක්මනින් හොයන්න

```
hiresphere/
├── docs/
│   ├── REPORT.md              ← Moodle PDF
│   ├── VIVA-DEMO-GUIDE.md     ← මේ file එක (speaker notes)
│   └── VIVA-CHECKLIST.md
├── cloudformation/            ← AWS infrastructure
├── auth-service/app.py        ← Microservice 1
├── booking-service/app.py     ← Microservice 2
├── interview-service/app.py   ← Microservice 3
├── nginx/nginx.conf           ← API Gateway
├── frontend/src/
│   ├── App.jsx                ← Routes
│   ├── context/AuthContext.jsx
│   └── pages/                 ← UI screens
├── docker-compose.yml
├── k8s/
├── scripts/
│   ├── push-ecr.ps1
│   └── deploy-ecs.ps1
└── .github/workflows/
```

---

# Lecturer ප්‍රශ්න වලට සූදානම

| ප්‍රශ්නය | පිළිතුර (කෙටියෙන්) |
|---------|-------------------|
| EKS එක කොහෙද? | Project ECS use කරනවා; K8s local manifests. EKS email ignore. |
| RDS wire කරලාද? | ඔව් — `deploy-ecs.ps1 -DbPassword` |
| DynamoDB? | RDS use කරනවා — relational data |
| Password කොහෙද? | Cognito + CFN parameter; repo එකේ save නැහැ |
| Demo mode? | Cloud API work නම් real data; API down නම් demo interviewers |

---

# හෙට 2:00 PM — Recommended order (කාලය)

| වේලාව | Section |
|--------|---------|
| 0:00 | හැඳින්වීම + diagram |
| 0:02 | GitHub |
| 0:04 | Code (microservices) |
| 0:07 | AWS Console (CFN, Cognito, RDS, ECS) |
| 0:12 | **Live UI demo** (candidate + interviewer) |
| 0:18 | Local හෝ K8s (time තියෙනවා නම්) |
| 0:20 | Questions |

---

# Emergency — යමක් වැඩ නොකළොත්

1. `curl .../health` — API alive ද?  
2. Local: `.\start.bat` → 1  
3. Report + GitHub + CFN console — code/infrastructure marks තවම ගත හැක  

---

**Good luck හෙට 2 PM ට! 🎯**

*Print this file or keep open on phone during viva.*
