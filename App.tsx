import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PortfolioSuggestion, PortfolioDetails, SuggestedAsset, MarketData, AdvancedAnalytics, TaxLossSuggestion, OptimizationGoal } from './types';
import { fetchPortfolioSuggestion, fetchOptimizedAllocations } from './services/geminiService';
import { fetchMarketData, fetchAssetFinancials } from './services/marketDataService';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PortfolioSandbox from './components/PortfolioSandbox';

const App: React.FC = () => {
  const [suggestionResult, setSuggestionResult] = useState<PortfolioSuggestion | null>(null);
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState(0);
  const [userAddedAssets, setUserAddedAssets] = useState<SuggestedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<{ amount: number, riskLevel: string, horizon: string, goal: string } | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(false);

  // State for advanced features
  const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  const allPortfolios = useMemo(() => {
    if (!suggestionResult) return [];
    return [suggestionResult.primary, ...suggestionResult.alternatives];
  }, [suggestionResult]);
  
  const activePortfolio = useMemo(() => {
    if (!suggestionResult) return null;

    const basePortfolio = allPortfolios[selectedPortfolioIndex];
    if (userAddedAssets.length === 0) {
        return basePortfolio;
    }

    const totalUserAllocation = userAddedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
    const scaleFactor = Math.max(0, (100 - totalUserAllocation) / 100);

    const updatedBaseAssets = basePortfolio.portfolio.map(asset => ({
        ...asset,
        allocation: asset.allocation * scaleFactor,
    }));

    const newPortfolioAssets = [...updatedBaseAssets, ...userAddedAssets];
    
    const newMetrics = {
        expectedReturn: newPortfolioAssets.reduce((acc, asset) => acc + asset.expectedReturn * (asset.allocation / 100), 0),
        volatility: newPortfolioAssets.reduce((acc, asset) => acc + asset.volatility * (asset.allocation / 100), 0),
        weightedBeta: newPortfolioAssets.reduce((acc, asset) => acc + asset.beta * (asset.allocation / 100), 0),
        riskScore: Math.max(1, Math.min(10, (newPortfolioAssets.reduce((acc, asset) => acc + asset.beta * (asset.allocation / 100), 0)) * 5 + 2.5)),
    };

    return {
        ...basePortfolio,
        title: `${allPortfolios[selectedPortfolioIndex].title} (Sandbox Mode)`,
        portfolio: newPortfolioAssets,
        strategy: {
            ...basePortfolio.strategy,
            portfolioMetrics: newMetrics,
        }
    };
  }, [suggestionResult, selectedPortfolioIndex, userAddedAssets, allPortfolios]);


  const handleSuggestion = useCallback(async (amount: number, riskLevel: string, horizon: string, goal: string) => {
    if (!amount || !riskLevel || !horizon || !goal) return;
    setIsLoading(true);
    setError(null);
    setSuggestionResult(null);
    setUserAddedAssets([]);
    setAdvancedAnalytics(null);
    setUserProfile({amount, riskLevel, horizon, goal});

    try {
      const data = await fetchPortfolioSuggestion(amount, riskLevel, horizon, goal);
      
      // Simulate purchase prices for tax-loss harvesting feature
      const allTickers = [
          ...data.primary.portfolio.map(a => a.ticker),
          ...data.alternatives.flatMap(p => p.portfolio.map(a => a.ticker))
      ];
      const uniqueTickers = [...new Set(allTickers)];
      const liveMarketData = await fetchMarketData(uniqueTickers);

      const addSimulatedPrices = (p: PortfolioDetails): PortfolioDetails => ({
          ...p,
          portfolio: p.portfolio.map(asset => ({
              ...asset,
              // Simulate a purchase price with a random fluctuation between -4% and +16% of current price
              purchasePrice: liveMarketData[asset.ticker]?.currentPrice * (1 + (Math.random() - 0.2) * 0.2)
          }))
      });

      const dataWithPrices: PortfolioSuggestion = {
          primary: addSimulatedPrices(data.primary),
          alternatives: data.alternatives.map(addSimulatedPrices)
      };

      setSuggestionResult(dataWithPrices);
      setSelectedPortfolioIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSelectPortfolio = (index: number) => {
    if (!suggestionResult) return;
    setSelectedPortfolioIndex(index);
    setAdvancedAnalytics(null); // Clear analytics when switching portfolio
  };

  const handleResetPortfolio = () => {
    setUserAddedAssets([]);
    setAdvancedAnalytics(null);
  };

  const handleAddStock = async (ticker: string, allocation: number) => {
    if (!activePortfolio) return;
    
    if (activePortfolio.portfolio.some(asset => asset.ticker.toUpperCase() === ticker.toUpperCase())) {
      setError(`Asset ${ticker.toUpperCase()} is already in the portfolio.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const totalUserAllocation = userAddedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
    if (totalUserAllocation + allocation >= 100) {
        setError(`Total user allocation cannot exceed 99%.`);
        setTimeout(() => setError(null), 4000);
        return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const financials = await fetchAssetFinancials(ticker);
      const newUserAsset: SuggestedAsset = {
        ...financials,
        ticker: ticker.toUpperCase(),
        allocation: allocation,
        isUserAdded: true,
        purchasePrice: financials.marketData?.currentPrice, // Purchase price is current price for new assets
      };
      
      setUserAddedAssets(prevAssets => [...prevAssets, newUserAsset]);
      setAdvancedAnalytics(null); // Clear old analytics
    } catch (err) {
        setError(err instanceof Error ? err.message : `Could not fetch data for ticker ${ticker}.`);
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleOptimizePortfolio = async (goal: OptimizationGoal) => {
    if (!activePortfolio || !userProfile || userAddedAssets.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
        const { fetchOptimizedAllocations } = await import('./services/geminiService');
        const optimizedAllocs = await fetchOptimizedAllocations(activePortfolio.portfolio, goal, userProfile);
        
        // Create a map for quick lookup
        const allocMap = new Map(optimizedAllocs.map(a => [a.ticker.toUpperCase(), a.allocation]));

        // Update both user-added and base assets based on the new allocations
        const updatedUserAssets = userAddedAssets.map(asset => ({
            ...asset,
            allocation: allocMap.get(asset.ticker.toUpperCase()) ?? asset.allocation,
        }));
        
        const basePortfolio = allPortfolios[selectedPortfolioIndex];
        const updatedBaseAssets = basePortfolio.portfolio.map(asset => ({
            ...asset,
            allocation: allocMap.get(asset.ticker.toUpperCase()) ?? asset.allocation,
        }));
        
        // This is tricky: we've optimized the combined portfolio. How to split it back?
        // Simple approach: The sandbox becomes the "new" base. We merge user assets into the main portfolio and clear the userAddedAssets list.
        const newOptimizedPortfolio: SuggestedAsset[] = activePortfolio.portfolio.map(asset => ({
            ...asset,
            allocation: allocMap.get(asset.ticker.toUpperCase()) ?? asset.allocation,
            isUserAdded: false, // All assets are now part of the optimized base
        }));

        // Replace the current "base" portfolio with this new optimized one
        const updatedPortfolioDetails: PortfolioDetails = {
            ...activePortfolio,
            title: `${basePortfolio.title} (Optimized)`,
            portfolio: newOptimizedPortfolio
        };

        const newSuggestionResult = { ...suggestionResult! };
        const newAllPortfolios = [...allPortfolios];
        newAllPortfolios[selectedPortfolioIndex] = updatedPortfolioDetails;
        
        // This is a bit of a hack to update the state structure correctly
        newSuggestionResult.primary = newAllPortfolios[0];
        newSuggestionResult.alternatives = newAllPortfolios.slice(1);
        
        setSuggestionResult(newSuggestionResult);
        setUserAddedAssets([]); // Clear sandbox as it's now merged
        setAdvancedAnalytics(null); // Clear old analytics

    } catch(err) {
        setError(err instanceof Error ? err.message : 'Optimization failed.');
    } finally {
        setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!activePortfolio) return;
    const tickers = activePortfolio.portfolio.map(a => a.ticker);
    if (tickers.length === 0) return;

    let isMounted = true;
    const fetchAndUpdate = async () => {
        setIsMarketDataLoading(true);
        try {
            const liveData = await fetchMarketData(tickers);
            if (isMounted) setMarketData(liveData);
        } catch (error) {
            console.error("Failed to fetch market data:", error);
        } finally {
            if (isMounted) setIsMarketDataLoading(false);
        }
    };
    
    fetchAndUpdate();
    const intervalId = setInterval(fetchAndUpdate, 60000);
    
    return () => {
        isMounted = false;
        clearInterval(intervalId);
    };
  }, [activePortfolio]);

  const portfolioWithMarketData = useMemo(() => {
    if (!activePortfolio) return null;
    return {
        ...activePortfolio,
        portfolio: activePortfolio.portfolio.map(asset => ({
            ...asset,
            marketData: marketData[asset.ticker]
        }))
    };
  }, [activePortfolio, marketData]);
  
  const isSandboxMode = userAddedAssets.length > 0;

  const Header: React.FC = () => (
    <div className="text-center p-4 md:p-6 border-b border-gray-700 bg-gray-900">
      <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center justify-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 6h-2v6h2V6zm0 8h-2v2h2v-2z"></path><path d="M15.585 14.172 11.03 9.617l-1.414 1.414 4.555 4.555-2.121 2.121 1.414 1.414 2.121-2.121 2.121 2.121 1.414-1.414-2.121-2.121 2.474-2.475-1.414-1.414-2.474 2.475z"></path></svg>
        AI Portfolio
      </h1>
      <p className="text-gray-400 mt-2">powered with investment analysis and market pulse</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <aside className="lg:col-span-3 lg:sticky lg:top-8 space-y-6">
                <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-2">Portfolio Controls</h2>
                    <p className="text-gray-400 mb-4 text-sm">Enter your details to generate a new portfolio.</p>
                    <InputForm onSubmit={handleSuggestion} isLoading={isLoading} />
                </div>
                {suggestionResult && (
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-3 animate-fade-in">
                         <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-3">Select Portfolio</h3>
                         {allPortfolios.map((p, index) => (
                            <button 
                                key={p.title + index}
                                onClick={() => handleSelectPortfolio(index)}
                                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 border ${
                                    selectedPortfolioIndex === index
                                    ? 'bg-cyan-600/20 border-cyan-500'
                                    : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                                }`}
                            >
                                <p className="font-semibold text-white text-sm">{p.title}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Risk: {p.strategy.portfolioMetrics.riskScore}/10 &bull; Return: {p.strategy.portfolioMetrics.expectedReturn.toFixed(1)}%
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <main className="lg:col-span-6">
                {isLoading && <LoadingSpinner />}
                {error && !isLoading && <ErrorDisplay message={error} />}
                {!isLoading && !error && portfolioWithMarketData && userProfile && (
                    <AnalysisResult 
                        data={portfolioWithMarketData} 
                        isMarketDataLoading={isMarketDataLoading}
                        totalValue={userProfile.amount}
                    />
                )}
                {!isLoading && !suggestionResult && (
                    <div className="text-center py-16 px-6 bg-gray-800 rounded-lg">
                        <h2 className="text-2xl font-semibold text-white">Welcome to AI Portfolio</h2>
                        <p className="text-gray-400 mt-2">Use the controls on the left to generate your personalized investment portfolio analysis.</p>
                    </div>
                )}
            </main>

            <aside className="lg:col-span-3 lg:sticky lg:top-8">
                {activePortfolio && portfolioWithMarketData && (
                    <PortfolioSandbox
                        portfolio={portfolioWithMarketData}
                        onAddStock={handleAddStock}
                        onReset={handleResetPortfolio}
                        onOptimize={handleOptimizePortfolio}
                        isSandboxMode={isSandboxMode}
                        isProcessing={isProcessing}
                    />
                )}
            </aside>
        </div>
      </div>
      <style>{`@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }`}</style>
    </div>
  );
};

export default App;
