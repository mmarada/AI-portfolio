
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PortfolioSuggestion, PortfolioDetails, SuggestedAsset, MarketData, OptimizationGoal, LinkedAccount, PerformanceDataPoint, Holding, ToastMessage } from './types';
import { fetchPortfolioSuggestion } from './services/geminiService';
import { fetchMarketData, fetchAssetFinancials, simulateLinkBrokerageAccount, fetchPerformanceHistory } from './services/marketDataService';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PortfolioSandbox from './components/PortfolioSandbox';
import WelcomeScreen from './components/WelcomeScreen';
import { ToastContainer } from './components/Toast';

type AppMode = 'suggestion' | 'live';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('suggestion');
  
  // Suggestion Mode State
  const [suggestionResult, setSuggestionResult] = useState<PortfolioSuggestion | null>(null);
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState(0);
  
  // Live Mode State
  const [linkedAccount, setLinkedAccount] = useState<LinkedAccount | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceDataPoint[] | null>(null);

  // Shared State
  const [userAddedAssets, setUserAddedAssets] = useState<SuggestedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<{ amount: number, riskLevel: string, horizon: string, goal: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // For sandbox actions
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        removeToast(id);
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  const allSuggestedPortfolios = useMemo(() => {
    if (!suggestionResult) return [];
    return [suggestionResult.primary, ...suggestionResult.alternatives];
  }, [suggestionResult]);
  
  const activePortfolio = useMemo<PortfolioDetails | null>(() => {
    let basePortfolio: PortfolioDetails | null = null;

    if (mode === 'suggestion' && suggestionResult) {
        basePortfolio = allSuggestedPortfolios[selectedPortfolioIndex];
    } else if (mode === 'live' && linkedAccount) {
        const liveAssets = linkedAccount.holdings.map((h: Holding) => ({
            ticker: h.ticker,
            name: h.name,
            sector: h.sector,
            allocation: (h.value / linkedAccount.totalValue) * 100,
            beta: 1.0, 
            expectedReturn: 8.0, 
            volatility: 15.0, 
            rationale: `From linked account: ${linkedAccount.accountName}`,
            purchasePrice: h.purchasePrice,
        }));

        basePortfolio = {
            title: `Live Portfolio (${linkedAccount.accountName})`,
            portfolio: liveAssets,
            strategy: {
                summary: 'This is an analysis of your currently held assets from your linked brokerage account.',
                conservativeMeasures: 'Review your live holdings for concentration risk and consider diversification.',
                marketOutlook: 'Market conditions can affect your live holdings. Stay informed on relevant news.',
                portfolioMetrics: {
                    expectedReturn: 8.0, 
                    volatility: 15.0, 
                    weightedBeta: 1.0, 
                    riskScore: 5,
                },
                benchmarks: [
                    { name: 'S&P 500', expectedReturn: 10, volatility: 18 },
                ],
            }
        };
    }
    
    if (!basePortfolio) return null;

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
        title: `${basePortfolio.title} (Sandbox Mode)`,
        portfolio: newPortfolioAssets,
        strategy: {
            ...basePortfolio.strategy,
            portfolioMetrics: newMetrics,
        }
    };
  }, [mode, suggestionResult, linkedAccount, selectedPortfolioIndex, userAddedAssets, allSuggestedPortfolios]);


  const handleSuggestion = useCallback(async (amount: number, riskLevel: string, horizon: string, goal: string) => {
    if (!amount || !riskLevel || !horizon || !goal) return;
    setIsLoading(true);
    setError(null);
    setSuggestionResult(null);
    setLinkedAccount(null);
    setPerformanceHistory(null);
    setUserAddedAssets([]);
    setMode('suggestion');
    setUserProfile({amount, riskLevel, horizon, goal});

    try {
      const data = await fetchPortfolioSuggestion(amount, riskLevel, horizon, goal);
      
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
              purchasePrice: liveMarketData[asset.ticker]?.currentPrice * (1 + (Math.random() - 0.2) * 0.2)
          }))
      });

      const dataWithPrices: PortfolioSuggestion = {
          primary: addSimulatedPrices(data.primary),
          alternatives: data.alternatives.map(addSimulatedPrices)
      };

      setSuggestionResult(dataWithPrices);
      setSelectedPortfolioIndex(0);
      addToast('AI portfolio suggestions generated successfully!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleLinkAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuggestionResult(null);
    setLinkedAccount(null);
    setPerformanceHistory(null);
    setUserAddedAssets([]);
    try {
      const [accountData, perfData] = await Promise.all([
        simulateLinkBrokerageAccount(),
        fetchPerformanceHistory()
      ]);
      setLinkedAccount(accountData);
      setPerformanceHistory(perfData);
      setUserProfile(prev => prev ? { ...prev, amount: accountData.totalValue } : { amount: accountData.totalValue, riskLevel: 'Moderate', horizon: '7+ Years (Long-term)', goal: 'Capital Growth' });
      setMode('live');
      addToast('Brokerage account linked successfully!', 'success');
    } catch (err) {
      setError("Failed to link account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);
  
  const handleSelectPortfolio = (index: number) => {
    if (!suggestionResult) return;
    setSelectedPortfolioIndex(index);
  };

  const handleResetPortfolio = () => {
    setUserAddedAssets([]);
    addToast('Sandbox has been reset to the original AI portfolio.', 'info');
  };

  const handleAddStock = async (ticker: string, allocation: number) => {
    if (!activePortfolio) return;
    
    if (activePortfolio.portfolio.some(asset => asset.ticker.toUpperCase() === ticker.toUpperCase())) {
      addToast(`Asset ${ticker.toUpperCase()} is already in the portfolio.`, 'error');
      return;
    }

    const totalUserAllocation = userAddedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
    if (totalUserAllocation + allocation >= 100) {
        addToast(`Total user allocation cannot exceed 99%.`, 'error');
        return;
    }

    setIsProcessing(true);
    try {
      const financials = await fetchAssetFinancials(ticker);
      const newUserAsset: SuggestedAsset = {
        ...financials,
        ticker: ticker.toUpperCase(),
        allocation: allocation,
        isUserAdded: true,
        purchasePrice: financials.marketData?.currentPrice,
      };
      
      setUserAddedAssets(prevAssets => [...prevAssets, newUserAsset]);
      addToast(`${ticker.toUpperCase()} added to your sandbox portfolio.`, 'success');
    } catch (err) {
        addToast(err instanceof Error ? err.message : `Could not fetch data for ticker ${ticker}.`, 'error');
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleOptimizePortfolio = async (goal: OptimizationGoal) => {
    if (!activePortfolio || !userProfile || userAddedAssets.length === 0) return;
    setIsProcessing(true);
    try {
        const { fetchOptimizedAllocations } = await import('./services/geminiService');
        const optimizedAllocs = await fetchOptimizedAllocations(activePortfolio.portfolio, goal, userProfile);
        
        const allocMap = new Map(optimizedAllocs.map(a => [a.ticker.toUpperCase(), a.allocation]));

        const newPortfolio: SuggestedAsset[] = activePortfolio.portfolio.map(asset => ({
            ...asset,
            allocation: allocMap.get(asset.ticker.toUpperCase()) ?? asset.allocation,
            isUserAdded: false,
        }));
        
        if (mode === 'suggestion' && suggestionResult) {
            const basePortfolio = allSuggestedPortfolios[selectedPortfolioIndex];
            const updatedPortfolioDetails: PortfolioDetails = {
                ...activePortfolio,
                title: `${basePortfolio.title} (Optimized)`,
                portfolio: newPortfolio,
            };
            const newSuggestionResult = { ...suggestionResult };
            const newAllPortfolios = [...allSuggestedPortfolios];
            newAllPortfolios[selectedPortfolioIndex] = updatedPortfolioDetails;
            newSuggestionResult.primary = newAllPortfolios[0];
            newSuggestionResult.alternatives = newAllPortfolios.slice(1);
            setSuggestionResult(newSuggestionResult);
        } else if (mode === 'live' && linkedAccount) {
            const totalValue = linkedAccount.totalValue;
            const newHoldings: Holding[] = newPortfolio.map(asset => ({
                ticker: asset.ticker,
                name: asset.name,
                sector: asset.sector,
                value: totalValue * (asset.allocation / 100),
                shares: 0, 
                purchasePrice: asset.purchasePrice ?? 0
            }));
             setLinkedAccount({
                ...linkedAccount,
                holdings: newHoldings
            });
        }
        setUserAddedAssets([]);
        addToast('Portfolio allocations have been optimized by AI!', 'success');
    } catch(err) {
        addToast(err instanceof Error ? err.message : 'Optimization failed.', 'error');
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
    <div className="p-4 md:p-6 border-b border-neutral-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto">
        <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-100">
                AI portfolio
            </h1>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <aside className="lg:col-span-3 lg:sticky lg:top-28 space-y-6">
                <InputForm 
                    onGenerate={handleSuggestion} 
                    onLinkAccount={handleLinkAccount}
                    isLoading={isLoading} 
                />
                
                {mode === 'suggestion' && suggestionResult && (
                    <div className="bg-neutral-900 rounded-lg shadow-xl p-6 space-y-3 animate-fade-in">
                         <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2 mb-3">Select AI Suggestion</h3>
                         {allSuggestedPortfolios.map((p, index) => (
                            <button 
                                key={p.title + index}
                                onClick={() => handleSelectPortfolio(index)}
                                className={`w-full text-left p-3 rounded-lg transition-all duration-300 border-2 ${
                                    selectedPortfolioIndex === index
                                    ? 'bg-amber-500/20 border-amber-500 scale-105 shadow-lg'
                                    : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/80 hover:border-neutral-600'
                                }`}
                            >
                                <p className="font-semibold text-neutral-100 text-sm">{p.title}</p>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Risk: {p.strategy.portfolioMetrics.riskScore}/10 &bull; Return: {p.strategy.portfolioMetrics.expectedReturn.toFixed(1)}%
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <section className="lg:col-span-6 space-y-6">
                {isLoading && <LoadingSpinner />}
                {error && !isLoading && <ErrorDisplay message={error} />}
                
                {!isLoading && !activePortfolio && <WelcomeScreen />}
                
                {portfolioWithMarketData && userProfile && (
                     <AnalysisResult 
                        data={portfolioWithMarketData} 
                        isMarketDataLoading={isMarketDataLoading}
                        totalValue={userProfile.amount}
                        mode={mode}
                        performanceHistory={performanceHistory}
                        aiSuggestionPerformance={suggestionResult ? suggestionResult.primary : null}
                    />
                )}
            </section>

            <aside className="lg:col-span-3 lg:sticky lg:top-28">
                {activePortfolio && portfolioWithMarketData && (
                    <PortfolioSandbox
                        portfolio={portfolioWithMarketData}
                        onAddStock={handleAddStock}
                        onReset={handleResetPortfolio}
                        onOptimize={handleOptimizePortfolio}
                        isSandboxMode={isSandboxMode}
                        isProcessing={isProcessing}
                        addToast={addToast}
                    />
                )}
            </aside>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }`}</style>
    </div>
  );
};

export default App;
