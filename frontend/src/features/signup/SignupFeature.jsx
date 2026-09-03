"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import SButton from '@/components/common/SButton';
import { signupUser } from './service/signupService';
import {
  validateRequired,
  validateMaxLength,
  validateEmail,
  validatePhone,
  validateDate,
  validatePassword,
  validateConfirmPassword,
  getPasswordRequirements,
} from '../../common/validations';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './signup.css';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

const GENDER_OPTIONS = [
  { label: 'Select Gender', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'हिंदी', value: 'hi' },
];

// ---------------------------------------------------------------------------
// Initial form state (no timezone)
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  language: 'en',
  password: '',
  confirmPassword: '',
};

// ---------------------------------------------------------------------------
// Form-level validation (runs on submit)
// ---------------------------------------------------------------------------

function validateForm(form, formConfig) {
  const e = {};

  const emailErr = validateEmail(form.email);
  if (emailErr) e.email = emailErr;

  const passwordErr = validatePassword(form.password, {
    firstName: form.first_name,
    lastName: form.last_name,
    displayName: form.display_name,
  });
  if (passwordErr) e.password = passwordErr;

  const confirmErr = validateConfirmPassword(form.password, form.confirmPassword);
  if (confirmErr) e.confirmPassword = confirmErr;

  // Validate dynamic required fields
  formConfig.forEach(field => {
    if (field.is_required && (!form[field.field_name] || String(form[field.field_name]).trim() === '')) {
      e[field.field_name] = `${field.label} is required`;
    }
  });

  return e;
}

// ---------------------------------------------------------------------------
// Password requirements checklist
// ---------------------------------------------------------------------------

