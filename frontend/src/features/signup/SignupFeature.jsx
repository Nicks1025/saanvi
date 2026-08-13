import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import STextField from '../../components/common/STextField';
import SDropdown from '../../components/common/SDropdown';
import SButton from '../../components/common/SButton';
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

function validateForm(form) {
  const e = {};

  const firstNameErr =
    validateRequired(form.firstName, 'First name') ||
    validateMaxLength(form.firstName, 100, 'First name');
  if (firstNameErr) e.firstName = firstNameErr;

  const lastNameErr =
    validateRequired(form.lastName, 'Last name') ||
    validateMaxLength(form.lastName, 100, 'Last name');
  if (lastNameErr) e.lastName = lastNameErr;

  const displayNameErr =
    validateRequired(form.displayName, 'Display name') ||
    validateMaxLength(form.displayName, 200, 'Display name');
  if (displayNameErr) e.displayName = displayNameErr;

  const emailErr = validateEmail(form.email);
  if (emailErr) e.email = emailErr;

  const phoneErr = validatePhone(form.phoneNumber);
  if (phoneErr) e.phoneNumber = phoneErr;

  const dobErr = validateDate(form.dateOfBirth, 'Date of birth');
  if (dobErr) e.dateOfBirth = dobErr;

  if (!form.gender) e.gender = 'Please select a gender';

  const passwordErr = validatePassword(form.password, {
    firstName: form.firstName,
    lastName: form.lastName,
    displayName: form.displayName,
  });
  if (passwordErr) e.password = passwordErr;

  const confirmErr = validateConfirmPassword(form.password, form.confirmPassword);
  if (confirmErr) e.confirmPassword = confirmErr;

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
    {error && <div className="signup-field-error">{error}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Main feature
// ---------------------------------------------------------------------------

const SignupFeature = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Live validation for password fields
    if (field === 'password') {
      setPasswordTouched(true);
      const pwErr = validatePassword(value, {
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: form.displayName,
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
    setApiError('');

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await signupUser({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        language: form.language || 'en',
      });
      navigate('/login?signup=success');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Something went wrong. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const showPwRequirements = passwordTouched || form.password.length > 0;

  const isFormValid = Object.keys(validateForm(form)).length === 0;

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

        {apiError && (
          <div className="signup-api-error" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">

          {/* Row: First | Last */}
          <div className="signup-field-row-2col">
            <STextField
              label="First Name"
              text={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Jane"
              required
              error={errors.firstName}
              autoComplete="given-name"
              marginBottom="0"
            />
            <STextField
              label="Last Name"
              text={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Doe"
              required
              error={errors.lastName}
              autoComplete="family-name"
              marginBottom="0"
            />
          </div>

          <STextField
            label="Display Name"
            text={form.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            placeholder="How others will see you"
            required
            error={errors.displayName}
            autoComplete="nickname"
          />

          <STextField
            label="Email"
            type="email"
            text={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="you@example.com"
            required
            error={errors.email}
            autoComplete="email"
          />

          <STextField
            label="Phone Number"
            type="tel"
            text={form.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="10-digit number"
            required
            error={errors.phoneNumber}
            autoComplete="tel"
          />

          {/* Row: DOB | Gender */}
          <div className="signup-field-row-2col">
            <STextField
              label="Date of Birth"
              type="date"
              text={form.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              required
              error={errors.dateOfBirth}
              autoComplete="bday"
              marginBottom="0"
            />
            <DropdownField
              label="Gender"
              required
              value={form.gender}
              options={GENDER_OPTIONS}
              onChange={(v) => handleChange('gender', v)}
              error={errors.gender}
            />
          </div>

          <DropdownField
            label="Language"
            value={form.language}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => handleChange('language', v)}
            error={errors.language}
          />

          {/* Password section — separated with a visual divider */}
          <div className="signup-password-section">
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
                firstName={form.firstName}
                lastName={form.lastName}
                displayName={form.displayName}
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
              disabled={loading || !isFormValid}
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
