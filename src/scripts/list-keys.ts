import { ExecArgs } from '@medusajs/framework/types'

const listKeys = async function ({ container }: ExecArgs) {
  try {
    // 嘗試直接查詢資料庫
    const dbManager = container.resolve('dbManager') as { getClient: () => any }
    const dbClient = dbManager.getClient()
    const result = await dbClient.query('SELECT * FROM publishable_api_key')
    console.log('Database publishable keys:', result.rows)
    
    if (result.rows.length === 0) {
      // 如果沒有 key，創建一個
      const insertResult = await dbClient.query(
        'INSERT INTO publishable_api_key (id, title, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING *',
        ['pk_' + Math.random().toString(36).substr(2, 48), 'Default Store Key', new Date(), new Date()]
      )
      console.log('Created new key:', insertResult.rows[0])
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

export default listKeys
