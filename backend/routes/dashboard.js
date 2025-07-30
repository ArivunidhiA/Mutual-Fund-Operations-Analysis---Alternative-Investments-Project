const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const FinancialCalculations = require('../utils/financialCalculations');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// GET /api/dashboard/summary - Dashboard summary statistics
router.get('/summary', (req, res) => {
  // Get total funds count
  const fundsQuery = 'SELECT COUNT(*) as total_funds FROM funds';
  
  db.get(fundsQuery, [], (err, fundsResult) => {
    if (err) {
      console.error('Error fetching funds count:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total AUM
    const aumQuery = `
      SELECT SUM(assets_under_management) as total_aum
      FROM (
        SELECT assets_under_management,
               ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY date DESC) as rn
        FROM fund_performance
      ) latest
      WHERE rn = 1
    `;

    db.get(aumQuery, [], (err, aumResult) => {
      if (err) {
        console.error('Error fetching AUM:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get compliance rate
      const complianceQuery = `
        SELECT 
          COUNT(*) as total_funds,
          SUM(CASE WHEN iiroc_compliant = 1 THEN 1 ELSE 0 END) as compliant_funds
        FROM (
          SELECT iiroc_compliant,
                 ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY report_date DESC) as rn
          FROM compliance_reports
        ) latest
        WHERE rn = 1
      `;

      db.get(complianceQuery, [], (err, complianceResult) => {
        if (err) {
          console.error('Error fetching compliance:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get fund types distribution
        const typesQuery = `
          SELECT fund_type, COUNT(*) as count
          FROM funds
          GROUP BY fund_type
          ORDER BY count DESC
        `;

        db.all(typesQuery, [], (err, typesResult) => {
          if (err) {
            console.error('Error fetching fund types:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Get fund families distribution
          const familiesQuery = `
            SELECT fund_family, COUNT(*) as count
            FROM funds
            GROUP BY fund_family
            ORDER BY count DESC
            LIMIT 10
          `;

          db.all(familiesQuery, [], (err, familiesResult) => {
            if (err) {
              console.error('Error fetching fund families:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            // Calculate compliance rate
            const complianceRate = complianceResult.total_funds > 0 
              ? (complianceResult.compliant_funds / complianceResult.total_funds) * 100 
              : 0;

            res.json({
              summary: {
                total_funds: fundsResult.total_funds,
                total_aum: parseFloat((aumResult.total_aum || 0).toFixed(2)),
                compliance_rate: parseFloat(complianceRate.toFixed(2)),
                compliant_funds: complianceResult.compliant_funds,
                non_compliant_funds: complianceResult.total_funds - complianceResult.compliant_funds
              },
              fund_types: typesResult,
              fund_families: familiesResult,
              last_updated: new Date().toISOString()
            });
          });
        });
      });
    });
  });
});

// GET /api/dashboard/top-performers - Get top performing funds
router.get('/top-performers', (req, res) => {
  const { period = '12', limit = 10 } = req.query;

  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.fund_family,
      fp.nav as latest_nav,
      fp.assets_under_management as latest_aum,
      fp.date as latest_date
    FROM funds f
    JOIN (
      SELECT fund_id, nav, assets_under_management, date,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY date DESC) as rn
      FROM fund_performance
    ) fp ON f.id = fp.fund_id AND fp.rn = 1
    ORDER BY fp.nav DESC
    LIMIT ?
  `;

  db.all(query, [parseInt(limit)], (err, results) => {
    if (err) {
      console.error('Error fetching top performers:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate performance metrics for each fund
    const topPerformers = results.map(fund => {
      // Get performance data for the specified period
      const performanceQuery = `
        SELECT total_return, nav, date
        FROM fund_performance 
        WHERE fund_id = ? 
        AND date >= date("now", "-${period} months")
        ORDER BY date
      `;

      return new Promise((resolve, reject) => {
        db.all(performanceQuery, [fund.id], (err, performance) => {
          if (err) {
            reject(err);
            return;
          }

          if (performance.length === 0) {
            resolve({
              ...fund,
              total_return: 0,
              volatility: 0,
              sharpe_ratio: 0
            });
            return;
          }

          const returns = performance.map(p => p.total_return);
          const navValues = performance.map(p => p.nav);
          
          const totalReturn = navValues.length >= 2 
            ? ((navValues[navValues.length - 1] / navValues[0]) - 1) * 100 
            : 0;

          const metrics = {
            total_return: parseFloat(totalReturn.toFixed(2)),
            volatility: FinancialCalculations.calculateVolatility(returns),
            sharpe_ratio: FinancialCalculations.calculateSharpeRatio(returns),
            max_drawdown: FinancialCalculations.calculateMaxDrawdown(navValues)
          };

          resolve({
            ...fund,
            ...metrics
          });
        });
      });
    });

    Promise.all(topPerformers)
      .then(performers => {
        // Sort by total return
        performers.sort((a, b) => b.total_return - a.total_return);
        
        res.json({
          period: period,
          top_performers: performers.slice(0, parseInt(limit)),
          total_funds_analyzed: performers.length
        });
      })
      .catch(err => {
        console.error('Error calculating performance metrics:', err);
        res.status(500).json({ error: 'Error calculating performance metrics' });
      });
  });
});

// GET /api/dashboard/alternative-investments - Get alternative investments summary
router.get('/alternative-investments', (req, res) => {
  const query = `
    SELECT 
      ai.investment_type,
      COUNT(*) as fund_count,
      AVG(ai.allocation_percentage) as avg_allocation,
      AVG(ai.risk_rating) as avg_risk_rating,
      SUM(ai.allocation_percentage) as total_allocation
    FROM alternative_investments ai
    GROUP BY ai.investment_type
    ORDER BY total_allocation DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching alternative investments:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate total funds with alternative investments
    const fundsWithAltQuery = `
      SELECT COUNT(DISTINCT fund_id) as funds_with_alt
      FROM alternative_investments
    `;

    db.get(fundsWithAltQuery, [], (err, fundsResult) => {
      if (err) {
        console.error('Error fetching funds with alt investments:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const totalAllocation = results.reduce((sum, inv) => sum + inv.total_allocation, 0);
      const avgRiskRating = results.reduce((sum, inv) => sum + inv.avg_risk_rating, 0) / results.length;

      res.json({
        alternative_investments: results.map(inv => ({
          ...inv,
          avg_allocation: parseFloat(inv.avg_allocation.toFixed(2)),
          avg_risk_rating: parseFloat(inv.avg_risk_rating.toFixed(1)),
          total_allocation: parseFloat(inv.total_allocation.toFixed(2)),
          percentage_of_total: totalAllocation > 0 ? parseFloat(((inv.total_allocation / totalAllocation) * 100).toFixed(2)) : 0
        })),
        summary: {
          total_investment_types: results.length,
          funds_with_alternative_investments: fundsResult.funds_with_alt,
          total_allocation: parseFloat(totalAllocation.toFixed(2)),
          average_risk_rating: parseFloat(avgRiskRating.toFixed(1))
        }
      });
    });
  });
});

// GET /api/dashboard/performance-trends - Get performance trends
router.get('/performance-trends', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      date,
      AVG(total_return) as avg_return,
      AVG(benchmark_return) as avg_benchmark_return,
      COUNT(*) as fund_count
    FROM fund_performance 
    WHERE date >= date("now", "-${period} months")
    GROUP BY date
    ORDER BY date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching performance trends:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate cumulative returns
    let cumulativeFundReturn = 1;
    let cumulativeBenchmarkReturn = 1;
    
    const trends = results.map(row => {
      cumulativeFundReturn *= (1 + row.avg_return / 100);
      cumulativeBenchmarkReturn *= (1 + row.avg_benchmark_return / 100);
      
      return {
        date: row.date,
        avg_return: parseFloat(row.avg_return.toFixed(2)),
        avg_benchmark_return: parseFloat(row.avg_benchmark_return.toFixed(2)),
        cumulative_fund_return: parseFloat(((cumulativeFundReturn - 1) * 100).toFixed(2)),
        cumulative_benchmark_return: parseFloat(((cumulativeBenchmarkReturn - 1) * 100).toFixed(2)),
        fund_count: row.fund_count
      };
    });

    // Calculate summary statistics
    const returns = results.map(r => r.avg_return);
    const benchmarkReturns = results.map(r => r.avg_benchmark_return);

    const summary = {
      avg_monthly_return: parseFloat((returns.reduce((sum, ret) => sum + ret, 0) / returns.length).toFixed(2)),
      avg_monthly_benchmark_return: parseFloat((benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length).toFixed(2)),
      total_return: parseFloat(((cumulativeFundReturn - 1) * 100).toFixed(2)),
      total_benchmark_return: parseFloat(((cumulativeBenchmarkReturn - 1) * 100).toFixed(2)),
      volatility: FinancialCalculations.calculateVolatility(returns),
      correlation: FinancialCalculations.calculateCorrelation(returns, benchmarkReturns)
    };

    res.json({
      period: period,
      trends: trends,
      summary: summary
    });
  });
});

// GET /api/dashboard/risk-metrics - Get risk metrics summary
router.get('/risk-metrics', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      fp.total_return,
      fp.nav
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
        sharpe_ratio: FinancialCalculations.calculateSharpeRatio(fund.returns),
        var_95: FinancialCalculations.calculateVaR(fund.returns, 0.95),
        sortino_ratio: FinancialCalculations.calculateSortinoRatio(fund.returns)
      };

      return {
        ...fund,
        risk_metrics: metrics,
        risk_level: getRiskLevel(metrics.volatility, metrics.max_drawdown)
      };
    });

    // Calculate summary statistics
    const volatilities = riskMetrics.map(fund => fund.risk_metrics.volatility);
    const maxDrawdowns = riskMetrics.map(fund => fund.risk_metrics.max_drawdown);
    const sharpeRatios = riskMetrics.map(fund => fund.risk_metrics.sharpe_ratio);

    const summary = {
      avg_volatility: parseFloat((volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length).toFixed(2)),
      avg_max_drawdown: parseFloat((maxDrawdowns.reduce((sum, dd) => sum + dd, 0) / maxDrawdowns.length).toFixed(2)),
      avg_sharpe_ratio: parseFloat((sharpeRatios.reduce((sum, sr) => sum + sr, 0) / sharpeRatios.length).toFixed(3)),
      highest_risk_fund: riskMetrics.reduce((highest, fund) => 
        fund.risk_metrics.volatility > highest.risk_metrics.volatility ? fund : highest
      ),
      lowest_risk_fund: riskMetrics.reduce((lowest, fund) => 
        fund.risk_metrics.volatility < lowest.risk_metrics.volatility ? fund : lowest
      )
    };

    // Risk level distribution
    const riskDistribution = {
      'Low': riskMetrics.filter(fund => fund.risk_level === 'Low').length,
      'Low-Medium': riskMetrics.filter(fund => fund.risk_level === 'Low-Medium').length,
      'Medium': riskMetrics.filter(fund => fund.risk_level === 'Medium').length,
      'Medium-High': riskMetrics.filter(fund => fund.risk_level === 'Medium-High').length,
      'High': riskMetrics.filter(fund => fund.risk_level === 'High').length
    };

    res.json({
      period: period,
      risk_metrics: riskMetrics,
      summary: summary,
      risk_distribution: riskDistribution
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

// GET /api/dashboard/fund-family-analysis - Get fund family analysis
router.get('/fund-family-analysis', (req, res) => {
  const query = `
    SELECT 
      f.fund_family,
      COUNT(*) as fund_count,
      AVG(f.management_fee) as avg_management_fee,
      AVG(f.expense_ratio) as avg_expense_ratio,
      SUM(fp.assets_under_management) as total_aum
    FROM funds f
    LEFT JOIN (
      SELECT fund_id, assets_under_management,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY date DESC) as rn
      FROM fund_performance
    ) fp ON f.id = fp.fund_id AND fp.rn = 1
    GROUP BY f.fund_family
    ORDER BY total_aum DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching fund family analysis:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalAUM = results.reduce((sum, family) => sum + (family.total_aum || 0), 0);

    const familyAnalysis = results.map(family => ({
      ...family,
      avg_management_fee: parseFloat(family.avg_management_fee.toFixed(2)),
      avg_expense_ratio: parseFloat(family.avg_expense_ratio.toFixed(2)),
      total_aum: parseFloat((family.total_aum || 0).toFixed(2)),
      market_share: totalAUM > 0 ? parseFloat(((family.total_aum || 0) / totalAUM * 100).toFixed(2)) : 0
    }));

    res.json({
      fund_families: familyAnalysis,
      summary: {
        total_families: results.length,
        total_aum: parseFloat(totalAUM.toFixed(2)),
        avg_funds_per_family: parseFloat((results.reduce((sum, f) => sum + f.fund_count, 0) / results.length).toFixed(1))
      }
    });
  });
});

module.exports = router; 