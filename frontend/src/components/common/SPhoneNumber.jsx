import React from 'react';
import STextField from './STextField';

const SPhoneNumber = ({ onChange, ...props }) => {
  const handleChange = (e) => {
    if (onChange) {
      // Basic phone filtering: only allow digits, max 10
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      onChange(digits); // Passes just the value, not the event, matching our current architecture
    }
  };

  // STextField normally expects onChange to take an event, but DynamicFormRenderer passes (field_name, value).
  // Wait, STextField takes an event. Let's provide a mock event for STextField if needed.
  const handleInternalChange = (e) => {
    if (onChange) {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      // Construct a mock event to keep it consistent if STextField needs it
      const mockEvent = { target: { value: digits } };
      onChange(mockEvent);
    }
  };

  return <STextField type="tel" {...props} onChange={handleInternalChange} />;
};

export default SPhoneNumber;
