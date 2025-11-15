import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioSuggestion, RecommendedStock, SuggestedAsset, AdvancedAnalytics, TaxLossSuggestion, OptimizationGoal, OptimizedAllocation } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const portfolioDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A descriptive title for this portfolio, e.g., 'Moderate Growth Portfolio'." },
        portfolio: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    ticker: { type: Type.STRING },
                    name: { type: Type.STRING },
                    sector: { type: Type.STRING, description: "The economic sector of the asset, e.g., 'Technology'." },
                    allocation: { type: Type.NUMBER, description: "Percentage of the portfolio, e.g., 40 for 40%" },
                    beta: { type: Type.NUMBER },
                    expectedReturn: { type: Type.NUMBER, description: "Estimated annualized return as a percentage, e.g., 8.5 for 8.5%" },
                    volatility: { type: Type.NUMBER, description: "Estimated annualized volatility (standard deviation) as a percentage, e.g., 15.2 for 15.2%" },
                    rationale: { type: Type.STRING, description: "Brief reason for including this asset." },
                },
                required: ['ticker', 'name', 'sector', 'allocation', 'beta', 'expectedReturn', 'volatility', 'rationale'],
            },
        },
        strategy: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING, description: "Explain why this is an efficient strategy for the given risk level." },
                conservativeMeasures: { type: Type.STRING, description: "Suggest risk mitigation strategies like stop-loss orders." },
                marketOutlook: { type: Type.STRING, description: "Brief analysis of the current market sentiment and outlook." },
                portfolioMetrics: {
                    type: Type.OBJECT,
                    properties: {
                        expectedReturn: { type: Type.NUMBER, description: "Weighted average annualized return for the whole portfolio." },
                        volatility: { type: Type.NUMBER, description: "Weighted average annualized volatility for the whole portfolio." },
                        weightedBeta: { type: Type.NUMBER, description: "Weighted average beta for the whole portfolio." },
                        riskScore: { type: Type.NUMBER, description: "A numerical risk score from 1 (very low) to 10 (very high)." },
                    },
                    required: ['expectedReturn', 'volatility', 'weightedBeta', 'riskScore'],
                },
                benchmarks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            expectedReturn: { type: Type.NUMBER },
                            volatility: { type: Type.NUMBER },
                        },
                        required: ['name', 'expectedReturn', 'volatility'],
                    }
                }
            },
            required: ['summary', 'conservativeMeasures', 'marketOutlook', 'portfolioMetrics', 'benchmarks'],
        },
    },
    required: ['title', 'portfolio', 'strategy'],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    primary: portfolioDetailsSchema,
    alternatives: {
        type: Type.ARRAY,
        description: "Provide exactly two alternative portfolios: one more conservative, one more aggressive.",
        items: portfolioDetailsSchema,
    }
  },
  required: ['primary', 'alternatives'],
};


