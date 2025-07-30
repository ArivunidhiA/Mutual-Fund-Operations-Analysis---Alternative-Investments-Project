# Mutual Fund Operations Analysis Platform

A comprehensive full-stack web application for analyzing mutual fund operations, IIROC compliance, PROR calculations, and alternative investment performance tracking. Built for financial services professionals and business analysts.

## 📸 Screenshots

### Dashboard Overview
![Dashboard Overview](Screenshot%202025-07-30%20at%206.29.51%20PM.png)

### Fund Performance Dashboard
![Fund Performance Dashboard](Screenshot%202025-07-30%20at%206.30.01%20PM.png)

### Alternative Investments Allocation
![Alternative Investments Allocation](Screenshot%202025-07-30%20at%206.30.06%20PM.png)

### Alternative Investments Analysis
![Alternative Investments Analysis](Screenshot%202025-07-30%20at%206.30.15%20PM.png)

## 🚀 Features

### Core Functionality
- **Fund Performance Analysis**: Real-time NAV tracking, return calculations, and performance metrics
- **IIROC Compliance Monitoring**: Automated regulatory compliance checks and reporting
- **PROR Calculator**: Personal Rate of Return calculations with advanced financial formulas
- **Alternative Investments Analysis**: Portfolio allocation tracking and risk assessment
- **Interactive Dashboards**: Real-time data visualization with Chart.js
- **Risk Analytics**: Sharpe ratio, maximum drawdown, volatility, and correlation analysis

### Financial Calculations
- Personal Rate of Return (PROR) calculations
- Sharpe Ratio, Sortino Ratio, and Treynor Ratio
- Maximum Drawdown analysis
- Value at Risk (VaR) and Conditional VaR (CVaR)
- Beta calculation and correlation analysis
- Information Ratio and Jensen's Alpha

### Compliance Features
- IIROC regulatory compliance checking
- Concentration limit monitoring
- Fee disclosure validation
- Risk disclosure requirements
- Liquidity requirement analysis
- Automated compliance reporting

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database for local development
- **Financial calculations** utility library
- **IIROC compliance** validation engine
- **RESTful API** with comprehensive endpoints

### Frontend
- **React.js** with functional components and hooks
- **TailwindCSS** for responsive design
- **Chart.js** for data visualization
- **React Router** for navigation
- **Axios** for API communication
- **Lucide React** for icons

### Key Libraries
- `moment.js` for date handling
- `react-hot-toast` for notifications
- `react-hook-form` for form management
- `date-fns` for date utilities

## 📊 Database Schema

### Funds Table
```sql
CREATE TABLE funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_name TEXT NOT NULL,
  fund_type TEXT NOT NULL,
  inception_date TEXT NOT NULL,
  management_fee REAL NOT NULL,
  expense_ratio REAL NOT NULL,
  fund_family TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fund Performance Table
```sql
CREATE TABLE fund_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  nav REAL NOT NULL,
  total_return REAL NOT NULL,
  benchmark_return REAL NOT NULL,
  assets_under_management REAL NOT NULL,
  FOREIGN KEY (fund_id) REFERENCES funds (id)
);
```

### Alternative Investments Table
```sql
CREATE TABLE alternative_investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id INTEGER NOT NULL,
  investment_type TEXT NOT NULL,
  allocation_percentage REAL NOT NULL,
  risk_rating INTEGER NOT NULL,
  description TEXT,
  FOREIGN KEY (fund_id) REFERENCES funds (id)
);
```

### Compliance Reports Table
```sql
CREATE TABLE compliance_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  iiroc_compliant BOOLEAN NOT NULL,
  regulatory_notes TEXT,
  risk_score INTEGER,
  concentration_warnings TEXT,
  FOREIGN KEY (fund_id) REFERENCES funds (id)
);
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd mutual-fund-analysis
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to root
cd ..
```

3. **Initialize the database**
```bash
cd backend
npm run init-db
```

4. **Start the development servers**
```bash
# Start both backend and frontend (from root directory)
npm run dev

# Or start them separately:
# Backend (port 3001)
npm run server

# Frontend (port 3000)
npm run client
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
Currently, the API doesn't require authentication for development purposes. In production, implement JWT or session-based authentication.

