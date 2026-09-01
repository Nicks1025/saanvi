import React from 'react';
import STextField from './STextField';

const SEmail = ({ validate, ...props }) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const internalValidate = (v) => {
    if (v && !emailRegex.test(v)) return 'Please enter a valid email address';
    if (validate) return validate(v);
    return '';
  };
  return <STextField type="email" validate={internalValidate} {...props} />;
};

export default SEmail;
