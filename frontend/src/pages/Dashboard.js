import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Building2
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

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [performanceTrends, setPerformanceTrends] = useState([]);
  const [alternativeInvestments, setAlternativeInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data in parallel
        const [summaryRes, topPerformersRes, trendsRes, altInvestmentsRes] = await Promise.all([
          axios.get('/api/dashboard/summary'),
          axios.get('/api/dashboard/top-performers?limit=5'),
          axios.get('/api/dashboard/performance-trends?period=12'),
          axios.get('/api/dashboard/alternative-investments')
        ]);

        setSummary(summaryRes.data);
        setTopPerformers(topPerformersRes.data.top_performers);
        setPerformanceTrends(trendsRes.data.trends);
        setAlternativeInvestments(altInvestmentsRes.data.alternative_investments);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getMetricIcon = (metric) => {
    switch (metric) {
      case 'total_funds':
        return <BarChart3 className="w-6 h-6 text-primary-500" />;
      case 'total_aum':
        return <DollarSign className="w-6 h-6 text-success-500" />;
      case 'compliance_rate':
        return <Shield className="w-6 h-6 text-secondary-500" />;
      default:
        return <TrendingUp className="w-6 h-6 text-gray-500" />;
    }
  };

  const getMetricChange = (metric) => {
    // Mock change data - in real app this would come from API
    const changes = {
      total_funds: 2.5,
      total_aum: -1.2,
      compliance_rate: 0.8
    };
    return changes[metric] || 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  // Chart data for performance trends
  const performanceChartData = {
    labels: performanceTrends.map(trend => new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Fund Returns',
        data: performanceTrends.map(trend => trend.cumulative_fund_return),
        borderColor: '#003B5C',
        backgroundColor: 'rgba(0, 59, 92, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Benchmark Returns',
        data: performanceTrends.map(trend => trend.cumulative_benchmark_return),
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // Chart data for alternative investments
  const altInvestmentsChartData = {
    labels: alternativeInvestments.map(inv => inv.investment_type),
    datasets: [
      {
        data: alternativeInvestments.map(inv => inv.total_allocation),
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

  // Chart data for fund types distribution
  const fundTypesChartData = {
    labels: summary?.fund_types.map(type => type.fund_type) || [],
    datasets: [
      {
        data: summary?.fund_types.map(type => type.count) || [],
        backgroundColor: [
          '#003B5C',
          '#4A90E2',
          '#28A745',
          '#DC3545',
          '#FFC107',
          '#6F42C1'
        ],
        borderWidth: 2,
        borderColor: '#fff',
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Comprehensive overview of mutual fund operations and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Funds</p>
              <p className="metric-value">{summary?.summary.total_funds || 0}</p>
              <div className="flex items-center mt-2">
                {getMetricChange('total_funds') >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-danger-500" />
                )}
                <span className={`metric-change ml-1 ${
                  getMetricChange('total_funds') >= 0 ? 'metric-change-positive' : 'metric-change-negative'
                }`}>
                  {formatPercentage(getMetricChange('total_funds'))}
                </span>
              </div>
            </div>
            {getMetricIcon('total_funds')}
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total AUM</p>
              <p className="metric-value">{formatCurrency(summary?.summary.total_aum || 0)}</p>
              <div className="flex items-center mt-2">
                {getMetricChange('total_aum') >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-danger-500" />
                )}
                <span className={`metric-change ml-1 ${
                  getMetricChange('total_aum') >= 0 ? 'metric-change-positive' : 'metric-change-negative'
                }`}>
                  {formatPercentage(getMetricChange('total_aum'))}
                </span>
              </div>
            </div>
            {getMetricIcon('total_aum')}
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Compliance Rate</p>
              <p className="metric-value">{summary?.summary.compliance_rate?.toFixed(1) || 0}%</p>
              <div className="flex items-center mt-2">
                {getMetricChange('compliance_rate') >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-danger-500" />
                )}
                <span className={`metric-change ml-1 ${
                  getMetricChange('compliance_rate') >= 0 ? 'metric-change-positive' : 'metric-change-negative'
                }`}>
                  {formatPercentage(getMetricChange('compliance_rate'))}
                </span>
              </div>
            </div>
            {getMetricIcon('compliance_rate')}
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Non-Compliant</p>
              <p className="metric-value">{summary?.summary.non_compliant_funds || 0}</p>
              <div className="flex items-center mt-2">
                <AlertTriangle className="w-4 h-4 text-warning-500" />
                <span className="metric-change ml-1 text-warning-600">
                  Requires attention
                </span>
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-warning-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Trends (12 Months)</h3>
            <Link to="/funds" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all funds →
            </Link>
          </div>
          <div className="h-80">
            <Line data={performanceChartData} options={chartOptions} />
          </div>
        </div>

        {/* Alternative Investments */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alternative Investments Allocation</h3>
            <Link to="/alternative-investments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View details →
            </Link>
          </div>
          <div className="h-80">
            <Doughnut data={altInvestmentsChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Performers and Fund Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Funds */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Funds</h3>
            <Link to="/funds" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {topPerformers.slice(0, 5).map((fund, index) => (
              <div key={fund.fund_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{fund.fund_name}</p>
                    <p className="text-sm text-gray-500">{fund.fund_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    fund.total_return >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    {formatPercentage(fund.total_return)}
                  </p>
                  <p className="text-sm text-gray-500">
                    NAV: ${fund.latest_nav?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fund Types Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Fund Types Distribution</h3>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <Pie data={fundTypesChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/funds"
            className="flex items-center p-4 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <p className="font-medium text-primary-900">Analyze Funds</p>
              <p className="text-sm text-primary-700">View detailed fund analysis</p>
            </div>
          </Link>

          <Link
            to="/compliance"
            className="flex items-center p-4 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-colors"
          >
            <Shield className="w-6 h-6 text-secondary-600 mr-3" />
            <div>
              <p className="font-medium text-secondary-900">Compliance Check</p>
              <p className="text-sm text-secondary-700">Review IIROC compliance</p>
            </div>
          </Link>

          <Link
            to="/alternative-investments"
            className="flex items-center p-4 bg-success-50 border border-success-200 rounded-lg hover:bg-success-100 transition-colors"
          >
            <Building2 className="w-6 h-6 text-success-600 mr-3" />
            <div>
              <p className="font-medium text-success-900">Alternative Investments</p>
              <p className="text-sm text-success-700">Analyze portfolio allocations</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 