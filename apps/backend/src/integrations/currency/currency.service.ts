import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EXCHANGE_RATES } from '@smartpos/utils';

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
  source: 'api' | 'cache' | 'fallback';
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly cacheTTL = 3600;
  private readonly cacheKey = 'exchange_rates';

  private readonly defaultRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    SAR: 3.75,
    AED: 3.67,
    KWD: 0.31,
    QAR: 3.64,
    BHD: 0.38,
    OMR: 0.38,
    EGP: 30.90,
    CNY: 7.24,
    INR: 83.12,
    PKR: 278.50,
    TRY: 30.25,
    RUB: 91.50,
    CAD: 1.35,
    AUD: 1.52,
    CHF: 0.88,
    SGD: 1.34,
    MYR: 4.72,
    IDR: 15650,
    PHP: 56.20,
    KRW: 1320,
    BRL: 4.95,
    ZAR: 18.75,
    NGN: 890,
    GHS: 12.35,
    MAD: 10.10,
    TND: 3.12,
    DZD: 134.50,
    LYD: 4.85,
    SDG: 601,
    IQD: 1310,
    JOD: 0.71,
    LBP: 89500,
    SYP: 13000,
    YER: 250,
  };

  constructor(private readonly redis: RedisService) {}

  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRateData> {
    try {
      const cacheKey = `${this.cacheKey}:${baseCurrency}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached) as ExchangeRateData;
        this.logger.log(`Exchange rates loaded from cache for ${baseCurrency}`);
        return { ...parsed, source: 'cache' };
      }

      const rates = await this.fetchRatesFromAPI(baseCurrency);

      const rateData: ExchangeRateData = {
        base: baseCurrency,
        rates,
        timestamp: new Date().toISOString(),
        source: 'api',
      };

      await this.redis.set(cacheKey, JSON.stringify(rateData), this.cacheTTL);

      this.logger.log(`Exchange rates fetched and cached for ${baseCurrency}`);
      return rateData;
    } catch (error) {
      this.logger.warn(`Failed to fetch exchange rates, using fallback: ${(error as Error).message}`);

      const fallbackRates = this.getFallbackRates(baseCurrency);

      const rateData: ExchangeRateData = {
        base: baseCurrency,
        rates: fallbackRates,
        timestamp: new Date().toISOString(),
        source: 'fallback',
      };

      return rateData;
    }
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);

      const rate = rates.rates[toCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} -> ${toCurrency}`);
      }

      const converted = amount * rate;
      const rounded = Math.round(converted * 100) / 100;

      this.logger.log(`Converted ${amount} ${fromCurrency} to ${rounded} ${toCurrency} (rate: ${rate})`);
      return rounded;
    } catch (error) {
      this.logger.error(`Conversion failed: ${fromCurrency} -> ${toCurrency}: ${(error as Error).message}`);
      throw error;
    }
  }

  getSupportedCurrencies(): CurrencyInfo[] {
    return (Object.entries(EXCHANGE_RATES) as [string, { name: string; symbol: string }][]).map(([code, data]) => ({
      code,
      name: data.name,
      symbol: data.symbol,
    }));
  }

  async updateExchangeRates(): Promise<{ updated: boolean; baseCurrencies: string[] }> {
    this.logger.log('Starting exchange rates update job');

    const baseCurrencies = ['USD', 'EUR', 'SAR', 'GBP'];
    const updated: string[] = [];

    for (const base of baseCurrencies) {
      try {
        const rates = await this.fetchRatesFromAPI(base);
        const cacheKey = `${this.cacheKey}:${base}`;
        const rateData: ExchangeRateData = {
          base,
          rates,
          timestamp: new Date().toISOString(),
          source: 'api',
        };
        await this.redis.set(cacheKey, JSON.stringify(rateData), this.cacheTTL);
        updated.push(base);
        this.logger.log(`Rates updated for ${base}`);
      } catch (error) {
        this.logger.warn(`Failed to update rates for ${base}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Exchange rates update completed: ${updated.length}/${baseCurrencies.length} updated`);
    return {
      updated: updated.length > 0,
      baseCurrencies: updated,
    };
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getExchangeRates(from);
    const rate = rates.rates[to];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${from} -> ${to}`);
    }

    return rate;
  }

  async getHistoricalRate(
    from: string,
    to: string,
    date: string,
  ): Promise<number> {
    const cacheKey = `${this.cacheKey}:${from}:${date}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached) as ExchangeRateData;
      const rate = parsed.rates[to];
      if (rate) return rate;
    }

    this.logger.warn(`Historical rate not available for ${from} -> ${to} on ${date}, using current rate`);
    return this.getRate(from, to);
  }

  async getSupportedCurrenciesByRegion(region: string): Promise<CurrencyInfo[]> {
    const allCurrencies = this.getSupportedCurrencies();

    const regionCurrencies: Record<string, string[]> = {
      middle_east: ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'EGP', 'JOD', 'IQD', 'LBP', 'SYR', 'YER'],
      europe: ['EUR', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'ISK', 'RSD', 'UAH'],
      asia: ['JPY', 'CNY', 'INR', 'KRW', 'SGD', 'MYR', 'IDR', 'THB', 'PHP', 'VND', 'PKR', 'BDT', 'LKR'],
      africa: ['ZAR', 'NGN', 'KES', 'GHS', 'MAD', 'TND', 'DZD', 'EGP', 'UGX', 'TZS', 'RWF', 'ETB'],
      americas: ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG'],
      oceania: ['AUD', 'NZD', 'FJD', 'PGK'],
    };

    const codes = regionCurrencies[region.toLowerCase()] || [];
    return allCurrencies.filter((c) => codes.includes(c.code));
  }

  private async fetchRatesFromAPI(base: string): Promise<Record<string, number>> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
    const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';

    if (apiKey) {
      try {
        this.logger.log(`Fetching exchange rates from API for ${base}`);
        const response = await fetch(`${apiUrl}/${base}?apikey=${apiKey}`, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = (await response.json()) as { rates: Record<string, number> };
        return data.rates;
      } catch (error) {
        this.logger.warn(`API fetch failed, using fallback: ${(error as Error).message}`);
        return this.getFallbackRates(base);
      }
    }

    this.logger.log('No API key configured, using fallback rates');
    return this.getFallbackRates(base);
  }

  private getFallbackRates(base: string): Record<string, number> {
    const baseUpper = base.toUpperCase();

    if (baseUpper === 'USD') {
      return { ...this.defaultRates };
    }

    const baseRate = this.defaultRates[baseUpper];
    if (!baseRate) {
      this.logger.warn(`Base currency ${baseUpper} not in fallback rates, using USD`);
      return { ...this.defaultRates };
    }

    const converted: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(this.defaultRates)) {
      converted[currency] = Math.round((rate / baseRate) * 10000) / 10000;
    }

    return converted;
  }
}