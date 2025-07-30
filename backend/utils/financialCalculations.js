const moment = require('moment');

class FinancialCalculations {
  /**
   * Calculate Personal Rate of Return (PROR)
   * Formula: ((Ending Value - Beginning Value - Contributions + Withdrawals) / (Beginning Value + Weighted Contributions)) * 100
   */
  static calculatePROR(beginningValue, endingValue, contributions, withdrawals, timePeriod) {
    if (beginningValue <= 0) {
      throw new Error('Beginning value must be greater than zero');
    }

    const netCashFlow = contributions - withdrawals;
    const weightedContributions = contributions * (timePeriod / 12); // Assuming monthly contributions
    const denominator = beginningValue + weightedContributions;

    if (denominator <= 0) {
      throw new Error('Invalid calculation parameters');
    }

    const pror = ((endingValue - beginningValue - netCashFlow) / denominator) * 100;
    return parseFloat(pror.toFixed(2));
  }

  /**
   * Calculate annualized return
   */
  static calculateAnnualizedReturn(returns, timePeriod) {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((sum, ret) => sum + (1 + ret / 100), 1);
    const annualizedReturn = Math.pow(totalReturn, 12 / timePeriod) - 1;
    return parseFloat((annualizedReturn * 100).toFixed(2));
  }

  /**
   * Calculate Sharpe Ratio
   * Formula: (Return - Risk Free Rate) / Standard Deviation
   */
  static calculateSharpeRatio(returns, riskFreeRate = 2.5) {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const sharpeRatio = (avgReturn - riskFreeRate) / stdDev;
    return parseFloat(sharpeRatio.toFixed(3));
  }

