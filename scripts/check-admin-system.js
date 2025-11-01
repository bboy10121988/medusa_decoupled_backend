#!/usr/bin/env node

/**
 * Admin 登入系統狀態檢查腳本
 * 檢查當前 Medusa Admin 系統的配置完整性
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Medusa Admin 登入系統檢查');
console.log('================================\n');

// 檢查配置檔案
function checkConfigFiles() {
  console.log('📄 檢查配置檔案...');
  
  const files = [
    'medusa-config.ts',
    '.env.vm',
    'package.json'
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
    }
  });
  
  console.log('');
}

// 檢查認證配置
function checkAuthConfig() {
  console.log('🔐 檢查認證配置...');
  
  try {
    const configContent = fs.readFileSync('medusa-config.ts', 'utf8');
    
    const checks = [
      { pattern: /@medusajs\/auth-emailpass/, name: 'Email/Password 認證' },
      { pattern: /authMethodsPerActor/, name: '認證方法配置' },
      { pattern: /user.*emailpass/, name: '管理員認證配置' },
      { pattern: /jwtSecret/, name: 'JWT 密鑰' },
      { pattern: /cookieSecret/, name: 'Cookie 密鑰' },
      { pattern: /redisUrl/, name: 'Redis 配置' }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(configContent)) {
        console.log(`✅ ${check.name} 已配置`);
      } else {
        console.log(`❌ ${check.name} 未配置`);
      }
    });
    
  } catch (error) {
    console.log('❌ 無法讀取 medusa-config.ts');
  }
  
  console.log('');
}

// 檢查環境變數
function checkEnvVars() {
  console.log('🌍 檢查環境變數...');
  
  const envFile = fs.existsSync('.env') ? '.env' : '.env.vm';
  
  if (!fs.existsSync(envFile)) {
    console.log('❌ 找不到環境變數檔案');
    return;
  }
  
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL', 
      'JWT_SECRET',
      'COOKIE_SECRET',
      'ADMIN_CORS'
    ];
    
    requiredVars.forEach(varName => {
      const pattern = new RegExp(`^${varName}=.+`, 'm');
      if (pattern.test(envContent)) {
        console.log(`✅ ${varName} 已設定`);
      } else {
        console.log(`❌ ${varName} 未設定`);
      }
    });
    
  } catch (error) {
    console.log('❌ 無法讀取環境變數檔案');
  }
  
  console.log('');
}

// 檢查依賴套件
function checkDependencies() {
  console.log('📦 檢查依賴套件...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      '@medusajs/framework',
      '@medusajs/auth-emailpass',
      '@medusajs/cache-redis'
    ];
    
    requiredDeps.forEach(dep => {
      if (deps[dep]) {
        console.log(`✅ ${dep} v${deps[dep]}`);
      } else {
        console.log(`❌ ${dep} 未安裝`);
      }
    });
    
  } catch (error) {
    console.log('❌ 無法讀取 package.json');
  }
  
  console.log('');
}

// 檢查 API 路由
function checkApiRoutes() {
  console.log('🛣️  檢查 API 路由...');
  
  const apiDir = 'src/api/admin';
  
  if (fs.existsSync(apiDir)) {
    console.log(`✅ Admin API 目錄存在: ${apiDir}`);
    
    try {
      const files = fs.readdirSync(apiDir, { recursive: true });
      const routeFiles = files.filter(file => file.endsWith('route.ts'));
      console.log(`📁 找到 ${routeFiles.length} 個 Admin API 路由檔案`);
    } catch (error) {
      console.log('⚠️  無法讀取 API 目錄內容');
    }
  } else {
    console.log(`❌ Admin API 目錄不存在: ${apiDir}`);
  }
  
  console.log('');
}

// 主要檢查函數
function runChecks() {
  checkConfigFiles();
  checkAuthConfig();
  checkEnvVars();
  checkDependencies();
  checkApiRoutes();
  
  console.log('🎯 總結建議:');
  console.log('1. 如果所有檢查都通過，系統配置完整');
  console.log('2. 需要確保資料庫遷移已執行: npm run db:migrate');
  console.log('3. 需要創建第一個管理員用戶: npx medusa user');
  console.log('4. 啟動服務並測試登入功能');
  console.log('');
  console.log('📚 相關命令:');
  console.log('   資料庫設置: npx medusa db:setup');
  console.log('   創建用戶: npx medusa user --email admin@example.com --password password');
  console.log('   啟動開發: yarn dev');
  console.log('   啟動生產: pm2 start ecosystem.config.js');
}

// 執行檢查
runChecks();