const { DataSource } = require("typeorm")

async function checkProviderIdentity() {
  console.log("🔍 開始檢查 provider_identity 表...")
  
  try {
    // 使用環境變數或預設值連接數據庫
    const dataSource = new DataSource({
      type: "postgres",
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
      database: process.env.POSTGRES_DB || "medusa-store",
      logging: false
    })
    
    await dataSource.initialize()
    console.log("✅ 數據庫連接成功")
    
    // 查看 provider_identity 表的數據
    const providerIdentities = await dataSource.query(`
      SELECT * FROM provider_identity 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
    
    console.log("\n🔍 Provider Identity 記錄 (最新10條):")
    console.log(JSON.stringify(providerIdentities, null, 2))
    
    // 查看表結構
    const tableInfo = await dataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'provider_identity'
      ORDER BY ordinal_position
    `)
    
    console.log("\n📋 Provider Identity 表結構:")
    console.log(JSON.stringify(tableInfo, null, 2))
    
    // 查看與 customer 的關聯
    const customerIdentities = await dataSource.query(`
      SELECT 
        pi.*,
        c.email as customer_email,
        c.first_name,
        c.last_name,
        c.created_at as customer_created_at
      FROM provider_identity pi
      LEFT JOIN customer c ON pi.customer_id = c.id
      WHERE pi.provider = 'google'
      ORDER BY pi.created_at DESC
      LIMIT 5
    `)
    
    console.log("\n👤 Customer 與 Google Identity 關聯:")
    console.log(JSON.stringify(customerIdentities, null, 2))
    
    // 檢查最近的Google認證記錄
    const recentGoogle = await dataSource.query(`
      SELECT 
        pi.id,
        pi.provider,
        pi.provider_user_id,
        pi.user_metadata,
        pi.created_at,
        c.email,
        c.id as customer_id
      FROM provider_identity pi
      LEFT JOIN customer c ON pi.customer_id = c.id
      WHERE pi.provider = 'google'
      ORDER BY pi.created_at DESC
      LIMIT 3
    `)
    
    console.log("\n🕐 最近的 Google 認證記錄:")
    recentGoogle.forEach((record, index) => {
      console.log(`\n記錄 ${index + 1}:`)
      console.log(`- ID: ${record.id}`)
      console.log(`- Provider User ID: ${record.provider_user_id}`)
      console.log(`- Customer ID: ${record.customer_id}`)
      console.log(`- Customer Email: ${record.email}`)
      console.log(`- Created At: ${record.created_at}`)
      console.log(`- User Metadata:`, JSON.stringify(record.user_metadata, null, 2))
    })
    
    await dataSource.destroy()
    console.log("\n✅ 檢查完成")
    
  } catch (error) {
    console.error("❌ 檢查失敗:", error.message)
    if (error.code === 'ECONNREFUSED') {
      console.log("💡 請確保 PostgreSQL 數據庫正在運行")
    }
  }
}

checkProviderIdentity()