### Endpoints

#### Funds
- `GET /funds` - List all funds with filtering options
- `GET /funds/:id` - Get detailed fund information
- `GET /funds/:id/performance` - Get fund performance data
- `GET /funds/:id/alternative-investments` - Get alternative investment allocations
- `POST /funds/:id/calculate-pror` - Calculate Personal Rate of Return
- `GET /funds/types` - Get all fund types
- `GET /funds/families` - Get all fund families

#### Performance Analytics
- `GET /performance/analytics` - Get performance analytics for all funds
- `GET /performance/comparison` - Compare multiple funds
- `GET /performance/benchmark` - Get benchmark performance data
- `GET /performance/risk-metrics` - Get risk metrics for all funds
- `GET /performance/returns-distribution` - Get returns distribution analysis

#### Compliance
- `GET /compliance/:fund_id` - Get IIROC compliance status for a fund
- `GET /compliance/summary` - Get compliance summary for all funds
- `GET /compliance/alerts` - Get all regulatory alerts
- `POST /compliance/check` - Run compliance check for a fund
- `GET /compliance/trends` - Get compliance trends over time
- `GET /compliance/export/:fund_id` - Export compliance report

#### Dashboard
- `GET /dashboard/summary` - Dashboard summary statistics
- `GET /dashboard/top-performers` - Get top performing funds
- `GET /dashboard/alternative-investments` - Get alternative investments summary
- `GET /dashboard/performance-trends` - Get performance trends
- `GET /dashboard/risk-metrics` - Get risk metrics summary
- `GET /dashboard/fund-family-analysis` - Get fund family analysis

#### Alternative Investments
- `GET /alternative-investments/summary` - Get alternative investments summary
- `GET /alternative-investments/fund/:fund_id` - Get alternative investments for a specific fund
- `GET /alternative-investments/risk-analysis` - Get risk analysis for alternative investments
- `GET /alternative-investments/correlation` - Get correlation analysis between alternative investments
- `GET /alternative-investments/performance` - Get performance analysis for alternative investments
- `GET /alternative-investments/allocation-limits` - Check allocation limits compliance

### Example API Calls

#### Get all funds
```bash
curl http://localhost:3001/api/funds
```

#### Get fund performance with PROR calculation
```bash
curl "http://localhost:3001/api/funds/1/performance?calculate_pror=true&period=12"
```

#### Calculate PROR for a fund
```bash
curl -X POST http://localhost:3001/api/funds/1/calculate-pror \
  -H "Content-Type: application/json" \
  -d '{
    "beginning_value": 10000,
    "ending_value": 11000,
    "contributions": 1000,
    "withdrawals": 0,
    "time_period": 12
  }'
```

#### Check compliance for a fund
```bash
curl -X POST http://localhost:3001/api/compliance/check \
  -H "Content-Type: application/json" \
  -d '{"fund_id": 1}'
```

## 💰 Financial Calculations

### PROR Formula
```
PROR = ((Ending Value - Beginning Value - Contributions + Withdrawals) / (Beginning Value + Weighted Contributions)) * 100
```

### Sharpe Ratio
```
Sharpe Ratio = (Return - Risk Free Rate) / Standard Deviation
```

### Maximum Drawdown
Calculated by tracking the peak value and measuring the largest percentage decline from peak to trough.

### Beta Calculation
```
Beta = Covariance(Fund Returns, Benchmark Returns) / Variance(Benchmark Returns)
```

## 🔒 IIROC Compliance Rules

### Concentration Limits
- Maximum 20% allocation to any single alternative investment
- Portfolio concentration warnings for allocations exceeding 15%

### Fee Disclosure Requirements
- Maximum management fee: 2.5%
- Maximum expense ratio: 3.0%
- Maximum total fees: 4.0%

### Risk Disclosure Requirements
- Fund type classification
- Management fee disclosure
- Expense ratio disclosure
- Inception date information

### Liquidity Requirements
- Minimum AUM: $10M
- Liquidity ratio: ≤ 30 days to liquidate

## 📱 Frontend Features

### Dashboard
- Real-time summary metrics
- Performance trend charts
- Top performing funds list
- Alternative investments allocation
- Quick action buttons

