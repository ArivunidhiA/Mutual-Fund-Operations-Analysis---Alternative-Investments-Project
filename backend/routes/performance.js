const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const FinancialCalculations = require('../utils/financialCalculations');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// GET /api/performance/analytics - Get performance analytics for all funds
router.get('/analytics', (req, res) => {
  const { period = '12', metric = 'total_return' } = req.query;

  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.fund_family,
      fp.total_return,
      fp.benchmark_return,
      fp.nav,
      fp.assets_under_management,
      fp.date
    FROM funds f
    JOIN fund_performance fp ON f.id = fp.fund_id
    WHERE fp.date >= date("now", "-${period} months")
    ORDER BY f.id, fp.date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching performance analytics:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by fund
    const fundPerformance = {};
    results.forEach(row => {
      if (!fundPerformance[row.id]) {
        fundPerformance[row.id] = {
          fund_id: row.id,
          fund_name: row.fund_name,
          fund_type: row.fund_type,
          fund_family: row.fund_family,
          returns: [],
          benchmark_returns: [],
          nav_values: [],
          aum_values: []
        };
      }
      fundPerformance[row.id].returns.push(row.total_return);
      fundPerformance[row.id].benchmark_returns.push(row.benchmark_return);
      fundPerformance[row.id].nav_values.push(row.nav);
      fundPerformance[row.id].aum_values.push(row.assets_under_management);
    });

    // Calculate metrics for each fund
    const analytics = Object.values(fundPerformance).map(fund => {
      const metrics = {
        volatility: FinancialCalculations.calculateVolatility(fund.returns),
        sharpe_ratio: FinancialCalculations.calculateSharpeRatio(fund.returns),
        max_drawdown: FinancialCalculations.calculateMaxDrawdown(fund.nav_values),
        beta: FinancialCalculations.calculateBeta(fund.returns, fund.benchmark_returns),
        correlation: FinancialCalculations.calculateCorrelation(fund.returns, fund.benchmark_returns),
        information_ratio: FinancialCalculations.calculateInformationRatio(fund.returns, fund.benchmark_returns),
        sortino_ratio: FinancialCalculations.calculateSortinoRatio(fund.returns),
        var_95: FinancialCalculations.calculateVaR(fund.returns, 0.95),
        cvar_95: FinancialCalculations.calculateCVaR(fund.returns, 0.95)
      };

      return {
        ...fund,
        metrics: metrics,
        avg_return: fund.returns.reduce((sum, ret) => sum + ret, 0) / fund.returns.length,
        avg_benchmark_return: fund.benchmark_returns.reduce((sum, ret) => sum + ret, 0) / fund.benchmark_returns.length,
        latest_aum: fund.aum_values[fund.aum_values.length - 1]
      };
    });

    res.json({
      period: period,
      total_funds: analytics.length,
      analytics: analytics
    });
  });
});

