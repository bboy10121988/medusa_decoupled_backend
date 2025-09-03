0. 技術基線（Tech Baseline）

- Runtime: Node.js >= 20.x（package engines），Yarn 4.x（Berry），TS 5.6
- Framework: Medusa v2（@medusajs/framework 2.9.0, @medusajs/medusa 2.9.0）
- Language: TypeScript（module: Node16, target: ES2021, decorators enabled）
- Package Manager: Yarn 4（packageManager 已鎖定）
- Database: PostgreSQL（Mikro-ORM），`DATABASE_URL` / `DB_NAME` 於 .env
- Cache/Queue: Redis（選用），`REDIS_URL` 於 .env
- Payment: Medusa Payment Module，客製 Provider：`ecpay_credit_card`
  - 入口：`src/modules/ecpayments`
  - Service：`ECPayCreditProviderService` extends `AbstractPaymentProvider`
  - 依 Medusa 規範實作必要方法（initiate/authorize/capture/refund 等）
- Config: 以 `.env` + Medusa `loadEnv` 讀取
  - `medusa-config.ts` 讀取環境後註冊 modules/providers
  - 內部設定工具：`src/internal/config`（barrel），匯出：
    - `getEnvironmentMode(): string`
    - `isEnvironmentMode(mode: string): boolean`
  - 常數集中：`src/constants`（ENV_MODE_LOCALHOST/DEV/PROD）
- Scripts: `yarn dev`（medusa develop）、`yarn start`（medusa start）、`yarn build`（medusa build）
- Tests: Jest + SWC（unit / integration 腳本已配置）

AI 實作時，若需新增套件，先在「任務規劃」中列出並說明用途與替代方案。

⸻

1. 標準專案目錄結構（約定優於配置）

根目錄
├─ `.env` / `.env.template`        # 環境變數與範本
├─ `medusa-config.ts`               # Medusa 應用與模組註冊（包含 Payment Module）
├─ `package.json` / `yarn.lock`     # 套件相依與腳本
├─ `jest.config.js`                 # 測試設定
├─ `instrumentation.ts`             # 觀測/初始化掛載點（如需要）
├─ `integration-tests/`             # 整合測試（如使用）
└─ `README.md`

後端（src）
├─ `src/admin/`                     # 管理後台相關擴充（如有）
├─ `src/api/`                       # API 路由擴充
├─ `src/modules/`                   # 自訂 Medusa 模組
│  └─ `ecpayments/`
│     ├─ `index.ts`                 # Provider 載入/匯出入口
│     └─ `ecpaycreditproviderservice.ts`  # ECPay Provider（extends AbstractPaymentProvider）
├─ `src/internal/`                  # 專案內部工具/設定（不對外暴露）
│  └─ `configs/`
├─ `src/constants/`
├─ `src/jobs/`                      # 週期性工作/排程（如有）
├─ `src/scripts/`                   # 開發/初始化腳本（如 seed）
├─ `src/subscribers/`               # 事件訂閱者（Event Bus）
├─ `src/workflows/`                 # 工作流程/自動化（Workflows）
└─ `src/links/`                     # Linking 設定或跨模組關聯（如有）

命名約定
• 檔案/資料夾：kebab-case（除類別/型別）
• 類別/型別：PascalCase
• 變數/函式：camelCase
• 公用出口：目錄以 `index.ts` 作 barrel 匯出

⸻

2. 開發規範（SOLID 與設計模式）
  •	S (Single Responsibility)：每個模組/類別只關注單一職責；將業務邏輯抽離至可測的服務或用例層。
  •	O (Open/Closed)：對擴充開放、對修改封閉；以策略/裝飾者等模式封裝變動點，避免修改核心。
  •	L (Liskov Substitution)：以抽象介面描述契約；替換不同實作（如 Mock 與 Prod）不破壞呼叫端。
  •	I (Interface Segregation)：拆分細顆粒介面；呼叫端只依賴需要的方法。
  •	D (Dependency Inversion)：高層依賴抽象；以注入方式取代 new 具體類別。

  設計模式優先級與應用清單
  1.	策略（Strategy）：支付流程策略、清單排序/分頁策略、主題切換策略。
  2.	工廠（Factory）：建立客製 Provider/Client、建立服務實例（Dev/Prod/Mock）。
  3.	介面卡（Adapter）：將第三方/SDK DTO 轉為內部模型。
  4.	外觀（Facade）：封裝複雜子系統（例如支付、上傳）給簡單呼叫介面。
  5.	觀察者（Observer）：事件匯流排或模組事件。
  6.	命令（Command）：可撤銷/重作的操作。
  7.	裝飾者（Decorator）：為服務加上快取/重試/追蹤/權限。
  8.	組合（Composite）：巢狀結構（例如選單、段落）。

  備註
  •	AI 在任務規劃時，若存在多個可行模式，需列出選擇原因與放棄理由。

⸻

3. 代碼風格與靜態分析
	•	ESLint 規則：
	•	禁止 any；必須處理 Promise 錯誤；禁止未使用變數；
  • 任何函式、物件與方法都需要寫註解，內容包括但不限於：
      - 用途
      - 參數說明
      - 回傳說明
      - 使用範例
⸻

4. 提交與 PR 樣板

提交訊息（Conventional Commits）

feat(todo): add addTodo usecase
fix(auth): handle token refresh race condition
refactor(user): extract adapter from service
test(cart): add e2e checkout happy path
chore: update eslint and typescript

PR 模板

### 變更類型
- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] test
- [ ] docs
- [ ] chore

### 本次設計說明
- SOLID/設計模式應用：
- 資料流與邊界：
- DI 與替身策略：

### 測試證據
- 單元/元件：覆蓋率  __% （附報告摘要）
- E2E：__ 條通過（截圖/錄影）

### 檔案/結構變更清單
- 新增：
- 修改：
- 移動：

### 回歸風險
- 風險點：
- 緩解方案：


⸻

5. 任務完成自我檢查（1~5點） — 每個任務必填
	•	SOLID 是否落實？（單一職責、抽象依賴、介面分離…）
	•	設計模式 是否合理且必要？（列出採用模式與原因）
	•	目錄結構 是否符合標準？（檔案是否放在正確層）
	•	本清單 是否逐項核對？（附測試報告與型別檢查結果）

⸻

6. AI 執行輸出格式（每次任務回覆請遵循）

# 任務規劃
- 目標：
- SOLID/設計模式選擇：
- 受影響模組：
- 檔案/結構變更：

# 測試（Red）
- 新增測試清單：
- 主要案例（Given/When/Then）：

# 實作（Green）
- 重要決策：

# 重構（Refactor）
- 重構項目與理由：

# 自我檢查（1~5）
- [ ] SOLID 落實
- [ ] 設計模式合理
- [ ] 結構符合
- [ ] TDD 遵循
- [ ] 清單完成

# 證據
- 測試結果摘要：
- 覆蓋率：
- 型別/ESLint：

⸻

7. 風險與原則
	•	簡潔優先：過度工程化會降低速度；只有當變化驅動時才引入模式。
	•	可觀察性：必要時為服務加日誌/埋點（Decorator）。
	•	可替換性：所有對外 I/O 以介面抽象，方便 Mock 與替身。

⸻

8. 變更流程

任何偏離本規範的需求，需在 PR 說明中標註「偏離點與理由」，並新增/更新對應規範段落。
