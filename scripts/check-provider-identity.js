const { medusaIntegrationTestRunner } = require("medusa-test-utils")

medusaIntegrationTestRunner({
  testSuite: () => {
    describe("Check Provider Identity", () => {
      it("should show provider_identity table data", async () => {
        const container = getContainer()
        const manager = container.resolve("manager")
        
        // 查看 provider_identity 表的數據
        const providerIdentities = await manager.query(`
          SELECT * FROM provider_identity 
          ORDER BY created_at DESC 
          LIMIT 10
        `)
        
        console.log("🔍 Provider Identity 記錄:")
        console.log(JSON.stringify(providerIdentities, null, 2))
        
        // 查看表結構
        const tableInfo = await manager.query(`
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'provider_identity'
          ORDER BY ordinal_position
        `)
        
        console.log("\n📋 Provider Identity 表結構:")
        console.log(JSON.stringify(tableInfo, null, 2))
        
        // 查看與 customer 的關聯
        const customerIdentities = await manager.query(`
          SELECT 
            pi.*,
            c.email as customer_email,
            c.first_name,
            c.last_name
          FROM provider_identity pi
          LEFT JOIN customer c ON pi.customer_id = c.id
          WHERE pi.provider = 'google'
          ORDER BY pi.created_at DESC
          LIMIT 5
        `)
        
        console.log("\n👤 Customer 與 Google Identity 關聯:")
        console.log(JSON.stringify(customerIdentities, null, 2))
      })
    })
  }
})