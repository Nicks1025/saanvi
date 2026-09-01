import React from 'react';
import STextField from './STextField';

const SNumber = (props) => {
  const handleKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };
  return <STextField type="number" onKeyDown={handleKeyDown} {...props} />;
};

export default SNumber;
