/**
 * Currency Exchange Service
 * 
 * Provides real-time exchange rate conversion for multi-currency support.
 * Primarily used to convert JPY/USD to TWD for ECPay payment processing.
 * 
 * Primary API: Frankfurter (https://www.frankfurter.app/)
 * - ✅ Completely FREE - No API key required
 * - ✅ Uses European Central Bank (ECB) rates
 * - ✅ No request limits
 * - ⚠️ Note: ECB doesn't include TWD directly, so we use USD as intermediary
 * 
 * Alternative (if you want more currencies):
 * - ExchangeRate-API: Free tier 1,500 req/month, includes TWD
 */

// Cache exchange rates to reduce API calls
interface ExchangeRateCache {
    rates: Record<string, number>
    timestamp: number
    baseCurrency: string
}

let rateCache: ExchangeRateCache | null = null
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour cache

/**
 * Supported currencies for conversion
 */
export const SUPPORTED_CURRENCIES = ['TWD', 'JPY', 'USD', 'MYR'] as const
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

/**
 * Fallback exchange rates (used when API is unavailable)
 * Based on approximate rates as of 2026-01-18
 * These should be manually updated periodically as a safety net
 */
const FALLBACK_RATES_TO_TWD: Record<string, number> = {
    TWD: 1,
    JPY: 0.21,    // 1 JPY ≈ 0.21 TWD
    USD: 32.5,    // 1 USD ≈ 32.5 TWD
    MYR: 7.3,     // 1 MYR ≈ 7.3 TWD
}

/**
 * Fetch latest exchange rates from Frankfurter API (FREE, no API key)
 * Since ECB doesn't have TWD, we fetch USD-based rates and convert
 */
async function fetchFromFrankfurter(): Promise<Record<string, number>> {
    try {
        // Frankfurter API - completely free, uses ECB data
        // ECB doesn't have TWD, so we use USD as base
        const response = await fetch(
            'https://api.frankfurter.app/latest?from=USD' // Fetch USD to all available currencies
        )

        if (!response.ok) {
            throw new Error(`Frankfurter API returned ${response.status}`)
        }

        const data = await response.json()
        console.log('[Exchange] Frankfurter rates (USD base):', data.rates)

        // Convert to TWD-based rates using our known USD-TWD rate
        // We use a fixed approximate USD-TWD rate since ECB doesn't have TWD
        const usdToTwd = FALLBACK_RATES_TO_TWD.USD

        const rates: Record<string, number> = {
            TWD: 1,
            USD: usdToTwd, // 1 USD = usdToTwd TWD
        }

        for (const currency of SUPPORTED_CURRENCIES) {
            if (currency === 'TWD' || currency === 'USD') continue
            if (data.rates[currency]) {
                // Frankfurter gives 1 USD = X currency. We want 1 currency = Y TWD
                // 1 USD = X currency => 1 currency = 1/X USD
                // 1 currency = (1/X) * usdToTwd TWD
                rates[currency] = (1 / data.rates[currency]) * usdToTwd
            }
        }

        console.log('[Exchange] Converted to TWD-based rates:', rates)
        return rates
    } catch (error) {
        console.error('[Exchange] Frankfurter API failed:', error)
        throw error
    }
}

/**
 * Fetch from ExchangeRate-API if API key is configured (includes TWD directly)
 */
