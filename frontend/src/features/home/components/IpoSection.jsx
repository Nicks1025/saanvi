import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Calendar, 
  Building2, 
  CheckCircle2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

const IpoSection = () => {
  const [selectedRegistrar, setSelectedRegistrar] = useState('linkintime');

  const registrars = [
    {
      id: 'linkintime',
      name: 'Link Intime India',
      domain: 'linkintime.co.in',
      url: 'https://linkintime.co.in/initial_offer/public-issues.html',
      supported: 'Major Mainboard & SME IPOs',
      status: 'Active Gateway'
    },
    {
      id: 'kfintech',
      name: 'KFin Technologies',
      domain: 'kfintech.com',
      url: 'https://kosmic.kfintech.com/ipostatus/',
      supported: 'Mainboard IPOs & Mutual Funds',
      status: 'Active Gateway'
    },
    {
      id: 'bigshare',
      name: 'Bigshare Services',
      domain: 'bigshareonline.com',
      url: 'https://www.bigshareonline.com/ipo_Allotment.html',
      supported: 'SME IPOs & Emerging Issuances',
      status: 'Active Gateway'
    }
  ];

  const ipoPhases = [
    {
      step: '01',
      title: 'Announcement & DRHP',
      desc: 'Company files draft prospectus with SEBI detailing issue size, object of the offer, and financials.'
    },
    {
      step: '02',
      title: 'Bidding Window Opens',
      desc: 'Price band and lot size are published. Retail, HNI, and QIB investors place bids across 3 open trading days.'
    },
    {
      step: '03',
      title: 'Basis of Allotment',
      desc: 'Registrar finalizes share distribution based on oversubscription ratios and lottery allotment algorithms.'
    },
    {
      step: '04',
      title: 'Listing Day & Trading',
      desc: 'Shares get credited to demat accounts and start active secondary market trading on NSE and BSE.'
    }
  ];

  return (
    <section className="home-section ipo-hub-section" id="ipo-section">
      <div className="section-header-block text-center">
        <div className="section-pill-tag">
          <TrendingUp size={14} />
          <span>Saanvi IPO Hub</span>
        </div>
        <h2 className="section-main-heading">
          Track IPO Lifecycles & Check Allotments
        </h2>
        <p className="section-sub-heading">
          Understand issue mechanics, calculate retail lot commitments, and access official allotment verification gateways.
        </p>
      </div>

      <div className="ipo-suite-grid">
        {/* Left Column: IPO Roadmap & Lifecycle */}
        <div className="ipo-lifecycle-col">
          <div className="ipo-card-box">
            <div className="box-top-tag">
              <Sparkles size={14} />
              <span>How IPOs Work</span>
            </div>
            <h3 className="box-title">The 4-Stage IPO Journey</h3>
            <p className="box-desc">
              From the initial draft filing to the opening bell on exchange listing day, understand each critical milestone.
            </p>

            <div className="ipo-steps-vertical">
              {ipoPhases.map((phase) => (
                <div key={phase.step} className="ipo-step-card">
                  <div className="step-badge">{phase.step}</div>
                  <div className="step-info">
                    <h4 className="step-name">{phase.title}</h4>
                    <p className="step-detail">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Allotment Verification Gateway */}
        <div className="ipo-allotment-col">
          <div className="ipo-gateway-card">
            <div className="gateway-header">
              <div className="gateway-icon">
                <FileCheck2 size={24} />
              </div>
              <div>
                <h3 className="gateway-title">Official Allotment Gateways</h3>
                <p className="gateway-subtitle">
                  Verify genuine allotment directly with SEBI-registered registrar portals.
                </p>
              </div>
            </div>

            {/* Registrar selection tabs */}
            <div className="registrar-tabs-row">
              {registrars.map((reg) => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSelectedRegistrar(reg.id)}
                  className={`reg-tab-btn ${selectedRegistrar === reg.id ? 'is-active' : ''}`}
                >
                  <Building2 size={16} />
                  <span>{reg.name}</span>
                </button>
              ))}
            </div>

            {/* Selected Registrar Info Box */}
            {(() => {
              const current = registrars.find((r) => r.id === selectedRegistrar) || registrars[0];
              return (
                <div className="reg-info-panel">
                  <div className="reg-panel-top">
                    <div>
                      <h4 className="reg-entity-name">{current.name}</h4>
                      <div className="reg-coverage-tag">{current.supported}</div>
                    </div>
                    <span className="reg-status-chip">
                      <CheckCircle2 size={12} />
                      <span>{current.status}</span>
                    </span>
                  </div>

                  <div className="reg-checklist">
                    <div className="check-item">
                      <CheckCircle2 size={15} className="text-emerald" />
                      <span>Search by PAN Card number or Application No.</span>
                    </div>
                    <div className="check-item">
                      <CheckCircle2 size={15} className="text-emerald" />
                      <span>Instant bid confirmation and allotted lot counts</span>
                    </div>
                    <div className="check-item">
                      <CheckCircle2 size={15} className="text-emerald" />
                      <span>Direct official secure HTTPS encryption</span>
                    </div>
                  </div>

                  <a 
                    href={current.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="reg-external-btn"
                  >
                    <span>Check Allotment on {current.name}</span>
                    <ExternalLink size={16} />
                  </a>
                </div>
              );
            })()}

            {/* Transparency Note */}
            <div className="ipo-transparency-note">
              <AlertCircle size={16} className="text-amber" />
              <span>
                Saanvi provides direct registrar redirection to ensure 100% data authenticity and avoid storing sensitive PAN/DP details.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IpoSection;