### Fund Analysis
- Interactive fund search and filtering
- Detailed fund information display
- Performance charts with multiple timeframes
- Risk metrics and analytics
- PROR calculator widget

### Compliance Dashboard
- IIROC compliance status overview
- Regulatory alerts and notifications
- Compliance trend analysis
- Export functionality for reports

### Alternative Investments
- Portfolio allocation visualizations
- Risk analysis dashboard
- Correlation matrix
- Performance attribution analysis

## 🎨 UI/UX Design

### Color Scheme
- **Primary**: Navy Blue (#003B5C) - Scotiabank branding
- **Secondary**: Light Blue (#4A90E2)
- **Success**: Green (#28A745) - Positive returns
- **Danger**: Red (#DC3545) - Negative returns
- **Warning**: Orange (#FFC107) - Alerts

### Design Principles
- Professional financial services aesthetic
- Responsive design for all devices
- Accessibility compliance
- Intuitive navigation
- Clear data visualization

## 📊 Sample Data

The application comes pre-populated with 20 realistic mutual funds including:

### Fund Types
- Canadian Equity Funds
- Fixed Income Funds
- Balanced Funds
- Global Equity Funds
- Alternative Investment Funds
- Real Estate Funds
- Sector Funds

### Fund Families
- Scotiabank, RBC, TD, CIBC, BMO
- Manulife, Sun Life, Great-West
- Fidelity, Mackenzie, AGF
- Dynamic, Invesco, Franklin Templeton
- PIMCO, BlackRock, Vanguard
- iShares, Horizons, Purpose

### Alternative Investments
- REITs (Real Estate Investment Trusts)
- Commodities (Gold, precious metals)
- Private Equity
- Hedge Funds
- Infrastructure
- Cryptocurrency
- Cannabis Stocks

## 🔧 Development

### Project Structure
```
mutual-fund-analysis/
├── backend/
│   ├── server.js                 # Main server file
│   ├── routes/                   # API routes
│   │   ├── funds.js
│   │   ├── performance.js
│   │   ├── compliance.js
│   │   ├── dashboard.js
│   │   └── alternativeInvestments.js
│   ├── utils/                    # Utility functions
│   │   ├── initDatabase.js
│   │   ├── financialCalculations.js
│   │   └── iirocCompliance.js
│   ├── data/                     # Database files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/               # Page components
│   │   ├── App.js
│   │   └── index.css
│   ├── public/
│   └── package.json
├── package.json
└── README.md
```

### Available Scripts

#### Root Directory
```bash
npm run dev          # Start both backend and frontend
npm run server       # Start backend only
npm run client       # Start frontend only
npm run install-all  # Install all dependencies
npm run build        # Build frontend for production
```

#### Backend Directory
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run init-db     # Initialize database with sample data
```

#### Frontend Directory
```bash
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
Use tools like Postman or curl to test the API endpoints. All endpoints return JSON responses.

## 📈 Performance Optimization

### Backend
- Database indexing on frequently queried columns
- Prepared statements for SQL queries
- Efficient data aggregation
- Caching for static data

### Frontend
- React.memo for component optimization
- Lazy loading for routes
- Efficient chart rendering
- Responsive image loading

## 🔐 Security Considerations

### Development
- Input validation on all API endpoints
- SQL injection prevention with prepared statements
- CORS configuration for frontend-backend communication
- Error handling without sensitive data exposure

### Production Recommendations
- Implement JWT authentication
- Add rate limiting
- Use HTTPS
- Implement API key management
- Add request logging and monitoring
- Database connection pooling
- Environment variable management

## 🚀 Deployment

### Backend Deployment
1. Set up a Node.js server (AWS, Heroku, DigitalOcean)
2. Configure environment variables
3. Set up a production database (PostgreSQL recommended)
4. Deploy using PM2 or similar process manager

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, AWS S3)
3. Configure environment variables for API endpoints

### Database Migration
For production, consider migrating from SQLite to PostgreSQL or MySQL for better performance and scalability.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- Complete mutual fund analysis platform
- IIROC compliance monitoring
- PROR calculator
- Alternative investments analysis
- Interactive dashboards

---

**Note**: This is a demonstration project for educational purposes. For production use in financial services, ensure compliance with all applicable regulations and implement proper security measures. 