async function fetchFromExchangeRateAPI(): Promise<Record<string, number>> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    if (!apiKey) {
        throw new Error('No EXCHANGE_RATE_API_KEY configured')
    }

    const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/TWD`
    )

    if (!response.ok) {
        throw new Error(`ExchangeRate-API returned ${response.status}`)
    }

    const data = await response.json()
    if (data.result !== 'success') {
        throw new Error(data['error-type'] || 'Unknown API error')
    }

    // ExchangeRate-API gives 1 TWD = X currency. We want 1 currency = Y TWD
    const rates: Record<string, number> = { TWD: 1 }
    for (const currency of SUPPORTED_CURRENCIES) {
        if (currency === 'TWD') continue
        if (data.conversion_rates[currency]) {
            rates[currency] = 1 / (data.conversion_rates[currency] as number) // Invert: TWD→X becomes X→TWD
        }
    }

    return rates
}

/**
 * Fetch latest exchange rates from available APIs
 * Prioritizes Frankfurter, then ExchangeRate-API, then fallback rates.
 */
async function fetchExchangeRates(): Promise<ExchangeRateCache> {
    let rates: Record<string, number> = FALLBACK_RATES_TO_TWD
    let source = 'Fallback'

    try {
        rates = await fetchFromFrankfurter()
        source = 'Frankfurter'
    } catch (frankfurterError) {
        console.warn('[Exchange] Frankfurter API failed, trying ExchangeRate-API if key exists:', frankfurterError)
        const apiKey = process.env.EXCHANGE_RATE_API_KEY
        if (apiKey) {
            try {
                rates = await fetchFromExchangeRateAPI()
                source = 'ExchangeRate-API'
            } catch (exchangeRateAPIError) {
                console.error('[Exchange] ExchangeRate-API also failed:', exchangeRateAPIError)
                console.warn('[Exchange] Using fallback rates')
            }
        } else {
            console.warn('[Exchange] No EXCHANGE_RATE_API_KEY configured, using fallback rates')
        }
    }

    console.log(`[Exchange] Fetched rates from ${source}:`, rates)

    return {
        rates,
        timestamp: Date.now(),
        baseCurrency: 'TWD'
    }
}

/**
 * Get current exchange rates (cached)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
    const now = Date.now()

    // Return cached rates if still valid
    if (rateCache && (now - rateCache.timestamp) < CACHE_DURATION_MS) {
        return rateCache.rates
    }

    // Fetch fresh rates
    rateCache = await fetchExchangeRates()
    return rateCache.rates
}

/**
 * Convert amount from one currency to another
 * 
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code (e.g., 'JPY', 'USD')
 * @param toCurrency - Target currency code (default: 'TWD' for ECPay)
 * @returns Converted amount
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency = 'TWD'
): Promise<number> {
    if (fromCurrency === toCurrency) {
        return amount
    }

    const rates = await getExchangeRates()

    // Rates are based on TWD, so:
    // - To convert FROM TWD: multiply by rate
    // - To convert TO TWD: divide by rate

    if (fromCurrency === 'TWD') {
        // TWD → Other currency
        const rate = rates[toCurrency]
        if (!rate) {
            console.warn(`[Exchange] Unknown currency: ${toCurrency}, returning original amount`)
            return amount
        }
        return Math.round(amount * rate * 100) / 100
    }

    if (toCurrency === 'TWD') {
        // Other currency → TWD
        const rate = rates[fromCurrency]
        if (!rate) {
            console.warn(`[Exchange] Unknown currency: ${fromCurrency}, returning original amount`)
            return amount
        }
        // Since rates are TWD→X, we need to do X→TWD = amount / rate
        return Math.round((amount / rate) * 100) / 100
    }

    // Cross-conversion: Other → TWD → Other
    const fromRate = rates[fromCurrency]
    const toRate = rates[toCurrency]

    if (!fromRate || !toRate) {
        console.warn(`[Exchange] Missing rate for cross-conversion: ${fromCurrency}→${toCurrency}`)
        return amount
    }

    const twdAmount = amount / fromRate
    return Math.round(twdAmount * toRate * 100) / 100
}

/**
 * Convert cart total for ECPay submission (always to TWD)
 * Rounds to integer as ECPay only accepts whole numbers
 * 
 * @param amount - Amount in original currency
 * @param currency - Original currency code
 * @returns Amount in TWD (integer)
 */
export async function convertToTWDForECPay(
    amount: number,
    currency: SupportedCurrency
): Promise<number> {
    const twdAmount = await convertCurrency(amount, currency, 'TWD')
    // ECPay only accepts integer amounts
    return Math.ceil(twdAmount)
}

/**
 * Get exchange rate info for display purposes
 * 
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency (default: TWD)
 * @returns Exchange rate and formatted display string
 */
export async function getExchangeRateInfo(
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency = 'TWD'
): Promise<{
    rate: number
    displayText: string
    lastUpdated: Date
}> {
    const rates = await getExchangeRates()

    let rate: number
    if (fromCurrency === 'TWD') {
        rate = rates[toCurrency] || 1
    } else if (toCurrency === 'TWD') {
        rate = 1 / (rates[fromCurrency] || 1)
    } else {
        // Cross rate
        rate = (rates[toCurrency] || 1) / (rates[fromCurrency] || 1)
    }

    return {
        rate,
        displayText: `1 ${fromCurrency} ≈ ${rate.toFixed(2)} ${toCurrency}`,
        lastUpdated: new Date(rateCache?.timestamp || Date.now())
    }
}

/**
 * Format amount with currency symbol
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted string (e.g., "¥5,000", "$35", "NT$1,050")
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
    const symbols: Record<SupportedCurrency, string> = {
        TWD: 'NT$',
        JPY: '¥',
        USD: '$',
        MYR: 'RM',
    }

    const symbol = symbols[currency] || currency
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount)

    return `${symbol}${formatted}`
}
