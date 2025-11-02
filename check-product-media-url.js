const { Client } = require('pg');
require('dotenv').config();

async function checkMediaUrls() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('✅ 資料庫連接成功\n');

  // 查詢最近的產品媒體
  const mediaQuery = `
    SELECT 
      id,
      url,
      created_at,
      updated_at
    FROM file
    WHERE url LIKE '%1762064%' OR url LIKE '%1762065%'
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const result = await client.query(mediaQuery);
  
  console.log('📋 最近上傳的檔案 URL:');
  result.rows.forEach(row => {
    console.log(`ID: ${row.id}`);
    console.log(`URL: ${row.url}`);
    console.log(`Created: ${row.created_at}`);
    console.log('---');
  });

  await client.end();
}

checkMediaUrls().catch(err => {
  console.error('❌ 錯誤:', err);
  process.exit(1);
});
