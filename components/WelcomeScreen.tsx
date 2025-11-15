
import React from 'react';

const WelcomeScreen: React.FC = () => {
    return (
        <div className="text-center py-16 px-6 bg-neutral-900 rounded-lg border-2 border-dashed border-neutral-800 animate-fade-in">
            <div className="mx-auto bg-amber-500/10 p-4 rounded-full w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mt-6">Welcome to AI portfolio</h2>
            <p className="text-neutral-400 mt-2 max-w-md mx-auto">
                Your intelligent investment cockpit. Choose an option on the left to begin.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 p-3 bg-neutral-800/50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Generate AI Suggestions</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-neutral-800/50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                    <span>Analyze Live Portfolio</span>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
