import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  PieChart,
  BarChart3,
  Target,
  Shield,
  Download,
  RefreshCw
} from 'lucide-react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AlternativeInvestments = () => {
  const [summary, setSummary] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [allocationLimits, setAllocationLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlternativeInvestmentsData();
  }, []);

  const fetchAlternativeInvestmentsData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, riskRes, correlationRes, performanceRes, limitsRes] = await Promise.all([
        axios.get('/api/alternative-investments/summary'),
        axios.get('/api/alternative-investments/risk-analysis'),
        axios.get('/api/alternative-investments/correlation'),
        axios.get('/api/alternative-investments/performance?period=12'),
        axios.get('/api/alternative-investments/allocation-limits')
      ]);

      setSummary(summaryRes.data);
      setRiskAnalysis(riskRes.data);
      setCorrelation(correlationRes.data);
      setPerformance(performanceRes.data);
      setAllocationLimits(limitsRes.data);
      
    } catch (error) {
      console.error('Error fetching alternative investments data:', error);
      toast.error('Failed to load alternative investments data');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    if (!value) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'Low': 'text-success-600 bg-success-50',
      'Low-Medium': 'text-warning-600 bg-warning-50',
      'Medium': 'text-orange-600 bg-orange-50',
      'Medium-High': 'text-danger-600 bg-danger-50',
      'High': 'text-purple-600 bg-purple-50'
    };
    return colors[level] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  // Chart data for allocation summary
  const allocationChartData = {
    labels: summary?.alternative_investments.map(inv => inv.investment_type) || [],
    datasets: [
      {
        data: summary?.alternative_investments.map(inv => inv.total_allocation) || [],
        backgroundColor: [
          '#003B5C',
          '#4A90E2',
          '#28A745',
          '#DC3545',
          '#FFC107',
          '#6F42C1',
          '#FD7E14',
          '#20C997'
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  };

  // Chart data for risk analysis
  const riskChartData = {
    labels: riskAnalysis?.risk_analysis.map(inv => inv.investment_type) || [],
    datasets: [
      {
        label: 'Average Risk Rating',
        data: riskAnalysis?.risk_analysis.map(inv => inv.avg_risk_rating) || [],
        backgroundColor: '#DC3545',
        borderColor: '#DC3545',
        borderWidth: 1,
      },
      {
        label: 'Average Allocation (%)',
        data: riskAnalysis?.risk_analysis.map(inv => inv.avg_allocation) || [],
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2',
        borderWidth: 1,
      }
    ]
  };

  // Chart data for performance
  const performanceChartData = {
    labels: performance?.performance.map(inv => inv.investment_type) || [],
    datasets: [
      {
        label: 'Total Return (%)',
        data: performance?.performance.map(inv => inv.metrics.total_return) || [],
        backgroundColor: '#28A745',
        borderColor: '#28A745',
        borderWidth: 1,
      },
      {
        label: 'Volatility (%)',
        data: performance?.performance.map(inv => inv.metrics.volatility) || [],
        backgroundColor: '#FFC107',
        borderColor: '#FFC107',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alternative Investments</h1>
          <p className="mt-1 text-gray-600">
            Portfolio allocation analysis and risk assessment for alternative investments
          </p>
        </div>
        <button
          onClick={fetchAlternativeInvestmentsData}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Investment Types</p>
              <p className="metric-value">{summary?.summary.total_investment_types || 0}</p>
            </div>
            <Building2 className="w-6 h-6 text-primary-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Funds with Alternatives</p>
              <p className="metric-value">{summary?.summary.funds_with_alternative_investments || 0}</p>
            </div>
            <PieChart className="w-6 h-6 text-secondary-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Allocation</p>
              <p className="metric-value">{formatPercentage(summary?.summary.total_allocation || 0)}</p>
            </div>
            <Target className="w-6 h-6 text-success-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Avg Risk Rating</p>
              <p className="metric-value">{summary?.summary.average_risk_rating?.toFixed(1) || 0}/10</p>
            </div>
            <Shield className="w-6 h-6 text-warning-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Summary */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Allocation</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <Doughnut data={allocationChartData} options={chartOptions} />
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk vs Allocation</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <Bar data={riskChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Analysis (12 Months)</h3>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        <div className="h-80">
          <Bar data={performanceChartData} options={chartOptions} />
        </div>
      </div>

      {/* Alternative Investments Details */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Alternative Investment Details</h3>
          <button className="btn-outline flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Investment Type</th>
                <th className="table-header-cell">Fund Count</th>
                <th className="table-header-cell">Avg Allocation</th>
                <th className="table-header-cell">Avg Risk Rating</th>
                <th className="table-header-cell">Total Allocation</th>
                <th className="table-header-cell">Risk Level</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {summary?.alternative_investments?.map((investment) => (
                <tr key={investment.investment_type} className="table-row">
                  <td className="table-cell font-medium">{investment.investment_type}</td>
                  <td className="table-cell">{investment.fund_count}</td>
                  <td className="table-cell">{formatPercentage(investment.avg_allocation)}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      investment.avg_risk_rating <= 3 ? 'badge-success' :
                      investment.avg_risk_rating <= 6 ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {investment.avg_risk_rating.toFixed(1)}/10
                    </span>
                  </td>
                  <td className="table-cell">{formatPercentage(investment.total_allocation)}</td>
                  <td className="table-cell">
                    <span className={`badge ${getRiskLevelColor(investment.risk_level)}`}>
                      {investment.risk_level}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View Details
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Limits Compliance */}
      {allocationLimits && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Allocation Limits Compliance</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Max Concentration: {allocationLimits.max_concentration_limit}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {allocationLimits.compliance_summary.total_funds_with_alternatives}
              </p>
              <p className="text-sm text-gray-500">Total Funds</p>
            </div>
            <div className="text-center p-4 bg-success-50 rounded-lg">
              <p className="text-2xl font-bold text-success-600">
                {allocationLimits.compliance_summary.funds_with_alternatives - allocationLimits.compliance_summary.funds_with_violations}
              </p>
              <p className="text-sm text-success-600">Compliant</p>
            </div>
            <div className="text-center p-4 bg-danger-50 rounded-lg">
              <p className="text-2xl font-bold text-danger-600">
                {allocationLimits.compliance_summary.funds_with_violations}
              </p>
              <p className="text-sm text-danger-600">Violations</p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">
                {allocationLimits.compliance_summary.compliance_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-primary-600">Compliance Rate</p>
            </div>
          </div>

          {allocationLimits.violations.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Concentration Limit Violations</h4>
              {allocationLimits.violations.map((violation, index) => (
                <div key={index} className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{violation.fund_name}</p>
                      <p className="text-sm text-gray-600">
                        {violation.investment_type}: {formatPercentage(violation.allocation_percentage)} 
                        (Limit: {violation.limit}%)
                      </p>
                      <p className="text-sm text-danger-600">
                        Excess: {formatPercentage(violation.excess_allocation)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="badge badge-danger">
                        Risk: {violation.risk_rating}/10
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk Analysis Summary */}
      {riskAnalysis && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Risk Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {riskAnalysis.overall_risk.total_investments}
              </p>
              <p className="text-sm text-gray-500">Total Investments</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {formatPercentage(riskAnalysis.overall_risk.avg_allocation)}
              </p>
              <p className="text-sm text-blue-600">Avg Allocation</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {riskAnalysis.overall_risk.avg_risk_rating.toFixed(1)}/10
              </p>
              <p className="text-sm text-orange-600">Avg Risk Rating</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {formatPercentage(riskAnalysis.overall_risk.concentration_risk)}
              </p>
              <p className="text-sm text-purple-600">Concentration Risk</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors">
            <Building2 className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-primary-900">Portfolio Analysis</p>
              <p className="text-sm text-primary-700">Deep dive into allocation analysis</p>
            </div>
          </button>

          <button className="flex items-center p-4 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-colors">
            <Shield className="w-6 h-6 text-secondary-600 mr-3" />
            <div>
              <p className="font-medium text-secondary-900">Risk Assessment</p>
              <p className="text-sm text-secondary-700">Comprehensive risk evaluation</p>
            </div>
          </button>

          <button className="flex items-center p-4 bg-success-50 border border-success-200 rounded-lg hover:bg-success-100 transition-colors">
            <Target className="w-6 h-6 text-success-600 mr-3" />
            <div>
              <p className="font-medium text-success-900">Rebalance Portfolio</p>
              <p className="text-sm text-success-700">Optimize allocation strategy</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlternativeInvestments; 