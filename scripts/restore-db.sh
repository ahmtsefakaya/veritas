#!/usr/bin/env bash
#
# Veritas - yedekten geri yukleme
#
# Varsayilan davranis GUVENLIDIR: yedegi atilabilir bir yerel docker
# konteynerine yukler ve dogrular. Canli veritabanina yazmak ayrica ve
# acikca istenmelidir (--target live + ONAY degiskeni).
#
# NEDEN: Geri yukleme, yedeklemenin kendisinden daha risklidir. Yanlis
# hedefe yapilan bir --clean geri yukleme canli veriyi siler. Bu yuzden
# canli hedef iki ayri bilincli adim ister.
#
# Kullanim:
#   ./scripts/restore-db.sh backups/veritas-...dump               # yerel dogrulama (varsayilan)
#   ./scripts/restore-db.sh backups/veritas-...dump --target live # CANLI (onay ister)
#
set -euo pipefail

DUMP="${1:-}"
TARGET="local"
[[ "${2:-}" == "--target" ]] && TARGET="${3:-local}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%d %H:%M:%SZ')" "$*"; }
die() { printf 'HATA: %s\n' "$*" >&2; exit 1; }

[[ -n "$DUMP" && -s "$DUMP" ]] || die "Kullanim: $0 <dump dosyasi> [--target local|live]"
command -v docker >/dev/null || die "docker gerekli."

# Dokumun hangi surumle alindigini ve saglam oldugunu once dogrula.
log "Dokum okunuyor"
TABLES="$(docker run --rm -i postgres:18-alpine pg_restore -l < "$DUMP" 2>/dev/null | grep -c 'TABLE DATA' || true)"
[[ "${TABLES:-0}" -gt 0 ]] || die "Dokum bozuk veya tablo verisi yok."
log "Dokum saglam: $TABLES tablo verisi"

if [[ "$TARGET" == "local" ]]; then
  # ---- Atilabilir yerel konteynere yukle ve dogrula ----
  C=vrestore
  log "Atilabilir konteyner hazirlaniyor ($C)"
  docker rm -f "$C" >/dev/null 2>&1 || true
  docker run -d --name "$C" -e POSTGRES_PASSWORD=restoretest \
    -e POSTGRES_DB=veritas_restore postgres:18-alpine >/dev/null
  for _ in $(seq 1 30); do
    docker exec "$C" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1
  done

  docker cp "$DUMP" "$C":/tmp/r.dump
  log "Geri yukleniyor"
  docker exec "$C" pg_restore -U postgres -d veritas_restore \
    --no-owner --no-privileges /tmp/r.dump

  log "Icerik dogrulaniyor"
  docker exec "$C" psql -U postgres -d veritas_restore -c "
    select 'users' t, count(*) from users
    union all select 'topics', count(*) from topics
    union all select 'evidences', count(*) from evidences
    union all select 'comments', count(*) from comments
    union all select '_prisma_migrations', count(*) from _prisma_migrations
    order by 1;"
  IDX="$(docker exec "$C" psql -U postgres -d veritas_restore -t -A -c \
    "select count(*) from pg_indexes where schemaname='public';")"
  log "Indeks sayisi: $IDX"
  log "TAMAM. Incelemek icin:"
  log "  docker exec -it $C psql -U postgres -d veritas_restore"
  log "Bitince: docker rm -f $C"
  exit 0
fi

# ---- CANLI hedef ----
[[ "$TARGET" == "live" ]] || die "Bilinmeyen hedef: $TARGET (local|live)"

if [[ "${ONAYLIYORUM:-}" != "EVET-CANLIYA-YAZ" ]]; then
  cat >&2 <<'UYARI'
HATA: Canli geri yukleme onaylanmadi.

Bu islem CANLI veritabanindaki mevcut veriyi yedekteki haliyle DEGISTIRIR.
Once mutlaka guncel bir yedek al (./scripts/backup-db.sh), sonra:

  ONAYLIYORUM=EVET-CANLIYA-YAZ ./scripts/restore-db.sh <dump> --target live
UYARI
  exit 1
fi

if [[ -z "${DATABASE_PUBLIC_URL:-}" ]]; then
  command -v railway >/dev/null || die "railway CLI yok ve DATABASE_PUBLIC_URL verilmedi."
  DATABASE_PUBLIC_URL="$(railway variables --service "${PG_SERVICE:-Postgres}" --kv 2>/dev/null \
    | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2- || true)"
fi
[[ -n "${DATABASE_PUBLIC_URL:-}" ]] || die "DATABASE_PUBLIC_URL bulunamadi."

log "GUVENLIK: canli geri yukleme oncesi mevcut durumun yedegi aliniyor"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}" \
  "$(dirname "$0")/backup-db.sh"

log "CANLIYA geri yukleniyor (--clean --if-exists)"
# --clean --if-exists: ayni nesneler varsa once dusurulur; yoksa her nesne
# "already exists" hatasi verir ve geri yukleme yarim kalir.
docker run --rm -i -e C="$DATABASE_PUBLIC_URL" postgres:18-alpine \
  sh -c 'pg_restore -d "$C" --clean --if-exists --no-owner --no-privileges' < "$DUMP"

log "TAMAM. Backend'i yeniden baslat: railway redeploy --service veritas"
