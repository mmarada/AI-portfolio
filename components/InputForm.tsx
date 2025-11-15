import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (amount: number, riskLevel: string, horizon: string, goal: string) => void;
  isLoading: boolean;
}

const riskLevels = ['Conservative', 'Moderate', 'Aggressive'];
const horizons = ['1-3 Years (Short-term)', '3-7 Years (Medium-term)', '7+ Years (Long-term)'];
const goals = ['Capital Growth', 'Wealth Preservation', 'Regular Income', 'Speculation'];


const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [amount, setAmount] = useState<string>('10000');
  const [riskLevel, setRiskLevel] = useState<string>('Moderate');
  const [horizon, setHorizon] = useState<string>(horizons[1]);
  const [goal, setGoal] = useState<string>(goals[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > 0 && riskLevel && horizon && goal) {
      onSubmit(parseFloat(amount), riskLevel, horizon, goal);
    }
  };
  
  const CustomSelect: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: string[]; disabled: boolean; }> = ({ label, value, onChange, options, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full appearance-none px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white transition duration-200"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
  );


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition duration-200"
            disabled={isLoading}
            min="1"
          />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Tolerance</label>
            <div className="flex bg-gray-700 border border-gray-600 rounded-md p-1 h-[46px]">
                {riskLevels.map((level) => (
                <button
                    type="button"
                    key={level}
                    onClick={() => !isLoading && setRiskLevel(level)}
                    className={`w-full text-center text-sm font-semibold py-2 rounded-md transition-colors duration-200 focus:outline-none ${
                    riskLevel === level
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
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
        className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Portfolios...
          </>
        ) : (
          'Generate Portfolios'
        )}
      </button>
    </form>
  );
};

export default InputForm;