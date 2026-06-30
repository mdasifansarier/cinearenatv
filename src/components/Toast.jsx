// src/components/Toast.jsx
import React, { useState, useEffect } from 'react';

const Toast = () => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleToast = (event) => {
      setMessage(event.detail.message);
      setIsVisible(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    window.addEventListener('showToast', handleToast);
    return () => window.removeEventListener('showToast', handleToast);
  }, []);

  return (
    <div className={`toast-container ${isVisible ? 'show' : ''}`}>
      {message}
    </div>
  );
};

export const showToast = (message) => {
  window.dispatchEvent(new CustomEvent('showToast', { detail: { message } }));
};

export default Toast;