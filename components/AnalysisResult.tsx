import React, { useState, useCallback } from 'react';
import { SuggestedAsset, PortfolioDetails, AdvancedAnalytics, ScenarioAnalysisResult, ValueAtRiskResult, CorrelationMatrix } from '../types';
import { fetchAdvancedAnalytics } from '../services/geminiService';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
    BarChart, Bar, ReferenceLine
} from 'recharts';

type Tab = 'strategy' | 'visuals' | 'advanced';

// --- Chart Components ---
const CHART_COLORS = ['#06b6d4', '#6366f1', '#ec4899', '#f97316', '#84cc16', '#f59e0b', '#10b981', '#d946ef', '#3b82f6', '#ef4444', '#22c55e'];

const AllocationChart: React.FC<{ data: SuggestedAsset[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie data={data} dataKey="allocation" nameKey="ticker" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isUserAdded ? '#a855f7' : CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }} labelStyle={{ color: '#d1d5db' }}/>
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

const RiskReturnChart: React.FC<{ data: PortfolioDetails }> = ({ data }) => {
    const chartData = [
        { name: 'Your Portfolio', volatility: data.strategy.portfolioMetrics.volatility, expectedReturn: data.strategy.portfolioMetrics.expectedReturn },
        ...data.strategy.benchmarks
    ];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                <XAxis type="number" dataKey="volatility" name="Volatility (Risk)" unit="%" stroke="#9ca3af" domain={['dataMin - 2', 'dataMax + 2']}/>
                <YAxis type="number" dataKey="expectedReturn" name="Expected Return" unit="%" stroke="#9ca3af" domain={['dataMin - 2', 'dataMax + 2']}/>
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}/>
                <Legend />
                <Scatter name="Benchmarks" data={chartData.slice(1)} fill="#6366f1" />
                <Scatter name="Your Portfolio" data={chartData.slice(0, 1)} fill="#06b6d4" shape="star" />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

const BetaChart: React.FC<{ data: PortfolioDetails }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.portfolio} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
             <XAxis dataKey="ticker" stroke="#9ca3af" />
             <YAxis stroke="#9ca3af" />
             <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }} labelStyle={{ color: '#d1d5db' }}/>
             <Legend />
             <Bar dataKey="beta" name="Asset Beta">
                {data.portfolio.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isUserAdded ? '#a855f7' : CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
             </Bar>
             <ReferenceLine y={data.strategy.portfolioMetrics.weightedBeta} label={{ value: `Portfolio Beta: ${data.strategy.portfolioMetrics.weightedBeta.toFixed(2)}`, position: 'insideTopRight', fill: '#f5f5f5' }} stroke="#ec4899" strokeDasharray="3 3" />
        </BarChart>
    </ResponsiveContainer>
);

const RiskScore: React.FC<{ score: number }> = ({ score }) => {
    const getColor = (s: number) => s <= 3 ? 'text-green-400' : s <= 7 ? 'text-yellow-400' : 'text-red-400';
    return <div className={`font-bold text-xl ${getColor(Math.round(score))}`}>{Math.round(score)} / 10</div>;
};

// --- Main Component ---
interface AnalysisResultProps {
    data: PortfolioDetails;
    isMarketDataLoading: boolean;
    totalValue: number;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, isMarketDataLoading, totalValue }) => {
  const [activeTab, setActiveTab] = useState<Tab>('strategy');
  
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
        <header>
            <div className="flex justify-between items-start bg-gray-800 p-6 rounded-lg shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white">{data.title}</h2>
                    <p className="text-gray-400 mt-1">An analysis of the suggested assets and strategy.</p>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Risk Score</div>
                    <RiskScore score={data.strategy.portfolioMetrics.riskScore} />
                </div>
            </div>
        </header>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('strategy')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'strategy' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>Strategy Analysis</button>
                <button onClick={() => setActiveTab('visuals')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'visuals' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>Visual Analysis</button>
                <button onClick={() => setActiveTab('advanced')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'advanced' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>Advanced Analytics</button>
            </nav>
        </div>

        <div className="mt-6">
            {activeTab === 'strategy' && <StrategyView data={data} isMarketDataLoading={isMarketDataLoading} />}
            {activeTab === 'visuals' && <VisualsView data={data} />}
            {activeTab === 'advanced' && <AdvancedAnalyticsView portfolio={data.portfolio} totalValue={totalValue} />}
        </div>
        <style>{`.recharts-legend-item-text, .recharts-text.recharts-label { color: #d1d5db !important; fill: #d1d5db; }`}</style>
    </div>
  );
};

// --- Tab Content Components ---
const InfoCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactElement }> = ({ title, children, icon }) => (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700/50"><div className="flex items-center gap-3 mb-3">{icon && <div className="text-cyan-400">{icon}</div>}<h4 className="text-lg font-semibold text-white">{title}</h4></div><div className="text-gray-300 text-sm whitespace-pre-wrap">{children}</div></div>
);
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/50"><h4 className="text-lg font-semibold text-white text-center mb-4">{title}</h4>{children}</div>
);

