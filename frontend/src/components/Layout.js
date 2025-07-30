import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Building2, 
  Menu, 
  X, 
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Fund Analysis', href: '/funds', icon: TrendingUp },
    { name: 'Compliance', href: '/compliance', icon: Shield },
    { name: 'Alternative Investments', href: '/alternative-investments', icon: Building2 },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-400 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-bold text-gray-900">Mutual Fund Analysis</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-400 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">FA</span>
              </div>
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-700">Financial Analyst</p>
                <p className="text-xs text-gray-500">IIROC Certified</p>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <HelpCircle className="mr-3 h-4 w-4" />
                  Help
                </button>
                <hr className="my-1" />
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || 'Mutual Fund Analysis'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg">
                <div className="relative">
                  <div className="w-2 h-2 bg-danger-500 rounded-full absolute -top-1 -right-1"></div>
                  <Shield className="w-5 h-5" />
                </div>
              </button>

              {/* Compliance status */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-success-50 text-success-700 rounded-full">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span className="text-sm font-medium">IIROC Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-500">
              © 2024 Mutual Fund Analysis Platform. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>IIROC Compliant</span>
              <span>•</span>
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout; 