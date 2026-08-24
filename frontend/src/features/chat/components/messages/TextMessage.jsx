import React from 'react';

/**
 * TextMessage
 *
 * Renders a plain-text (or text-only) chat bubble.
 *
 * Props:
 *  message  {string}          – the text content
 */
const TextMessage = ({ message }) => (
  <p className="msg-text">{message}</p>
);

export default TextMessage;
