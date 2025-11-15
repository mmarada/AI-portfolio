import { MarketData, SuggestedAsset } from '../types';

// In a real application, this would call a financial data API (e.g., Alpha Vantage, IEX Cloud)
// For this example, we'll simulate the API call with random data.

// Cache to keep some price consistency between calls
const priceCache: Record<string, number> = {};

export const fetchMarketData = async (tickers: string[]): Promise<Record<string, MarketData>> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

  const marketData: Record<string, MarketData> = {};

  tickers.forEach(ticker => {
    let currentPrice = priceCache[ticker];
    if (!currentPrice) {
      // Initialize with a random price if not in cache
      currentPrice = Math.random() * 500 + 20; // Price between $20 and $520
    }

    // Simulate a small price fluctuation
    const fluctuation = (Math.random() - 0.5) * 0.05; // up to 5% change
    const newPrice = currentPrice * (1 + fluctuation);

    const priceChange = newPrice - currentPrice;
    const priceChangePercent = (priceChange / currentPrice) * 100;

    marketData[ticker] = {
      currentPrice: newPrice,
      priceChange: priceChange,
      priceChangePercent: priceChangePercent,
    };
    
    // Update cache for next call
    priceCache[ticker] = newPrice;
  });

  return marketData;
};

// Simulate fetching core financial metrics for a new, user-added stock
export const fetchAssetFinancials = async (ticker: string): Promise<Pick<SuggestedAsset, 'name' | 'beta' | 'expectedReturn' | 'volatility' | 'rationale'> & { marketData: MarketData }> => {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // In a real app, you'd look up the company name. Here we'll format the ticker.
    const name = ticker.toUpperCase() + ' Holdings Inc.';

    // Generate plausible random financial data
    const beta = parseFloat((0.5 + Math.random() * 1.5).toFixed(2)); // Beta between 0.5 and 2.0
    const expectedReturn = parseFloat((5 + Math.random() * 10).toFixed(2)); // Return between 5% and 15%
    const volatility = parseFloat((10 + Math.random() * 20).toFixed(2)); // Volatility between 10% and 30%
    
    const marketData = await fetchMarketData([ticker]);

    return {
        name,
        beta,
        expectedReturn,
        volatility,
        rationale: "This asset was added by the user for custom analysis.",
        marketData: marketData[ticker]
    };
};
