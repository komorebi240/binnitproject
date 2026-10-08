# Publishing Orbit for free

One free VM runs the whole app behind HTTPS; only the database lives elsewhere.

```text
Browser --HTTPS--> Caddy (VM, ports 80/443)
                     |-- /api/*  -> backend  (Spring Boot, :8080, not exposed)
                     |-- others  -> frontend (Next.js, :3000, not exposed)
                   backend --TLS--> Azure SQL Database (free offer)
```

Why this shape: the browser only talks to one origin, so the httpOnly session cookie is first-party (the
Next.js middleware reads it), there is no CORS to get wrong, and Caddy sees the real client IP for the
rate limits. Swagger UI and `/actuator` are not routed, so they are unreachable from outside.

Free-tier terms change. Check each provider's current page before you sign up, and keep every
"auto-pause / do not upgrade" choice below so nothing can be billed.

## Which name goes where

Only **one** public name is needed, because the VM serves the app and the API from the same address.

| Platform | Name | Set up by |
|---|---|---|
| Your domain (Mắt Bão DNS) | `app.stayorbit.cloud` -> A record to the VM's public IP | You, step 3.5 |
| Oracle VM + Caddy | `SITE_HOST=app.stayorbit.cloud` in `deploy/.env` (Caddy gets the HTTPS certificate for it) | You, step 4 |
| Azure SQL | its own `xxxx.database.windows.net` (not under your domain, never shown to users) | Azure gives it; goes in `DB_HOST` |
| Gmail (OTP / invitation mail) | `smtp.gmail.com`, nothing to set in DNS | Already configured |
| Google OAuth (only to link real Google Drive) | redirect URI `https://app.stayorbit.cloud/api/v1/drive/oauth2/callback` | You, in Google Cloud Console |

`stayorbit.cloud` itself (and `www`) is free for a landing page later; no `api.` name is needed.

## 1. Accounts (all need email; Oracle and Azure also ask for a card only to verify identity)

| What | Where | Notes |
|---|---|---|
| Domain name | Your own domain (e.g. bought at Mắt Bão) | You only add one DNS record for it in step 3.5; no extra account or service |
| Database | Azure SQL Database, **free offer** | Choose "Apply free offer" and the behaviour "Auto-pause the database until next month" when the monthly allowance runs out, so it can never be billed |
| Server | Oracle Cloud **Always Free** | Pick the home region carefully (permanent). Do not upgrade the account |
| Email | Gmail App Password | Same as local (backend/README.md, Phase 4) |

## 2. Database (Azure SQL)

1. Create the SQL database with the free offer; note the server name (`xxx.database.windows.net`) and database name.
2. Server -> Networking: add a firewall rule for the VM's public IP (after step 3). Leave "Allow Azure services" off.
3. Connect once as the server admin (Azure Data Studio or `sqlcmd`) **to the application database** and create a least-privilege login for the app (Flyway needs to create tables, so `db_owner` on this one database):
   ```sql
   CREATE USER orbit_app WITH PASSWORD = '<long random password>';
   ALTER ROLE db_owner ADD MEMBER orbit_app;
   ```
   Use `orbit_app` as `DB_USERNAME`. Do not give the app the server admin account.
4. Do not seed anything: the development users (`binmit1`-`binmit4`) are created only under the `dev` profile. The first company and admin come from the normal `/register` flow.

## 3. The VM (Oracle)

1. Create an instance: shape `VM.Standard.A1.Flex` (Ampere, e.g. 2 OCPU / 12 GB; both images build for arm64), image Ubuntu 22.04, add your SSH public key. If "out of capacity" shows up, retry later or in another availability domain.
2. VCN -> Security List: allow ingress TCP 80 and 443 from `0.0.0.0/0`; keep 22 open only to your own IP if you can.
3. On the VM, Ubuntu's own firewall also blocks them:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo apt-get install -y iptables-persistent && sudo netfilter-persistent save
   ```
4. Install Docker: `curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER` (log out and in again).
5. Point the domain at the VM. In your registrar's DNS panel (at Mắt Bão: the domain's "Quản lý DNS" / DNS records page) add an **A record**: host `app` (this makes `app.stayorbit.cloud`), value = the VM's public IP, TTL as low as offered (300 s). Use that name (`app.stayorbit.cloud`) as `SITE_HOST` in step 4. Check it with `nslookup app.stayorbit.cloud` (it must print the VM's IP; it can take a few minutes). Then add the same IP to the Azure SQL firewall (step 2.2).
   If the panel only manages DNS when the domain uses the registrar's own name servers, leave the name servers as they are; do not switch them to another service for this setup.

## 4. Deploy

```bash
git clone <your GitHub repo URL> orbit && cd orbit/deploy
cp .env.example .env && nano .env      # fill every value
docker compose up -d --build           # first build takes several minutes
docker compose logs -f backend         # wait for "Started ProjectApplication"
```

Generate the secrets on the VM, fresh (never reuse the development ones):
`openssl rand -base64 48` for `JWT_SECRET`, `openssl rand -base64 32` for `DRIVE_TOKEN_ENCRYPTION_KEY` and again (a different value) for `CRM_DATA_KEY`,
which encrypts the customer data of the CRM: keep a copy somewhere safe, because losing it makes that data unreadable.

Open `https://<SITE_HOST>/register` and create your company. Caddy fetches the HTTPS certificate on the first request (needs ports 80/443 reachable and the A record pointing at the VM).

## 5. Updating and backups

- Update: `git pull && docker compose up -d --build` in `deploy/`. Flyway applies new migrations on start.
- Database: Azure keeps automatic backups for the free tier (check the retention it shows for your database).
- Uploads (avatars, chat and task files) live in the Docker volume `deploy_uploads`:
  `docker run --rm -v deploy_uploads:/d -v "$PWD":/b alpine tar czf /b/uploads.tgz -C /d .`
  Copy that file off the VM now and then; the VM disk is the only copy.

## 6. Checklist before telling anyone the address

- [ ] `.env` exists only on the server; `deploy/.env` is git-ignored.
- [ ] `JWT_SECRET`, `DRIVE_TOKEN_ENCRYPTION_KEY` and `CRM_DATA_KEY` are new values, and `CRM_DATA_KEY` is backed up.
- [ ] `https://<SITE_HOST>/swagger-ui.html` and `/actuator/health` do **not** open from outside.
- [ ] Registration sends a real OTP email; login, logout and a file upload work.
- [ ] Only ports 22 (ideally restricted), 80 and 443 are open on the VM.
- [ ] The Azure SQL firewall lists only the VM's IP.

## Known limits of the free setup

- One instance: the rate limiter is in memory, which is fine for one backend but cannot scale out.
- No automatic uploads backup, no monitoring or alerting.
- Real Google Drive linking needs your own Google OAuth client (its redirect URI is `https://<SITE_HOST>/api/v1/drive/oauth2/callback`).
- Email: only the Gmail App Password route is set up. Mail from your own domain (for example a no-reply address) would need its own mail service and DNS records.
- The Docker images could not be built on the development machine (no Docker there). Instead the packaged jar was run with the `prod` profile against an empty database on this machine (2026-10-03): it started in 11 s, applied all 26 migrations, created no users, `/actuator/health` was UP, Swagger and API docs answered 404 with the two `SPRINGDOC_*` switches, `/actuator/env` answered 401, the seed login failed and the registration code request was refused (503) while no SMTP was configured. The Next.js standalone output was built and served too, but the first `docker compose up --build` on the VM is still the first real test of the Dockerfiles.
