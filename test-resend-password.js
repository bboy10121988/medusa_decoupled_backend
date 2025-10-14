// 測試 Resend API
const { Resend } = require('resend');

const resend = new Resend('re_cX7UFw7m_7bMvJqiExKim8MwTdNDzCR4G');

async function testResend() {
  try {
    console.log('🧪 測試 Resend 密碼重設郵件...');
    
    const resetUrl = 'https://timsfantasyworld.com/auth/reset-password?token=test123';
    
    const { data, error } = await resend.emails.send({
      from: 'noreply@timsfantasyworld.com',
      to: ['bboy10121988@gmail.com'],
      subject: '密碼重設 - Tim\'s Fantasy World',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">密碼重設請求</h2>
          <p>您好，</p>
          <p>我們收到了您的密碼重設請求。請點擊下方按鈕來重設您的密碼：</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">重設密碼</a>
          </p>
          <p>如果按鈕無法點擊，請複製以下連結到瀏覽器：</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            如果您沒有請求密碼重設，請忽略此郵件。<br>
            此連結將在 24 小時後失效。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            此郵件由 Tim's Fantasy World 系統自動發送，請勿回覆。
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ 郵件發送失敗:', error);
      return false;
    }

    console.log('✅ 測試郵件發送成功！');
    console.log('📧 郵件 ID:', data.id);
    console.log('🎯 收件者: bboy10121988@gmail.com');
    
    return true;
  } catch (error) {
    console.error('❌ Resend API 測試失敗:', error);
    return false;
  }
}

testResend().then(success => {
  if (success) {
    console.log('🎉 Resend API 測試完成！請檢查您的 Gmail 收件箱。');
  } else {
    console.log('💥 測試失敗，請檢查配置。');
  }
});