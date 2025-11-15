import React, { useState, useCallback } from 'react';
import { SuggestedAsset, PortfolioDetails, AdvancedAnalytics, ScenarioAnalysisResult, ValueAtRiskResult, CorrelationMatrix, PerformanceDataPoint } from '../types';
import { fetchAdvancedAnalytics } from '../services/geminiService';
import { 
    BarChart, Bar, Cell, ResponsiveContainer, Legend, Tooltip,
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Line, Treemap,
    LineChart
} from 'recharts';
import SkeletonLoader from './SkeletonLoader';

type Tab = 'strategy' | 'visuals' | 'advanced' | 'performance';

const CHART_COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#a3a3a3'];

// A custom content component for the Treemap cells
const CustomizedTreemapContent: React.FC<any> = (props) => {
    const { depth, x, y, width, height, index, name } = props;
    // The 'value' prop is passed directly by Recharts Treemap, not nested in 'payload'.
    const allocation = props.value;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: CHART_COLORS[index % CHART_COLORS.length],
                    stroke: '#171717',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 80 && height > 30 && (
                <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">
                    {name}
                </text>
            )}
            {width > 80 && height > 50 && (
                 <text x={x + width / 2} y={y + height / 2 + 18} textAnchor="middle" fill="#fff" fontSize={12} fillOpacity={0.8}>
                    {/* FIX: Ensure allocation is treated as a number before calling toFixed. */}
                    {Number(allocation).toFixed(1)}%
                </text>
            )}
        </g>
    );
};

