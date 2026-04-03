#!/usr/bin/env bash
# ─── AgenticRev — Local Dev Runner ──────────────────────────────────────────
# Single command to bring up the full local stack and start Next.js dev server.
#
# Usage:
#   chmod +x dev.sh
#   ./dev.sh
#
# Requirements: Docker Desktop, Node.js 20+
# ────────────────────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; RESET='\033[0m'
info()  { echo -e "${BLUE}[dev]${RESET} $*"; }
ok()    { echo -e "${GREEN}[dev]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[dev]${RESET} $*"; }
die()   { echo -e "${RED}[dev] ✗ $*${RESET}" >&2; exit 1; }

echo -e "${BOLD}─── AgenticRev Local Dev ────────────────────────────────${RESET}"

# ── 1. Check .env.local ───────────────────────────────────────────────────────
if [[ ! -f ".env.local" ]]; then
  die ".env.local not found. Copy .env.local.example and fill in values."
fi
ok ".env.local found"

# ── 2. Check Node.js ─────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  die "Node.js not found. Install from https://nodejs.org"
fi
NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [[ "$NODE_VERSION" -lt 20 ]]; then
  warn "Node.js ${NODE_VERSION} detected — recommend Node 20+"
fi
ok "Node.js v$(node --version | tr -d v) ready"

# ── 3. Install dependencies if needed ────────────────────────────────────────
if [[ ! -d "node_modules" ]]; then
  info "Installing npm dependencies…"
  npm install
  ok "Dependencies installed"
fi

# ── 4. Docker Desktop check ───────────────────────────────────────────────────
if ! docker info &>/dev/null 2>&1; then
  warn "Docker daemon not running — starting Docker Desktop…"
  if [[ "$(uname)" == "Darwin" ]]; then
    open -a Docker
    info "Waiting for Docker daemon (up to 60s)…"
    for i in $(seq 1 30); do
      sleep 2
      if docker info &>/dev/null 2>&1; then break; fi
      if [[ "$i" == "30" ]]; then die "Docker failed to start. Open Docker Desktop manually."; fi
      printf '.'
    done
    echo ""
  else
    die "Docker is not running. Start Docker Desktop before running this script."
  fi
fi
ok "Docker running"

# ── 5. Start Docker Compose stack ────────────────────────────────────────────
info "Starting database stack (postgres + PostgREST + Studio)…"
docker compose --env-file .env.local up -d 2>&1 | grep -v "^$"

# ── 6. Wait for DB to be healthy ─────────────────────────────────────────────
info "Waiting for Postgres to be healthy…"
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' agenticrevops-db-1 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "healthy" ]]; then break; fi
  if [[ "$i" == "30" ]]; then die "Postgres health check timed out. Run: docker compose logs db"; fi
  sleep 2
  printf '.'
done
echo ""
ok "Postgres healthy"

# ── 7. Wait for PostgREST API ────────────────────────────────────────────────
info "Waiting for REST API (localhost:8000)…"
for i in $(seq 1 15); do
  if curl -sf http://localhost:8000/health -o /dev/null 2>/dev/null; then break; fi
  if [[ "$i" == "15" ]]; then
    warn "REST API not responding yet — it may still be starting. Continuing anyway."
    break
  fi
  sleep 2
  printf '.'
done
echo ""
ok "REST API ready"

# ── 8. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}─── Stack ready ──────────────────────────────────────────${RESET}"
echo -e "  ${GREEN}●${RESET} Postgres         postgresql://localhost:5433/postgres"
echo -e "  ${GREEN}●${RESET} Supabase API     http://localhost:8000"
echo -e "  ${GREEN}●${RESET} Supabase Studio  http://localhost:54323"
echo -e "  ${GREEN}●${RESET} Next.js          http://localhost:3000  ${YELLOW}(starting…)${RESET}"
echo ""
echo -e "  DB credentials:  user=${BOLD}supabase_admin${RESET}  password=${BOLD}postgres${RESET}"
echo ""

# ── 9. Start Next.js ─────────────────────────────────────────────────────────
info "Starting Next.js dev server…"
npm run dev
