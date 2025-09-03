import * as constants from "../constants"

/**
 * getEnvironmentMode
 *
 * - 方法用途：讀取 `.env` 檔中的 `ENVIRONMENT_MODE`，回傳目前執行環境模式字串。
 * - 參數說明：無。
 * - 回傳值說明：若環境變數存在則回傳其字串值，否則回傳空字串。
 */
function getEnvironmentMode(): string {
  return process.env.ENVIRONMENT_MODE ?? constants.ENV_MODE_LOCALHOST
}

/**
 * isEnvironmentMode
 *
 * - 方法用途：檢查目前的 `ENVIRONMENT_MODE` 是否等於指定值。
 * - 參數說明：
 *   - `mode`: 要比對的模式字串（例如："localhost"、"dev"、"prod"）。
 * - 回傳值說明：
 *   - 若目前環境模式等於 `mode` 回傳 `true`，否則回傳 `false`。
 */
function isEnvironmentMode(mode: string): boolean {
  return getEnvironmentMode() === mode
}

/**
 * isEnvironmentModeProd
 *
 * - 方法用途：檢查目前的 `ENVIRONMENT_MODE` 是否為生產環境模式。
 * - 參數說明：無。
 * - 回傳值說明：
 *   - 若目前環境模式為生產環境回傳 `true`，否則回傳 `false`。
 */
function isEnvironmentModeProd(): boolean {
  return isEnvironmentMode(constants.ENV_MODE_PROD)
}

// 統一於此處輸出所有函式（包含預設匯出）
export { getEnvironmentMode, isEnvironmentMode, isEnvironmentModeProd }
