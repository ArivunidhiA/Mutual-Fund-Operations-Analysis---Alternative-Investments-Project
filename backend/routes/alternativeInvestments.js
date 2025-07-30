const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const FinancialCalculations = require('../utils/financialCalculations');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// GET /api/alternative-investments/summary - Get alternative investments summary
router.get('/summary', (req, res) => {
  const query = `
    SELECT 
      ai.investment_type,
      COUNT(DISTINCT ai.fund_id) as fund_count,
      AVG(ai.allocation_percentage) as avg_allocation,
      AVG(ai.risk_rating) as avg_risk_rating,
      SUM(ai.allocation_percentage) as total_allocation,
      MIN(ai.allocation_percentage) as min_allocation,
      MAX(ai.allocation_percentage) as max_allocation
    FROM alternative_investments ai
    GROUP BY ai.investment_type
    ORDER BY total_allocation DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching alternative investments summary:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalAllocation = results.reduce((sum, inv) => sum + inv.total_allocation, 0);
    const totalFunds = results.reduce((sum, inv) => sum + inv.fund_count, 0);

    const summary = {
      total_investment_types: results.length,
      total_funds_with_alternatives: totalFunds,
      total_allocation: parseFloat(totalAllocation.toFixed(2)),
      average_risk_rating: parseFloat((results.reduce((sum, inv) => sum + inv.avg_risk_rating, 0) / results.length).toFixed(1))
    };

    const investments = results.map(inv => ({
      ...inv,
      avg_allocation: parseFloat(inv.avg_allocation.toFixed(2)),
      avg_risk_rating: parseFloat(inv.avg_risk_rating.toFixed(1)),
      total_allocation: parseFloat(inv.total_allocation.toFixed(2)),
      min_allocation: parseFloat(inv.min_allocation.toFixed(2)),
      max_allocation: parseFloat(inv.max_allocation.toFixed(2)),
      percentage_of_total: totalAllocation > 0 ? parseFloat(((inv.total_allocation / totalAllocation) * 100).toFixed(2)) : 0,
      risk_level: getRiskLevel(inv.avg_risk_rating)
    }));

    res.json({
      summary: summary,
      alternative_investments: investments
    });
  });
});

// GET /api/alternative-investments/fund/:fund_id - Get alternative investments for a specific fund
router.get('/fund/:fund_id', (req, res) => {
  const fundId = req.params.fund_id;

  const query = `
    SELECT 
      ai.*,
      f.fund_name,
      f.fund_type,
      f.fund_family
    FROM alternative_investments ai
    JOIN funds f ON ai.fund_id = f.id
    WHERE ai.fund_id = ?
    ORDER BY ai.allocation_percentage DESC
  `;

  db.all(query, [fundId], (err, results) => {
    if (err) {
      console.error('Error fetching fund alternative investments:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.json({
        fund_id: fundId,
        alternative_investments: [],
        summary: {
          total_allocation: 0,
          average_risk_rating: 0,
          concentration_risk: 0
        }
      });
    }

    const totalAllocation = results.reduce((sum, inv) => sum + inv.allocation_percentage, 0);
    const avgRiskRating = results.reduce((sum, inv) => sum + inv.risk_rating, 0) / results.length;
    const concentrationRisk = FinancialCalculations.calculateConcentrationRisk(
      results.map(inv => inv.allocation_percentage)
    );

    const fundInfo = {
      fund_id: fundId,
      fund_name: results[0].fund_name,
      fund_type: results[0].fund_type,
      fund_family: results[0].fund_family
    };

    const investments = results.map(inv => ({
      id: inv.id,
      investment_type: inv.investment_type,
      allocation_percentage: parseFloat(inv.allocation_percentage.toFixed(2)),
      risk_rating: inv.risk_rating,
      description: inv.description,
      risk_level: getRiskLevel(inv.risk_rating)
    }));

    res.json({
      fund_info: fundInfo,
      alternative_investments: investments,
      summary: {
        total_allocation: parseFloat(totalAllocation.toFixed(2)),
        average_risk_rating: parseFloat(avgRiskRating.toFixed(1)),
        concentration_risk: parseFloat(concentrationRisk.toFixed(2)),
        risk_level: getRiskLevel(avgRiskRating)
      }
    });
  });
});

// GET /api/alternative-investments/risk-analysis - Get risk analysis for alternative investments
router.get('/risk-analysis', (req, res) => {
  const query = `
    SELECT 
      ai.investment_type,
      ai.risk_rating,
      ai.allocation_percentage,
      f.fund_type,
      f.fund_family
    FROM alternative_investments ai
    JOIN funds f ON ai.fund_id = f.id
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching risk analysis:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by investment type
    const riskAnalysis = {};
    results.forEach(inv => {
      if (!riskAnalysis[inv.investment_type]) {
        riskAnalysis[inv.investment_type] = {
          investment_type: inv.investment_type,
          allocations: [],
          risk_ratings: [],
          fund_types: new Set(),
          fund_families: new Set()
        };
      }
      riskAnalysis[inv.investment_type].allocations.push(inv.allocation_percentage);
      riskAnalysis[inv.investment_type].risk_ratings.push(inv.risk_rating);
      riskAnalysis[inv.investment_type].fund_types.add(inv.fund_type);
      riskAnalysis[inv.investment_type].fund_families.add(inv.fund_family);
    });

    // Calculate risk metrics for each investment type
    const analysis = Object.values(riskAnalysis).map(inv => {
      const avgAllocation = inv.allocations.reduce((sum, alloc) => sum + alloc, 0) / inv.allocations.length;
      const avgRiskRating = inv.risk_ratings.reduce((sum, risk) => sum + risk, 0) / inv.risk_ratings.length;
      const maxAllocation = Math.max(...inv.allocations);
      const minAllocation = Math.min(...inv.allocations);

      return {
        investment_type: inv.investment_type,
        avg_allocation: parseFloat(avgAllocation.toFixed(2)),
        avg_risk_rating: parseFloat(avgRiskRating.toFixed(1)),
        max_allocation: parseFloat(maxAllocation.toFixed(2)),
        min_allocation: parseFloat(minAllocation.toFixed(2)),
        allocation_volatility: FinancialCalculations.calculateVolatility(inv.allocations),
        risk_volatility: FinancialCalculations.calculateVolatility(inv.risk_ratings),
        fund_types: Array.from(inv.fund_types),
        fund_families: Array.from(inv.fund_families),
        fund_count: inv.allocations.length,
        risk_level: getRiskLevel(avgRiskRating)
      };
    });

    // Calculate overall risk metrics
    const allAllocations = results.map(inv => inv.allocation_percentage);
    const allRiskRatings = results.map(inv => inv.risk_rating);

    const overallRisk = {
      total_investments: results.length,
      avg_allocation: parseFloat((allAllocations.reduce((sum, alloc) => sum + alloc, 0) / allAllocations.length).toFixed(2)),
      avg_risk_rating: parseFloat((allRiskRatings.reduce((sum, risk) => sum + risk, 0) / allRiskRatings.length).toFixed(1)),
      allocation_volatility: FinancialCalculations.calculateVolatility(allAllocations),
      risk_volatility: FinancialCalculations.calculateVolatility(allRiskRatings),
      concentration_risk: FinancialCalculations.calculateConcentrationRisk(allAllocations)
    };

    res.json({
      risk_analysis: analysis,
      overall_risk: overallRisk
    });
  });
});

