/**
 * 環境模式常數
 *
 * - 用途：集中管理 ENVIRONMENT_MODE 可用值，避免魔法字串散落各處。
 * - 匯出：以 named export 匯出，import 目錄即可使用（index.ts）。
 */
export const ENV_MODE_LOCALHOST = "localhost"
export const ENV_MODE_DEV = "dev"
export const ENV_MODE_PROD = "prod"

export default {
  ENV_MODE_LOCALHOST,
  ENV_MODE_DEV,
  ENV_MODE_PROD,
}

