import React, { useState } from 'react';
import { PortfolioDetails, RecommendedStock, OptimizationGoal, TaxLossSuggestion } from '../types';
import { fetchDiversificationSuggestions, fetchTaxLossHarvestingSuggestions } from '../services/geminiService';

interface PortfolioSandboxProps {
    portfolio: PortfolioDetails;
    onAddStock: (ticker: string, allocation: number) => void;
    onReset: () => void;
    onOptimize: (goal: OptimizationGoal) => void;
    isSandboxMode: boolean;
    isProcessing: boolean;
}

const LoadingIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PortfolioSandbox: React.FC<PortfolioSandboxProps> = ({ portfolio, onAddStock, onReset, onOptimize, isSandboxMode, isProcessing }) => {
    const [ticker, setTicker] = useState('');
    const [allocation, setAllocation] = useState('10');
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<RecommendedStock[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [taxLossSuggestions, setTaxLossSuggestions] = useState<TaxLossSuggestion[]>([]);
    const [isFetchingTaxLoss, setIsFetchingTaxLoss] = useState(false);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const allocNum = parseFloat(allocation);

        if (!ticker.trim()) {
            setError('Ticker symbol cannot be empty.');
            return;
        }
        if (isNaN(allocNum) || allocNum <= 0 || allocNum >= 100) {
            setError('Allocation must be between 1% and 99%.');
            return;
        }

        onAddStock(ticker, allocNum);
        setTicker('');
        setAllocation('10');
    };

    const handleGetSuggestions = async () => {
        setIsSuggesting(true);
        setSuggestions([]);
        setError('');
        try {
            const result = await fetchDiversificationSuggestions(portfolio.portfolio);
            setSuggestions(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not fetch suggestions.');
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleGetTaxLossSuggestions = async () => {
        setIsFetchingTaxLoss(true);
        setTaxLossSuggestions([]);
        setError('');
        try {
            const result = await fetchTaxLossHarvestingSuggestions(portfolio.portfolio);
            setTaxLossSuggestions(result);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Could not fetch suggestions.');
        } finally {
            setIsFetchingTaxLoss(false);
        }
    };


    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 animate-fade-in space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Portfolio Sandbox
                </h3>
                <p className="text-gray-400 text-sm mt-1">Experiment with your portfolio.</p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg space-y-4">
                 <h4 className="font-semibold text-white text-sm">Add Your Own Asset</h4>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                        <label htmlFor="ticker" className="block text-xs font-medium text-gray-300 mb-1">Stock Ticker</label>
                        <input
                            type="text"
                            id="ticker"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            placeholder="e.g., AAPL"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition duration-200 text-sm"
                            disabled={isProcessing}
                        />
                    </div>
                    <div>
                        <label htmlFor="allocation" className="block text-xs font-medium text-gray-300 mb-1">Allocation (%)</label>
                        <input
                            type="number"
                            id="allocation"
                            value={allocation}
                            onChange={(e) => setAllocation(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition duration-200 text-sm"
                            disabled={isProcessing}
                            min="1"
                            max="99"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={isProcessing || !ticker}
                        className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
                    >
                       {isProcessing ? <><LoadingIcon /> Adding...</> : 'Add Asset'}
                    </button>
                </form>
            </div>
            
            {isSandboxMode && (
                 <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-white text-sm">Portfolio Actions</h4>
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400">Optimize this custom portfolio:</p>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => onOptimize('MINIMIZE_RISK')} disabled={isProcessing} className="w-full text-sm px-2 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-600">Minimize Risk</button>
                             <button onClick={() => onOptimize('MAXIMIZE_RETURN')} disabled={isProcessing} className="w-full text-sm px-2 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-600">Maximize Return</button>
                        </div>
                    </div>
                    <div className="pt-2">
                         <button
                            onClick={onReset}
                            className="w-full px-4 py-2 font-semibold text-white bg-red-600/80 rounded-md hover:bg-red-700/80 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200"
                        >
                            Reset to AI Original
                        </button>
                    </div>
                 </div>
            )}

            <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                 <h4 className="font-semibold text-white text-sm">AI-Powered Actions</h4>
                 <button onClick={handleGetSuggestions} disabled={isSuggesting || isProcessing} className="w-full flex items-center justify-center text-sm px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200">
                     {isSuggesting ? <><LoadingIcon /> Analyzing...</> : 'Suggest Diversifications'}
                 </button>
                 <button onClick={handleGetTaxLossSuggestions} disabled={isFetchingTaxLoss || isProcessing} className="w-full flex items-center justify-center text-sm px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200">
                     {isFetchingTaxLoss ? <><LoadingIcon /> Scanning...</> : 'Suggest Tax-Loss Harvests'}
                 </button>

                 {suggestions.length > 0 && (
                     <div className="space-y-2 pt-2">
                        <h5 className="text-xs font-bold text-gray-300">Diversification Ideas:</h5>
                        {suggestions.map(s => (
                            <div key={s.ticker} className="text-xs bg-gray-800 p-2 rounded">
                                <p className="font-bold text-white">{s.name} ({s.ticker})</p>
                                <p className="text-gray-400">{s.rationale}</p>
                            </div>
                        ))}
                     </div>
                 )}
                 {taxLossSuggestions.length > 0 && (
                     <div className="space-y-2 pt-2">
                        <h5 className="text-xs font-bold text-gray-300">Tax-Loss Harvesting Opportunities:</h5>
                        {taxLossSuggestions.map(s => (
                            <div key={s.sellTicker} className="text-xs bg-gray-800 p-2 rounded">
                                <p className="font-bold text-white">Sell {s.sellTicker} to harvest ~${Math.abs(s.unrealizedLoss).toFixed(0)} loss</p>
                                <p className="text-gray-300">Replace with: <span className="font-semibold">{s.replaceWithTicker}</span></p>
                                <p className="text-gray-400 mt-1">{s.rationale}</p>
                            </div>
                        ))}
                     </div>
                 )}
                 {isFetchingTaxLoss && taxLossSuggestions.length === 0 && (
                    <p className="text-xs text-center text-gray-400 pt-2">No significant loss-harvesting opportunities found.</p>
                 )}
            </div>

        </div>
    );
};

export default PortfolioSandbox;
