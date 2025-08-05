import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWidget } from './ChatWidget';

// Standalone version for embedding
const ChatWidgetStandalone = () => {
  // Get configuration from global variable or script tag
  const config = (window as any).CCLChatConfig || {};
  
  // Listen for programmatic API events
  React.useEffect(() => {
    const handleShow = () => {
      // Trigger show event
      const widget = document.querySelector('.ccl-chat-widget');
      if (widget) {
        (widget as any).style.display = 'flex';
      }
    };
    
    const handleHide = () => {
      // Trigger hide event
      const widget = document.querySelector('.ccl-chat-widget');
      if (widget) {
        (widget as any).style.display = 'none';
      }
    };
    
    window.addEventListener('ccl-chat-show', handleShow);
    window.addEventListener('ccl-chat-hide', handleHide);
    
    return () => {
      window.removeEventListener('ccl-chat-show', handleShow);
      window.removeEventListener('ccl-chat-hide', handleHide);
    };
  }, []);
  
  return <ChatWidget {...config} />;
};

// Auto-initialize if script is loaded directly
if (typeof window !== 'undefined' && document.getElementById('ccl-chat-root')) {
  const root = ReactDOM.createRoot(document.getElementById('ccl-chat-root')!);
  root.render(<ChatWidgetStandalone />);
}

export default ChatWidgetStandalone;