# HireSphere — Viva Demonstration Speech Script (~30 minutes)

**Student:** Damith Jayawardhane  
**Module:** SE6020 Cloud Computing (2026)  
**Assignment:** HireSphere — cloud-native interview simulation platform  
**Viva date:** 9 May 2026  
**Total time:** ~28–30 minutes (පටන් ගන්නේ හැඳින්වීමෙන්, අවසානයේ Q&A buffer)

**පෙන්වන්න:**
- VS Code — repo open  
- Browser — AWS Console (us-east-1), GitHub, Amplify  
- Terminal — VS Code integrated terminal  

**Links:**
- Live UI: https://main.d2vg09g8z6y2es.amplifyapp.com  
- API: https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health  
- GitHub: https://github.com/Damithjayawardhane/hiresphere  

**Assignment key points මෙ script එක cover කරනවා:**
Report · Microservices · K8s + API Gateway · React/Amplify/Cognito · CloudFormation · GitHub integration · Scalability · Security · Fault tolerance · Cost efficiency

---

## පෙර සූදානම (viva ට පැයකට පෙර — කථා නොකරන්න, check පමණයි)

```powershell
curl https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health
```

Tabs open කරලා තියාගන්න: `docs/REPORT.md`, `cloudformation/`, `auth-service/app.py`, GitHub Actions, Amplify URL, AWS CloudFormation.

---

# කාල සටහන (Timeline)

| වේලාව | කොටස | Marks align |
|--------|------|-------------|
| 0:00–2:00 | හැඳින්වීම + assignment map | Report intro |
| 2:00–6:00 | Architecture report + diagrams | Report 20% |
| 6:00–11:00 | CloudFormation + AWS live console | CFN 10% |
| 11:00–16:00 | Microservices + API gateway code | Microservices 20% |
| 16:00–18:00 | GitHub + CI/CD | Integration 10% |
| 18:00–19:00 | Cognito + RDS + ECS (console) | Amplify/Cognito + DB |
| 19:00–25:00 | **Live UI demo** (candidate + interviewer) | Web UI 20% |
| 25:00–28:00 | Kubernetes + WebRTC (optional local) | K8s 20% |
| 28:00–30:00 | Non-functional + closing | All NFRs |

---

# SECTION 0 — Opening (0:00 – 2:00)

**පෙන්වන්න:** `docs/REPORT.md` title page / introduction.

**කියන්න (word-by-word):**

> “සුබ දවසක් sir. මම Damith Jayawardhane. අද මම demonstrate කරන්නේ මගේ SE6020 Cloud Computing assignment එක — **HireSphere** කියන cloud-native technical interview simulation platform එක.
>
> මෙහි objective එක තමයි cloud environment එකක architecture සහ implementation knowledge එක practical solution එකක් විදිහට පෙන්වීම.
>
> HireSphere එකෙන් job seekers ලා — final year students, bootcamp graduates, career switchers — verified industry interviewers ලා connect වෙලා mock interviews practice කරන්න පුළුවන්. Candidates ලා book කරන්න පුළුවන්, coding challenges submit කරන්න පුළුවන්, live sessions join කරන්න පුළුවන්, structured feedback ලබන්න පුළුවන්. Interviewers ලා bookings manage කරන්න, evaluations දාන්න, packages offer කරන්න පුළුවන්.
>
> මගේ solution එකේ technology stack එක: **Python Flask microservices** තුනක්, **nginx API gateway**, **React frontend** on **AWS Amplify**, **Amazon Cognito** authentication, **Amazon RDS PostgreSQL** database, **Docker** containers, **Kubernetes** manifests, infrastructure **AWS CloudFormation**, production deploy **ECS Fargate** with **API Gateway HTTPS**, සහ **GitHub Actions** CI/CD.
>
> Demo එක මම VS Code, AWS Console, GitHub, සහ live hosted application එකෙන් walkthrough කරනවා. සම්පූර්ණයෙන්ම අවසානය දක්වා.”

---

# SECTION 1 — Architecture Report (2:00 – 6:00)

**පෙන්වන්න:** `docs/REPORT.md` — Mermaid diagrams (2.1, 2.2, 2.3).

**කියන්න:**

