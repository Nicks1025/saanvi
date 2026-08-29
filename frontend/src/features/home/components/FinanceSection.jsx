import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Landmark, 
  PiggyBank, 
  Percent, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Coins
} from 'lucide-react';

const FinanceSection = () => {
  const [activeTab, setActiveTab] = useState('sip'); // 'sip', 'emi', 'lump', 'fd', 'rd'

  // SIP State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // EMI State
  const [emiPrincipal, setEmiPrincipal] = useState(2500000);
  const [emiRate, setEmiRate] = useState(8.5);
  const [emiYears, setEmiYears] = useState(15);

  // Lump Sum State
  const [lumpAmount, setLumpAmount] = useState(200000);
  const [lumpRate, setLumpRate] = useState(12);
  const [lumpYears, setLumpYears] = useState(5);

  // FD State
  const [fdPrincipal, setFdPrincipal] = useState(100000);
  const [fdRate, setFdRate] = useState(7.0);
  const [fdYears, setFdYears] = useState(5);

  // RD State
  const [rdMonthly, setRdMonthly] = useState(5000);
  const [rdRate, setRdRate] = useState(6.8);
  const [rdYears, setRdYears] = useState(3);

  // Format currency in Indian numbering system format (₹)
  const formatCurrency = (val) => {
    if (isNaN(val) || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val));
  };

  // Calculations
  const sipResult = useMemo(() => {
    const monthlyRate = sipRate / 12 / 100;
    const months = sipYears * 12;
    if (monthlyRate === 0) {
      const invested = sipMonthly * months;
      return { invested, maturity: invested, returns: 0 };
    }
    const maturity = sipMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const invested = sipMonthly * months;
    const returns = maturity - invested;
    return { invested, maturity, returns };
  }, [sipMonthly, sipRate, sipYears]);

  const emiResult = useMemo(() => {
    const monthlyRate = emiRate / 12 / 100;
    const months = emiYears * 12;
    if (monthlyRate === 0) {
      const emi = emiPrincipal / months;
      return { emi, totalPayment: emiPrincipal, totalInterest: 0 };
    }
    const emi = (emiPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - emiPrincipal;
    return { emi, totalPayment, totalInterest };
  }, [emiPrincipal, emiRate, emiYears]);

  const lumpResult = useMemo(() => {
    const maturity = lumpAmount * Math.pow(1 + lumpRate / 100, lumpYears);
    const invested = lumpAmount;
    const returns = maturity - invested;
    return { invested, maturity, returns };
  }, [lumpAmount, lumpRate, lumpYears]);

  const fdResult = useMemo(() => {
    // Standard quarterly compounding: A = P(1 + r/400)^(4*t)
    const maturity = fdPrincipal * Math.pow(1 + fdRate / 400, 4 * fdYears);
    const invested = fdPrincipal;
    const returns = maturity - invested;
    return { invested, maturity, returns };
  }, [fdPrincipal, fdRate, fdYears]);

  const rdResult = useMemo(() => {
    // Monthly compounding for recurring deposit
    const monthlyRate = rdRate / 12 / 100;
    const months = rdYears * 12;
    if (monthlyRate === 0) {
      const invested = rdMonthly * months;
      return { invested, maturity: invested, returns: 0 };
    }
    const maturity = rdMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const invested = rdMonthly * months;
    const returns = maturity - invested;
    return { invested, maturity, returns };
  }, [rdMonthly, rdRate, rdYears]);

  const toolsSummary = [
    {
      id: 'sip',
      title: 'SIP Planner',
      subtitle: 'Systematic Investment Plan',
      icon: TrendingUp,
      accent: 'purple',
      desc: 'Calculate the exponential power of compounding for disciplined monthly mutual fund investing.'
    },
    {
      id: 'emi',
      title: 'Loan EMI Calculator',
      subtitle: 'Home, Car & Personal Loans',
      icon: Landmark,
      accent: 'blue',
      desc: 'Estimate exact monthly installments, total interest liabilities, and principal amortization.'
    },
    {
      id: 'lump',
      title: 'Lump Sum Estimator',
      subtitle: 'One-time Investments',
      icon: Coins,
      accent: 'emerald',
      desc: 'Forecast long-term capital accumulation from single one-off investment allocations.'
    },
    {
      id: 'fd',
      title: 'Fixed Deposit (FD)',
      subtitle: 'Guaranteed Term Returns',
      icon: ShieldCheck,
      accent: 'amber',
      desc: 'Calculate quarterly compounded returns on secure fixed-rate bank deposits.'
    },
    {
      id: 'rd',
      title: 'Recurring Deposit (RD)',
      subtitle: 'Monthly Savings Interest',
      icon: PiggyBank,
      accent: 'rose',
      desc: 'Analyze recurring monthly deposit maturities with predictable compounded interest.'
    }
  ];

  return (
    <section className="home-section finance-suite-section" id="finance-section">
      <div className="section-header-block text-center">
        <div className="section-pill-tag">
          <Calculator size={14} />
          <span>Saanvi Finance Suite</span>
        </div>
        <h2 className="section-main-heading">
          Smarter Financial Calculators
        </h2>
        <p className="section-sub-heading">
          Clean, approachable planning tools engineered with accurate mathematical formulas. No ads, no tracking.
        </p>
      </div>

      {/* Tool Cards Overview */}
      <div className="finance-tools-cards-strip">
        {toolsSummary.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`finance-tab-card theme-${t.accent} ${isSelected ? 'is-active' : ''}`}
            >
              <div className="tab-card-icon">
                <Icon size={20} />
              </div>
              <div className="tab-card-content">
                <h4 className="tab-card-title">{t.title}</h4>
                <p className="tab-card-sub">{t.subtitle}</p>
              </div>
              <div className="tab-card-indicator" />
            </button>
          );
        })}
      </div>

      {/* Interactive In-Page Calculator Stage */}
      <div className="finance-calculator-stage">
        {/* SIP Calculator View */}
        {activeTab === 'sip' && (
          <div className="calc-panel">
            <div className="calc-inputs-col">
              <div className="calc-panel-header">
                <h3>SIP (Systematic Investment Plan) Calculator</h3>
                <p>Forecast wealth created through regular monthly investment.</p>
              </div>

              {/* Monthly Investment Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Monthly Investment</span>
                  <span className="slider-val-box">{formatCurrency(sipMonthly)}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="150000" 
                  step="500" 
                  value={sipMonthly} 
                  onChange={(e) => setSipMonthly(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>₹500</span>
                  <span>₹1.5 Lakh</span>
                </div>
              </div>

              {/* Expected Return Rate Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Expected Annual Return Rate</span>
                  <span className="slider-val-box">{sipRate}% p.a.</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="0.5" 
                  value={sipRate} 
                  onChange={(e) => setSipRate(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1%</span>
                  <span>30%</span>
                </div>
              </div>

              {/* Time Period Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Time Horizon</span>
                  <span className="slider-val-box">{sipYears} Years ({sipYears * 12} Mos)</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="35" 
                  step="1" 
                  value={sipYears} 
                  onChange={(e) => setSipYears(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1 Yr</span>
                  <span>35 Yrs</span>
                </div>
              </div>
            </div>

            {/* Output Summary Box */}
            <div className="calc-outputs-col">
              <div className="calc-result-card">
                <div className="result-main-highlight">
                  <span className="res-sub">Expected Maturity Wealth</span>
                  <span className="res-large text-purple">{formatCurrency(sipResult.maturity)}</span>
                </div>

                <div className="result-breakdown-table">
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot invested" />Total Invested</div>
                    <div className="b-val">{formatCurrency(sipResult.invested)}</div>
                  </div>
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot returns" />Est. Returns Gain</div>
                    <div className="b-val text-green">+{formatCurrency(sipResult.returns)}</div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="ratio-bar-wrapper">
                  <div 
                    className="ratio-bar-fill invested" 
                    style={{ width: `${Math.min(100, Math.max(5, (sipResult.invested / sipResult.maturity) * 100))}%` }} 
                    title="Invested Amount"
                  />
                  <div 
                    className="ratio-bar-fill returns" 
                    style={{ width: `${Math.min(100, Math.max(5, (sipResult.returns / sipResult.maturity) * 100))}%` }} 
                    title="Est. Returns"
                  />
                </div>
                <div className="ratio-legend">
                  <span>Invested: {Math.round((sipResult.invested / sipResult.maturity) * 100)}%</span>
                  <span>Wealth Gain: {Math.round((sipResult.returns / sipResult.maturity) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMI Calculator View */}
        {activeTab === 'emi' && (
          <div className="calc-panel">
            <div className="calc-inputs-col">
              <div className="calc-panel-header">
                <h3>Loan EMI Calculator</h3>
                <p>Calculate your monthly repayment obligation and total interest outlay.</p>
              </div>

              {/* Principal Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Loan Amount (Principal)</span>
                  <span className="slider-val-box">{formatCurrency(emiPrincipal)}</span>
                </div>
                <input 
                  type="range" 
                  min="50000" 
                  max="20000000" 
                  step="50000" 
                  value={emiPrincipal} 
                  onChange={(e) => setEmiPrincipal(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>₹50K</span>
                  <span>₹2 Crore</span>
                </div>
              </div>

              {/* Interest Rate Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Interest Rate (Annual)</span>
                  <span className="slider-val-box">{emiRate}% p.a.</span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="24" 
                  step="0.1" 
                  value={emiRate} 
                  onChange={(e) => setEmiRate(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>4%</span>
                  <span>24%</span>
                </div>
              </div>

              {/* Loan Tenure Slider */}
              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Loan Tenure</span>
                  <span className="slider-val-box">{emiYears} Years ({emiYears * 12} Months)</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="1" 
                  value={emiYears} 
                  onChange={(e) => setEmiYears(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1 Yr</span>
                  <span>30 Yrs</span>
                </div>
              </div>
            </div>

            {/* Output Summary Box */}
            <div className="calc-outputs-col">
              <div className="calc-result-card">
                <div className="result-main-highlight">
                  <span className="res-sub">Monthly EMI Repayment</span>
                  <span className="res-large text-blue">{formatCurrency(emiResult.emi)}<span className="text-sm">/mo</span></span>
                </div>

                <div className="result-breakdown-table">
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot invested" />Principal Loan</div>
                    <div className="b-val">{formatCurrency(emiPrincipal)}</div>
                  </div>
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot interest" />Total Interest Payable</div>
                    <div className="b-val text-amber">{formatCurrency(emiResult.totalInterest)}</div>
                  </div>
                  <div className="breakdown-row total-row">
                    <div className="b-label">Total Amount Payable</div>
                    <div className="b-val font-bold">{formatCurrency(emiResult.totalPayment)}</div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="ratio-bar-wrapper">
                  <div 
                    className="ratio-bar-fill invested" 
                    style={{ width: `${Math.min(100, Math.max(5, (emiPrincipal / emiResult.totalPayment) * 100))}%` }} 
                    title="Principal"
                  />
                  <div 
                    className="ratio-bar-fill interest" 
                    style={{ width: `${Math.min(100, Math.max(5, (emiResult.totalInterest / emiResult.totalPayment) * 100))}%` }} 
                    title="Total Interest"
                  />
                </div>
                <div className="ratio-legend">
                  <span>Principal: {Math.round((emiPrincipal / emiResult.totalPayment) * 100)}%</span>
                  <span>Interest: {Math.round((emiResult.totalInterest / emiResult.totalPayment) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lump Sum Calculator View */}
        {activeTab === 'lump' && (
          <div className="calc-panel">
            <div className="calc-inputs-col">
              <div className="calc-panel-header">
                <h3>Lump Sum Investment Calculator</h3>
                <p>Calculate compounding returns on single one-time capital allocations.</p>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Total Investment</span>
                  <span className="slider-val-box">{formatCurrency(lumpAmount)}</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="5000000" 
                  step="5000" 
                  value={lumpAmount} 
                  onChange={(e) => setLumpAmount(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>₹5,000</span>
                  <span>₹50 Lakh</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Expected Return Rate</span>
                  <span className="slider-val-box">{lumpRate}% p.a.</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="25" 
                  step="0.5" 
                  value={lumpRate} 
                  onChange={(e) => setLumpRate(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1%</span>
                  <span>25%</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Time Horizon</span>
                  <span className="slider-val-box">{lumpYears} Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="1" 
                  value={lumpYears} 
                  onChange={(e) => setLumpYears(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1 Yr</span>
                  <span>30 Yrs</span>
                </div>
              </div>
            </div>

            <div className="calc-outputs-col">
              <div className="calc-result-card">
                <div className="result-main-highlight">
                  <span className="res-sub">Future Maturity Value</span>
                  <span className="res-large text-emerald">{formatCurrency(lumpResult.maturity)}</span>
                </div>

                <div className="result-breakdown-table">
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot invested" />Invested Capital</div>
                    <div className="b-val">{formatCurrency(lumpResult.invested)}</div>
                  </div>
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot returns" />Est. Compounded Gain</div>
                    <div className="b-val text-green">+{formatCurrency(lumpResult.returns)}</div>
                  </div>
                </div>

                <div className="ratio-bar-wrapper">
                  <div 
                    className="ratio-bar-fill invested" 
                    style={{ width: `${Math.min(100, Math.max(5, (lumpResult.invested / lumpResult.maturity) * 100))}%` }} 
                  />
                  <div 
                    className="ratio-bar-fill returns" 
                    style={{ width: `${Math.min(100, Math.max(5, (lumpResult.returns / lumpResult.maturity) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FD Calculator View */}
        {activeTab === 'fd' && (
          <div className="calc-panel">
            <div className="calc-inputs-col">
              <div className="calc-panel-header">
                <h3>Fixed Deposit (FD) Calculator</h3>
                <p>Calculate guaranteed maturity returns with standard quarterly bank compounding.</p>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Deposit Amount</span>
                  <span className="slider-val-box">{formatCurrency(fdPrincipal)}</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="2000000" 
                  step="5000" 
                  value={fdPrincipal} 
                  onChange={(e) => setFdPrincipal(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>₹5,000</span>
                  <span>₹20 Lakh</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Annual FD Interest Rate</span>
                  <span className="slider-val-box">{fdRate}% p.a.</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="12" 
                  step="0.1" 
                  value={fdRate} 
                  onChange={(e) => setFdRate(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>3%</span>
                  <span>12%</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Tenure</span>
                  <span className="slider-val-box">{fdYears} Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1" 
                  value={fdYears} 
                  onChange={(e) => setFdYears(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1 Yr</span>
                  <span>10 Yrs</span>
                </div>
              </div>
            </div>

            <div className="calc-outputs-col">
              <div className="calc-result-card">
                <div className="result-main-highlight">
                  <span className="res-sub">Total Maturity Value</span>
                  <span className="res-large text-amber">{formatCurrency(fdResult.maturity)}</span>
                </div>

                <div className="result-breakdown-table">
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot invested" />Principal Deposit</div>
                    <div className="b-val">{formatCurrency(fdResult.invested)}</div>
                  </div>
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot returns" />Interest Earned</div>
                    <div className="b-val text-green">+{formatCurrency(fdResult.returns)}</div>
                  </div>
                </div>

                <div className="ratio-bar-wrapper">
                  <div 
                    className="ratio-bar-fill invested" 
                    style={{ width: `${Math.min(100, Math.max(5, (fdResult.invested / fdResult.maturity) * 100))}%` }} 
                  />
                  <div 
                    className="ratio-bar-fill returns" 
                    style={{ width: `${Math.min(100, Math.max(5, (fdResult.returns / fdResult.maturity) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RD Calculator View */}
        {activeTab === 'rd' && (
          <div className="calc-panel">
            <div className="calc-inputs-col">
              <div className="calc-panel-header">
                <h3>Recurring Deposit (RD) Calculator</h3>
                <p>Plan guaranteed monthly savings with cumulative interest.</p>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Monthly Deposit</span>
                  <span className="slider-val-box">{formatCurrency(rdMonthly)}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="50000" 
                  step="500" 
                  value={rdMonthly} 
                  onChange={(e) => setRdMonthly(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>₹500</span>
                  <span>₹50,000</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Annual RD Interest Rate</span>
                  <span className="slider-val-box">{rdRate}% p.a.</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="12" 
                  step="0.1" 
                  value={rdRate} 
                  onChange={(e) => setRdRate(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>3%</span>
                  <span>12%</span>
                </div>
              </div>

              <div className="calc-slider-group">
                <div className="slider-label-row">
                  <span className="slider-name">Tenure</span>
                  <span className="slider-val-box">{rdYears} Years ({rdYears * 12} Months)</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1" 
                  value={rdYears} 
                  onChange={(e) => setRdYears(Number(e.target.value))}
                  className="calc-range-slider"
                />
                <div className="slider-scale-ends">
                  <span>1 Yr</span>
                  <span>10 Yrs</span>
                </div>
              </div>
            </div>

            <div className="calc-outputs-col">
              <div className="calc-result-card">
                <div className="result-main-highlight">
                  <span className="res-sub">Total Maturity Value</span>
                  <span className="res-large text-rose">{formatCurrency(rdResult.maturity)}</span>
                </div>

                <div className="result-breakdown-table">
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot invested" />Total Deposited</div>
                    <div className="b-val">{formatCurrency(rdResult.invested)}</div>
                  </div>
                  <div className="breakdown-row">
                    <div className="b-label"><span className="legend-dot returns" />Total Interest Earned</div>
                    <div className="b-val text-green">+{formatCurrency(rdResult.returns)}</div>
                  </div>
                </div>

                <div className="ratio-bar-wrapper">
                  <div 
                    className="ratio-bar-fill invested" 
                    style={{ width: `${Math.min(100, Math.max(5, (rdResult.invested / rdResult.maturity) * 100))}%` }} 
                  />
                  <div 
                    className="ratio-bar-fill returns" 
                    style={{ width: `${Math.min(100, Math.max(5, (rdResult.returns / rdResult.maturity) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FinanceSection;