// GET /api/performance/comparison - Compare multiple funds
router.get('/comparison', (req, res) => {
  const { fund_ids, period = '12' } = req.query;

  if (!fund_ids) {
    return res.status(400).json({ error: 'fund_ids parameter is required' });
  }

  const fundIdArray = fund_ids.split(',').map(id => parseInt(id.trim()));
  const placeholders = fundIdArray.map(() => '?').join(',');

  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.fund_family,
      fp.total_return,
      fp.benchmark_return,
      fp.nav,
      fp.date
    FROM funds f
    JOIN fund_performance fp ON f.id = fp.fund_id
    WHERE f.id IN (${placeholders}) 
    AND fp.date >= date("now", "-${period} months")
    ORDER BY f.id, fp.date
  `;

  db.all(query, fundIdArray, (err, results) => {
    if (err) {
      console.error('Error fetching performance comparison:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by fund
    const fundData = {};
    results.forEach(row => {
      if (!fundData[row.id]) {
        fundData[row.id] = {
          fund_id: row.id,
          fund_name: row.fund_name,
          fund_type: row.fund_type,
          fund_family: row.fund_family,
          returns: [],
          benchmark_returns: [],
          nav_values: [],
          dates: []
        };
      }
      fundData[row.id].returns.push(row.total_return);
      fundData[row.id].benchmark_returns.push(row.benchmark_return);
      fundData[row.id].nav_values.push(row.nav);
      fundData[row.id].dates.push(row.date);
    });

    // Calculate comparison metrics
    const comparison = Object.values(fundData).map(fund => {
      const metrics = {
        volatility: FinancialCalculations.calculateVolatility(fund.returns),
        sharpe_ratio: FinancialCalculations.calculateSharpeRatio(fund.returns),
        max_drawdown: FinancialCalculations.calculateMaxDrawdown(fund.nav_values),
        beta: FinancialCalculations.calculateBeta(fund.returns, fund.benchmark_returns),
        information_ratio: FinancialCalculations.calculateInformationRatio(fund.returns, fund.benchmark_returns),
        sortino_ratio: FinancialCalculations.calculateSortinoRatio(fund.returns)
      };

      const totalReturn = fund.nav_values[fund.nav_values.length - 1] / fund.nav_values[0] - 1;
      const benchmarkTotalReturn = fund.benchmark_returns.reduce((sum, ret) => sum + (1 + ret / 100), 1) - 1;

      return {
        ...fund,
        metrics: metrics,
        total_return: parseFloat((totalReturn * 100).toFixed(2)),
        benchmark_total_return: parseFloat((benchmarkTotalReturn * 100).toFixed(2)),
        excess_return: parseFloat(((totalReturn - benchmarkTotalReturn) * 100).toFixed(2)),
        avg_return: parseFloat((fund.returns.reduce((sum, ret) => sum + ret, 0) / fund.returns.length).toFixed(2))
      };
    });

    // Calculate correlation matrix
    const correlationMatrix = {};
    const fundIds = Object.keys(fundData);
    
    for (let i = 0; i < fundIds.length; i++) {
      for (let j = i; j < fundIds.length; j++) {
        const fund1Id = fundIds[i];
        const fund2Id = fundIds[j];
        const fund1Returns = fundData[fund1Id].returns;
        const fund2Returns = fundData[fund2Id].returns;
        
        const correlation = FinancialCalculations.calculateCorrelation(fund1Returns, fund2Returns);
        
        if (!correlationMatrix[fund1Id]) correlationMatrix[fund1Id] = {};
        if (!correlationMatrix[fund2Id]) correlationMatrix[fund2Id] = {};
        
        correlationMatrix[fund1Id][fund2Id] = correlation;
        correlationMatrix[fund2Id][fund1Id] = correlation;
      }
    }

    res.json({
      period: period,
      comparison: comparison,
      correlation_matrix: correlationMatrix,
      summary: {
        best_performer: comparison.reduce((best, fund) => 
          fund.total_return > best.total_return ? fund : best
        ),
        worst_performer: comparison.reduce((worst, fund) => 
          fund.total_return < worst.total_return ? fund : worst
        ),
        highest_volatility: comparison.reduce((highest, fund) => 
          fund.metrics.volatility > highest.metrics.volatility ? fund : highest
        ),
        best_sharpe: comparison.reduce((best, fund) => 
          fund.metrics.sharpe_ratio > best.metrics.sharpe_ratio ? fund : best
        )
      }
    });
  });
});

// GET /api/performance/benchmark - Get benchmark performance data
router.get('/benchmark', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      date,
      AVG(benchmark_return) as avg_benchmark_return,
      AVG(total_return) as avg_fund_return,
      COUNT(*) as fund_count
    FROM fund_performance 
    WHERE date >= date("now", "-${period} months")
    GROUP BY date
    ORDER BY date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching benchmark data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const benchmarkReturns = results.map(r => r.avg_benchmark_return);
    const fundReturns = results.map(r => r.avg_fund_return);

    const metrics = {
      benchmark_volatility: FinancialCalculations.calculateVolatility(benchmarkReturns),
      fund_volatility: FinancialCalculations.calculateVolatility(fundReturns),
      correlation: FinancialCalculations.calculateCorrelation(benchmarkReturns, fundReturns),
      tracking_error: FinancialCalculations.calculateVolatility(
        fundReturns.map((fund, i) => fund - benchmarkReturns[i])
      )
    };

    res.json({
      period: period,
      benchmark_data: results,
      metrics: metrics,
      total_return: parseFloat((fundReturns.reduce((sum, ret) => sum + (1 + ret / 100), 1) - 1) * 100).toFixed(2),
      benchmark_total_return: parseFloat((benchmarkReturns.reduce((sum, ret) => sum + (1 + ret / 100), 1) - 1) * 100).toFixed(2)
    });
  });
});

// GET /api/performance/risk-metrics - Get risk metrics for all funds
router.get('/risk-metrics', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      fp.total_return,
      fp.nav,
      fp.date
    FROM funds f
    JOIN fund_performance fp ON f.id = fp.fund_id
    WHERE fp.date >= date("now", "-${period} months")
    ORDER BY f.id, fp.date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching risk metrics:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by fund
    const fundRiskData = {};
    results.forEach(row => {
      if (!fundRiskData[row.id]) {
        fundRiskData[row.id] = {
          fund_id: row.id,
          fund_name: row.fund_name,
          fund_type: row.fund_type,
          returns: [],
          nav_values: []
        };
      }
      fundRiskData[row.id].returns.push(row.total_return);
      fundRiskData[row.id].nav_values.push(row.nav);
    });

    // Calculate risk metrics for each fund
    const riskMetrics = Object.values(fundRiskData).map(fund => {
      const metrics = {
        volatility: FinancialCalculations.calculateVolatility(fund.returns),
        max_drawdown: FinancialCalculations.calculateMaxDrawdown(fund.nav_values),
        var_95: FinancialCalculations.calculateVaR(fund.returns, 0.95),
        cvar_95: FinancialCalculations.calculateCVaR(fund.returns, 0.95),
        var_99: FinancialCalculations.calculateVaR(fund.returns, 0.99),
        cvar_99: FinancialCalculations.calculateCVaR(fund.returns, 0.99),
        sharpe_ratio: FinancialCalculations.calculateSharpeRatio(fund.returns),
        sortino_ratio: FinancialCalculations.calculateSortinoRatio(fund.returns)
      };

      return {
        ...fund,
        risk_metrics: metrics,
        risk_level: getRiskLevel(metrics.volatility, metrics.max_drawdown)
      };
    });

    res.json({
      period: period,
      risk_metrics: riskMetrics,
      summary: {
        highest_risk: riskMetrics.reduce((highest, fund) => 
          fund.risk_metrics.volatility > highest.risk_metrics.volatility ? fund : highest
        ),
        lowest_risk: riskMetrics.reduce((lowest, fund) => 
          fund.risk_metrics.volatility < lowest.risk_metrics.volatility ? fund : lowest
        ),
        highest_drawdown: riskMetrics.reduce((highest, fund) => 
          fund.risk_metrics.max_drawdown > highest.risk_metrics.max_drawdown ? fund : highest
        )
      }
    });
  });
});

// Helper function to determine risk level
function getRiskLevel(volatility, maxDrawdown) {
  const riskScore = (volatility * 0.6) + (maxDrawdown * 0.4);
  
  if (riskScore <= 10) return 'Low';
  if (riskScore <= 20) return 'Low-Medium';
  if (riskScore <= 30) return 'Medium';
  if (riskScore <= 40) return 'Medium-High';
  return 'High';
}

// GET /api/performance/returns-distribution - Get returns distribution analysis
router.get('/returns-distribution', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT total_return
    FROM fund_performance 
    WHERE date >= date("now", "-${period} months")
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching returns distribution:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const returns = results.map(r => r.total_return);
    
    // Calculate distribution statistics
    const sortedReturns = returns.sort((a, b) => a - b);
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const median = sortedReturns[Math.floor(sortedReturns.length / 2)];
    
    // Calculate percentiles
    const percentiles = {
      p10: sortedReturns[Math.floor(sortedReturns.length * 0.1)],
      p25: sortedReturns[Math.floor(sortedReturns.length * 0.25)],
      p50: median,
      p75: sortedReturns[Math.floor(sortedReturns.length * 0.75)],
      p90: sortedReturns[Math.floor(sortedReturns.length * 0.9)]
    };

    // Create histogram bins
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binCount = 20;
    const binSize = (max - min) / binCount;
    
    const histogram = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize;
      const count = returns.filter(ret => ret >= binStart && ret < binEnd).length;
      
      histogram.push({
        bin: i + 1,
        start: parseFloat(binStart.toFixed(2)),
        end: parseFloat(binEnd.toFixed(2)),
        count: count,
        percentage: parseFloat(((count / returns.length) * 100).toFixed(2))
      });
    }

    res.json({
      period: period,
      total_observations: returns.length,
      statistics: {
        mean: parseFloat(mean.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        standard_deviation: FinancialCalculations.calculateVolatility(returns),
        percentiles: percentiles
      },
      histogram: histogram,
      skewness: calculateSkewness(returns),
      kurtosis: calculateKurtosis(returns)
    });
  });
});

// Helper function to calculate skewness
function calculateSkewness(returns) {
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 3), 0) / returns.length;
  return parseFloat(skewness.toFixed(3));
}

// Helper function to calculate kurtosis
function calculateKurtosis(returns) {
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 4), 0) / returns.length;
  return parseFloat(kurtosis.toFixed(3));
}

module.exports = router; 