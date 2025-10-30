#!/bin/bash

# 全面修復VM問題
echo "🔧 開始全面修復VM配置問題..."

# 1. 修復nginx配置 - 增加檔案上傳大小限制
echo "📝 修復nginx配置..."
sudo tee /etc/nginx/sites-available/admin-timsfantasyworld > /dev/null << 'EOF'
server {
    if ($host = admin.timsfantasyworld.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name admin.timsfantasyworld.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.timsfantasyworld.com;
    
    ssl_certificate /etc/letsencrypt/live/admin.timsfantasyworld.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/admin.timsfantasyworld.com/privkey.pem; # managed by Certbot
    
    # 設定檔案上傳大小限制 (50MB)
    client_max_body_size 50M;
    
    # 根路徑重定向到 /app
    location = / {
        return 301 https://$server_name/app;
    }

    # Admin 應用程式
    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 增加超時時間
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 增加緩衝區大小以處理大檔案上傳
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
EOF

# 2. 重新載入nginx配置
echo "🔄 重新載入nginx配置..."
sudo nginx -t && sudo systemctl reload nginx

# 3. 檢查並修復medusa-config.ts中的CORS設定
echo "📝 檢查medusa-config.ts..."
cd /home/raychou/medusa-backend

# 備份原始檔案
cp medusa-config.ts medusa-config.ts.backup.$(date +%Y%m%d_%H%M%S)

# 創建修復版本的medusa-config.ts
cat > medusa-config.ts << 'EOF'
import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"
import path from "path"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,https://timsfantasyworld.com,https://www.timsfantasyworld.com",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:9000,https://admin.timsfantasyworld.com",
      authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:9000,https://admin.timsfantasyworld.com",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    backendUrl: process.env.BACKEND_URL || "https://admin.timsfantasyworld.com",
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: [
    {
      key: Modules.FILE,
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local-next",
            id: "local",
            options: {
              backend_url: process.env.BACKEND_URL || "https://admin.timsfantasyworld.com",
              upload_dir: "static/uploads",
            },
          },
        ],
      },
    },
    {
      key: Modules.NOTIFICATION,
      resolve: "@medusajs/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/notification-sendgrid",
            id: "sendgrid",
            options: {
              api_key: process.env.SENDGRID_API_KEY,
              from: process.env.SENDGRID_FROM,
            },
          },
        ],
      },
    },
    "./src/modules/manual-payment",
    "./src/modules/ecpayments", 
    "./src/modules/resend-notification",
  ],
})
EOF

# 4. 檢查package.json中是否有正確的檔案上傳相關依賴
echo "📦 檢查package.json..."
npm list formidable || npm install formidable@latest
npm list multer || npm install multer@latest

# 5. 確保static目錄權限正確
echo "📁 檢查static目錄權限..."
mkdir -p static/uploads
chmod 755 static
chmod 755 static/uploads
chown -R raychou:raychou static

# 6. 重新啟動services
echo "🔄 重新啟動medusa服務..."
pm2 restart medusa-backend --update-env
sleep 5

# 7. 測試各種endpoint
echo "🧪 測試服務..."
echo "測試backend健康檢查:"
curl -s -o /dev/null -w "%{http_code}" https://admin.timsfantasyworld.com/health

echo ""
echo "測試static檔案服務:"
curl -s -o /dev/null -w "%{http_code}" https://admin.timsfantasyworld.com/static/

echo ""
echo "檢查PM2狀態:"
pm2 list

echo ""
echo "檢查環境變數:"
pm2 show medusa-backend | grep -A 10 "environment"

echo ""
echo "✅ 修復完成！"
echo "🔗 請測試: https://admin.timsfantasyworld.com"
EOF