const PasswordRequirements = ({ password, firstName, lastName, displayName }) => {
  const requirements = getPasswordRequirements(password, { firstName, lastName, displayName });
  return (
    <div className="signup-pw-requirements">
      <p className="signup-pw-req-title">Password must contain</p>
      <ul className="signup-pw-req-list">
        {requirements.map((req) => (
          <li
            key={req.key}
            className={`signup-pw-req-item ${req.met ? 'signup-pw-req-met' : 'signup-pw-req-unmet'}`}
          >
            <span className="signup-pw-req-icon" aria-hidden="true">
              {req.met ? '✓' : '○'}
            </span>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DropdownField — wraps SDropdown with required mark + error
// ---------------------------------------------------------------------------

const DropdownField = ({ label, required, value, options, onChange, error }) => (
  <div className="signup-dropdown-field">
    <SDropdown
      label={
        required
          ? <span>{label}<span className="signup-required-star">*</span></span>
          : label
      }
      value={value}
      options={options}
      onChange={onChange}
    />
  
  </div>
);

import DynamicFormRenderer from '@/components/common/DynamicFormRenderer';
import axios from '@/services/axios.client';

// ---------------------------------------------------------------------------
// Main feature
// ---------------------------------------------------------------------------

const SignupFeature = () => {
  const navigate = useRouter();

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [formConfig, setFormConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/api/public/users/form-config?context=signup');
        const config = response.data || [];
        setFormConfig(config);
        
        const initialForm = { email: '', password: '', confirmPassword: '' };
        config.forEach(f => {
          initialForm[f.field_name] = '';
        });
        setForm(initialForm);
      } catch (err) {
        toast.error('Failed to load user fields configuration.');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Live validation for password fields
    if (field === 'password') {
      setPasswordTouched(true);
      const pwErr = validatePassword(value, {
        firstName: form.first_name,
        lastName: form.last_name,
        displayName: form.display_name,
      });
      setErrors((prev) => ({ ...prev, password: pwErr || undefined }));

      if (form.confirmPassword) {
        const confErr = validateConfirmPassword(value, form.confirmPassword);
        setErrors((prev) => ({ ...prev, confirmPassword: confErr || undefined }));
      }
      return;
    }

    if (field === 'confirmPassword') {
      const confErr = validateConfirmPassword(form.password, value);
      setErrors((prev) => ({ ...prev, confirmPassword: confErr || undefined }));
      return;
    }

    // Live required-field validation for all other touched fields
    if (field === 'phoneNumber') {
      const phoneErr = validatePhone(value);
      setErrors((prev) => ({ ...prev, phoneNumber: phoneErr || undefined }));
      return;
    }

    if (field === 'email') {
      const emailErr = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: emailErr || undefined }));
      return;
    }

    // Clear error when field has a value; re-run required if cleared
    if (errors[field]) {
      const requiredErr = validateRequired(value, field);
      if (!requiredErr) {
        setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
      }
    }
  };

  // Phone: allow only digits, cap at 10
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    handleChange('phoneNumber', digits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(form, formConfig);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      const hasRequiredError = Object.values(validationErrors).some(msg => 
        msg.toLowerCase().includes('required')
      );
      
      if (hasRequiredError) {
        toast.error('Please fill all required fields');
      } else {
        toast.error('Please provide valid values');
      }
      
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, email: form.email.trim() };
      delete payload.confirmPassword;
      await signupUser(payload);
      navigate.push('/login?signup=success');
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Something went wrong. Please try again.';
      
      if (data) {
        // If the backend returns Joi validation details array, use the first exact error message
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          msg = data.details[0];
        } else if (data.error) {
          msg = data.error;
        }
      } else if (err.message) {
        msg = err.message;
      }

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const showPwRequirements = passwordTouched || form.password.length > 0;

  const isFormValid = Object.keys(validateForm(form, formConfig)).length === 0;

  return (
    <div className="signup-content-area">

      {/* Left: Saanvi branding panel — same background, no color split */}
      <aside className="signup-branding" aria-hidden="true">
        <div className="signup-branding-inner">

          {/* Headline */}
          <h1 className="signup-branding-headline">
            Learn.<br />Play.<br />Grow.
          </h1>
          <p className="signup-branding-desc">
            Saanvi brings together brain games, word challenges and educational activities — all in one place.
          </p>

          {/* Stats bar */}
          <div className="signup-stats-row">
            <div className="signup-stat">
              <span className="signup-stat-value">500+</span>
              <span className="signup-stat-label">Words &amp; Puzzles</span>
            </div>
            <div className="signup-stat-divider" />
            <div className="signup-stat">
              <span className="signup-stat-value">50+</span>
              <span className="signup-stat-label">Game Levels</span>
            </div>
            <div className="signup-stat-divider" />
            <div className="signup-stat">
              <span className="signup-stat-value">10K+</span>
              <span className="signup-stat-label">Active Players</span>
            </div>
          </div>

          {/* Feature cards */}
          <div className="signup-feature-cards">
            <div className="signup-feature-card">
              <span className="signup-feature-icon">🎯</span>
              <div>
                <strong>Word Search</strong>
                <span>Timed puzzles that sharpen vocabulary</span>
              </div>
            </div>
            <div className="signup-feature-card">
              <span className="signup-feature-icon">🧠</span>
              <div>
                <strong>Brain Challenges</strong>
                <span>Adaptive exercises that level you up</span>
              </div>
            </div>
            <div className="signup-feature-card">
              <span className="signup-feature-icon">📚</span>
              <div>
                <strong>Learning Games</strong>
                <span>Educational content delivered through fun</span>
              </div>
            </div>
          </div>

          {/* How it works steps */}
          <div className="signup-steps">
            <p className="signup-steps-title">How it works</p>
            <div className="signup-steps-list">
              <div className="signup-step">
                <span className="signup-step-num">1</span>
                <div className="signup-step-body">
                  <strong>Create your account</strong>
                  <span>Sign up in under a minute</span>
                </div>
              </div>
              <div className="signup-step">
                <span className="signup-step-num">2</span>
                <div className="signup-step-body">
                  <strong>Pick your game</strong>
                  <span>Word search, trivia and more</span>
                </div>
              </div>
              <div className="signup-step">
                <span className="signup-step-num">3</span>
                <div className="signup-step-body">
                  <strong>Track your progress</strong>
                  <span>Earn points and climb the ranks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <blockquote className="signup-testimonial">
            <p className="signup-testimonial-text">
              "Saanvi made learning fun again. My vocabulary improved in just two weeks!"
            </p>
            <footer className="signup-testimonial-author">— Priya K., Student</footer>
          </blockquote>

          {/* Pills */}
          <div className="signup-branding-pills">
            <span className="signup-branding-pill">Learn</span>
            <span className="signup-branding-pill">Challenge</span>
            <span className="signup-branding-pill">Have Fun</span>
            <span className="signup-branding-pill">Free to Join</span>
          </div>
        </div>
      </aside>

      {/* Right: Signup form */}
      <div className="signup-form-col">
        <div className="signup-card">

        {/* Card header branding */}
        <div className="signup-card-brand">
          <img src="/saanvi_logo.png" alt="Saanvi" className="signup-card-logo" />
          <div className="signup-card-brand-text">
            <span className="signup-card-brand-name">Saanvi</span>
            <span className="signup-card-tagline">Learn · Play · Grow</span>
          </div>
        </div>

        <h2 className="signup-form-title">Create your account</h2>
        <p className="signup-form-subtitle">Join Saanvi and start your journey</p>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">



          {!configLoading && (
            <DynamicFormRenderer 
              fields={formConfig}
              form={form}
              errors={errors}
              onChange={handleChange}
            />
          )}

          {/* Password section — separated with a visual divider */}
          <div className="signup-password-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <STextField
              label="Password"
              type="password"
              text={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
              required
              error={errors.password}
              autoComplete="new-password"
            />

            {showPwRequirements && (
              <PasswordRequirements
                password={form.password}
                firstName={form.first_name}
                lastName={form.last_name}
                displayName={form.display_name}
              />
            )}

            <STextField
              label="Confirm Password"
              type="password"
              text={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              required
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <div className="signup-actions">
            <SButton
              type="submit"
              color="primary"
              disabled={loading}
              label="Create account"
              icon={loading ? <Loader2 className="signup-spinner" size={18} /> : null}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </SButton>
          </div>
        </form>

        <div className="signup-footer">
          Already have an account?{' '}
          <a href="/login" className="signup-footer-link">Sign In</a>
        </div>
        </div>{/* end signup-card */}
      </div>{/* end signup-form-col */}

      {/* Subtle decorative blobs — purely cosmetic */}
      <div className="signup-deco signup-deco--1" aria-hidden="true" />
      <div className="signup-deco signup-deco--2" aria-hidden="true" />
    </div>
  );
};

export default SignupFeature;
