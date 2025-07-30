import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FundAnalysis = () => {
  const [funds, setFunds] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [sortBy, setSortBy] = useState('fund_name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [fundTypes, setFundTypes] = useState([]);
  const [fundFamilies, setFundFamilies] = useState([]);

  useEffect(() => {
    fetchFunds();
    fetchFilters();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [funds, searchTerm, selectedType, selectedFamily, sortBy, sortOrder]);

  const fetchFunds = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/funds');
      setFunds(response.data.funds);
      setFilteredFunds(response.data.funds);
    } catch (error) {
      console.error('Error fetching funds:', error);
      toast.error('Failed to load funds');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [typesResponse, familiesResponse] = await Promise.all([
        axios.get('/api/funds/types'),
        axios.get('/api/funds/families')
      ]);
      setFundTypes(typesResponse.data.fund_types);
      setFundFamilies(familiesResponse.data.fund_families);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...funds];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(fund =>
        fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.fund_family.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType) {
      filtered = filtered.filter(fund => fund.fund_type === selectedType);
    }

    // Apply family filter
    if (selectedFamily) {
      filtered = filtered.filter(fund => fund.fund_family === selectedFamily);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredFunds(filtered);
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

  const formatPercentage = (value) => {
    if (!value) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const getFundTypeColor = (type) => {
    const colors = {
      'Canadian Equity': 'bg-blue-100 text-blue-800',
      'Fixed Income': 'bg-green-100 text-green-800',
      'Balanced': 'bg-purple-100 text-purple-800',
      'Global Equity': 'bg-orange-100 text-orange-800',
      'Alternative': 'bg-red-100 text-red-800',
      'Real Estate': 'bg-indigo-100 text-indigo-800',
      'Sector': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPerformanceIcon = (returnValue) => {
    if (!returnValue) return null;
    return returnValue >= 0 ? (
      <ArrowUpRight className="w-4 h-4 text-success-500" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-danger-500" />
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedFamily('');
    setSortBy('fund_name');
    setSortOrder('ASC');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton-title w-64" />
          <div className="skeleton-text w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fund Analysis</h1>
          <p className="mt-1 text-gray-600">
            Comprehensive analysis of mutual fund performance and metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {filteredFunds.length} of {funds.length} funds
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear all filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search funds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Fund Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="select-field"
          >
            <option value="">All Fund Types</option>
            {fundTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Fund Family Filter */}
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="select-field"
          >
            <option value="">All Fund Families</option>
            {fundFamilies.map(family => (
              <option key={family} value={family}>{family}</option>
            ))}
          </select>

          {/* Sort Options */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-field flex-1"
            >
              <option value="fund_name">Name</option>
              <option value="fund_type">Type</option>
              <option value="fund_family">Family</option>
              <option value="management_fee">Management Fee</option>
              <option value="expense_ratio">Expense Ratio</option>
              <option value="total_fees">Total Fees</option>
              <option value="fund_age">Fund Age</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFunds.map((fund) => (
          <div key={fund.id} className="card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {fund.fund_name}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`badge ${getFundTypeColor(fund.fund_type)}`}>
                    {fund.fund_type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {fund.fund_family}
                  </span>
                </div>
              </div>
              <Link
                to={`/funds/${fund.id}`}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5" />
              </Link>
            </div>

            <div className="space-y-3">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Management Fee</p>
                  <p className="font-semibold text-gray-900">
                    {formatPercentage(fund.management_fee)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Expense Ratio</p>
                  <p className="font-semibold text-gray-900">
                    {formatPercentage(fund.expense_ratio)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Fees</p>
                  <p className="font-semibold text-gray-900">
                    {formatPercentage(fund.total_fees)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Fund Age</p>
                  <p className="font-semibold text-gray-900">
                    {fund.fund_age} years
                  </p>
                </div>
              </div>

              {/* NAV and AUM */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Latest NAV</p>
                  <p className="font-semibold text-gray-900">
                    ${fund.latest_nav?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">AUM</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(fund.latest_aum)}
                  </p>
                </div>
              </div>

              {/* Fund Details */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Inception: {new Date(fund.inception_date).getFullYear()}</span>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1" />
                    <span>{fund.fund_family}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Link
                    to={`/funds/${fund.id}`}
                    className="btn-primary flex-1 text-center"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/funds/${fund.id}?tab=performance`}
                    className="btn-outline flex-1 text-center"
                  >
                    Performance
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredFunds.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No funds found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search criteria or filters
          </p>
          <button
            onClick={clearFilters}
            className="btn-primary"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Summary Statistics */}
      {filteredFunds.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{filteredFunds.length}</p>
              <p className="text-sm text-gray-500">Total Funds</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(
                  filteredFunds.reduce((sum, fund) => sum + fund.total_fees, 0) / filteredFunds.length
                )}
              </p>
              <p className="text-sm text-gray-500">Avg Total Fees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  filteredFunds.reduce((sum, fund) => sum + (fund.latest_aum || 0), 0)
                )}
              </p>
              <p className="text-sm text-gray-500">Total AUM</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  filteredFunds.reduce((sum, fund) => sum + fund.fund_age, 0) / filteredFunds.length
                )}
              </p>
              <p className="text-sm text-gray-500">Avg Fund Age</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundAnalysis; 