export const fetchPortfolioSuggestion = async (amount: number, riskLevel: string, horizon: string, goal: string): Promise<PortfolioSuggestion> => {
  const prompt = `
    Act as a world-class quantitative investment strategist. A client wants a portfolio suggestion based on the following criteria:
    - Investment Amount: $${amount}
    - Risk Tolerance: ${riskLevel}
    - Investment Horizon: ${horizon}
    - Financial Goal: ${goal}

    Your task is to create a primary diversified portfolio and TWO alternative portfolios (one more conservative, one more aggressive).
    Each portfolio should contain 3-5 stocks and/or index funds (ETFs) that align with the client's profile. Do NOT include any cryptocurrencies.
    Map the risk tolerance to the portfolio's overall beta (e.g., Conservative < 0.8, Moderate 0.8-1.2, Aggressive > 1.2) and assign a risk score from 1-10.

    For your analysis, consider:
    - Current market sentiment, economic indicators, and the client's horizon/goals.
    - Fundamental analysis of the companies/funds.
    - Key financial metrics: beta for volatility, but also estimate annualized return and volatility (standard deviation).
    - For each asset, provide its economic sector (e.g., 'Technology', 'Healthcare', 'Financials').

    Provide a response in a valid JSON format that adheres to the provided schema. The response MUST include a 'primary' portfolio and exactly two 'alternatives'.

    - primary: The main portfolio that best matches all the user's criteria.
    - alternatives: An array containing exactly two other portfolios:
        1. A slightly more conservative version.
        2. A slightly more aggressive version.
    - For each portfolio:
      - title: A descriptive title (e.g., "Balanced Growth Portfolio (Primary)", "Conservative Alternative", "Aggressive Growth Alternative").
      - allocation: The sum of allocations must be 100.
      - riskScore: A numerical risk score from 1 (very low) to 10 (very high).
      - summary: Explain why this is an efficient strategy, referencing the client's goals.
      - benchmarks: Provide 2-3 relevant benchmark data points for comparison on a risk vs. return chart (e.g., 'S&P 500', 'Bonds').
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });
    
    const text = response.text.trim();
    const data = JSON.parse(text);

    // Basic validation to ensure the API returned the expected structure
    if (!data.primary || !Array.isArray(data.alternatives) || data.alternatives.length < 2) {
      throw new Error("API response is missing primary or sufficient alternative portfolios.");
    }

    return data as PortfolioSuggestion;
  } catch (error) {
    console.error("Error fetching portfolio suggestion:", error);
    if (error instanceof Error && error.message.includes("API response")) {
        throw error;
    }
    throw new Error(`Failed to generate a portfolio. The AI model may have returned an invalid structure. Please try again.`);
  }
};

const recommendationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            ticker: { type: Type.STRING },
            name: { type: Type.STRING },
            rationale: { type: Type.STRING, description: "Briefly explain why this stock would be a good addition for diversification." }
        },
        required: ['ticker', 'name', 'rationale']
    }
};

export const fetchDiversificationSuggestions = async (portfolio: SuggestedAsset[]): Promise<RecommendedStock[]> => {
    const currentPortfolioString = portfolio.map(a => `${a.ticker} (${a.allocation.toFixed(1)}%)`).join(', ');
    const prompt = `
        Given the following investment portfolio: ${currentPortfolioString}.
        Suggest exactly 3 stocks or ETFs that would improve its diversification.
        For each suggestion, provide a brief rationale explaining how it would contribute to a more balanced portfolio (e.g., exposure to a different sector, geography, or asset class).
        Do not suggest any assets already in the portfolio.
        Provide a response in a valid JSON format that adheres to the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: recommendationSchema,
            }
        });
        const text = response.text.trim();
        return JSON.parse(text) as RecommendedStock[];
    } catch (error) {
        console.error("Error fetching diversification suggestions:", error);
        throw new Error("Failed to get diversification suggestions from the AI.");
    }
};


const advancedAnalyticsSchema = {
    type: Type.OBJECT,
    properties: {
        valueAtRisk: {
            type: Type.OBJECT,
            properties: {
                value: { type: Type.NUMBER, description: "The VaR amount in dollars." },
                confidenceLevel: { type: Type.NUMBER, description: "The confidence level, e.g., 95." },
                timeHorizon: { type: Type.STRING, description: "The time horizon, e.g., '1-day'." },
                explanation: { type: Type.STRING, description: "A simple explanation of what this VaR value means." }
            },
            required: ['value', 'confidenceLevel', 'timeHorizon', 'explanation']
        },
        scenarioAnalysis: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    scenario: { type: Type.STRING, description: "Name of the scenario, e.g., '2008 Financial Crisis'." },
                    estimatedImpactPercent: { type: Type.NUMBER, description: "The estimated portfolio loss as a percentage." },
                    estimatedImpactValue: { type: Type.NUMBER, description: "The estimated portfolio loss in dollars." },
                    rationale: { type: Type.STRING, description: "A brief explanation of the impact." }
                },
                required: ['scenario', 'estimatedImpactPercent', 'estimatedImpactValue', 'rationale']
            }
        },
        correlationMatrix: {
            type: Type.OBJECT,
            properties: {
                tickers: { type: Type.ARRAY, items: { type: Type.STRING } },
                matrix: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } }
            },
            required: ['tickers', 'matrix']
        }
    },
    required: ['valueAtRisk', 'scenarioAnalysis', 'correlationMatrix']
};

