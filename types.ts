
export interface MarketData {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

export interface SuggestedAsset {
  ticker: string;
  name: string;
  sector: string;
  allocation: number; // Percentage
  beta: number;
  expectedReturn: number;
  volatility: number;
  rationale: string;
  marketData?: MarketData; // Optional, fetched client-side
  isUserAdded?: boolean; // Flag for user-added assets
  purchasePrice?: number; // For simulating unrealized gains/losses
}

export interface PortfolioMetrics {
  expectedReturn: number;
  volatility: number;
  weightedBeta: number;
  riskScore: number; // e.g., on a scale of 1-10
}

export interface Benchmark {
  name: string;
  expectedReturn: number;
  volatility: number;
}

export interface StrategyAnalysis {
  summary: string;
  conservativeMeasures: string;
  marketOutlook: string;
  portfolioMetrics: PortfolioMetrics;
  benchmarks: Benchmark[];
}

export interface PortfolioDetails {
  title: string;
  portfolio: SuggestedAsset[];
  strategy: StrategyAnalysis;
}

export interface PortfolioSuggestion {
  primary: PortfolioDetails;
  alternatives: PortfolioDetails[];
}

export interface RecommendedStock {
    ticker: string;
    name: string;
    rationale: string;
}

export interface OptimizedAllocation {
    ticker: string;
    allocation: number;
}

export type OptimizationGoal = 'MINIMIZE_RISK' | 'MAXIMIZE_RETURN';

// --- Advanced Analytics Types ---

export interface ScenarioAnalysisResult {
    scenario: string;
    estimatedImpactPercent: number;
    estimatedImpactValue: number;
    rationale: string;
}

export interface ValueAtRiskResult {
    value: number;
    confidenceLevel: number;
    timeHorizon: string;
    explanation: string;
}

export interface CorrelationMatrix {
    tickers: string[];
    matrix: number[][]; // 2D array representing the correlation values
}

export interface AdvancedAnalytics {
    valueAtRisk: ValueAtRiskResult;
    scenarioAnalysis: ScenarioAnalysisResult[];
    correlationMatrix: CorrelationMatrix;
}

export interface TaxLossSuggestion {
    sellTicker: string;
    sellName: string;
    unrealizedLoss: number;
    replaceWithTicker: string;
    replaceWithName: string;
    rationale: string;
}

// --- Live Portfolio Types ---

export interface Holding {
    ticker: string;
    name: string;
    sector: string;
    shares: number;
    value: number;
    purchasePrice: number;
}

export interface LinkedAccount {
    accountName: string;
    totalValue: number;
    holdings: Holding[];
}

export interface PerformanceDataPoint {
    date: string;
    portfolioValue: number;
    benchmarkValue: number;
    aiSuggestionValue: number;
}

// --- UI Types ---
export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}