const StrategyView: React.FC<{ data: PortfolioDetails; isMarketDataLoading: boolean }> = ({ data, isMarketDataLoading }) => (
    <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                 <h4 className="text-lg font-semibold text-white">Asset Allocation</h4>
                 {isMarketDataLoading && <div className="text-sm text-gray-400 flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Updating...</div>}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3 text-right">Allocation</th><th className="px-4 py-3 text-right">Current Price</th><th className="px-4 py-3 text-right">Day's Change</th></tr></thead>
                    <tbody>
                        {data.portfolio.map(asset => {
                            const changeColor = asset.marketData?.priceChange && asset.marketData.priceChange > 0 ? 'text-green-400' : 'text-red-400';
                            return (
                                <tr key={asset.ticker} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${asset.isUserAdded ? 'bg-purple-600/10' : ''}`}>
                                    <td className="px-4 py-4 font-medium text-white flex items-center">
                                        {asset.name} ({asset.ticker})
                                        {asset.isUserAdded && <span className="ml-2 text-xs bg-purple-500/50 text-purple-200 px-2 py-0.5 rounded-full">User</span>}
                                    </td>
                                    <td className="px-4 py-4 text-right">{asset.allocation.toFixed(1)}%</td>
                                    <td className="px-4 py-4 text-right">{asset.marketData ? `$${asset.marketData.currentPrice.toFixed(2)}` : '...'}</td>
                                    <td className={`px-4 py-4 text-right font-medium ${asset.marketData ? changeColor : 'text-gray-500'}`}>{asset.marketData ? `${asset.marketData.priceChange.toFixed(2)} (${asset.marketData.priceChangePercent.toFixed(2)}%)` : '...'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
        <InfoCard title="Strategy Summary" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>{data.strategy.summary}</InfoCard>
        <InfoCard title="Conservative Measures" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>{data.strategy.conservativeMeasures}</InfoCard>
        <InfoCard title="Market Outlook" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}>{data.strategy.marketOutlook}</InfoCard>
    </div>
);

const VisualsView: React.FC<{ data: PortfolioDetails }> = ({ data }) => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="xl:col-span-2"><ChartCard title="Risk vs. Return (Efficient Frontier)"><RiskReturnChart data={data} /></ChartCard></div>
        <ChartCard title="Portfolio Allocation"><AllocationChart data={data.portfolio} /></ChartCard>
        <ChartCard title="Asset Beta vs. Portfolio Average"><BetaChart data={data} /></ChartCard>
    </div>
);


const AdvancedAnalyticsView: React.FC<{ portfolio: SuggestedAsset[], totalValue: number }> = ({ portfolio, totalValue }) => {
    const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await fetchAdvancedAnalytics(portfolio, totalValue);
            setAnalytics(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analysis.');
        } finally {
            setIsLoading(false);
        }
    }, [portfolio, totalValue]);

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                <h3 className="text-xl font-bold text-white">Institutional-Grade Analytics</h3>
                <p className="text-gray-400 mt-2 mb-4">Run advanced simulations and stress tests on your current portfolio configuration.</p>
                <button onClick={handleRunAnalysis} disabled={isLoading} className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200">
                    {isLoading ? 'Analyzing...' : 'Run Advanced Analysis'}
                </button>
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>

            {isLoading && <div className="text-center text-gray-400">Loading analysis...</div>}

            {analytics && (
                <div className="space-y-6 animate-fade-in">
                    <ValueAtRiskCard data={analytics.valueAtRisk} />
                    <ScenarioAnalysisCard data={analytics.scenarioAnalysis} />
                    <CorrelationMatrixHeatmap data={analytics.correlationMatrix} />
                </div>
            )}
        </div>
    );
};

const ValueAtRiskCard: React.FC<{ data: ValueAtRiskResult }> = ({ data }) => (
    <InfoCard title="Value at Risk (VaR)" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}>
        <div className="flex items-baseline gap-4">
            <p className="text-4xl font-bold text-red-400">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-gray-400">{data.timeHorizon} @ {data.confidenceLevel}% Confidence</p>
        </div>
        <p className="mt-3 text-gray-400">{data.explanation}</p>
    </InfoCard>
);

const ScenarioAnalysisCard: React.FC<{ data: ScenarioAnalysisResult[] }> = ({ data }) => (
    <InfoCard title="Scenario Analysis & Stress Testing" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
        <div className="space-y-4">
            {data.map(scenario => (
                <div key={scenario.scenario} className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                        <h5 className="font-semibold text-white">{scenario.scenario}</h5>
                        <div className="text-right">
                            <p className="text-lg font-bold text-red-400">{scenario.estimatedImpactPercent.toFixed(2)}%</p>
                            <p className="text-sm text-gray-400">(${scenario.estimatedImpactValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})</p>
                        </div>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">{scenario.rationale}</p>
                </div>
            ))}
        </div>
    </InfoCard>
);

const CorrelationMatrixHeatmap: React.FC<{ data: CorrelationMatrix }> = ({ data }) => {
    const getColor = (value: number) => {
        if (value > 0.7) return 'bg-red-500/60';
        if (value > 0.4) return 'bg-red-500/30';
        if (value > -0.4) return 'bg-gray-600/20';
        if (value > -0.7) return 'bg-green-500/30';
        return 'bg-green-500/60';
    };

    return (
        <InfoCard title="Asset Correlation Matrix" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border border-gray-700"></th>
                            {data.tickers.map(ticker => <th key={ticker} className="p-2 border border-gray-700 font-semibold text-white">{ticker}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.matrix.map((row, i) => (
                            <tr key={i}>
                                <td className="p-2 border border-gray-700 font-semibold text-white">{data.tickers[i]}</td>
                                {row.map((val, j) => (
                                    <td key={j} className={`p-2 border border-gray-700 font-mono ${getColor(val)}`}>
                                        {val.toFixed(2)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-4 mt-3 text-xs text-gray-400">
                <span><span className="inline-block w-3 h-3 bg-red-500/60 mr-1"></span>High Correlation</span>
                <span><span className="inline-block w-3 h-3 bg-gray-600/20 mr-1"></span>Low Correlation</span>
                <span><span className="inline-block w-3 h-3 bg-green-500/60 mr-1"></span>Negative Correlation</span>
            </div>
        </InfoCard>
    );
};


export default AnalysisResult;
