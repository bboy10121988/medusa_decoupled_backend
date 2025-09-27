const { initializeContainer } = require("@medusajs/framework");

async function checkInventory() {
  try {
    const container = initializeContainer();
    const inventoryService = container.resolve("inventoryService");
    
    console.log("=== 查找 SKU: SHIRT-S-BLACK ===");
    
    // 查找庫存項目
    const inventory = await inventoryService.listInventoryItems({
      sku: "SHIRT-S-BLACK"
    });
    
    console.log("庫存項目數量:", inventory.length);
    
    if (inventory.length > 0) {
      const item = inventory[0];
      console.log("\n=== 庫存項目詳情 ===");
      console.log("ID:", item.id);
      console.log("SKU:", item.sku);
      console.log("標題:", item.title);
      
      // 查看預留詳情
      console.log("\n=== 查詢預留詳情 ===");
      const reservations = await inventoryService.listReservationItems({
        inventory_item_id: item.id
      });
      
      console.log("預留數量:", reservations.length);
      
      if (reservations.length > 0) {
        reservations.forEach((res, index) => {
          console.log(`\n--- 預留 ${index + 1} ---`);
          console.log("預留ID:", res.id);
          console.log("數量:", res.quantity);
          console.log("描述:", res.description);
          console.log("創建時間:", res.created_at);
          console.log("元數據:", JSON.stringify(res.metadata, null, 2));
        });
      } else {
        console.log("沒有找到預留記錄！");
      }
      
      // 查看庫存級別
      console.log("\n=== 庫存級別 ===");
      const levels = await inventoryService.listInventoryLevels({
        inventory_item_id: item.id
      });
      
      levels.forEach((level, index) => {
        console.log(`\n--- 庫存級別 ${index + 1} ---`);
        console.log("位置ID:", level.location_id);
        console.log("庫存數量:", level.stocked_quantity);
        console.log("預留數量:", level.reserved_quantity);
        console.log("可用數量:", level.available_quantity);
      });
      
    } else {
      console.log("未找到 SKU: SHIRT-S-BLACK 的庫存項目");
    }
    
  } catch (error) {
    console.error("錯誤:", error);
  }
  
  process.exit(0);
}

checkInventory();
