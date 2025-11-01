/**
 * 簡化版管理員通知測試
 * 直接使用 Resend API 發送測試郵件
 */

// 載入環境變數
require('dotenv').config()

const { Resend } = require('resend')

async function sendTestAdminEmail() {
  console.log('📧 發送管理員訂單通知測試郵件...')
  
  try {
    // 初始化 Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // 管理員郵件地址
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@timsfantasyworld.com'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@timsfantasyworld.com'
    
    console.log(`📬 從: ${fromEmail}`)
    console.log(`📮 到: ${adminEmail}`)
    
    // 測試訂單資料
    const testOrder = {
      id: `test-${Date.now()}`,
      date: new Date().toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      customer: {
        name: '測試客戶',
        email: 'test@example.com'
      },
      items: [
        { title: '測試商品 A', quantity: 2, price: 500, total: 1000 },
        { title: '測試商品 B', quantity: 1, price: 500, total: 500 }
      ],
      total: 1500,
      currency: 'TWD',
      shipping: {
        name: '張三',
        address: '台北市信義區信義路五段 7 號 101 大樓 50 樓',
        city: '台北市',
        postal: '110'
      }
    }
    
    // HTML 郵件內容
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>新訂單通知</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .order-info { background: #fff; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .item { padding: 10px 0; border-bottom: 1px solid #f1f3f4; }
            .total { font-weight: bold; font-size: 18px; color: #28a745; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 新訂單通知</h1>
                <p><strong>這是一封測試郵件</strong></p>
                <p>訂單時間: ${testOrder.date}</p>
            </div>
            
            <div class="order-info">
                <h2>📋 訂單資訊</h2>
                <p><strong>訂單編號:</strong> ${testOrder.id}</p>
                <p><strong>客戶姓名:</strong> ${testOrder.customer.name}</p>
                <p><strong>客戶信箱:</strong> ${testOrder.customer.email}</p>
                
                <h3>🛍️ 商品明細</h3>
                ${testOrder.items.map(item => `
                    <div class="item">
                        <strong>${item.title}</strong><br>
                        數量: ${item.quantity} × ${item.currency || 'TWD'} ${item.price} = <span style="color: #28a745;">${item.currency || 'TWD'} ${item.total}</span>
                    </div>
                `).join('')}
                
                <div style="text-align: right; margin-top: 20px;">
                    <div class="total">訂單總額: ${testOrder.currency} ${testOrder.total}</div>
                </div>
                
                <h3>📦 配送資訊</h3>
                <p><strong>收件人:</strong> ${testOrder.shipping.name}</p>
                <p><strong>地址:</strong> ${testOrder.shipping.address}</p>
                <p><strong>城市:</strong> ${testOrder.shipping.city}</p>
                <p><strong>郵遞區號:</strong> ${testOrder.shipping.postal}</p>
                
                <a href="${process.env.BACKEND_URL || 'http://localhost:9000'}/admin/orders/${testOrder.id}" class="button">
                    🔗 查看訂單詳情
                </a>
            </div>
            
            <div style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
                <p>此郵件由 Tim's Fantasy World 自動發送</p>
                <p>測試時間: ${new Date().toLocaleString('zh-TW')}</p>
            </div>
        </div>
    </body>
    </html>
    `
    
    // 發送郵件
    const result = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `🎉 新訂單通知 #${testOrder.id} (測試郵件)`,
      html: htmlContent,
    })
    
    console.log('✅ 測試郵件發送成功!')
    console.log('📋 郵件詳情:')
    console.log(`   郵件 ID: ${result.data?.id || '未知'}`)
    console.log(`   收件人: ${adminEmail}`)
    console.log(`   主旨: 🎉 新訂單通知 #${testOrder.id} (測試郵件)`)
    console.log(`   訂單編號: ${testOrder.id}`)
    console.log(`   總金額: ${testOrder.currency} ${testOrder.total}`)
    console.log('\n📬 請檢查您的信箱 (包含垃圾郵件資料夾)')
    
  } catch (error) {
    console.error('❌ 發送失敗:', error.message)
    if (error.message.includes('API key')) {
      console.error('💡 請檢查 RESEND_API_KEY 是否正確設定')
    }
  }
}

// 執行測試
sendTestAdminEmail()