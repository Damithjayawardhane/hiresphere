# HireSphere — VS Code Demo Guide

**Project folder:** `hiresphere` (repo root)  
**Live cloud UI:** https://main.d2vg09g8z6y2es.amplifyapp.com  
**API health:** https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health  
**Full viva script (Sinhala):** [VIVA-DEMO-GUIDE.md](VIVA-DEMO-GUIDE.md)  
**Quick checklist:** [VIVA-CHECKLIST.md](VIVA-CHECKLIST.md)

---

## 1. VS Code setup

1. **File → Open Folder** → select the `hiresphere` repo root.
2. Open terminal: **`` Ctrl+` ``** or **Terminal → New Terminal**.
3. Keep these files open in tabs for the presentation:

| Tab | File | Why |
|-----|------|-----|
| Report | `docs/REPORT.md` | Architecture diagrams |
| Auth | `auth-service/app.py` | Microservice 1 |
| Booking | `booking-service/app.py` | Microservice 2 |
| Interview | `interview-service/app.py` | Microservice 3 + WebSocket |
| Gateway | `nginx/nginx.conf` | API routing |
| CFN | `cloudformation/hiresphere-stack.yaml` | AWS baseline |
| CFN ECS | `cloudformation/hiresphere-ecs-services.yaml` | ECS + API Gateway |
| Frontend auth | `frontend/src/context/AuthContext.jsx` | Cognito / JWT |
| Docker | `docker-compose.yml` | Local = cloud mapping |

---

## 2. Recommended viva layout (VS Code + browser)

| Part | VS Code | Browser |
|------|---------|---------|
| Architecture & code | `REPORT.md`, CFN, services | — |
| GitHub / CI/CD | Terminal (optional) | GitHub → **Actions** |
| AWS infrastructure | `aws` commands in terminal | AWS Console (us-east-1) |
| **Live demo** | — | Amplify URL |

**Optional:** In VS Code, `Ctrl+Shift+P` → **Simple Browser: Show** → paste Amplify URL to view UI inside the editor.

---

## 3. Pre-demo checks (2 minutes)

Run in VS Code terminal (PowerShell):

```powershell
aws cloudformation describe-stacks --stack-name hiresphere --region us-east-1 --query "Stacks[0].StackStatus"
aws cloudformation describe-stacks --stack-name hiresphere-ecs --region us-east-1 --query "Stacks[0].StackStatus"
curl https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com/health
```

Expected:

- `hiresphere` → `CREATE_COMPLETE`
- `hiresphere-ecs` → `UPDATE_COMPLETE` or `CREATE_COMPLETE`
- health → `{"gateway":"ok"}`

Open https://main.d2vg09g8z6y2es.amplifyapp.com and test Cognito login once.

---

## 4. Cloud demo only (easiest for viva)

No Docker required.

### Option A — `start.bat`

```powershell
.\start.bat
```

Choose **`2` Cloud app** — opens Amplify in the browser.

### Option B — Browser directly

https://main.d2vg09g8z6y2es.amplifyapp.com

- Sign in with your **Cognito** user (candidate or interviewer).
- **Candidate flow:** Find Interviewers → Book → Pay → My Sessions → Submissions / Messages.
- **Interviewer flow:** Bookings → Confirm → Start session → Feedback → Packages / Review submissions.

Data comes from the **database/API** (not hardcoded demo users in the UI).

---

## 5. Local full stack from VS Code

**Requires:** Docker Desktop running.

### Option A — `start.bat` (recommended)

```powershell
.\start.bat
```

Choose **`1` Local full stack** — starts Docker + frontend in a new window.

### Option B — Manual commands

```powershell
docker compose up --build -d
cd frontend
npm ci
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API gateway | http://localhost:8080 |

**Local JWT login** (when Cognito env vars are not set in `.env.local`):

- Candidate: `candidate@hiresphere.com` / `password123`
- Interviewer: `alice@hiresphere.com` / `password123`

Create `frontend/.env.local` from `frontend/env.local.example` if missing.

### Stop local stack

```powershell
.\start.bat
# choose 5 — Stop Docker
# or:
docker compose down
```

---

## 6. Demo order (~15–20 min)

Follow [VIVA-DEMO-GUIDE.md](VIVA-DEMO-GUIDE.md) for Sinhala speaker notes. Short order:

1. **VS Code** — `docs/REPORT.md` (architecture diagram).
2. **VS Code** — `cloudformation/` templates + `docker-compose.yml`.
3. **VS Code** — Walk through `auth-service`, `booking-service`, `interview-service`, `nginx/nginx.conf`.
4. **Browser** — GitHub repo + green **Actions** (CI/CD).
5. **Browser** — AWS Console: CloudFormation (`hiresphere`, `hiresphere-ecs`), Cognito, RDS, ECS.
6. **Browser** — **Live Amplify app** (main demo).
7. **Optional** — VS Code terminal: `docker compose ps` or K8s `kubectl get pods -n hiresphere`.

---

## 7. Deploy / update UI from VS Code

After code changes:

```powershell
git add .
git commit -m "Your message"
git push origin main
```

GitHub **Actions → Deploy to Amplify** runs automatically when `frontend/` changes.

Or: GitHub → **Actions** → **Deploy to Amplify** → **Run workflow**.

Backend (ECS) update:

```powershell
.\scripts\push-ecr.ps1
.\scripts\deploy-ecs.ps1 -DbPassword 'YOUR_RDS_PASSWORD'
```

---

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| Amplify UI old style | Wait for Actions deploy; hard refresh (`Ctrl+F5`) |
| No interviewers / API error | Run health `curl`; redeploy ECS if needed |
| Local `npm run dev` API 404 | Ensure `docker compose up` and `frontend/.env.local` points to `http://localhost:8080` |
| Cognito login fails | Use user created in Cognito pool; check Amplify env vars |
| Live session / WebRTC | Needs camera permission; works best on localhost or HTTPS cloud |

---

## 9. Useful links

- GitHub: https://github.com/Damithjayawardhane/hiresphere  
- Amplify UI: https://main.d2vg09g8z6y2es.amplifyapp.com  
- API: https://wv4jaqqvhc.execute-api.us-east-1.amazonaws.com  

---

*Good luck with your viva.*