> “Assignment task එකේ පළමු requirement එක තමයි report එකක් architecture diagrams සහ approach එක සමඟ. ඒක මම `docs/REPORT.md` file එකේ submit කරලා තියෙනවා Moodle එකට.
>
> පළමු diagram එක **logical architecture** එක. Browser එකෙන් user එක React SPA එකට යනවා — ඒක host වෙන්නේ **AWS Amplify** එකේ HTTPS උයි. Login වෙන්නේ **Amazon Cognito** එකෙන්. API calls යන්නේ **API Gateway HTTP API** එකට — HTTPS — mixed content problem එක avoid කරන්න frontend hosted on HTTPS නිසා.
>
> API Gateway එක **Application Load Balancer** එකට proxy කරනවා. ALB එකට එන traffic nginx **API gateway container** එක route කරනවා — `/auth` auth-service ට, `/bookings` booking-service ට, `/feedback`, `/submissions`, `/messages` interview-service ට. තුනම microservices **RDS PostgreSQL** එකට connect වෙනවා. Booking service එක auth service එකට health check කරනවා — fault tolerance සඳහා.
>
> දෙවැනි diagram එක **AWS deployment** එක. Amplify, Cognito, API Gateway, ALB, ECS Fargate task, ECR images, RDS — සියල්ල CloudFormation එකෙන් provision කරනවා.
>
> තෙවැනි diagram එක **Kubernetes** deployment එක — namespace `hiresphere`, NodePort 30080, nginx gateway pod, තුන microservice pods. Assignment එක Kubernetes deploy කරන්න කිව්වා — අපි `k8s/` folder එකේ manifests provide කරනවා local හෝ cluster එකක demo සඳහා. Production cloud deploy එක ECS use කරනවා cost සහ operational simplicity සඳහා.
>
> Local development එක `docker-compose.yml` එකෙන් same layout එක mirror කරනවා — lecturerට code එකෙන් cloud mapping එක පැහැදිලි වෙනවා.”

---

# SECTION 2 — CloudFormation & AWS Infrastructure (6:00 – 11:00)

**පෙන්වන්න:** VS Code — `cloudformation/hiresphere-stack.yaml`, `hiresphere-ecs-services.yaml`  
**පෙන්වන්න:** AWS Console → CloudFormation → stacks `hiresphere`, `hiresphere-ecs` → Outputs

**කියන්න:**

> “Assignment එකේ අනිවාර්ය requirement එක තමයි **CloudFormation stack** එකක් run කරලා entire infrastructure deploy කරලා demonstrate කරන්න.
>
> මම templates දෙකක් use කරනවා. පළමුව `hiresphere-stack.yaml`. මෙහි create වෙන්නේ: **VPC** public subnets සහිතව, **Amazon Cognito User Pool** app client සහිතව, **RDS PostgreSQL** instance — assignment එක RDS හෝ DynamoDB කිව්වා, මම relational data නිසා **PostgreSQL** select කළා — **Application Load Balancer**, **ECR repositories**, **ECS cluster**, **Amplify** app.
>
> දෙවැනි template එක `hiresphere-ecs-services.yaml`. මෙයින් deploy වෙන්නේ: ECS **Fargate task definition** — එක task එකක containers හතර — auth-service, booking-service, interview-service, nginx api-gateway. **Target group**, **ECS service**, **Application Auto Scaling** — CPU seventy percent ට scale out — scalability requirement. **API Gateway v2** HTTPS front — output `ApiHttpsUrl`.
>
> Console එකේ පෙන්වන්න පුළුවන් stacks දෙකම **CREATE_COMPLETE** හෝ **UPDATE_COMPLETE** status එකේ. Outputs tab එකේ Cognito pool ID, RDS endpoint, API HTTPS URL, Amplify app ID තියෙනවා.
>
> Deploy scripts repo එකේ: `scripts/push-ecr.ps1` Docker images ECR එකට push කරනවා. `scripts/deploy-ecs.ps1` ECS stack update කරනවා RDS password pass කරලා database connect කරන්න. `scripts/init-rds-db.ps1` RDS එකේ database create කරනවා අවශ්‍ය නම්.
>
> මෙය **Infrastructure as Code** — reproducible, version controlled, assignment automation requirement satisfy කරනවා.”

**Terminal (optional, කෙටියෙන්):**

