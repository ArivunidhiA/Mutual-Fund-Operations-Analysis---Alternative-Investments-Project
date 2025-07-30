const FinancialCalculations = require('./financialCalculations');

class IIROCCompliance {
  /**
   * Check IIROC compliance for a fund
   */
  static checkCompliance(fundData, performanceData, alternativeInvestments) {
    const complianceChecks = {
      concentrationLimits: this.checkConcentrationLimits(alternativeInvestments),
      riskDisclosure: this.checkRiskDisclosure(fundData),
      performanceReporting: this.checkPerformanceReporting(performanceData),
      feeDisclosure: this.checkFeeDisclosure(fundData),
      liquidityRequirements: this.checkLiquidityRequirements(fundData, performanceData),
      overallCompliant: true,
      warnings: [],
      violations: []
    };

    // Aggregate compliance status
    if (!complianceChecks.concentrationLimits.compliant) {
      complianceChecks.overallCompliant = false;
      complianceChecks.violations.push('Concentration Limits');
    }

    if (!complianceChecks.riskDisclosure.compliant) {
      complianceChecks.warnings.push('Risk Disclosure');
    }

    if (!complianceChecks.performanceReporting.compliant) {
      complianceChecks.warnings.push('Performance Reporting');
    }

    if (!complianceChecks.feeDisclosure.compliant) {
      complianceChecks.violations.push('Fee Disclosure');
      complianceChecks.overallCompliant = false;
    }

    if (!complianceChecks.liquidityRequirements.compliant) {
      complianceChecks.warnings.push('Liquidity Requirements');
    }

    return complianceChecks;
  }

  /**
   * Check concentration limits (IIROC Rule 1300.1)
   */
  static checkConcentrationLimits(alternativeInvestments) {
    const maxConcentration = 20; // 20% maximum concentration per IIROC rules
    const totalAllocation = alternativeInvestments.reduce((sum, inv) => sum + inv.allocation_percentage, 0);
    
    const violations = alternativeInvestments.filter(inv => inv.allocation_percentage > maxConcentration);
    const concentrationRisk = FinancialCalculations.calculateConcentrationRisk(
      alternativeInvestments.map(inv => inv.allocation_percentage)
    );

    return {
      compliant: violations.length === 0,
      concentrationRisk: concentrationRisk,
      violations: violations.map(v => ({
        type: v.investment_type,
        allocation: v.allocation_percentage,
        limit: maxConcentration
      })),
      totalAlternativeAllocation: totalAllocation
    };
  }

  /**
   * Check risk disclosure requirements
   */
  static checkRiskDisclosure(fundData) {
    const requiredDisclosures = [
      'fund_type',
      'management_fee',
      'expense_ratio',
      'inception_date'
    ];

    const missingDisclosures = requiredDisclosures.filter(field => !fundData[field]);
    const riskScore = this.calculateRiskScore(fundData);

    return {
      compliant: missingDisclosures.length === 0,
      riskScore: riskScore,
      missingDisclosures: missingDisclosures,
      riskLevel: this.getRiskLevel(riskScore)
    };
  }

  /**
   * Check performance reporting requirements
   */
  static checkPerformanceReporting(performanceData) {
    if (!performanceData || performanceData.length === 0) {
      return {
        compliant: false,
        reason: 'No performance data available'
      };
    }

    const requiredPeriods = ['1Y', '3Y', '5Y'];
    const hasRequiredPeriods = performanceData.length >= 12; // At least 1 year of data

    const volatility = FinancialCalculations.calculateVolatility(
      performanceData.map(p => p.total_return)
    );

    const maxDrawdown = FinancialCalculations.calculateMaxDrawdown(
      performanceData.map(p => p.nav)
    );

    return {
      compliant: hasRequiredPeriods,
      volatility: volatility,
      maxDrawdown: maxDrawdown,
      dataPoints: performanceData.length,
      hasRequiredPeriods: hasRequiredPeriods
    };
  }

  /**
   * Check fee disclosure requirements
   */
  static checkFeeDisclosure(fundData) {
    const maxManagementFee = 2.5; // 2.5% maximum management fee
    const maxExpenseRatio = 3.0; // 3.0% maximum expense ratio

    const feeViolations = [];

    if (fundData.management_fee > maxManagementFee) {
      feeViolations.push(`Management fee (${fundData.management_fee}%) exceeds maximum (${maxManagementFee}%)`);
    }

    if (fundData.expense_ratio > maxExpenseRatio) {
      feeViolations.push(`Expense ratio (${fundData.expense_ratio}%) exceeds maximum (${maxExpenseRatio}%)`);
    }

    const totalFees = fundData.management_fee + fundData.expense_ratio;
    const maxTotalFees = 4.0; // 4.0% maximum total fees

    if (totalFees > maxTotalFees) {
      feeViolations.push(`Total fees (${totalFees}%) exceed maximum (${maxTotalFees}%)`);
    }

    return {
      compliant: feeViolations.length === 0,
      violations: feeViolations,
      totalFees: totalFees,
      managementFee: fundData.management_fee,
      expenseRatio: fundData.expense_ratio
    };
  }