// GET /api/alternative-investments/correlation - Get correlation analysis between alternative investments
router.get('/correlation', (req, res) => {
  const query = `
    SELECT 
      ai.fund_id,
      ai.investment_type,
      ai.allocation_percentage,
      fp.total_return,
      fp.date
    FROM alternative_investments ai
    JOIN fund_performance fp ON ai.fund_id = fp.fund_id
    WHERE fp.date >= date("now", "-12 months")
    ORDER BY ai.fund_id, fp.date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching correlation data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by investment type and calculate returns
    const investmentReturns = {};
    results.forEach(row => {
      if (!investmentReturns[row.investment_type]) {
        investmentReturns[row.investment_type] = [];
      }
      investmentReturns[row.investment_type].push(row.total_return);
    });

    // Calculate correlation matrix
    const investmentTypes = Object.keys(investmentReturns);
    const correlationMatrix = {};

    for (let i = 0; i < investmentTypes.length; i++) {
      for (let j = i; j < investmentTypes.length; j++) {
        const type1 = investmentTypes[i];
        const type2 = investmentTypes[j];
        
        if (!correlationMatrix[type1]) correlationMatrix[type1] = {};
        if (!correlationMatrix[type2]) correlationMatrix[type2] = {};

        const returns1 = investmentReturns[type1];
        const returns2 = investmentReturns[type2];

        // Ensure both arrays have the same length
        const minLength = Math.min(returns1.length, returns2.length);
        const correlation = FinancialCalculations.calculateCorrelation(
          returns1.slice(0, minLength),
          returns2.slice(0, minLength)
        );

        correlationMatrix[type1][type2] = correlation;
        correlationMatrix[type2][type1] = correlation;
      }
    }

    // Calculate diversification metrics
    const diversificationMetrics = investmentTypes.map(type => {
      const correlations = Object.values(correlationMatrix[type]).filter(corr => corr !== 1);
      const avgCorrelation = correlations.length > 0 
        ? correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length 
        : 0;

      return {
        investment_type: type,
        avg_correlation: parseFloat(avgCorrelation.toFixed(3)),
        diversification_score: parseFloat((1 - Math.abs(avgCorrelation)).toFixed(3)),
        return_count: investmentReturns[type].length
      };
    });

    res.json({
      correlation_matrix: correlationMatrix,
      diversification_metrics: diversificationMetrics,
      investment_types: investmentTypes
    });
  });
});

// GET /api/alternative-investments/performance - Get performance analysis for alternative investments
router.get('/performance', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      ai.investment_type,
      fp.total_return,
      fp.benchmark_return,
      fp.nav,
      fp.date
    FROM alternative_investments ai
    JOIN fund_performance fp ON ai.fund_id = fp.fund_id
    WHERE fp.date >= date("now", "-${period} months")
    ORDER BY ai.investment_type, fp.date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching performance data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by investment type
    const performanceData = {};
    results.forEach(row => {
      if (!performanceData[row.investment_type]) {
        performanceData[row.investment_type] = {
          returns: [],
          benchmark_returns: [],
          nav_values: []
        };
      }
      performanceData[row.investment_type].returns.push(row.total_return);
      performanceData[row.investment_type].benchmark_returns.push(row.benchmark_return);
      performanceData[row.investment_type].nav_values.push(row.nav);
    });

    // Calculate performance metrics for each investment type
    const performance = Object.keys(performanceData).map(type => {
      const data = performanceData[type];
      const returns = data.returns;
      const benchmarkReturns = data.benchmark_returns;
      const navValues = data.nav_values;

      const totalReturn = navValues.length >= 2 
        ? ((navValues[navValues.length - 1] / navValues[0]) - 1) * 100 
        : 0;

      const metrics = {
        total_return: parseFloat(totalReturn.toFixed(2)),
        volatility: FinancialCalculations.calculateVolatility(returns),
        sharpe_ratio: FinancialCalculations.calculateSharpeRatio(returns),
        max_drawdown: FinancialCalculations.calculateMaxDrawdown(navValues),
        beta: FinancialCalculations.calculateBeta(returns, benchmarkReturns),
        information_ratio: FinancialCalculations.calculateInformationRatio(returns, benchmarkReturns),
        sortino_ratio: FinancialCalculations.calculateSortinoRatio(returns)
      };

      return {
        investment_type: type,
        metrics: metrics,
        data_points: returns.length,
        avg_return: parseFloat((returns.reduce((sum, ret) => sum + ret, 0) / returns.length).toFixed(2)),
        avg_benchmark_return: parseFloat((benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length).toFixed(2))
      };
    });

    res.json({
      period: period,
      performance: performance
    });
  });
});

// GET /api/alternative-investments/allocation-limits - Check allocation limits compliance
router.get('/allocation-limits', (req, res) => {
  const maxConcentration = 20; // IIROC limit

  const query = `
    SELECT 
      ai.fund_id,
      f.fund_name,
      ai.investment_type,
      ai.allocation_percentage,
      ai.risk_rating
    FROM alternative_investments ai
    JOIN funds f ON ai.fund_id = f.id
    WHERE ai.allocation_percentage > ?
    ORDER BY ai.allocation_percentage DESC
  `;

  db.all(query, [maxConcentration], (err, violations) => {
    if (err) {
      console.error('Error fetching allocation limits:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get all allocations for context
    const allQuery = `
      SELECT 
        ai.fund_id,
        f.fund_name,
        ai.investment_type,
        ai.allocation_percentage,
        ai.risk_rating
      FROM alternative_investments ai
      JOIN funds f ON ai.fund_id = f.id
      ORDER BY ai.allocation_percentage DESC
    `;

    db.all(allQuery, [], (err, allAllocations) => {
      if (err) {
        console.error('Error fetching all allocations:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const complianceSummary = {
        total_funds_with_alternatives: new Set(allAllocations.map(a => a.fund_id)).size,
        funds_with_violations: new Set(violations.map(v => v.fund_id)).size,
        total_violations: violations.length,
        compliance_rate: new Set(allAllocations.map(a => a.fund_id)).size > 0 
          ? ((new Set(allAllocations.map(a => a.fund_id)).size - new Set(violations.map(v => v.fund_id)).size) / new Set(allAllocations.map(a => a.fund_id)).size) * 100
          : 100
      };

      res.json({
        max_concentration_limit: maxConcentration,
        compliance_summary: complianceSummary,
        violations: violations.map(v => ({
          fund_id: v.fund_id,
          fund_name: v.fund_name,
          investment_type: v.investment_type,
          allocation_percentage: parseFloat(v.allocation_percentage.toFixed(2)),
          risk_rating: v.risk_rating,
          excess_allocation: parseFloat((v.allocation_percentage - maxConcentration).toFixed(2))
        })),
        all_allocations: allAllocations.map(a => ({
          fund_id: a.fund_id,
          fund_name: a.fund_name,
          investment_type: a.investment_type,
          allocation_percentage: parseFloat(a.allocation_percentage.toFixed(2)),
          risk_rating: a.risk_rating,
          compliant: a.allocation_percentage <= maxConcentration
        }))
      });
    });
  });
});

// Helper function to determine risk level
function getRiskLevel(riskRating) {
  if (riskRating <= 3) return 'Low';
  if (riskRating <= 5) return 'Low-Medium';
  if (riskRating <= 7) return 'Medium';
  if (riskRating <= 9) return 'Medium-High';
  return 'High';
}

module.exports = router; 