// 測試事件系統的腳本
console.log("🔍 檢查 Medusa 事件系統...")

// 檢查訂閱者是否被正確載入
const path = require('path')
const fs = require('fs')

const subscribersPath = path.join(__dirname, 'src/subscribers')

console.log("📂 檢查 subscribers 資料夾:")
console.log("路徑:", subscribersPath)

if (fs.existsSync(subscribersPath)) {
  const files = fs.readdirSync(subscribersPath)
  console.log("✅ 找到的訂閱者檔案:")
  files.forEach(file => {
    console.log(`   - ${file}`)
  })
} else {
  console.log("❌ subscribers 資料夾不存在")
}

// 檢查密碼重設訂閱者
const passwordResetPath = path.join(subscribersPath, 'password-reset.ts')
if (fs.existsSync(passwordResetPath)) {
  console.log("✅ password-reset.ts 存在")
  
  // 讀取檔案內容並檢查事件配置
  const content = fs.readFileSync(passwordResetPath, 'utf8')
  
  if (content.includes('auth.password_reset')) {
    console.log("✅ 事件名稱 'auth.password_reset' 已配置")
  } else {
    console.log("❌ 未找到事件名稱 'auth.password_reset'")
  }
  
  if (content.includes('export const config')) {
    console.log("✅ 導出配置已設定")
  } else {
    console.log("❌ 未找到導出配置")
  }
} else {
  console.log("❌ password-reset.ts 不存在")
}

console.log("\n🧪 測試完成")