export const fetchAdvancedAnalytics = async (portfolio: SuggestedAsset[], totalValue: number): Promise<AdvancedAnalytics> => {
    const portfolioString = portfolio.map(a => `${a.ticker}: ${a.allocation.toFixed(1)}%`).join(', ');
    const tickers = portfolio.map(a => a.ticker);

    const prompt = `
        Act as a quantitative financial analyst. For the given portfolio valued at $${totalValue.toLocaleString()} with assets [${portfolioString}], perform the following advanced analysis:
        1.  **Value at Risk (VaR):** Calculate the 1-day 95% confidence VaR. Provide the dollar value and a simple explanation.
        2.  **Scenario Analysis:** Estimate the portfolio's performance under three scenarios: a repeat of the '2008 Financial Crisis', a repeat of the 'COVID-19 Crash (March 2020)', and a hypothetical 'Sudden 3% Inflation Spike'. For each, provide the estimated impact as a percentage and dollar value, with a brief rationale.
        3.  **Correlation Matrix:** Generate a correlation matrix for all assets in the portfolio (${tickers.join(', ')}).

        Return the entire analysis in a single, valid JSON object that adheres to the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: advancedAnalyticsSchema
            }
        });
        const text = response.text.trim();
        return JSON.parse(text) as AdvancedAnalytics;
    } catch (error) {
        console.error("Error fetching advanced analytics:", error);
        throw new Error("Failed to get advanced analytics from the AI.");
    }
};

const taxLossHarvestingSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            sellTicker: { type: Type.STRING },
            sellName: { type: Type.STRING },
            unrealizedLoss: { type: Type.NUMBER, description: "The amount of the loss in dollars." },
            replaceWithTicker: { type: Type.STRING },
            replaceWithName: { type: Type.STRING },
            rationale: { type: Type.STRING, description: "Why the replacement is a suitable but not 'substantially identical' asset." }
        },
        required: ['sellTicker', 'sellName', 'unrealizedLoss', 'replaceWithTicker', 'replaceWithName', 'rationale']
    }
};

export const fetchTaxLossHarvestingSuggestions = async (portfolio: SuggestedAsset[]): Promise<TaxLossSuggestion[]> => {
    const assetsWithLoss = portfolio
        .filter(a => a.purchasePrice && a.marketData && a.marketData.currentPrice < a.purchasePrice)
        .map(a => {
            const loss = (a.marketData!.currentPrice - a.purchasePrice!) * (a.allocation / 100);
            return `${a.ticker} (Unrealized Loss: $${Math.abs(loss).toFixed(2)})`;
        });

    if (assetsWithLoss.length === 0) {
        return [];
    }

    const prompt = `
        Act as a tax advisor and portfolio manager. The following assets in a portfolio have unrealized losses: ${assetsWithLoss.join(', ')}.
        For each asset, suggest a tax-loss harvesting strategy. This involves selling the asset to realize the loss for tax purposes and immediately buying a suitable replacement to maintain market exposure and the portfolio's strategic allocation.
        The replacement must NOT be 'substantially identical' to avoid the wash-sale rule. For example, replace a specific company stock with a broad-market or sector-specific ETF, or one ETF with another from a different provider that tracks a similar but not identical index.
        
        Provide up to 3 suggestions in a valid JSON format that adheres to the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: taxLossHarvestingSchema
            }
        });
        const text = response.text.trim();
        return JSON.parse(text) as TaxLossSuggestion[];
    } catch (error) {
        console.error("Error fetching tax-loss harvesting suggestions:", error);
        throw new Error("Failed to get tax-loss harvesting suggestions.");
    }
};


const optimizationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            ticker: { type: Type.STRING },
            allocation: { type: Type.NUMBER, description: "The new, optimized allocation percentage." }
        },
        required: ['ticker', 'allocation']
    }
};

export const fetchOptimizedAllocations = async (portfolio: SuggestedAsset[], goal: OptimizationGoal, userProfile: { riskLevel: string, horizon: string, goal: string }): Promise<OptimizedAllocation[]> => {
    const portfolioString = portfolio.map(a => `${a.ticker} (${a.allocation.toFixed(1)}%)`).join(', ');
    const goalDescription = goal === 'MAXIMIZE_RETURN'
        ? "maximize the expected return for a similar level of overall portfolio risk (volatility)."
        : "minimize the overall portfolio risk (volatility) while targeting a similar expected return.";

    const prompt = `
        Act as a quantitative analyst using Modern Portfolio Theory. The client's profile is: Risk Tolerance=${userProfile.riskLevel}, Horizon=${userProfile.horizon}, Goal=${userProfile.goal}.
        The current portfolio is composed of these assets: [${portfolioString}].
        Your task is to rebalance the allocations of these exact assets to create a more efficient portfolio.
        The optimization goal is to ${goalDescription}
        
        Analyze the assets' expected returns, volatilities, and correlations to find the optimal allocation mix. The new allocations must sum to 100.
        Provide the new allocations in a valid JSON format that adheres to the provided schema. Do not add or remove any assets.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: optimizationSchema,
            }
        });
        const text = response.text.trim();
        const result = JSON.parse(text) as OptimizedAllocation[];
        
        // Ensure the sum is 100
        const totalAllocation = result.reduce((sum, asset) => sum + asset.allocation, 0);
        if (Math.abs(totalAllocation - 100) > 1) { // Allow for small rounding errors
            // Normalize allocations if they don't sum to 100
            return result.map(asset => ({ ...asset, allocation: (asset.allocation / totalAllocation) * 100 }));
        }

        return result;
    } catch (error) {
        console.error("Error fetching optimized allocations:", error);
        throw new Error("Failed to get portfolio optimization from the AI.");
    }
};