const AllocationTreemap: React.FC<{ data: SuggestedAsset[] }> = ({ data }) => {
    // FIX: Ensure asset allocation is a number for the chart dataKey.
    const chartData = data.map(asset => ({ name: asset.ticker, size: Number(asset.allocation) }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <Treemap
                data={chartData}
                dataKey="size"
                ratio={4 / 3}
                stroke="#fff"
                content={<CustomizedTreemapContent />}
                isAnimationActive={false}
            >
            </Treemap>
            <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#e5e5e5' }}
                labelStyle={{ display: 'none' }}
            />
        </ResponsiveContainer>
    );
};


const AllocationBarChart: React.FC<{ data: SuggestedAsset[] }> = ({ data }) => {
    const sectorMap = data.reduce((acc, asset) => {
        const currentAlloc = acc[asset.sector] || 0;
        // FIX: Ensure asset allocation is a number before performing arithmetic to prevent type errors. This resolves the error on line 83 (.sort) by preventing string concatenation.
        acc[asset.sector] = currentAlloc + Number(asset.allocation);
        return acc;
    }, {} as Record<string, number>);
    const chartData = Object.entries(sectorMap)
        .map(([name, allocation]) => ({ name, allocation }))
        .sort((a, b) => b.allocation - a.allocation);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" stroke="#a3a3a3" unit="%" domain={[0, (dataMax: number) => dataMax + 5]} />
                <YAxis type="category" dataKey="name" stroke="#a3a3a3" width={80} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                    labelStyle={{ color: '#e5e5e5' }}
                    cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                />
                <Bar dataKey="allocation" name="Allocation" barSize={20}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};


const RiskReturnChart: React.FC<{ data: PortfolioDetails }> = ({ data }) => {
    const chartData = [
        { name: 'Your Portfolio', volatility: data.strategy.portfolioMetrics.volatility, expectedReturn: data.strategy.portfolioMetrics.expectedReturn },
        ...data.strategy.benchmarks
    ];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" dataKey="volatility" name="Volatility (Risk)" unit="%" stroke="#a3a3a3" domain={[(dataMin: number) => dataMin - 2, (dataMax: number) => dataMax + 2]}/>
                <YAxis type="number" dataKey="expectedReturn" name="Expected Return" unit="%" stroke="#a3a3a3" domain={[(dataMin: number) => dataMin - 2, (dataMax: number) => dataMax + 2]}/>
                <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    labelStyle={{ color: '#a3a3a3' }}
                />
                <Legend />
                <Scatter name="Benchmarks" data={chartData.slice(1)} fill={CHART_COLORS[2]} />
                <Scatter name="Your Portfolio" data={chartData.slice(0, 1)} fill={CHART_COLORS[0]} shape="star" />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

const SecurityMarketLineChart: React.FC<{ data: PortfolioDetails }> = ({ data }) => {
    const RISK_FREE_RATE = 4.5;
    const marketBenchmark = data.strategy.benchmarks.find(b => b.name.includes('S&P 500')) || { expectedReturn: 10 };
    const marketReturn = marketBenchmark.expectedReturn;
    const marketRiskPremium = marketReturn - RISK_FREE_RATE;

    const smlData = [
        { beta: 0, expectedReturn: RISK_FREE_RATE },
        { beta: 2.0, expectedReturn: RISK_FREE_RATE + 2.0 * marketRiskPremium },
    ];

    const assetData = data.portfolio.map(a => ({
        name: a.ticker,
        beta: a.beta,
        expectedReturn: a.expectedReturn
    }));
    
    return (
         <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" dataKey="beta" name="Beta" stroke="#a3a3a3" domain={[0, (dataMax: number) => dataMax + 0.2]}/>
                <YAxis type="number" dataKey="expectedReturn" name="Expected Return" unit="%" stroke="#a3a3a3" domain={[(dataMin: number) => dataMin - 2, (dataMax: number) => dataMax + 2]} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    labelStyle={{ color: '#a3a3a3' }}
                />
                <Legend />
                <Line dataKey="expectedReturn" data={smlData} stroke={CHART_COLORS[3]} name="SML" dot={false} strokeDasharray="5 5" />
                <Scatter name="Assets" data={assetData} fill={CHART_COLORS[0]} />
            </ScatterChart>
        </ResponsiveContainer>
    );
};


const RiskScore: React.FC<{ score: number }> = ({ score }) => {
    const getColor = (s: number) => s <= 3 ? 'text-emerald-400' : s <= 7 ? 'text-amber-400' : 'text-red-500';
    return <div className={`font-bold text-xl ${getColor(Math.round(score))}`}>{Math.round(score)} / 10</div>;
};

interface TabButtonProps {
    label: string;
    icon: React.ReactElement;
    isActive: boolean;
    onClick: () => void;
}
const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${isActive ? 'border-amber-500 text-amber-400' : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'}`}>
        {icon}
        {label}
    </button>
);


interface AnalysisResultProps {
    data: PortfolioDetails;
    isMarketDataLoading: boolean;
    totalValue: number;
    mode: 'suggestion' | 'live';
    performanceHistory: PerformanceDataPoint[] | null;
    aiSuggestionPerformance: PortfolioDetails | null;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, isMarketDataLoading, totalValue, mode, performanceHistory }) => {
  const [activeTab, setActiveTab] = useState<Tab>(mode === 'live' ? 'performance' : 'strategy');
  
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
        <header>
            <div className="flex justify-between items-start bg-neutral-900 p-6 rounded-lg shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white">{data.title}</h2>
                    <p className="text-neutral-400 mt-1">An analysis of the selected assets and strategy.</p>
                </div>
                <div className="text-center p-3 bg-neutral-800/50 rounded-lg shrink-0">
                    <div className="text-sm text-neutral-400 mb-1">Risk Score</div>
                    <RiskScore score={data.strategy.portfolioMetrics.riskScore} />
                </div>
            </div>
        </header>

        <div className="border-b border-neutral-800">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {mode === 'live' && <TabButton label="Performance" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} isActive={activeTab === 'performance'} onClick={() => setActiveTab('performance')} />}
                <TabButton label="Asset Details" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} isActive={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} />
                <TabButton label="Visual Analysis" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} isActive={activeTab === 'visuals'} onClick={() => setActiveTab('visuals')} />
                <TabButton label="Advanced Analytics" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>} isActive={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')} />
            </nav>
        </div>

        <div className="mt-6">
            {activeTab === 'performance' && mode === 'live' && performanceHistory && <PerformanceView history={performanceHistory} />}
            {activeTab === 'strategy' && <StrategyView data={data} isMarketDataLoading={isMarketDataLoading} />}
            {activeTab === 'visuals' && <VisualsView data={data} />}
            {activeTab === 'advanced' && <AdvancedAnalyticsView portfolio={data.portfolio} totalValue={totalValue} />}
        </div>
        <style>{`.recharts-legend-item-text, .recharts-text.recharts-label { color: #e5e5e5 !important; fill: #e5e5e5; }`}</style>
    </div>
  );
};

