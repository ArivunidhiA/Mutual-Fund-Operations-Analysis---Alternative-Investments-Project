const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const IIROCCompliance = require('../utils/iirocCompliance');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'data', 'mutual_funds.db');
const db = new sqlite3.Database(dbPath);

// GET /api/compliance/:fund_id - Get IIROC compliance status for a fund
router.get('/:fund_id', (req, res) => {
  const fundId = req.params.fund_id;

  // Get fund data
  const fundQuery = 'SELECT * FROM funds WHERE id = ?';
  
  db.get(fundQuery, [fundId], (err, fund) => {
    if (err) {
      console.error('Error fetching fund:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    // Get performance data
    const performanceQuery = `
      SELECT * FROM fund_performance 
      WHERE fund_id = ? 
      ORDER BY date DESC 
      LIMIT 12
    `;

    db.all(performanceQuery, [fundId], (err, performance) => {
      if (err) {
        console.error('Error fetching performance:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get alternative investments
      const altInvestmentsQuery = 'SELECT * FROM alternative_investments WHERE fund_id = ?';
      
      db.all(altInvestmentsQuery, [fundId], (err, alternativeInvestments) => {
        if (err) {
          console.error('Error fetching alternative investments:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Run IIROC compliance checks
        const complianceData = IIROCCompliance.checkCompliance(fund, performance, alternativeInvestments);
        
        // Generate compliance report
        const complianceReport = IIROCCompliance.generateComplianceReport(fundId, complianceData);
        
        // Check for regulatory alerts
        const alerts = IIROCCompliance.checkRegulatoryAlerts(fund, performance);

        res.json({
          fund_id: fundId,
          fund_name: fund.fund_name,
          compliance_report: complianceReport,
          regulatory_alerts: alerts,
          last_updated: new Date().toISOString()
        });
      });
    });
  });
});

// GET /api/compliance/summary - Get compliance summary for all funds
router.get('/summary', (req, res) => {
  const query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.fund_family,
      cr.iiroc_compliant,
      cr.risk_score,
      cr.report_date,
      cr.regulatory_notes
    FROM funds f
    LEFT JOIN (
      SELECT fund_id, iiroc_compliant, risk_score, report_date, regulatory_notes,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY report_date DESC) as rn
      FROM compliance_reports
    ) cr ON f.id = cr.fund_id AND cr.rn = 1
    ORDER BY f.fund_name
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching compliance summary:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const compliantFunds = results.filter(fund => fund.iiroc_compliant === 1);
    const nonCompliantFunds = results.filter(fund => fund.iiroc_compliant === 0);
    
    const complianceRate = results.length > 0 ? (compliantFunds.length / results.length) * 100 : 0;

    // Calculate risk distribution
    const riskDistribution = {
      'Low (1-3)': results.filter(fund => fund.risk_score >= 1 && fund.risk_score <= 3).length,
      'Medium (4-6)': results.filter(fund => fund.risk_score >= 4 && fund.risk_score <= 6).length,
      'High (7-10)': results.filter(fund => fund.risk_score >= 7 && fund.risk_score <= 10).length
    };

    // Group by fund family
    const familyCompliance = {};
    results.forEach(fund => {
      if (!familyCompliance[fund.fund_family]) {
        familyCompliance[fund.fund_family] = {
          total: 0,
          compliant: 0,
          non_compliant: 0
        };
      }
      familyCompliance[fund.fund_family].total++;
      if (fund.iiroc_compliant === 1) {
        familyCompliance[fund.fund_family].compliant++;
      } else {
        familyCompliance[fund.fund_family].non_compliant++;
      }
    });

    // Calculate compliance rate by family
    Object.keys(familyCompliance).forEach(family => {
      const data = familyCompliance[family];
      data.compliance_rate = data.total > 0 ? (data.compliant / data.total) * 100 : 0;
    });

    res.json({
      summary: {
        total_funds: results.length,
        compliant_funds: compliantFunds.length,
        non_compliant_funds: nonCompliantFunds.length,
        compliance_rate: parseFloat(complianceRate.toFixed(2)),
        last_updated: new Date().toISOString()
      },
      risk_distribution: riskDistribution,
      family_compliance: familyCompliance,
      funds: results
    });
  });
});

// GET /api/compliance/alerts - Get all regulatory alerts
router.get('/alerts', (req, res) => {
  const { severity, fund_id } = req.query;

  let query = `
    SELECT 
      f.id,
      f.fund_name,
      f.fund_type,
      f.fund_family,
      cr.iiroc_compliant,
      cr.risk_score,
      cr.concentration_warnings,
      cr.report_date
    FROM funds f
    LEFT JOIN (
      SELECT fund_id, iiroc_compliant, risk_score, concentration_warnings, report_date,
             ROW_NUMBER() OVER (PARTITION BY fund_id ORDER BY report_date DESC) as rn
      FROM compliance_reports
    ) cr ON f.id = cr.fund_id AND cr.rn = 1
  `;

  const conditions = [];
  const params = [];

  if (fund_id) {
    conditions.push('f.id = ?');
    params.push(fund_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY cr.risk_score DESC, f.fund_name';

  db.all(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching alerts:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Generate alerts based on compliance data
    const alerts = [];
    
    results.forEach(fund => {
      // High risk score alert
      if (fund.risk_score >= 8) {
        alerts.push({
          fund_id: fund.id,
          fund_name: fund.fund_name,
          type: 'HIGH_RISK_SCORE',
          severity: 'WARNING',
          message: `Fund has high risk score (${fund.risk_score}/10)`,
          date: fund.report_date
        });
      }

      // Non-compliance alert
      if (fund.iiroc_compliant === 0) {
        alerts.push({
          fund_id: fund.id,
          fund_name: fund.fund_name,
          type: 'NON_COMPLIANT',
          severity: 'CRITICAL',
          message: 'Fund is not IIROC compliant',
          date: fund.report_date
        });
      }

      // Concentration warning
      if (fund.concentration_warnings) {
        alerts.push({
          fund_id: fund.id,
          fund_name: fund.fund_name,
          type: 'CONCENTRATION_WARNING',
          severity: 'WARNING',
          message: fund.concentration_warnings,
          date: fund.report_date
        });
      }
    });

    // Filter by severity if specified
    const filteredAlerts = severity ? alerts.filter(alert => alert.severity === severity.toUpperCase()) : alerts;

    res.json({
      alerts: filteredAlerts,
      total_alerts: filteredAlerts.length,
      severity_breakdown: {
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        warning: alerts.filter(a => a.severity === 'WARNING').length,
        info: alerts.filter(a => a.severity === 'INFO').length
      }
    });
  });
});

// POST /api/compliance/check - Run compliance check for a fund
router.post('/check', (req, res) => {
  const { fund_id } = req.body;

  if (!fund_id) {
    return res.status(400).json({ error: 'fund_id is required' });
  }

  // Get fund data
  const fundQuery = 'SELECT * FROM funds WHERE id = ?';
  
  db.get(fundQuery, [fund_id], (err, fund) => {
    if (err) {
      console.error('Error fetching fund:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    // Get recent performance data
    const performanceQuery = `
      SELECT * FROM fund_performance 
      WHERE fund_id = ? 
      ORDER BY date DESC 
      LIMIT 12
    `;

    db.all(performanceQuery, [fund_id], (err, performance) => {
      if (err) {
        console.error('Error fetching performance:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get alternative investments
      const altInvestmentsQuery = 'SELECT * FROM alternative_investments WHERE fund_id = ?';
      
      db.all(altInvestmentsQuery, [fund_id], (err, alternativeInvestments) => {
        if (err) {
          console.error('Error fetching alternative investments:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Run comprehensive compliance check
        const complianceData = IIROCCompliance.checkCompliance(fund, performance, alternativeInvestments);
        const complianceReport = IIROCCompliance.generateComplianceReport(fund_id, complianceData);
        const alerts = IIROCCompliance.checkRegulatoryAlerts(fund, performance);

        // Store compliance report in database
        const insertQuery = `
          INSERT INTO compliance_reports 
          (fund_id, report_date, iiroc_compliant, regulatory_notes, risk_score, concentration_warnings)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const riskScore = IIROCCompliance.calculateRiskScore(fund);
        const concentrationWarnings = complianceData.concentrationLimits.violations.length > 0 
          ? complianceData.concentrationLimits.violations.map(v => `${v.type}: ${v.allocation}%`).join(', ')
          : null;

        db.run(insertQuery, [
          fund_id,
          new Date().toISOString().split('T')[0],
          complianceData.overallCompliant ? 1 : 0,
          JSON.stringify(complianceReport),
          riskScore,
          concentrationWarnings
        ], function(err) {
          if (err) {
            console.error('Error storing compliance report:', err);
          }

          res.json({
            fund_id: fund_id,
            fund_name: fund.fund_name,
            compliance_check: {
              status: complianceData.overallCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
              risk_score: riskScore,
              risk_level: IIROCCompliance.getRiskLevel(riskScore),
              checks_passed: complianceReport.summary.passedChecks,
              total_checks: complianceReport.summary.totalChecks,
              warnings: complianceData.warnings,
              violations: complianceData.violations
            },
            compliance_report: complianceReport,
            regulatory_alerts: alerts,
            recommendations: complianceReport.recommendations,
            check_date: new Date().toISOString()
          });
        });
      });
    });
  });
});

// GET /api/compliance/trends - Get compliance trends over time
router.get('/trends', (req, res) => {
  const { period = '12' } = req.query;

  const query = `
    SELECT 
      report_date,
      COUNT(*) as total_funds,
      SUM(CASE WHEN iiroc_compliant = 1 THEN 1 ELSE 0 END) as compliant_funds,
      AVG(risk_score) as avg_risk_score
    FROM compliance_reports
    WHERE report_date >= date("now", "-${period} months")
    GROUP BY report_date
    ORDER BY report_date
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching compliance trends:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const trends = results.map(row => ({
      date: row.report_date,
      total_funds: row.total_funds,
      compliant_funds: row.compliant_funds,
      non_compliant_funds: row.total_funds - row.compliant_funds,
      compliance_rate: row.total_funds > 0 ? (row.compliant_funds / row.total_funds) * 100 : 0,
      avg_risk_score: parseFloat(row.avg_risk_score.toFixed(2))
    }));

    // Calculate trend metrics
    const complianceRates = trends.map(t => t.compliance_rate);
    const avgComplianceRate = complianceRates.reduce((sum, rate) => sum + rate, 0) / complianceRates.length;
    
    const riskScores = trends.map(t => t.avg_risk_score);
    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;

    res.json({
      period: period,
      trends: trends,
      summary: {
        avg_compliance_rate: parseFloat(avgComplianceRate.toFixed(2)),
        avg_risk_score: parseFloat(avgRiskScore.toFixed(2)),
        trend_direction: trends.length >= 2 
          ? (trends[trends.length - 1].compliance_rate > trends[0].compliance_rate ? 'Improving' : 'Declining')
          : 'Stable'
      }
    });
  });
});

// GET /api/compliance/export/:fund_id - Export compliance report
router.get('/export/:fund_id', (req, res) => {
  const fundId = req.params.fund_id;
  const format = req.query.format || 'json';

  // Get comprehensive compliance data
  const fundQuery = 'SELECT * FROM funds WHERE id = ?';
  
  db.get(fundQuery, [fundId], (err, fund) => {
    if (err) {
      console.error('Error fetching fund:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    // Get performance and alternative investments data
    const performanceQuery = 'SELECT * FROM fund_performance WHERE fund_id = ? ORDER BY date DESC LIMIT 12';
    const altInvestmentsQuery = 'SELECT * FROM alternative_investments WHERE fund_id = ?';

    db.all(performanceQuery, [fundId], (err, performance) => {
      if (err) {
        console.error('Error fetching performance:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.all(altInvestmentsQuery, [fundId], (err, alternativeInvestments) => {
        if (err) {
          console.error('Error fetching alternative investments:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Generate comprehensive compliance report
        const complianceData = IIROCCompliance.checkCompliance(fund, performance, alternativeInvestments);
        const complianceReport = IIROCCompliance.generateComplianceReport(fundId, complianceData);
        const alerts = IIROCCompliance.checkRegulatoryAlerts(fund, performance);

        const exportData = {
          fund_information: {
            id: fund.id,
            name: fund.fund_name,
            type: fund.fund_type,
            family: fund.fund_family,
            inception_date: fund.inception_date,
            management_fee: fund.management_fee,
            expense_ratio: fund.expense_ratio
          },
          compliance_report: complianceReport,
          regulatory_alerts: alerts,
          performance_summary: {
            data_points: performance.length,
            latest_nav: performance.length > 0 ? performance[0].nav : null,
            latest_aum: performance.length > 0 ? performance[0].assets_under_management : null
          },
          alternative_investments: alternativeInvestments,
          export_date: new Date().toISOString(),
          generated_by: 'Mutual Fund Analysis Platform'
        };

        if (format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${fundId}.json"`);
          res.json(exportData);
        } else {
          res.status(400).json({ error: 'Unsupported export format. Use "json".' });
        }
      });
    });
  });
});

module.exports = router; 