  /**
   * Check liquidity requirements
   */
  static checkLiquidityRequirements(fundData, performanceData) {
    if (!performanceData || performanceData.length === 0) {
      return {
        compliant: false,
        reason: 'Insufficient data for liquidity analysis'
      };
    }

    const recentAUM = performanceData[performanceData.length - 1].assets_under_management;
    const minAUM = 10000000; // $10M minimum AUM for liquidity

    const avgDailyVolume = this.calculateAverageDailyVolume(performanceData);
    const liquidityRatio = recentAUM / avgDailyVolume;

    return {
      compliant: recentAUM >= minAUM && liquidityRatio <= 30, // 30 days to liquidate
      aum: recentAUM,
      minAUM: minAUM,
      liquidityRatio: liquidityRatio,
      avgDailyVolume: avgDailyVolume
    };
  }

  /**
   * Calculate risk score for a fund
   */
  static calculateRiskScore(fundData) {
    let riskScore = 0;

    // Fund type risk
    const fundTypeRisk = {
      'Fixed Income': 2,
      'Balanced': 4,
      'Canadian Equity': 6,
      'Global Equity': 7,
      'Alternative': 9,
      'Sector': 8,
      'Real Estate': 7
    };

    riskScore += fundTypeRisk[fundData.fund_type] || 5;

    // Fee risk (higher fees = higher risk)
    if (fundData.expense_ratio > 2.0) riskScore += 2;
    else if (fundData.expense_ratio > 1.5) riskScore += 1;

    // Fund age risk (newer funds = higher risk)
    const fundAge = new Date().getFullYear() - new Date(fundData.inception_date).getFullYear();
    if (fundAge < 3) riskScore += 2;
    else if (fundAge < 5) riskScore += 1;

    return Math.min(riskScore, 10); // Cap at 10
  }

  /**
   * Get risk level description
   */
  static getRiskLevel(riskScore) {
    if (riskScore <= 3) return 'Low';
    if (riskScore <= 5) return 'Low-Medium';
    if (riskScore <= 7) return 'Medium';
    if (riskScore <= 9) return 'Medium-High';
    return 'High';
  }

  /**
   * Calculate average daily volume (simplified)
   */
  static calculateAverageDailyVolume(performanceData) {
    if (performanceData.length < 2) return 0;

    const totalAUM = performanceData.reduce((sum, p) => sum + p.assets_under_management, 0);
    const avgAUM = totalAUM / performanceData.length;
    
    // Assume 1% daily volume on average
    return avgAUM * 0.01;
  }

  /**
   * Generate compliance report
   */
  static generateComplianceReport(fundId, complianceData) {
    const report = {
      fundId: fundId,
      reportDate: new Date().toISOString(),
      complianceStatus: complianceData.overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT',
      summary: {
        totalChecks: 5,
        passedChecks: Object.values(complianceData).filter(check => 
          typeof check === 'object' && check.compliant === true
        ).length,
        warnings: complianceData.warnings.length,
        violations: complianceData.violations.length
      },
      details: complianceData,
      recommendations: this.generateRecommendations(complianceData)
    };

    return report;
  }

  /**
   * Generate compliance recommendations
   */
  static generateRecommendations(complianceData) {
    const recommendations = [];

    if (!complianceData.concentrationLimits.compliant) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Concentration Limits',
        action: 'Review and rebalance portfolio to meet IIROC concentration limits',
        deadline: '30 days'
      });
    }

    if (!complianceData.feeDisclosure.compliant) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Fee Disclosure',
        action: 'Review fee structure and ensure compliance with IIROC fee limits',
        deadline: '15 days'
      });
    }

    if (complianceData.warnings.includes('Risk Disclosure')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Risk Disclosure',
        action: 'Update fund documentation with complete risk disclosures',
        deadline: '60 days'
      });
    }

    if (complianceData.warnings.includes('Liquidity Requirements')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Liquidity',
        action: 'Monitor liquidity ratios and consider portfolio adjustments',
        deadline: '90 days'
      });
    }

    return recommendations;
  }

  /**
   * Check regulatory alerts
   */
  static checkRegulatoryAlerts(fundData, performanceData) {
    const alerts = [];

    // High volatility alert
    if (performanceData && performanceData.length > 0) {
      const volatility = FinancialCalculations.calculateVolatility(
        performanceData.map(p => p.total_return)
      );
      
      if (volatility > 25) {
        alerts.push({
          type: 'HIGH_VOLATILITY',
          severity: 'WARNING',
          message: `Fund volatility (${volatility.toFixed(2)}%) exceeds normal range`,
          threshold: 25
        });
      }
    }

    // High fee alert
    if (fundData.expense_ratio > 2.0) {
      alerts.push({
        type: 'HIGH_FEES',
        severity: 'WARNING',
        message: `Expense ratio (${fundData.expense_ratio}%) is above industry average`,
        threshold: 2.0
      });
    }

    // New fund alert
    const fundAge = new Date().getFullYear() - new Date(fundData.inception_date).getFullYear();
    if (fundAge < 1) {
      alerts.push({
        type: 'NEW_FUND',
        severity: 'INFO',
        message: 'Fund is less than 1 year old - limited performance history',
        threshold: 1
      });
    }

    return alerts;
  }
}

module.exports = IIROCCompliance; 