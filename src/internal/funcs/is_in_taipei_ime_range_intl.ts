/**
 * 判斷當前時間是否在台北時區 20:15 - 20:30 之間
 * @param targetDate 要檢查的日期時間，如果不提供則使用當前時間
 * @returns boolean - 如果在指定時間範圍內回傳 true，否則回傳 false
 */
export function isInTaipeiTimeRange(targetDate?: Date): boolean {
  const dateToCheck = targetDate || new Date();
  
  // 將時間轉換為台北時區 (UTC+8)
  const taipeiTime = new Date(dateToCheck.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  
  const hours = taipeiTime.getHours();
  const minutes = taipeiTime.getMinutes();
  
  // 檢查是否在 20:15 - 20:30 之間
  const startTime = 20 * 60 + 15; // 20:15 轉換為分鐘
  const endTime = 20 * 60 + 30;   // 20:30 轉換為分鐘
  const currentTimeInMinutes = hours * 60 + minutes;
  
  return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
}

/**
 * 更詳細的版本，可以指定任意時間範圍
 * @param startHour 開始小時 (0-23)
 * @param startMinute 開始分鐘 (0-59)
 * @param endHour 結束小時 (0-23)
 * @param endMinute 結束分鐘 (0-59)
 * @param targetDate 要檢查的日期時間，如果不提供則使用當前時間
 * @returns boolean
 */
export function isInTaipeiTimeRangeCustom(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  targetDate?: Date
): boolean {
  const dateToCheck = targetDate || new Date();
  
  // 將時間轉換為台北時區 (UTC+8)
  const taipeiTime = new Date(dateToCheck.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  
  const hours = taipeiTime.getHours();
  const minutes = taipeiTime.getMinutes();
  
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  const currentTimeInMinutes = hours * 60 + minutes;
  
  // 處理跨日情況 (例如 23:00 - 01:00)
  if (endTimeInMinutes < startTimeInMinutes) {
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
  }
  
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
}

/**
 * 使用 Intl.DateTimeFormat 的更精確版本
 * @param targetDate 要檢查的日期時間
 * @returns boolean
 */
export function isInTaipeiTimeRangeIntl(targetDate?: Date): boolean {
  const dateToCheck = targetDate || new Date();
  
  // 使用 Intl.DateTimeFormat 獲取台北時間
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(dateToCheck);
  const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
  
  const currentTimeInMinutes = hour * 60 + minute;
  const startTime = 20 * 60 + 15; // 20:15
  const endTime = 20 * 60 + 30;   // 20:30
  
  return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
}