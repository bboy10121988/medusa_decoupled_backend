const { MedusaApp } = require("@medusajs/medusa")

async function main() {
  const app = await MedusaApp({
    directory: process.cwd(),
  })

  try {
    console.log("🔍 檢查產品圖片 URL 記錄...")
    
    // 查詢最近的產品和圖片
    const query = `
      SELECT 
        p.id as product_id,
        p.title,
        pi.id as image_id,
        pi.url,
        pi.created_at
      FROM product p 
      LEFT JOIN product_images pi ON p.id = pi.product_id 
      WHERE pi.url IS NOT NULL 
      ORDER BY pi.created_at DESC 
      LIMIT 10
    `
    
    const result = await app.query(query)
    
    console.log("\n📋 最近的產品圖片 URL:")
    result.forEach(row => {
      console.log(`產品: ${row.title}`)
      console.log(`圖片 URL: ${row.url}`)
      console.log(`創建時間: ${row.created_at}`)
      console.log("---")
    })

    // 檢查是否有錯誤的 URL 格式
    const badUrls = result.filter(row => 
      row.url && !row.url.startsWith('/static/uploads/') && !row.url.startsWith('http')
    )
    
    if (badUrls.length > 0) {
      console.log("\n⚠️  發現錯誤的 URL 格式:")
      badUrls.forEach(row => {
        console.log(`${row.url} (產品: ${row.title})`)
      })
    }

  } catch (error) {
    console.error("❌ 錯誤:", error.message)
  } finally {
    await app.close()
  }
}

main().catch(console.error)