```powershell
aws cloudformation describe-stacks --stack-name hiresphere-ecs --region us-east-1 --query "Stacks[0].Outputs"
curl https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health
```

> “Health endpoint එක response දෙනවා `gateway ok` — API layer alive.”

---

# SECTION 3 — Microservices Implementation (11:00 – 16:00)

**පෙන්වන්න:** VS Code — `auth-service/app.py`, `booking-service/app.py`, `interview-service/app.py`, `nginx/nginx.conf`, Dockerfiles

**කියන්න:**

> “Assignment එක microservices implement කරන්න කිව්වා — මම **Python Flask** use කළා. Services තුනක් separate repositories logic, separate Docker images, separate deployment units.
>
> **පළමුව auth-service**, port five thousand one. Users register/login — local mode JWT, cloud mode **Cognito JWT** validate කරනවා `cognito_jwt.py` එකෙන්. User profiles — candidate හෝ interviewer role. Interviewer profiles එකේ domain, skills, rate, availability, interview types store වෙනවා — database එකෙන්. Endpoint `/auth/cognito-sync` — Cognito login එකෙන් පස්සේ extended profile RDS එකට save කරනවා.
>
> **දෙවැනි booking-service**, port five thousand two. Mock interview **booking** — calendar datetime, session type, duration, price. **Payment integration** simulated — test card numbers — success හෝ decline. Booking statuses: pending, awaiting payment, confirmed, completed, cancelled. **Interview packages** — interviewer bundled sessions publish කරනවා. **Recording URL** attach කරන්න පුළුවන් completed sessions වලට — optional bonus requirement. `resilience.py` — **circuit breaker** pattern — auth service unreachable නම් graceful degradation — assignment fault tolerance.
>
> **තෙවැනි interview-service**, port five thousand three. **Structured evaluation reports** — feedback scores, recommendation Hire Maybe No Hire. **Ratings** interviewers වලට. **Coding challenge submissions** — GitHub URL හෝ file upload — interviewer **annotations**. **Messaging** between candidate and interviewer. **Socket.IO** — live session room, collaborative code editor sync, **WebRTC signaling** video offer answer ICE candidates — live mock interview requirement.
>
> **nginx** `nginx.conf` — API gateway pattern — single entry port eight thousand eighty locally, ALB එකට cloud එකේ. Routes පැහැදිලිව separate කරලා.
>
> **Dockerfile** එකක් එකක් service එකකට — containerised images requirement satisfy. `docker compose` සහ ECR push දෙකටම same images.”

---

# SECTION 4 — GitHub & CI/CD Integration (16:00 – 18:00)

**පෙන්වන්න:** Browser — https://github.com/Damithjayawardhane/hiresphere → Actions

**කියන්න:**

> “Assignment එක **real GitHub repository** integration demonstrate කරන්න කිව්වා — marks ten percent.
>
> Repository link එක Moodle submission එකේ දාලා තියෙනවා. Code, CloudFormation, Kubernetes manifests, frontend, scripts — සියල්ල version controlled.
>
> `.github/workflows/ci.yml` — push වෙද්දී frontend build test කරනවා, Docker images build validate කරනවා.
>
> `.github/workflows/amplify-deploy.yml` — frontend changes වෙද්දී automatically: AWS credentials use කරලා CloudFormation stack `hiresphere-ecs` එකෙන් **HTTPS API URL** read කරනවා, Vite environment variables set කරනවා — API URL, Cognito pool ID, client ID — `npm run build`, zip upload, **Amplify manual deployment API** — live site update.
>
> මේක end-to-end **CI/CD pipeline** — code change එකක් production UI එකට යන එක demonstrate කරනවා. Lecturer commits history එක බලන්න පුළුවන්.”

---

# SECTION 5 — Cognito, RDS, ECS (18:00 – 19:00) — Console quick tour

**පෙන්වන්න:** Cognito User Pool → Users; RDS `hiresphere-db`; ECS cluster → service `hiresphere-api` → task → 4 containers

**කියන්න:**

