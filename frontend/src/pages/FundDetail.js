import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  AlertTriangle,
  Calendar,
  Users,
  PieChart,
  BarChart3,
  Activity,
  Target,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

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
  Legend
);

const FundDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [alternativeInvestments, setAlternativeInvestments] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchFundData = async () => {
      try {
        setLoading(true);
        const [fundRes, performanceRes, altInvRes, complianceRes] = await Promise.all([
          axios.get(`/api/funds/${id}`),
          axios.get(`/api/funds/${id}/performance`),
          axios.get(`/api/funds/${id}/alternative-investments`),
          axios.get(`/api/compliance/${id}`)
        ]);

        setFund(fundRes.data);
        setPerformance(performanceRes.data.performance || []);
        setAlternativeInvestments(altInvRes.data.alternative_investments || []);
        setCompliance(complianceRes.data);
      } catch (error) {
        console.error('Error fetching fund data:', error);
        toast.error('Failed to load fund details');
      } finally {
        setLoading(false);
      }
    };

    fetchFundData();
  }, [id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getReturnColor = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getRiskColor = (score) => {
    if (score <= 3) return 'text-green-600';
    if (score <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceStatus = () => {
    if (!compliance) return { status: 'Unknown', color: 'text-gray-500', icon: AlertCircle };
    return compliance.iiroc_compliant 
      ? { status: 'Compliant', color: 'text-green-600', icon: CheckCircle }
      : { status: 'Non-Compliant', color: 'text-red-600', icon: XCircle };
  };

  const performanceChartData = {
    labels: performance.slice(-12).map(p => new Date(p.date).toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })),
    datasets: [
      {
        label: 'Fund NAV',
        data: performance.slice(-12).map(p => p.nav),
        borderColor: '#003B5C',
        backgroundColor: 'rgba(0, 59, 92, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Benchmark',
        data: performance.slice(-12).map(p => p.benchmark_return),
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const returnsChartData = {
    labels: performance.slice(-12).map(p => new Date(p.date).toLocaleDateString('en-CA', { month: 'short' })),
    datasets: [
      {
        label: 'Total Return (%)',
        data: performance.slice(-12).map(p => p.total_return),
        backgroundColor: performance.slice(-12).map(p => p.total_return >= 0 ? '#28A745' : '#DC3545'),
        borderColor: performance.slice(-12).map(p => p.total_return >= 0 ? '#28A745' : '#DC3545'),
        borderWidth: 1,
      }
    ]
  };

  const allocationChartData = {
    labels: alternativeInvestments.map(ai => ai.investment_type),
    datasets: [
      {
        data: alternativeInvestments.map(ai => ai.allocation_percentage),
        backgroundColor: [
          '#003B5C', '#4A90E2', '#28A745', '#FFC107', '#DC3545',
          '#6F42C1', '#FD7E14', '#20C997', '#E83E8C', '#6C757D'
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fund details...</p>
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fund Not Found</h2>
          <p className="text-gray-600 mb-4">The fund you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/funds')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Funds
          </button>
        </div>
      </div>
    );
  }

  const complianceStatus = getComplianceStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/funds')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fund.fund_name}</h1>
                <p className="text-gray-600">{fund.fund_family} • {fund.fund_type}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${complianceStatus.color} bg-opacity-10`}>
                <complianceStatus.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{complianceStatus.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'risk', label: 'Risk & Compliance', icon: Shield },
              { id: 'allocation', label: 'Allocation', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Latest NAV</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fund.latest_nav ? `$${fund.latest_nav.toFixed(4)}` : 'N/A'}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total AUM</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fund.latest_aum ? formatCurrency(fund.latest_aum) : 'N/A'}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Fees</p>
                    <p className="text-2xl font-bold text-gray-900">{fund.total_fees}%</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fund Age</p>
                    <p className="text-2xl font-bold text-gray-900">{fund.fund_age} years</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Fund Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fund Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fund Type:</span>
                    <span className="font-medium">{fund.fund_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fund Family:</span>
                    <span className="font-medium">{fund.fund_family}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inception Date:</span>
                    <span className="font-medium">{new Date(fund.inception_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Management Fee:</span>
                    <span className="font-medium">{fund.management_fee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expense Ratio:</span>
                    <span className="font-medium">{fund.expense_ratio}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">IIROC Status:</span>
                    <div className={`flex items-center space-x-2 ${complianceStatus.color}`}>
                      <complianceStatus.icon className="h-4 w-4" />
                      <span className="font-medium">{complianceStatus.status}</span>
                    </div>
                  </div>
                  {compliance && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk Score:</span>
                        <span className={`font-medium ${getRiskColor(compliance.risk_score)}`}>
                          {compliance.risk_score}/10
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Report:</span>
                        <span className="font-medium">{new Date(compliance.report_date).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">NAV Performance</h3>
                <Line data={performanceChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: false }
                  }
                }} />
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns</h3>
                <Bar data={returnsChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }} />
              </div>
            </div>

            {performance.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Latest Return', value: performance[performance.length - 1]?.total_return, format: formatPercentage },
                    { label: 'YTD Return', value: performance.slice(-12).reduce((sum, p) => sum + p.total_return, 0), format: formatPercentage },
                    { label: 'Best Month', value: Math.max(...performance.map(p => p.total_return)), format: formatPercentage },
                    { label: 'Worst Month', value: Math.min(...performance.map(p => p.total_return)), format: formatPercentage },
                  ].map((metric, index) => (
                    <div key={index} className="text-center">
                      <p className="text-sm text-gray-600">{metric.label}</p>
                      <p className={`text-xl font-bold ${getReturnColor(metric.value)}`}>
                        {metric.format(metric.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Details</h3>
                {compliance ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">IIROC Compliance</span>
                      <div className={`flex items-center space-x-2 ${complianceStatus.color}`}>
                        <complianceStatus.icon className="h-4 w-4" />
                        <span className="font-medium">{complianceStatus.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Risk Score</span>
                      <span className={`font-medium ${getRiskColor(compliance.risk_score)}`}>
                        {compliance.risk_score}/10
                      </span>
                    </div>

                    {compliance.regulatory_notes && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">{compliance.regulatory_notes}</p>
                      </div>
                    )}

                    {compliance.concentration_warnings && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <p className="text-sm text-yellow-800">{compliance.concentration_warnings}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No compliance data available</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Management Fee</span>
                    <span className={`font-medium ${fund.management_fee > 2.5 ? 'text-red-600' : 'text-green-600'}`}>
                      {fund.management_fee}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Expense Ratio</span>
                    <span className={`font-medium ${fund.expense_ratio > 3.0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fund.expense_ratio}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Total Fees</span>
                    <span className={`font-medium ${fund.total_fees > 4.0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fund.total_fees}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {alternativeInvestments.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternative Investments Allocation</h3>
                    <Doughnut data={allocationChartData} options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' },
                        title: { display: false }
                      }
                    }} />
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocation Details</h3>
                    <div className="space-y-3">
                      {alternativeInvestments.map((ai, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{ai.investment_type}</p>
                            <p className="text-sm text-gray-600">{ai.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{ai.allocation_percentage}%</p>
                            <p className={`text-sm ${getRiskColor(ai.risk_rating)}`}>
                              Risk: {ai.risk_rating}/10
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocation Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Alternative Allocation</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {alternativeInvestments.reduce((sum, ai) => sum + ai.allocation_percentage, 0).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Average Risk Rating</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(alternativeInvestments.reduce((sum, ai) => sum + ai.risk_rating, 0) / alternativeInvestments.length).toFixed(1)}/10
                      </p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">Investment Types</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {alternativeInvestments.length}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alternative Investments</h3>
                <p className="text-gray-600">This fund does not have any alternative investment allocations.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FundDetail; 