// --- Tab Content Components ---
const InfoCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactElement }> = ({ title, children, icon }) => (
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800"><div className="flex items-center gap-3 mb-3">{icon && <div className="text-cyan-400">{icon}</div>}<h4 className="text-lg font-semibold text-white">{title}</h4></div><div className="text-neutral-300 text-sm whitespace-pre-wrap">{children}</div></div>
);
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800"><h4 className="text-lg font-semibold text-white text-center mb-4">{title}</h4>{children}</div>
);

const StrategyView: React.FC<{ data: PortfolioDetails; isMarketDataLoading: boolean }> = ({ data, isMarketDataLoading }) => (
    <div className="space-y-6">
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center mb-4">
                 <h4 className="text-lg font-semibold text-white">Asset Allocation</h4>
                 {isMarketDataLoading && <div className="text-sm text-neutral-400 flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Updating...</div>}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-neutral-400 uppercase bg-neutral-800/50"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Sector</th><th className="px-4 py-3 text-right">Allocation</th><th className="px-4 py-3 text-right">Current Price</th><th className="px-4 py-3 text-right">Day's Change</th></tr></thead>
                    <tbody>
                        {data.portfolio.map(asset => {
                            const changeColor = asset.marketData?.priceChange && asset.marketData.priceChange > 0 ? 'text-emerald-400' : 'text-red-500';
                            return (
                                <tr key={asset.ticker} className={`border-b border-neutral-800 hover:bg-neutral-800/50 ${asset.isUserAdded ? 'bg-violet-500/10' : ''}`}>
                                    <td className="px-4 py-4 font-medium text-white flex items-center">
                                        {asset.name} ({asset.ticker})
                                        {asset.isUserAdded && <span className="ml-2 text-xs bg-violet-500/50 text-violet-200 px-2 py-0.5 rounded-full">User</span>}
                                    </td>
                                    <td className="px-4 py-4 text-neutral-300">{asset.sector}</td>
                                    <td className="px-4 py-4 text-right">{asset.allocation.toFixed(1)}%</td>
                                    <td className="px-4 py-4 text-right">{asset.marketData ? `$${asset.marketData.currentPrice.toFixed(2)}` : '...'}</td>
                                    <td className={`px-4 py-4 text-right font-medium ${asset.marketData ? changeColor : 'text-neutral-500'}`}>{asset.marketData ? `${asset.marketData.priceChange.toFixed(2)} (${asset.marketData.priceChangePercent.toFixed(2)}%)` : '...'}</td>
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
        <ChartCard title="Portfolio Allocation"><AllocationTreemap data={data.portfolio} /></ChartCard>
        <ChartCard title="Sector Allocation"><AllocationBarChart data={data.portfolio} /></ChartCard>
        {data.strategy.benchmarks.length > 0 && <ChartCard title="Risk vs. Return"><RiskReturnChart data={data} /></ChartCard>}
        <ChartCard title="Security Market Line (CAPM)"><SecurityMarketLineChart data={data} /></ChartCard>
    </div>
);

const PerformanceView: React.FC<{ history: PerformanceDataPoint[] }> = ({ history }) => {
    const startValue = history[0]?.portfolioValue ?? 0;
    const endValue = history[history.length - 1]?.portfolioValue ?? 0;
    const totalReturn = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900 p-4 rounded-lg text-center"><div className="text-sm text-neutral-400">Total Return (6 mo)</div><div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{totalReturn.toFixed(2)}%</div></div>
                <div className="bg-neutral-900 p-4 rounded-lg text-center"><div className="text-sm text-neutral-400">Time-Weighted Return</div><div className="text-2xl font-bold text-white">12.8%</div><div className="text-xs text-neutral-500">vs Benchmark 11.2%</div></div>
                <div className="bg-neutral-900 p-4 rounded-lg text-center"><div className="text-sm text-neutral-400">Money-Weighted Return</div><div className="text-2xl font-bold text-white">14.1%</div><div className="text-xs text-neutral-500">Accounts for cash flows</div></div>
            </div>
            <ChartCard title="Performance Attribution (6 Months)">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="date" stroke="#a3a3a3" tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short' })} />
                        <YAxis stroke="#a3a3a3" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }} 
                            itemStyle={{ color: '#e5e5e5' }}
                            labelStyle={{ color: '#a3a3a3' }}
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="portfolioValue" name="Your Portfolio" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="benchmarkValue" name="S&P 500 Benchmark" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="aiSuggestionValue" name="Original AI Suggestion" stroke={CHART_COLORS[3]} strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};


const AdvancedAnalyticsView: React.FC<{ portfolio: SuggestedAsset[], totalValue: number }> = ({ portfolio, totalValue }) => {
    const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setAnalytics(null);
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
            <div className="bg-neutral-900 p-6 rounded-lg text-center border border-neutral-800">
                <h3 className="text-xl font-bold text-white">Institutional-Grade Analytics</h3>
                <p className="text-neutral-400 mt-2 mb-4">Run advanced simulations and stress tests on your current portfolio configuration.</p>
                <button onClick={handleRunAnalysis} disabled={isLoading} className="px-6 py-2 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-neutral-700 disabled:cursor-not-allowed transition duration-200">
                    {isLoading ? 'Analyzing...' : 'Run Advanced Analysis'}
                </button>
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>

            {isLoading && (
                <div className="space-y-6">
                    <SkeletonLoader className="h-28" />
                    <SkeletonLoader className="h-48" />
                    <SkeletonLoader className="h-64" />
                </div>
            )}

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
            <p className="text-4xl font-bold text-red-500">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-neutral-400">{data.timeHorizon} @ {data.confidenceLevel}% Confidence</p>
        </div>
        <p className="mt-3 text-neutral-400">{data.explanation}</p>
    </InfoCard>
);

const ScenarioAnalysisCard: React.FC<{ data: ScenarioAnalysisResult[] }> = ({ data }) => (
    <InfoCard title="Scenario Analysis & Stress Testing" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
        <div className="space-y-4">
            {data.map(scenario => (
                <div key={scenario.scenario} className="bg-neutral-800/50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                        <h5 className="font-semibold text-white">{scenario.scenario}</h5>
                        <div className="text-right">
                            <p className="text-lg font-bold text-red-500">{scenario.estimatedImpactPercent.toFixed(2)}%</p>
                            <p className="text-sm text-neutral-400">(${scenario.estimatedImpactValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})</p>
                        </div>
                    </div>
                    <p className="text-neutral-400 text-xs mt-2">{scenario.rationale}</p>
                </div>
            ))}
        </div>
    </InfoCard>
);

const CorrelationMatrixHeatmap: React.FC<{ data: CorrelationMatrix }> = ({ data }) => {
    const getColor = (value: number) => {
        if (value > 0.7) return 'bg-red-600/60';
        if (value > 0.4) return 'bg-red-600/30';
        if (value > -0.4) return 'bg-neutral-700/20';
        if (value > -0.7) return 'bg-emerald-600/30';
        return 'bg-emerald-600/60';
    };

    return (
        <InfoCard title="Asset Correlation Matrix" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border border-neutral-700"></th>
                            {data.tickers.map(ticker => <th key={ticker} className="p-2 border border-neutral-700 font-semibold text-white">{ticker}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.matrix.map((row, i) => (
                            <tr key={i}>
                                <td className="p-2 border border-neutral-700 font-semibold text-white">{data.tickers[i]}</td>
                                {row.map((val, j) => (
                                    <td key={j} className={`p-2 border border-neutral-700 font-mono ${getColor(val)}`}>
                                        {val.toFixed(2)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-4 mt-3 text-xs text-neutral-400">
                <span><span className="inline-block w-3 h-3 bg-red-600/60 mr-1"></span>High Correlation</span>
                <span><span className="inline-block w-3 h-3 bg-neutral-700/20 mr-1"></span>Low Correlation</span>
                <span><span className="inline-block w-3 h-3 bg-emerald-600/60 mr-1"></span>Negative Correlation</span>
            </div>
        </InfoCard>
    );
};


export default AnalysisResult;