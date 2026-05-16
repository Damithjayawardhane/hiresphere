# HireSphere — Viva quick checklist

> **Full demo script + Sinhala speaker notes:** see [`VIVA-DEMO-GUIDE.md`](VIVA-DEMO-GUIDE.md)  
> **Demo from VS Code:** see [`VS-CODE-DEMO.md`](VS-CODE-DEMO.md)  
> **~30 min word-by-word speech:** see [`VIVA-SPEECH-SCRIPT-30MIN.md`](VIVA-SPEECH-SCRIPT-30MIN.md)  
> **Code flow & viva Q&A:** see [`VIVA-CODE-FLOW.md`](VIVA-CODE-FLOW.md)

## Before viva

- [ ] `aws cloudformation describe-stacks --stack-name hiresphere --query Stacks[0].StackStatus`
- [ ] `aws cloudformation describe-stacks --stack-name hiresphere-ecs --query Stacks[0].Outputs`
- [ ] `curl https://<ApiHttpsUrl>/health`
- [ ] Amplify URL opens and Cognito login works

## Demo order

1. CloudFormation (both stacks)
2. Cognito User Pool
3. RDS PostgreSQL
4. ECS + ECR
5. API Gateway HTTPS health
6. Amplify live app
7. Local: `start.bat` → 1 (WebRTC / full booking)
8. GitHub Actions history

## Commands

```powershell
.\scripts\push-ecr.ps1
.\scripts\deploy-ecs.ps1 -DbPassword YOUR_RDS_PASSWORD
.\scripts\deploy-k8s.ps1
```