> “**Security** requirement — authentication **Amazon Cognito** managed service. User pool, app client, password policy AWS handle කරනවා. Custom attribute `role` — candidate හෝ interviewer. Frontend `AuthContext.jsx` — Amplify Auth library.
>
> **Database** — **Amazon RDS PostgreSQL**. Users, bookings, feedback, submissions, messages — relational tables. ECS tasks environment variable `DATABASE_URL` through CloudFormation parameter. Encrypted in transit HTTPS, VPC security groups restrict access.
>
> **ECS Fargate** — microservices run වෙන්නේ serverless containers — no EC2 manage. Service auto scaling — peak booking hours handle කරන්න — scalability.
>
> Data persistence assignment requirement — RDS use කළා DynamoDB වෙනුවට — joins සහ structured reports නිසා.”

---

# SECTION 6 — LIVE Web Demo — Candidate Flow (19:00 – 22:30) ⭐

**පෙන්වන්න:** https://main.d2vg09g8z6y2es.amplifyapp.com  
**Login:** Cognito candidate user (ඔබ register කළ account)

**කියන්න (එක් එක් click එකටම කථා කරන්න):**

> “දැන් **workable demonstration** — live deployed system. Frontend **React** on **AWS Amplify**, light theme UI, database-driven data — hardcoded mock lists නැහැ API work වෙද්දී.
>
> **Login / Sign up** — assignment එක secure authentication require කරනවා. Cognito email password. Sign up page එකෙන් role select කරන්න පුළුවන් candidate හෝ interviewer.
>
> Dashboard එක — quick stats API එකෙන් load වෙනවා — bookings count, upcoming sessions.
>
> **Find Interviewers** — assignment candidate capabilities. Search interviewers by **domain** — Backend, Frontend, DevOps — filters database එකේ interviewer profiles වලින් dynamically populate වෙනවා. **Interview type** — DSA, System Design, Behavioral. **Experience level** — Senior, Staff, Principal. **Ratings** සහ **badges** ratings API එකෙන් merge වෙනවා auth users සමඟ.
>
> Interviewer card එකක් select කරලා **Book Session** — calendar datetime picker, session type interviewer profile එකෙන්, duration, notes. Price interviewer rate එකෙන් calculate වෙනවා.
>
> **Payment step** — simulated payment integration — test card number enter කරලා pay — booking status awaiting payment සිට update වෙනවා — database එකේ.
>
> **My Sessions** — interview **history** — upcoming සහ completed — assignment requirement display interview history.
>
> **Submissions** — coding challenge — **GitHub repository link** paste කරන්න පුළුවන් හෝ **file upload** — database එකට save වෙනවා interview-service එකේ.
>
> **Messages** — candidate සහ interviewer අතර direct messages — messaging service requirement.
>
> මේ flow එකෙන් candidate-facing functionality assignment PDF එකේ list එක cover වෙනවා.”

---

# SECTION 7 — LIVE Web Demo — Interviewer Flow (22:30 – 25:00)

**පෙන්වන්න:** Logout → Cognito interviewer user login

**කියන්න:**

> “දැන් **interviewer role** එක demo කරනවා — වෙනම Cognito user.
>
> **Bookings** page — candidate booking requests පෙන්වනවා database එකෙන්. **Confirm** කරන්න පුළුවන් pending booking එකක් — accept booking request. **Decline** හෝ cancel.
>
> Confirmed booking එකකට **Start Session** — live session page — Socket.IO room, collaborative code, WebRTC video — assignment live mock interview.
>
> Session complete කරලා **Give Feedback** — structured evaluation — coding score, communication score, recommendation — database save.
>
> **Recording URL** add කරන්න පුළුවන් — optional bonus past interview recordings.
>
> **Review Submissions** — candidates upload කළ GitHub හෝ files — **annotation** add කරනවා — interviewer capability assignment එකේ.
>
> **Packages** — bundled interview sessions create කරනවා — title, description, session count, bundle price — booking service database.
>
> Interviewer capabilities assignment PDF එක complete.”

---

# SECTION 8 — Kubernetes & WebRTC (25:00 – 28:00)

**පෙන්වන්න:** VS Code `k8s/` folder; terminal (Docker ON):

```powershell
kubectl get pods -n hiresphere
kubectl get svc -n hiresphere
```

**Local WebRTC (time තියෙනවා නම්):**

```powershell
.\start.bat
# Option 1 — Local full stack
```

