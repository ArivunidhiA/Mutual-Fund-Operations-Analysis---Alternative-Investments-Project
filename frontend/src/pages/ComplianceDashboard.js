import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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

const ComplianceDashboard = () => {
  const [complianceSummary, setComplianceSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, alertsRes, trendsRes] = await Promise.all([
        axios.get('/api/compliance/summary'),
        axios.get('/api/compliance/alerts'),
        axios.get('/api/compliance/trends?period=12')
      ]);

      setComplianceSummary(summaryRes.data);
      setAlerts(alertsRes.data.alerts);
      setTrends(trendsRes.data.trends);
      
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      case 'WARNING':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'INFO':
        return 'text-info-600 bg-info-50 border-info-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-5 h-5" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5" />;
      case 'INFO':
        return <Eye className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAlerts = selectedSeverity 
    ? alerts.filter(alert => alert.severity === selectedSeverity)
    : alerts;

  // Chart data for compliance trends
  const trendsChartData = {
    labels: trends.map(trend => formatDate(trend.date)),
    datasets: [
      {
        label: 'Compliance Rate (%)',
        data: trends.map(trend => trend.compliance_rate),
        borderColor: '#003B5C',
        backgroundColor: 'rgba(0, 59, 92, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // Chart data for risk distribution
  const riskDistributionData = {
    labels: Object.keys(complianceSummary?.risk_distribution || {}),
    datasets: [
      {
        data: Object.values(complianceSummary?.risk_distribution || {}),
        backgroundColor: [
          '#28A745', // Low
          '#FFC107', // Low-Medium
          '#FD7E14', // Medium
          '#DC3545', // Medium-High
          '#6F42C1'  // High
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  };

  // Chart data for family compliance
  const familyComplianceData = {
    labels: Object.keys(complianceSummary?.family_compliance || {}),
    datasets: [
      {
        label: 'Compliance Rate (%)',
        data: Object.values(complianceSummary?.family_compliance || {}).map(family => family.compliance_rate),
        backgroundColor: '#4A90E2',
        borderColor: '#003B5C',
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
        max: 100,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="mt-1 text-gray-600">
            IIROC compliance monitoring and regulatory oversight
          </p>
        </div>
        <button
          onClick={fetchComplianceData}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Compliance Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Funds</p>
              <p className="metric-value">{complianceSummary?.summary.total_funds || 0}</p>
            </div>
            <Shield className="w-6 h-6 text-primary-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Compliant Funds</p>
              <p className="metric-value">{complianceSummary?.summary.compliant_funds || 0}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="w-4 h-4 text-success-500" />
                <span className="metric-change ml-1 metric-change-positive">
                  {complianceSummary?.summary.compliance_rate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-success-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Non-Compliant</p>
              <p className="metric-value">{complianceSummary?.summary.non_compliant_funds || 0}</p>
              <div className="flex items-center mt-2">
                <XCircle className="w-4 h-4 text-danger-500" />
                <span className="metric-change ml-1 text-danger-600">
                  Requires attention
                </span>
              </div>
            </div>
            <XCircle className="w-6 h-6 text-danger-500" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Active Alerts</p>
              <p className="metric-value">{alerts.length}</p>
              <div className="flex items-center mt-2">
                <AlertTriangle className="w-4 h-4 text-warning-500" />
                <span className="metric-change ml-1 text-warning-600">
                  {alerts.filter(a => a.severity === 'CRITICAL').length} critical
                </span>
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-warning-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trends */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Trends (12 Months)</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <Line data={trendsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk Distribution</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <Doughnut data={riskDistributionData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Family Compliance */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Fund Family Compliance Rates</h3>
        </div>
        <div className="h-80">
          <Bar data={familyComplianceData} options={chartOptions} />
        </div>
      </div>

      {/* Regulatory Alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Regulatory Alerts</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="select-field"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <span className="text-sm text-gray-500">
              {filteredAlerts.length} alerts
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
              <p className="text-gray-500">
                {selectedSeverity ? `No ${selectedSeverity.toLowerCase()} alerts` : 'All systems are compliant'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {alert.fund_name}
                        </span>
                        <span className={`badge ${
                          alert.severity === 'CRITICAL' ? 'badge-danger' :
                          alert.severity === 'WARNING' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Type: {alert.type}</span>
                        <span>Date: {formatDate(alert.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Compliance Details Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Fund Compliance Details</h3>
          <button className="btn-outline flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Fund Name</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Family</th>
                <th className="table-header-cell">Risk Score</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Last Updated</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {complianceSummary?.funds?.map((fund) => (
                <tr key={fund.id} className="table-row">
                  <td className="table-cell font-medium">{fund.fund_name}</td>
                  <td className="table-cell">{fund.fund_type}</td>
                  <td className="table-cell">{fund.fund_family}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      fund.risk_score <= 3 ? 'badge-success' :
                      fund.risk_score <= 6 ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {fund.risk_score}/10
                    </span>
                  </td>
                  <td className="table-cell">
                    {fund.iiroc_compliant ? (
                      <span className="badge badge-success flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Compliant</span>
                      </span>
                    ) : (
                      <span className="badge badge-danger flex items-center space-x-1">
                        <XCircle className="w-3 h-3" />
                        <span>Non-Compliant</span>
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {fund.report_date ? formatDate(fund.report_date) : 'N/A'}
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

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors">
            <Shield className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-primary-900">Run Compliance Check</p>
              <p className="text-sm text-primary-700">Check all funds for IIROC compliance</p>
            </div>
          </button>

          <button className="flex items-center p-4 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-colors">
            <FileText className="w-6 h-6 text-secondary-600 mr-3" />
            <div>
              <p className="font-medium text-secondary-900">Generate Report</p>
              <p className="text-sm text-secondary-700">Create comprehensive compliance report</p>
            </div>
          </button>

          <button className="flex items-center p-4 bg-warning-50 border border-warning-200 rounded-lg hover:bg-warning-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-warning-600 mr-3" />
            <div>
              <p className="font-medium text-warning-900">Review Alerts</p>
              <p className="text-sm text-warning-700">Address regulatory alerts and warnings</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard; 