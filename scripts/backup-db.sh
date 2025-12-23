#!/bin/bash

# ==============================================================================
# Medusa Database Backup Script
# ==============================================================================

# 設定路徑
BACKUP_DIR="/home/raychou/backups"
ENV_FILE="/home/raychou/projects/backend/.env"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/medusa_db_$TIMESTAMP.sql"
LOG_FILE="/home/raychou/scripts/backup.log"

# 確保備份目錄存在
mkdir -p "$BACKUP_DIR"

echo "[$(date +"%Y-%m-%d %H:%M:%S")] Starting database backup..." >> "$LOG_FILE"

# 從 .env 讀取 DATABASE_URL
if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ -z "$DATABASE_URL" ]; then
        echo "[$(date +"%Y-%m-%d %H:%M:%S")] ERROR: DATABASE_URL not found in .env" >> "$LOG_FILE"
        exit 1
    fi
else
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] ERROR: .env file not found" >> "$LOG_FILE"
    exit 1
fi

# 執行備份
# 使用 pg_dump 直接使用 URL 格式
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    # 壓縮檔案以節省空間
    gzip "$BACKUP_FILE"
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] SUCCESS: Backup saved to ${BACKUP_FILE}.gz" >> "$LOG_FILE"
else
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] ERROR: pg_dump failed" >> "$LOG_FILE"
    rm -f "$BACKUP_FILE" # 刪除失敗產生的空檔案
    exit 1
fi

# 刪除超過 7 天的舊備份
find "$BACKUP_DIR" -maxdepth 1 -name "medusa_db_*.sql.gz" -mtime +7 -exec rm {} \;
echo "[$(date +"%Y-%m-%d %H:%M:%S")] Cleaned up old backups." >> "$LOG_FILE"
echo "--------------------------------------------------" >> "$LOG_FILE"
