import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ipoVerificationService } from '../features/ipoVerification/ipoVerification.service';
import IpoAllotmentModal from '../features/ipoVerification/components/IpoAllotmentModal';
import IpoResultTree from '../features/ipoVerification/components/IpoResultTree';
import SButton from '../components/common/SButton';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';

const IpoVerificationPage = () => {
  const { t } = useTranslation();
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedIpo, setSelectedIpo] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchIpos();
  }, []);

  const fetchIpos = async () => {
    try {
      setLoading(true);
      const res = await ipoVerificationService.getIposWithCapabilities();
      if (res && res.data) {
        setIpos(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch IPOs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerification = (ipo, source) => {
    setSelectedIpo(ipo);
    setSelectedSource(source);
    setVerificationResult(null);
    setIsModalOpen(true);
  };

  const handleVerify = async (payload) => {
    try {
      setVerifyLoading(true);
      const fullPayload = {
        ipoId: selectedIpo.id,
        sourceId: selectedSource.id,
        methodId: payload.methodId,
        applicantId: '00000000-0000-0000-0000-000000000000', // Mock for now if no auth context / applicant selection
        identifiers: payload.identifiers,
      };
      
      const res = await ipoVerificationService.verifyApplicant(fullPayload);
      setVerificationResult(res.data);
      setIsModalOpen(false);
    } catch (err) {
      setVerificationResult({
        status: 'FAILED',
        error_category: 'API_ERROR',
        message: err.response?.data?.message || err.message
      });
      setIsModalOpen(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div>{t('common.loading', 'Loading...')}</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
      <div style={{ padding: '2rem' }}>
        <h1>{t('ipo.page.title', 'IPO Verification')}</h1>
        
        {ipos.length === 0 ? (
          <p>{t('ipo.page.noIpos', 'No active IPOs found.')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            {ipos.map(ipo => (
              <div key={ipo.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                <h3>{ipo.name}</h3>
                <p><strong>{t('ipo.page.registrar', 'Registrar')}:</strong> {ipo.registrar_name}</p>
                
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  {ipo.sources && ipo.sources.map(source => (
                    <SButton 
                      key={source.id} 
                      onClick={() => handleOpenVerification(ipo, source)}
                    >
                      {t('ipo.page.verifyVia', 'Verify via')} {source.name}
                    </SButton>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <IpoAllotmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleVerify}
          capability={selectedSource?.capability}
          loading={verifyLoading}
        />

        {verificationResult && (
          <IpoResultTree result={verificationResult} />
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

export default IpoVerificationPage;
