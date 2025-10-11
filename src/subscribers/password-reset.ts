import { sendPasswordResetEmail } from '../utils/email'

export default async function resetPasswordTokenHandler({
  event: { data: {
    entity_id: email,
    token,
    actor_type,
  } },
  container,
}) {
  console.log(`\n🔐 ===== 密碼重置請求 =====`)
  console.log(`📧 電子郵件: ${email}`)
  console.log(`👤 用户類型: ${actor_type}`)
  console.log(`🔑 重置 Token: ${token}`)
  
  // 注意：這個事件只有在用戶存在時才會被觸發
  console.log(`✅ 用戶驗證：該電子郵件地址已在系統中註冊`)
  
  let resetUrl = ""
  
  if (actor_type === "customer") {
    // 客戶重置密碼 URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    resetUrl = `${frontendUrl}/tw/account?token=${token}&email=${encodeURIComponent(email)}`
  } else {
    // 管理員重置密碼 URL
    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    resetUrl = `${backendUrl}/app/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  }
  
  console.log(`� 重置密碼連結: ${resetUrl}`)
  console.log(`\n📝 請複製上述連結並發送給用戶，或在測試時直接使用該連結。`)
  console.log(`⏰ 該連結包含安全 token，請妥善保管。`)
  console.log(`===========================\n`)

  // 發送郵件（開發模式會在控制台顯示，生產模式會發送真實郵件）
  try {
    const result = await sendPasswordResetEmail(email, resetUrl)
    if (result.success) {
      console.log(`✅ 密碼重置郵件處理完成 (模式: ${result.mode})`)
    }
  } catch (error) {
    console.log(`❌ 發送郵件時發生錯誤:`, error.message || error)
    // 即使郵件發送失敗，也要顯示重置連結作為備份
    console.log(`🔗 備份重置連結: ${resetUrl}`)
  }
}

export const config = {
  event: "auth.password_reset",
}