  /**
   * Calculate Maximum Drawdown
   */
  static calculateMaxDrawdown(navValues) {
    if (navValues.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = navValues[0];

    for (let i = 1; i < navValues.length; i++) {
      if (navValues[i] > peak) {
        peak = navValues[i];
      } else {
        const drawdown = (peak - navValues[i]) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    return parseFloat((maxDrawdown * 100).toFixed(2));
  }

  /**
   * Calculate Volatility (Standard Deviation)
   */
  static calculateVolatility(returns) {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    return parseFloat(volatility.toFixed(2));
  }

  /**
   * Calculate Beta (vs benchmark)
   */
  static calculateBeta(fundReturns, benchmarkReturns) {
    if (fundReturns.length !== benchmarkReturns.length || fundReturns.length === 0) return 1;

    const fundAvg = fundReturns.reduce((sum, ret) => sum + ret, 0) / fundReturns.length;
    const benchmarkAvg = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < fundReturns.length; i++) {
      const fundDiff = fundReturns[i] - fundAvg;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkAvg;
      covariance += fundDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    covariance /= fundReturns.length;
    benchmarkVariance /= benchmarkReturns.length;

    if (benchmarkVariance === 0) return 1;

    const beta = covariance / benchmarkVariance;
    return parseFloat(beta.toFixed(3));
  }

  /**
   * Calculate Correlation Coefficient
   */
  static calculateCorrelation(returns1, returns2) {
    if (returns1.length !== returns2.length || returns1.length === 0) return 0;

    const avg1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
    const avg2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - avg1;
      const diff2 = returns2[i] - avg2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denominator1 * denominator2);
    if (denominator === 0) return 0;

    const correlation = numerator / denominator;
    return parseFloat(correlation.toFixed(3));
  }

  /**
   * Calculate Information Ratio
   */
  static calculateInformationRatio(fundReturns, benchmarkReturns) {
    if (fundReturns.length !== benchmarkReturns.length || fundReturns.length === 0) return 0;

    const excessReturns = fundReturns.map((fund, i) => fund - benchmarkReturns[i]);
    const avgExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const trackingError = this.calculateVolatility(excessReturns);

    if (trackingError === 0) return 0;

    const informationRatio = avgExcessReturn / trackingError;
    return parseFloat(informationRatio.toFixed(3));
  }

  /**
   * Calculate Sortino Ratio
   */
  static calculateSortinoRatio(returns, riskFreeRate = 2.5) {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const downsideReturns = returns.filter(ret => ret < avgReturn);
    
    if (downsideReturns.length === 0) return 0;

    const downsideVariance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);

    if (downsideDeviation === 0) return 0;

    const sortinoRatio = (avgReturn - riskFreeRate) / downsideDeviation;
    return parseFloat(sortinoRatio.toFixed(3));
  }

  /**
   * Calculate Treynor Ratio
   */
  static calculateTreynorRatio(returns, benchmarkReturns, riskFreeRate = 2.5) {
    const beta = this.calculateBeta(returns, benchmarkReturns);
    if (beta === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const treynorRatio = (avgReturn - riskFreeRate) / beta;
    return parseFloat(treynorRatio.toFixed(3));
  }

  /**
   * Calculate Jensen's Alpha
   */
  static calculateJensensAlpha(fundReturns, benchmarkReturns, riskFreeRate = 2.5) {
    const beta = this.calculateBeta(fundReturns, benchmarkReturns);
    const fundAvgReturn = fundReturns.reduce((sum, ret) => sum + ret, 0) / fundReturns.length;
    const benchmarkAvgReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

    const expectedReturn = riskFreeRate + beta * (benchmarkAvgReturn - riskFreeRate);
    const alpha = fundAvgReturn - expectedReturn;
    return parseFloat(alpha.toFixed(2));
  }

  /**
   * Calculate Value at Risk (VaR) at 95% confidence
   */
  static calculateVaR(returns, confidenceLevel = 0.95) {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * returns.length);
    const varValue = sortedReturns[index];

    return parseFloat(varValue.toFixed(2));
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  static calculateCVaR(returns, confidenceLevel = 0.95) {
    if (returns.length === 0) return 0;

    const varValue = this.calculateVaR(returns, confidenceLevel);
    const tailReturns = returns.filter(ret => ret <= varValue);
    
    if (tailReturns.length === 0) return varValue;

    const cvarValue = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    return parseFloat(cvarValue.toFixed(2));
  }

  /**
   * Calculate Risk-Adjusted Return
   */
  static calculateRiskAdjustedReturn(returns, riskMeasure = 'sharpe') {
    switch (riskMeasure.toLowerCase()) {
      case 'sharpe':
        return this.calculateSharpeRatio(returns);
      case 'sortino':
        return this.calculateSortinoRatio(returns);
      case 'treynor':
        return this.calculateTreynorRatio(returns);
      default:
        return this.calculateSharpeRatio(returns);
    }
  }

  /**
   * Calculate Portfolio Concentration Risk
   */
  static calculateConcentrationRisk(allocations) {
    if (allocations.length === 0) return 0;

    const totalAllocation = allocations.reduce((sum, alloc) => sum + alloc, 0);
    if (totalAllocation === 0) return 0;

    // Herfindahl-Hirschman Index (HHI)
    const hhi = allocations.reduce((sum, alloc) => {
      const weight = alloc / totalAllocation;
      return sum + Math.pow(weight, 2);
    }, 0);

    // Convert to percentage
    const concentrationRisk = hhi * 100;
    return parseFloat(concentrationRisk.toFixed(2));
  }

  /**
   * Calculate Diversification Ratio
   */
  static calculateDiversificationRatio(returns, weights) {
    if (returns.length !== weights.length || returns.length === 0) return 1;

    const portfolioReturn = returns.reduce((sum, ret, i) => sum + ret * weights[i], 0);
    const portfolioVolatility = this.calculateVolatility([portfolioReturn]);
    
    const weightedVolatility = returns.reduce((sum, ret, i) => sum + Math.abs(ret) * weights[i], 0);

    if (weightedVolatility === 0) return 1;

    const diversificationRatio = weightedVolatility / portfolioVolatility;
    return parseFloat(diversificationRatio.toFixed(3));
  }
}

module.exports = FinancialCalculations; 