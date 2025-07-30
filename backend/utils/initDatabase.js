const path = require('path');
const fs = require('fs');

const initDatabase = (db) => {
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create tables
  const createTables = () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Funds table
        db.run(`CREATE TABLE IF NOT EXISTS funds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fund_name TEXT NOT NULL,
          fund_type TEXT NOT NULL,
          inception_date TEXT NOT NULL,
          management_fee REAL NOT NULL,
          expense_ratio REAL NOT NULL,
          fund_family TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Fund performance table
        db.run(`CREATE TABLE IF NOT EXISTS fund_performance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fund_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          nav REAL NOT NULL,
          total_return REAL NOT NULL,
          benchmark_return REAL NOT NULL,
          assets_under_management REAL NOT NULL,
          FOREIGN KEY (fund_id) REFERENCES funds (id)
        )`);

        // Alternative investments table
        db.run(`CREATE TABLE IF NOT EXISTS alternative_investments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fund_id INTEGER NOT NULL,
          investment_type TEXT NOT NULL,
          allocation_percentage REAL NOT NULL,
          risk_rating INTEGER NOT NULL,
          description TEXT,
          FOREIGN KEY (fund_id) REFERENCES funds (id)
        )`);

        // Compliance reports table
        db.run(`CREATE TABLE IF NOT EXISTS compliance_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fund_id INTEGER NOT NULL,
          report_date TEXT NOT NULL,
          iiroc_compliant BOOLEAN NOT NULL,
          regulatory_notes TEXT,
          risk_score INTEGER,
          concentration_warnings TEXT,
          FOREIGN KEY (fund_id) REFERENCES funds (id)
        )`);

        db.run("PRAGMA foreign_keys = ON", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  };

  // Insert sample data
  const insertSampleData = () => {
    return new Promise((resolve, reject) => {
      // Sample funds data
      const funds = [
        { name: 'Scotiabank Canadian Equity Fund', type: 'Canadian Equity', inception: '2010-01-15', mgmt_fee: 1.25, expense: 1.85, family: 'Scotiabank' },
        { name: 'RBC Canadian Bond Fund', type: 'Fixed Income', inception: '2008-03-20', mgmt_fee: 0.85, expense: 1.15, family: 'RBC' },
        { name: 'TD Balanced Growth Fund', type: 'Balanced', inception: '2012-06-10', mgmt_fee: 1.15, expense: 1.65, family: 'TD' },
        { name: 'CIBC Global Technology Fund', type: 'Global Equity', inception: '2015-09-05', mgmt_fee: 1.45, expense: 2.05, family: 'CIBC' },
        { name: 'BMO Dividend Fund', type: 'Canadian Equity', inception: '2009-11-12', mgmt_fee: 1.10, expense: 1.60, family: 'BMO' },
        { name: 'Manulife Alternative Investments Fund', type: 'Alternative', inception: '2018-04-18', mgmt_fee: 1.75, expense: 2.35, family: 'Manulife' },
        { name: 'Sun Life Global Infrastructure Fund', type: 'Global Equity', inception: '2016-07-22', mgmt_fee: 1.35, expense: 1.95, family: 'Sun Life' },
        { name: 'Great-West Real Estate Fund', type: 'Real Estate', inception: '2014-02-28', mgmt_fee: 1.55, expense: 2.15, family: 'Great-West' },
        { name: 'Fidelity Canadian Growth Fund', type: 'Canadian Equity', inception: '2011-08-14', mgmt_fee: 1.20, expense: 1.80, family: 'Fidelity' },
        { name: 'Mackenzie Global Bond Fund', type: 'Fixed Income', inception: '2007-12-03', mgmt_fee: 0.90, expense: 1.30, family: 'Mackenzie' },
        { name: 'AGF Canadian Small Cap Fund', type: 'Canadian Equity', inception: '2013-05-17', mgmt_fee: 1.40, expense: 2.00, family: 'AGF' },
        { name: 'Dynamic Power Global Growth Fund', type: 'Global Equity', inception: '2017-01-30', mgmt_fee: 1.60, expense: 2.20, family: 'Dynamic' },
        { name: 'Invesco Canadian Balanced Fund', type: 'Balanced', inception: '2010-10-08', mgmt_fee: 1.05, expense: 1.55, family: 'Invesco' },
        { name: 'Franklin Templeton Emerging Markets Fund', type: 'Global Equity', inception: '2016-03-12', mgmt_fee: 1.50, expense: 2.10, family: 'Franklin Templeton' },
        { name: 'PIMCO Canadian Bond Fund', type: 'Fixed Income', inception: '2009-07-25', mgmt_fee: 0.95, expense: 1.35, family: 'PIMCO' },
        { name: 'BlackRock Canadian Equity Fund', type: 'Canadian Equity', inception: '2012-11-19', mgmt_fee: 1.15, expense: 1.75, family: 'BlackRock' },
        { name: 'Vanguard Canadian Index Fund', type: 'Canadian Equity', inception: '2014-08-07', mgmt_fee: 0.25, expense: 0.35, family: 'Vanguard' },
        { name: 'iShares Canadian Bond ETF Fund', type: 'Fixed Income', inception: '2011-04-13', mgmt_fee: 0.20, expense: 0.30, family: 'iShares' },
        { name: 'Horizons Marijuana Life Sciences ETF', type: 'Sector', inception: '2017-04-26', mgmt_fee: 0.75, expense: 1.25, family: 'Horizons' },
        { name: 'Purpose Bitcoin ETF Fund', type: 'Alternative', inception: '2021-02-18', mgmt_fee: 1.00, expense: 1.50, family: 'Purpose' }
      ];

      const insertFunds = db.prepare('INSERT OR IGNORE INTO funds (fund_name, fund_type, inception_date, management_fee, expense_ratio, fund_family) VALUES (?, ?, ?, ?, ?, ?)');
      
      funds.forEach(fund => {
        insertFunds.run(fund.name, fund.type, fund.inception, fund.mgmt_fee, fund.expense, fund.family);
      });
      
      insertFunds.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Insert performance data
  const insertPerformanceData = () => {
    return new Promise((resolve, reject) => {
      const performanceData = [];
      const startDate = new Date('2021-01-01');
      
      // Generate 3 years of monthly performance data for each fund
      for (let fundId = 1; fundId <= 20; fundId++) {
        let nav = 10.00 + Math.random() * 5; // Starting NAV between 10-15
        
        for (let month = 0; month < 36; month++) {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + month);
          
          // Generate realistic returns
          const monthlyReturn = (Math.random() - 0.5) * 0.08; // -4% to +4%
          const benchmarkReturn = (Math.random() - 0.5) * 0.06; // -3% to +3%
          
          nav = nav * (1 + monthlyReturn);
          const aum = 10000000 + Math.random() * 100000000; // 10M to 110M
          
          performanceData.push({
            fund_id: fundId,
            date: date.toISOString().split('T')[0],
            nav: parseFloat(nav.toFixed(4)),
            total_return: parseFloat((monthlyReturn * 100).toFixed(2)),
            benchmark_return: parseFloat((benchmarkReturn * 100).toFixed(2)),
            aum: parseFloat(aum.toFixed(2))
          });
        }
      }

      const insertPerformance = db.prepare('INSERT OR IGNORE INTO fund_performance (fund_id, date, nav, total_return, benchmark_return, assets_under_management) VALUES (?, ?, ?, ?, ?, ?)');
      
      performanceData.forEach(perf => {
        insertPerformance.run(perf.fund_id, perf.date, perf.nav, perf.total_return, perf.benchmark_return, perf.aum);
      });
      
      insertPerformance.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Insert alternative investments data
  const insertAlternativeInvestmentsData = () => {
    return new Promise((resolve, reject) => {
      const altInvestments = [
        { fund_id: 6, type: 'REITs', allocation: 25.0, risk: 7, desc: 'Real Estate Investment Trusts' },
        { fund_id: 6, type: 'Commodities', allocation: 20.0, risk: 8, desc: 'Gold and precious metals' },
        { fund_id: 6, type: 'Private Equity', allocation: 15.0, risk: 9, desc: 'Private company investments' },
        { fund_id: 6, type: 'Hedge Funds', allocation: 20.0, risk: 8, desc: 'Alternative strategies' },
        { fund_id: 6, type: 'Infrastructure', allocation: 20.0, risk: 6, desc: 'Public infrastructure projects' },
        { fund_id: 8, type: 'REITs', allocation: 80.0, risk: 7, desc: 'Real estate investment trusts' },
        { fund_id: 8, type: 'Direct Real Estate', allocation: 20.0, risk: 8, desc: 'Direct property holdings' },
        { fund_id: 20, type: 'Cryptocurrency', allocation: 100.0, risk: 10, desc: 'Bitcoin and digital assets' },
        { fund_id: 19, type: 'Cannabis Stocks', allocation: 90.0, risk: 9, desc: 'Marijuana and cannabis companies' },
        { fund_id: 19, type: 'Biotech', allocation: 10.0, risk: 8, desc: 'Biotechnology companies' }
      ];

      const insertAlt = db.prepare('INSERT OR IGNORE INTO alternative_investments (fund_id, investment_type, allocation_percentage, risk_rating, description) VALUES (?, ?, ?, ?, ?)');
      
      altInvestments.forEach(alt => {
        insertAlt.run(alt.fund_id, alt.type, alt.allocation, alt.risk, alt.desc);
      });
      
      insertAlt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Insert compliance data
  const insertComplianceData = () => {
    return new Promise((resolve, reject) => {
      const complianceData = [];
      const startDate = new Date('2023-01-01');
      
      // Generate quarterly compliance reports for each fund
      for (let fundId = 1; fundId <= 20; fundId++) {
        for (let quarter = 0; quarter < 4; quarter++) {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + (quarter * 3));
          
          const isCompliant = Math.random() > 0.1; // 90% compliance rate
          const riskScore = Math.floor(Math.random() * 10) + 1;
          
          complianceData.push({
            fund_id: fundId,
            date: date.toISOString().split('T')[0],
            compliant: isCompliant ? 1 : 0,
            notes: isCompliant ? 'All IIROC requirements met' : 'Review required for concentration limits',
            risk_score: riskScore,
            warnings: isCompliant ? null : 'Portfolio concentration exceeds 20% threshold'
          });
        }
      }

      const insertCompliance = db.prepare('INSERT OR IGNORE INTO compliance_reports (fund_id, report_date, iiroc_compliant, regulatory_notes, risk_score, concentration_warnings) VALUES (?, ?, ?, ?, ?, ?)');
      
      complianceData.forEach(comp => {
        insertCompliance.run(comp.fund_id, comp.date, comp.compliant, comp.notes, comp.risk_score, comp.warnings);
      });
      
      insertCompliance.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Initialize database
  createTables()
    .then(() => insertSampleData())
    .then(() => insertPerformanceData())
    .then(() => insertAlternativeInvestmentsData())
    .then(() => insertComplianceData())
    .then(() => {
      console.log('✅ Database initialized successfully with sample data');
    })
    .catch(err => {
      console.error('❌ Database initialization failed:', err);
    });
};

module.exports = initDatabase; 