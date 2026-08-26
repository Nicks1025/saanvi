import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ipoAllotmentService } from '../features/ipoVerification/ipoAllotment.service';
import IpoAllotmentModal from '../features/ipoVerification/components/IpoAllotmentModal';
import IpoResultTree from '../features/ipoVerification/components/IpoResultTree';
import SButton from '../components/common/SButton';
import SDataTable from '../components/common/SDataTable';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import toast from 'react-hot-toast';

const IpoAllotmentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [ipos, setIpos] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('All');
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [iposRes, applicantsRes] = await Promise.all([
        ipoAllotmentService.getIpos(),
        ipoAllotmentService.getApplicants()
      ]);
      setIpos(iposRes?.data || []);
      setApplicants(Array.isArray(applicantsRes) ? applicantsRes : (applicantsRes?.data || []));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch IPO catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerification = (ipo) => {
    if (applicants.length === 0) {
      toast.error(t('ipo.page.noApplicants', 'Please add an applicant first.'));
      return;
    }
    setSelectedIpo(ipo);
    setVerificationResults(null);
    setIsModalOpen(true);
  };

  const [captchaState, setCaptchaState] = useState(null);

  const handleVerify = async (selections, session = null) => {
    try {
      setVerifyLoading(true);
      const payload = {
        ipoId: selectedIpo.id,
        selections: selections,
        session: session
      };
      
      const res = await ipoAllotmentService.checkAllotment(payload);
      const results = Array.isArray(res) ? res : (res.data || []);
      
      // Check if any result demands a CAPTCHA (usually happens across the batch for a new session)
      const captchaReq = results.find(r => r.result && r.result.status === 'CAPTCHA_REQUIRED');
      if (captchaReq) {
        setCaptchaState({
           selections,
           sessionId: captchaReq.result.sessionId,
           captchaImage: captchaReq.result.captchaImage,
           message: captchaReq.result.message || 'Please solve the CAPTCHA to continue.'
        });
        setVerifyLoading(false);
        return; // Pause flow, don't close modal
      }

      setVerificationResults(results);
      setIsModalOpen(false);
      setCaptchaState(null);
      toast.success(t('ipo.page.verificationComplete', 'Verification complete'));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCaptchaSubmit = (captchaText) => {
    if (!captchaState) return;
    const sessionPayload = {
      sessionId: captchaState.sessionId,
      captchaText: captchaText
    };
    handleVerify(captchaState.selections, sessionPayload);
  };

  const getParsedCloseDate = (ipo) => {
    if (ipo.dates?.close) return new Date(ipo.dates.close).getTime();
    if (ipo.dates?.raw) {
      const match = ipo.dates.raw.match(/-\s*(\d{2})\/(\d{2})\/(\d{2})/);
      if (match) {
        return new Date(`20${match[3]}`, parseInt(match[2]) - 1, parseInt(match[1])).getTime();
      }
    }
    return 0;
  };

  const isRecentlyClosed = (ipo) => {
    if (ipo.status !== 'CLOSED' && ipo.status !== 'LISTED') return false;
    const closeTime = getParsedCloseDate(ipo);
    if (!closeTime) return ipo.status === 'CLOSED';
    
    const now = Date.now();
    const daysSinceClose = (now - closeTime) / (24 * 60 * 60 * 1000);
    // Allow up to 15 days past the close date (or slightly negative if time zones/hours differ)
    return daysSinceClose >= -1 && daysSinceClose <= 15;
  };

  const getFilteredIpos = () => {
    let filtered = ipos;
    if (activeTab !== 'All') {
      if (activeTab === 'Recently Closed') {
        filtered = ipos.filter(isRecentlyClosed);
      } else {
        filtered = ipos.filter(i => i.status === activeTab.toUpperCase());
      }
    }
    
    // Sort latest on top
    return [...filtered].sort((a, b) => {
      const getTimestamp = (ipo) => {
        if (ipo.dates?.open) return new Date(ipo.dates.open).getTime();
        if (ipo.dates?.raw) {
          const match = ipo.dates.raw.match(/(\d{2})\/(\d{2})\/(\d{2})/);
          if (match) {
            return new Date(`20${match[3]}`, parseInt(match[2]) - 1, parseInt(match[1])).getTime();
          }
        }
        return 0; // fallback for TBA / Unknown
      };
      return getTimestamp(b) - getTimestamp(a);
    });
  };

  const renderContent = () => {
    if (loading) return <div style={{ padding: '2rem' }}>{t('common.loading', 'Loading IPO Catalogue...')}</div>;

    const displayIpos = getFilteredIpos();
    
    const tabNames = ['All', 'Active', 'Recently Closed', 'Upcoming', 'Listed'];
    const tabsArray = tabNames.map(tab => {
      let count = 0;
      if (tab === 'All') count = ipos.length;
      else if (tab === 'Recently Closed') count = ipos.filter(isRecentlyClosed).length;
      else count = ipos.filter(i => i.status === tab.toUpperCase()).length;
      return { label: tab, count };
    });

    const columns = [
      { key: 'name', label: t('ipo.table.name', 'IPO Name'), sortable: true, render: row => <span style={{ fontWeight: 'bold' }}>{row.name}</span> },
      { key: 'symbol', label: t('ipo.table.symbol', 'Symbol'), sortable: true, render: row => <span style={{ color: 'var(--text-secondary)' }}>{row.symbol || '-'}</span> },
      { key: 'status', label: t('ipo.table.status', 'Status'), sortable: true },
      { key: 'issueSize', label: t('ipo.table.issueSize', 'Issue Size'), sortable: true, render: row => row.issueSize ? `${row.issueSize}` : '-' },
      { key: 'priceBand', label: t('ipo.table.priceBand', 'Price Band'), render: row => row.priceBand?.raw || '-' },
      { key: 'gmp', label: t('ipo.table.gmp', 'GMP'), render: row => {
          const gmpInfo = row.marketData?.gmp?.raw || '-';
          return <span style={{ color: gmpInfo !== '-' ? 'var(--success)' : 'inherit' }}>{gmpInfo}</span>;
      }},
      { key: 'dates', label: t('ipo.table.dates', 'Bidding Dates'), render: row => {
          if (row.dates?.raw) return row.dates.raw;
          if (row.dates?.open || row.dates?.close) {
             const startDate = row.dates.open ? new Date(row.dates.open).toLocaleDateString() : '-';
             const endDate = row.dates.close ? new Date(row.dates.close).toLocaleDateString() : '-';
             return `${startDate} - ${endDate}`;
          }
          return '-';
      }},
      { key: 'registrar', label: t('ipo.table.registrar', 'Registrar'), render: row => row.registrar?.name || '-' },
      { key: 'action', label: t('ipo.table.action', 'Action'), render: row => (
          <div style={{ textAlign: 'right' }}>
            <SButton onClick={() => handleOpenVerification(row)} disabled={!row.canCheckAllotment} title={!row.canCheckAllotment ? t('ipo.page.allotmentNotAvailable', 'Allotment is not available yet.') : ''}>
              {t('ipo.page.checkAllotment', 'Check Allotment')}
            </SButton>
          </div>
      )}
    ];

    return (
      <div>
        {error ? (
          <div style={{ marginTop: '2rem', background: '#ffebee', color: '#c62828', padding: '2rem', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
            <h2 style={{ marginTop: 0 }}>{t('ipo.page.errorTitle', 'IPO Catalogue Unavailable')}</h2>
            <p>{error}</p>
            <SButton onClick={fetchData} variant="secondary" style={{ marginTop: '1rem' }}>
              {t('common.retry', 'Retry')}
            </SButton>
          </div>
        ) : (
          <>
            {ipos.length === 0 ? (
              <p style={{ padding: '2rem' }}>{t('ipo.page.noIpos', 'No IPOs found in the catalog.')}</p>
            ) : (
              <div>
                <SDataTable 
                  title={t('ipo.page.allotmentTitle', 'IPO Allotment')}
                  headerActions={
                    <SButton onClick={() => navigate('/ipo-allotment/add')} variant="primary">
                      + {t('ipo.page.addApplicant', 'Add Applicant')}
                    </SButton>
                  }
                  data={displayIpos}
                  columns={columns}
                  tabs={tabsArray}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  searchPlaceholder={t('ipo.page.searchPlaceholder', 'Search IPO by name or symbol...')}
                  pagination={{ sortColu: 'name', sortOrder: 'asc' }}
                />
              </div>
            )}

        <IpoAllotmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCaptchaState(null);
          }}
          onSubmit={handleVerify}
          ipo={selectedIpo}
          applicants={applicants}
          loading={verifyLoading}
          captchaState={captchaState}
          onCaptchaSubmit={handleCaptchaSubmit}
        />

        {verificationResults && verificationResults.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>{t('ipo.page.results', 'Results')}</h3>
            {verificationResults.map((res, idx) => (
              <div key={idx} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <h4>{applicants.find(a => a.id === res.applicantId)?.name} - {res.type}: {res.value}</h4>
                {res.status === 'SUCCESS' ? (
                  <IpoResultTree result={res.result} />
                ) : (
                  <div style={{ color: 'red' }}>Error: {res.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        {renderContent()}
      </AppLayout>
    </ProtectedRoute>
  );
};

export default IpoAllotmentPage;

