
import React, { useState } from 'react';

interface InputFormProps {
  onGenerate: (amount: number, riskLevel: string, horizon: string, goal: string) => void;
  onLinkAccount: () => void;
  isLoading: boolean;
}

const riskLevels = ['Conservative', 'Moderate', 'Aggressive'];
const horizons = ['1-3 Years (Short-term)', '3-7 Years (Medium-term)', '7+ Years (Long-term)'];
const goals = ['Capital Growth', 'Wealth Preservation', 'Regular Income', 'Speculation'];


const InputForm: React.FC<InputFormProps> = ({ onGenerate, onLinkAccount, isLoading }) => {
  const [amount, setAmount] = useState<string>('10000');
  const [riskLevel, setRiskLevel] = useState<string>('Moderate');
  const [horizon, setHorizon] = useState<string>(horizons[1]);
  const [goal, setGoal] = useState<string>(goals[0]);
  const [isLinking, setIsLinking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > 0 && riskLevel && horizon && goal) {
      onGenerate(parseFloat(amount), riskLevel, horizon, goal);
    }
  };

  const handleLink = async () => {
    setIsLinking(true);
    await onLinkAccount();
    setIsLinking(false);
  };
  
  const CustomSelect: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: string[]; disabled: boolean; }> = ({ label, value, onChange, options, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full appearance-none px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-100 transition duration-200"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
  );

  return (
    <div className="bg-neutral-900 rounded-lg shadow-xl p-6 space-y-6">
        <div>
            <h2 className="text-lg font-semibold text-neutral-100 mb-2">Portfolio Generator</h2>
            <p className="text-neutral-400 mb-4 text-sm">Get an AI-powered portfolio suggestion.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                <div>
                <label htmlFor="amount" className="block text-sm font-medium text-neutral-300 mb-2">Amount ($)</label>
                <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-100 placeholder-neutral-500 transition duration-200"
                    disabled={isLoading}
                    min="1"
                />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Risk Tolerance</label>
                    <div className="flex bg-neutral-800 border border-neutral-700 rounded-md p-1 h-[46px]">
                        {riskLevels.map((level) => (
                        <button
                            type="button"
                            key={level}
                            onClick={() => !isLoading && setRiskLevel(level)}
                            className={`w-full text-center text-sm font-semibold py-2 rounded-md transition-colors duration-200 focus:outline-none ${
                            riskLevel === level
                                ? 'bg-amber-500 text-black font-bold'
                                : 'text-neutral-300 hover:bg-neutral-700'
                            }`}
                            disabled={isLoading}
                        >
                            {level}
                        </button>
                        ))}
                    </div>
                </div>
                
                <CustomSelect label="Investment Horizon" value={horizon} onChange={setHorizon} options={horizons} disabled={isLoading} />
                <CustomSelect label="Financial Goal" value={goal} onChange={setGoal} options={goals} disabled={isLoading} />
                
            </div>
            <button
                type="submit"
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 font-bold text-black bg-amber-500 rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed transition duration-200"
            >
                {isLoading && !isLinking ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
                ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate AI Portfolio
                </>
                )}
            </button>
            </form>
        </div>

        <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-neutral-700" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-neutral-900 px-2 text-sm text-neutral-400">OR</span>
            </div>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold text-neutral-100 mb-2">Live Portfolio Analysis</h2>
            <p className="text-neutral-400 mb-4 text-sm">Analyze your real holdings.</p>
             <button
                type="button"
                onClick={handleLink}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:bg-neutral-700 disabled:cursor-not-allowed transition duration-200"
            >
                 {isLoading && isLinking ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Linking Account...
                    </>
                 ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        Link Brokerage Account
                    </>
                 )}
            </button>
        </div>
    </div>
  );
};

export default InputForm;