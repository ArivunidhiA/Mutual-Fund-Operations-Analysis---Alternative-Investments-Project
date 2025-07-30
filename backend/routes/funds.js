const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const FinancialCalculations = require('../utils/financialCalculations');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// GET /api/funds - List all funds with basic info
router.get('/', (req, res) => {
  const { search, type, family, sortBy = 'fund_name', order = 'ASC' } = req.query;
  
  let query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.inception_date,
      f.management_fee,
      f.expense_ratio,
      f.fund_family,
      f.created_at,
      fp.nav as latest_nav,
      fp.assets_under_management as latest_aum
    FROM funds f
    LEFT JOIN (
      SELECT fund_id, nav, assets_under_management, date,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY date DESC) as rn
      FROM fund_performance
    ) fp ON f.id = fp.fund_id AND fp.rn = 1
  `;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(f.fund_name LIKE ? OR f.fund_family LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (type) {
    conditions.push('f.fund_type = ?');
    params.push(type);
  }

  if (family) {
    conditions.push('f.fund_family = ?');
    params.push(family);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ` ORDER BY ${sortBy} ${order}`;

  db.all(query, params, (err, funds) => {
    if (err) {
      console.error('Error fetching funds:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate additional metrics for each fund
    const fundsWithMetrics = funds.map(fund => ({
      ...fund,
      total_fees: parseFloat((fund.management_fee + fund.expense_ratio).toFixed(2)),
      fund_age: new Date().getFullYear() - new Date(fund.inception_date).getFullYear()
    }));

    res.json({
      funds: fundsWithMetrics,
      total: fundsWithMetrics.length,
      filters: { search, type, family, sortBy, order }
    });
  });
});

// GET /api/funds/:id - Get detailed fund information
router.get('/:id', (req, res) => {
  const fundId = req.params.id;

  const fundQuery = `
    SELECT 
      f.*,
      fp.nav as latest_nav,
      fp.assets_under_management as latest_aum,
      fp.date as latest_date
    FROM funds f
    LEFT JOIN (
      SELECT fund_id, nav, assets_under_management, date,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY date DESC) as rn
      FROM fund_performance
    ) fp ON f.id = fp.fund_id AND fp.rn = 1
    WHERE f.id = ?
  `;

  db.get(fundQuery, [fundId], (err, fund) => {
    if (err) {
      console.error('Error fetching fund:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    // Get performance summary
    const performanceQuery = `
      SELECT 
        MIN(nav) as min_nav,
        MAX(nav) as max_nav,
        AVG(nav) as avg_nav,
        MIN(total_return) as min_return,
        MAX(total_return) as max_return,
        AVG(total_return) as avg_return,
        COUNT(*) as data_points
      FROM fund_performance 
      WHERE fund_id = ?
    `;

    db.get(performanceQuery, [fundId], (err, performance) => {
      if (err) {
        console.error('Error fetching performance:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const fundData = {
        ...fund,
        total_fees: parseFloat((fund.management_fee + fund.expense_ratio).toFixed(2)),
        fund_age: new Date().getFullYear() - new Date(fund.inception_date).getFullYear(),
        performance_summary: performance
      };

      res.json(fundData);
    });
  });
});

// GET /api/funds/:id/performance - Get fund performance data with PROR calculations
router.get('/:id/performance', (req, res) => {
  const fundId = req.params.id;
  const { period = 'all', calculate_pror = false } = req.query;

  let dateFilter = '';
  const params = [fundId];

  if (period !== 'all') {
    const months = parseInt(period);
    if (!isNaN(months)) {
      dateFilter = 'AND date >= date("now", "-' + months + ' months")';
    }
  }

  const query = `
    SELECT 
      date,
      nav,
      total_return,
      benchmark_return,
      assets_under_management
    FROM fund_performance 
    WHERE fund_id = ? ${dateFilter}
    ORDER BY date ASC
  `;

  db.all(query, params, (err, performance) => {
    if (err) {
      console.error('Error fetching performance:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (performance.length === 0) {
      return res.json({ performance: [], pror_calculation: null });
    }

    let prorCalculation = null;
    if (calculate_pror === 'true' && performance.length >= 2) {
      const firstRecord = performance[0];
      const lastRecord = performance[performance.length - 1];
      
      // Calculate PROR using the financial calculations utility
      try {
        const beginningValue = firstRecord.nav;
        const endingValue = lastRecord.nav;
        const contributions = 0; // Would need actual contribution data
        const withdrawals = 0; // Would need actual withdrawal data
        const timePeriod = performance.length; // months

        const pror = FinancialCalculations.calculatePROR(
          beginningValue, 
          endingValue, 
          contributions, 
          withdrawals, 
          timePeriod
        );

        prorCalculation = {
          beginning_value: beginningValue,
          ending_value: endingValue,
          contributions: contributions,
          withdrawals: withdrawals,
          time_period_months: timePeriod,
          pror_percentage: pror,
          calculation_date: new Date().toISOString()
        };
      } catch (error) {
        console.error('PROR calculation error:', error);
        prorCalculation = { error: error.message };
      }
    }

    // Calculate additional metrics
    const returns = performance.map(p => p.total_return);
    const navValues = performance.map(p => p.nav);
    const benchmarkReturns = performance.map(p => p.benchmark_return);

    const metrics = {
      volatility: FinancialCalculations.calculateVolatility(returns),
      max_drawdown: FinancialCalculations.calculateMaxDrawdown(navValues),
      sharpe_ratio: FinancialCalculations.calculateSharpeRatio(returns),
      beta: FinancialCalculations.calculateBeta(returns, benchmarkReturns),
      correlation: FinancialCalculations.calculateCorrelation(returns, benchmarkReturns),
      information_ratio: FinancialCalculations.calculateInformationRatio(returns, benchmarkReturns)
    };

    res.json({
      fund_id: fundId,
      performance: performance,
      metrics: metrics,
      pror_calculation: prorCalculation,
      period: period,
      data_points: performance.length
    });
  });
});

// GET /api/funds/:id/alternative-investments - Get alternative investment allocations
router.get('/:id/alternative-investments', (req, res) => {
  const fundId = req.params.id;

  const query = `
    SELECT 
      id,
      investment_type,
      allocation_percentage,
      risk_rating,
      description
    FROM alternative_investments 
    WHERE fund_id = ?
    ORDER BY allocation_percentage DESC
  `;

  db.all(query, [fundId], (err, investments) => {
    if (err) {
      console.error('Error fetching alternative investments:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const totalAllocation = investments.reduce((sum, inv) => sum + inv.allocation_percentage, 0);
    const concentrationRisk = FinancialCalculations.calculateConcentrationRisk(
      investments.map(inv => inv.allocation_percentage)
    );

    res.json({
      fund_id: fundId,
      alternative_investments: investments,
      total_allocation: totalAllocation,
      concentration_risk: concentrationRisk,
      risk_level: concentrationRisk > 50 ? 'High' : concentrationRisk > 30 ? 'Medium' : 'Low'
    });
  });
});

// POST /api/funds/:id/calculate-pror - Calculate Personal Rate of Return
router.post('/:id/calculate-pror', (req, res) => {
  const fundId = req.params.id;
  const { beginning_value, ending_value, contributions, withdrawals, time_period } = req.body;

  // Validate required fields
  if (!beginning_value || !ending_value || !time_period) {
    return res.status(400).json({ 
      error: 'Missing required fields: beginning_value, ending_value, time_period' 
    });
  }

  try {
    const pror = FinancialCalculations.calculatePROR(
      parseFloat(beginning_value),
      parseFloat(ending_value),
      parseFloat(contributions || 0),
      parseFloat(withdrawals || 0),
      parseFloat(time_period)
    );

    const annualizedReturn = FinancialCalculations.calculateAnnualizedReturn(
      [pror], 
      parseFloat(time_period)
    );

    res.json({
      fund_id: fundId,
      pror_calculation: {
        beginning_value: parseFloat(beginning_value),
        ending_value: parseFloat(ending_value),
        contributions: parseFloat(contributions || 0),
        withdrawals: parseFloat(withdrawals || 0),
        time_period_months: parseFloat(time_period),
        pror_percentage: pror,
        annualized_return: annualizedReturn,
        calculation_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('PROR calculation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/funds/types - Get all fund types
router.get('/types', (req, res) => {
  const query = 'SELECT DISTINCT fund_type FROM funds ORDER BY fund_type';
  
  db.all(query, [], (err, types) => {
    if (err) {
      console.error('Error fetching fund types:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ fund_types: types.map(t => t.fund_type) });
  });
});

// GET /api/funds/families - Get all fund families
router.get('/families', (req, res) => {
  const query = 'SELECT DISTINCT fund_family FROM funds ORDER BY fund_family';
  
  db.all(query, [], (err, families) => {
    if (err) {
      console.error('Error fetching fund families:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ fund_families: families.map(f => f.fund_family) });
  });
});

module.exports = router; 