> “Assignment marks twenty percent — **workable demonstration on Kubernetes cluster with API Gateway**.
>
> `k8s/` directory එකේ: namespace, ConfigMap nginx config, Deployments auth booking interview, api-gateway Deployment, Services, NodePort **three zero zero eight zero** — same routing as cloud.
>
> `scripts/deploy-k8s.ps1` — apply manifests, optionally build images. `kubectl get pods` — pods Running පෙන්වන්න පුළුවන්.
>
> Cloud production **ECS** — Kubernetes requirement local/cluster demo සඳහා satisfy — manifests runnable, API gateway in cluster.
>
> **WebRTC live session** — `LiveSession.jsx` — browser camera permission, Socket.IO signaling, peer connection. Local Docker stack හොඳයි full video test සඳහා. Cloud එකේ signaling HTTPS API එක හරහා.
>
> Participate in live mock interviews — WebRTC-based — assignment explicit requirement — මෙහි implement කරලා තියෙනවා.”

---

# SECTION 9 — Non-Functional Requirements + Closing (28:00 – 30:00)

**පෙන්වන්න:** `docs/REPORT.md` — NFR section හෝ `booking-service/resilience.py`

**කියන්න:**

> “Assignment එක non-functional attributes require කළා — මම ඒවා map කරලා තියෙනවා:
>
> **Scalability** — ECS Application Auto Scaling, stateless microservices, ALB distribute traffic, Amplify CDN frontend.
>
> **Security** — Cognito authentication, JWT authorization every API request, HTTPS TLS end-to-end API Gateway to browser, RDS VPC private subnets, security groups.
>
> **Fault tolerance** — ALB health checks, ECS task restart, booking service **circuit breaker** auth calls වලට, API errors graceful messages frontend එකේ.
>
> **Cost efficiency** — Fargate pay per use, db.t3.micro RDS, single task default, Amplify hosting startup-friendly, no always-on expensive EKS cluster in this project.
>
> Cloud design patterns: **microservices**, **API gateway**, **containerisation**, **Infrastructure as Code**, **managed authentication**, **managed relational database**, **CI/CD**.
>
> සාරාංශය: HireSphere assignment requirements — report, microservices, containers, Kubernetes manifests, React Amplify Cognito UI, CloudFormation deploy, GitHub integration, live demo — මම cover කළා.
>
> Sir, මම demo එක අවසන්. ප්‍රශ්න තියෙනවා නම් සතුටුවෙන්න පිළිතුරු දෙන්නම්. ස්තූතියි.”

---

# Assignment marks — ඔබ පෙන්වන කොටස map එක

| Assignment component | Marks | ඔබ demo කරන section |
|---------------------|-------|---------------------|
| Solution Report | 20% | Section 1 |
| Implementation of microservices | 20% | Section 3 |
| K8s + API Gateway | 20% | Section 3 (nginx) + Section 8 |
| Web UI + Amplify + Cognito | 20% | Section 5 + 6 + 7 |
| CloudFormation | 10% | Section 2 |
| GitHub integration | 10% | Section 4 |

---

# Lecturer ප්‍රශ්න — කෙටි පිළිතුර (script එකෙන් පිටතින්)

| ප්‍රශ්නය | කියන්න |
|---------|--------|
| DynamoDB why not? | Relational bookings, feedback, users — PostgreSQL on RDS fits better. |
| EKS? | ECS for production; K8s manifests for assignment K8s requirement. |
| Plagiarism? | Own implementation, GitHub history, can explain any file. |
| Payment real? | Simulated test cards for demo; Stripe-style flow. |
| WebRTC cloud? | Signaling via API; full video best on local HTTPS or localhost. |

---

# Emergency — 2 minutes left, UI broken

> “API layer health check කරනවා. Infrastructure CloudFormation, code GitHub, report diagrams — implemented. Local `start.bat` option one fallback demo.”

```powershell
.\start.bat
# 1 = local
```

---

**Related files:**
- [VIVA-DEMO-GUIDE.md](VIVA-DEMO-GUIDE.md) — screen-by-screen notes  
- [VS-CODE-DEMO.md](VS-CODE-DEMO.md) — VS Code commands  
- [VIVA-CHECKLIST.md](VIVA-CHECKLIST.md) — pre-viva checklist  

*Print this document or keep on tablet — read naturally, not robotic speed.*
