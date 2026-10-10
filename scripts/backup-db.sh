#!/usr/bin/env bash
#
# Veritas - Railway Postgres yedekleme
#
# NEDEN BOYLE: Bu makinede pg_dump kurulu degil ve kurmak icin root gerekir.
# Ayrica pg_dump SUNUCUDAN ESKI OLAMAZ -- Railway'deki sunucu PostgreSQL 18,
# yerel bir pg_dump 16 olsaydi dokumu reddederdi. Bu yuzden script sunucunun
# surumunu once SORAR, sonra o surumle ESLESEN resmi docker imajinin
# pg_dump'ini kullanir. Boylece surum uyusmazligi sessiz bir hata olmaz.
#
# Baglanti: Railway'in ic adresi (*.railway.internal) disaridan cozulemez,
# bu yuzden DATABASE_PUBLIC_URL (TCP proxy) kullanilir.
#
# Kullanim:
#   ./scripts/backup-db.sh                 # yedegi backups/ altina al
#   BACKUP_DIR=/mnt/yedek ./scripts/backup-db.sh
#   KEEP=14 ./scripts/backup-db.sh         # 14 yedekten eskisini sil
#
# Geri yukleme: docs/yedekleme.md
#
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
KEEP="${KEEP:-7}"
SERVICE="${PG_SERVICE:-Postgres}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%d %H:%M:%SZ')" "$*"; }
die() { printf 'HATA: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "docker yok; pg_dump bu makinede docker ile kosuyor."

# --- Baglanti adresini al -------------------------------------------------
# Elle de verilebilir (CI gibi railway CLI olmayan ortamlar icin):
#   DATABASE_PUBLIC_URL=postgresql://... ./scripts/backup-db.sh
if [[ -z "${DATABASE_PUBLIC_URL:-}" ]]; then
  command -v railway >/dev/null || die "railway CLI yok ve DATABASE_PUBLIC_URL verilmedi."
  log "Baglanti adresi railway CLI'dan okunuyor (servis: $SERVICE)"
  DATABASE_PUBLIC_URL="$(railway variables --service "$SERVICE" --kv 2>/dev/null \
    | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2- || true)"
fi
[[ -n "${DATABASE_PUBLIC_URL:-}" ]] || die "DATABASE_PUBLIC_URL bulunamadi."

# Adres asla loglanmaz/ekrana yazilmaz: sifre iceriyor.

# --- Sunucu surumunu ogren, pg_dump'i ona gore sec --------------------------
log "Sunucu surumu sorgulaniyor"
SERVER_MAJOR="$(docker run --rm -e C="$DATABASE_PUBLIC_URL" postgres:18-alpine \
  sh -c 'psql "$C" -t -A -c "show server_version_num;"' 2>/dev/null | tr -d '[:space:]' | cut -c1-2)"
[[ "$SERVER_MAJOR" =~ ^[0-9]+$ ]] || die "Sunucu surumu okunamadi (baglanti kurulamadi?)."
IMAGE="postgres:${SERVER_MAJOR}-alpine"
log "Sunucu PostgreSQL ${SERVER_MAJOR}.x -> dokum imaji: $IMAGE"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
OUT="$BACKUP_DIR/veritas-${STAMP}.dump"

# --- Dokum ------------------------------------------------------------------
# -Fc (custom format): sikistirilmis, pg_restore ile secmeli geri yukleme
# yapilabilir ve metin SQL'den cok daha kucuk/hizlidir.
# --no-owner/--no-privileges: geri yukleme farkli bir rol altina yapilabilsin.
log "Dokum aliniyor -> $(basename "$OUT")"
docker run --rm -e C="$DATABASE_PUBLIC_URL" "$IMAGE" \
  sh -c 'pg_dump "$C" -Fc --no-owner --no-privileges' > "$OUT"

[[ -s "$OUT" ]] || { rm -f "$OUT"; die "Dokum bos cikti."; }

# --- Dokumun GERCEKTEN okunabilir oldugunu dogrula -------------------------
# Bos olmayan bir dosya, saglam bir yedek demek DEGILDIR. pg_restore -l
# dokumun icindekiler tablosunu okur; bozuk dosyada basarisiz olur.
log "Dokum dogrulaniyor (pg_restore -l)"
TABLES="$(docker run --rm -i "$IMAGE" pg_restore -l < "$OUT" 2>/dev/null | grep -c 'TABLE DATA' || true)"
[[ "${TABLES:-0}" -gt 0 ]] || { rm -f "$OUT"; die "Dokum okunamadi veya hic tablo verisi yok."; }

SIZE="$(du -h "$OUT" | cut -f1)"
log "TAMAM: $OUT ($SIZE, $TABLES tablo verisi)"

# --- Eski yedekleri at ------------------------------------------------------
COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name 'veritas-*.dump' | wc -l | tr -d ' ')"
if (( COUNT > KEEP )); then
  log "Saklama: $COUNT yedek var, en yeni $KEEP tutulacak"
  find "$BACKUP_DIR" -maxdepth 1 -name 'veritas-*.dump' -print0 \
    | xargs -0 ls -1t | tail -n +$((KEEP + 1)) | while read -r old; do
        log "siliniyor: $(basename "$old")"; rm -f "$old"
      done
fi

log "Yedekleme bitti."
