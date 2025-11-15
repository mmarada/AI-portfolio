import { MarketData, SuggestedAsset, LinkedAccount, PerformanceDataPoint, Holding } from '../types';

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
export const fetchAssetFinancials = async (ticker: string): Promise<Pick<SuggestedAsset, 'name' | 'sector' | 'beta' | 'expectedReturn' | 'volatility' | 'rationale'> & { marketData: MarketData }> => {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const sectors = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Industrials', 'Energy', 'Real Estate', 'Utilities'];
    const name = ticker.toUpperCase() + ' Holdings Inc.';

    // Generate plausible random financial data
    const beta = parseFloat((0.5 + Math.random() * 1.5).toFixed(2)); // Beta between 0.5 and 2.0
    const expectedReturn = parseFloat((5 + Math.random() * 10).toFixed(2)); // Return between 5% and 15%
    const volatility = parseFloat((10 + Math.random() * 20).toFixed(2)); // Volatility between 10% and 30%
    
    const marketData = await fetchMarketData([ticker]);

    return {
        name,
        sector: sectors[Math.floor(Math.random() * sectors.length)],
        beta,
        expectedReturn,
        volatility,
        rationale: "This asset was added by the user for custom analysis.",
        marketData: marketData[ticker]
    };
};

// --- Live Portfolio Simulation ---

export const simulateLinkBrokerageAccount = async (): Promise<LinkedAccount> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    
    const holdings: Holding[] = [
        { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', shares: 50, value: 9500, purchasePrice: 150 },
        { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', shares: 30, value: 12000, purchasePrice: 300 },
        { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'Diversified Index', shares: 60, value: 15000, purchasePrice: 220 },
        { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', shares: 50, value: 8000, purchasePrice: 160 },
        { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', sector: 'Fixed Income', shares: 100, value: 7500, purchasePrice: 76 },
    ];

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

    return {
        accountName: 'Fidelity Brokerage',
        totalValue,
        holdings,
    };
};


export const fetchPerformanceHistory = async (): Promise<PerformanceDataPoint[]> => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

    const data: PerformanceDataPoint[] = [];
    let portfolioValue = 100000;
    let benchmarkValue = 100000;
    let aiSuggestionValue = 100000;

    const today = new Date();
    for (let i = 180; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        portfolioValue *= (1 + (Math.random() - 0.48) * 0.015);
        benchmarkValue *= (1 + (Math.random() - 0.49) * 0.014);
        aiSuggestionValue *= (1 + (Math.random() - 0.47) * 0.016);

        data.push({
            date: date.toISOString().split('T')[0],
            portfolioValue: parseFloat(portfolioValue.toFixed(2)),
            benchmarkValue: parseFloat(benchmarkValue.toFixed(2)),
            aiSuggestionValue: parseFloat(aiSuggestionValue.toFixed(2)),
        });
    }
    return data;
};