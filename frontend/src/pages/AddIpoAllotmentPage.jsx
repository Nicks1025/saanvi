import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ipoAllotmentService } from '../features/ipoVerification/ipoAllotment.service';
import SForm from '../components/common/SForm';
import STextField from '../components/common/STextField';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import toast from 'react-hot-toast';

const AddIpoAllotmentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [dpid, setDpid] = useState('');
  const [appNumber, setAppNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase());
  const isFormValid = name.trim().length > 0 && isPanValid;

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        toast.error(t('ipo.page.nameRequired', 'Applicant Name is required'));
        return;
      }
      if (!isPanValid) {
        toast.error(t('ipo.page.panInvalid', 'Enter a valid PAN in the format ABCDE1234F.'));
        return;
      }
      
      const identifiers = {};
      if (pan.trim()) identifiers['PAN'] = pan.trim();
      if (dpid.trim()) identifiers['DPID'] = dpid.trim();
      if (appNumber.trim()) identifiers['APPLICATION_NUMBER'] = appNumber.trim();

      const payload = {
        name: name.trim(),
        identifiers
      };

      setLoading(true);
      await ipoAllotmentService.upsertApplicant(payload);
      toast.success(t('ipo.page.applicantSaved', 'Applicant saved successfully'));
      navigate('/ipo-allotment');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save applicant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>{t('ipo.page.addApplicantTitle', 'Add New Applicant')}</h2>
          </div>
          
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <SForm 
              onSubmit={handleSave} 
              onCancel={() => navigate('/ipo-allotment')}
              isValid={isFormValid}
              loading={loading}
              saveText={t('common.save', 'Save Applicant')}
              cancelText={t('common.cancel', 'Cancel')}
            >
              <div style={{ marginBottom: '2rem' }}>
                <h3>{t('ipo.page.applicantDetails', 'Applicant Details')}</h3>
                <STextField
                  label={t('ipo.page.applicantName', 'Full Name')}
                  text={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  required
                />
              </div>

              <hr style={{ borderColor: 'var(--border)', margin: '2rem 0' }} />
              
              <div style={{ marginBottom: '2rem' }}>
                <h3>{t('ipo.page.identifiers', 'Identifiers')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {t('ipo.page.identifiersHelp', 'Provide the identifiers used when applying for the IPO. These will be used to check allotment status.')}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <STextField
                    label={t('ipo.page.pan', 'PAN Number')}
                    text={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    required
                    maxLength={10}
                    error={pan.length > 0 && !isPanValid ? t('ipo.page.panInvalid', 'Enter a valid PAN in the format ABCDE1234F.') : ''}
                  />
                  
                  <STextField
                    label={t('ipo.page.dpid', 'DPID (Demat Account Number)')}
                    text={dpid}
                    onChange={(e) => setDpid(e.target.value)}
                    placeholder="IN123456789"
                  />
                  
                  <STextField
                    label={t('ipo.page.appNumber', 'Application Number')}
                    text={appNumber}
                    onChange={(e) => setAppNumber(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>
            </SForm>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default AddIpoAllotmentPage;
