// CCL Chat Widget Embed Script
// This script can be embedded via Google Tag Manager or directly on any website

(function() {
  // Configuration passed from the embedding script
  const config = (window as any).CCLChatConfig || {};
  
  // Default configuration
  const defaultConfig = {
    apiEndpoint: 'http://localhost:3000',
    position: 'bottom-right',
    primaryColor: '#2563eb',
    headerText: 'Chat with us',
    startMinimized: false
  };
  
  // Merge configurations
  const finalConfig = { ...defaultConfig, ...config };
  
  // Create container div
  const container = document.createElement('div');
  container.id = 'ccl-chat-container';
  document.body.appendChild(container);
  
  // Load React and ReactDOM from CDN
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };
  
  // Load required dependencies
  const loadDependencies = async () => {
    // Check if React is already loaded
    if (!(window as any).React) {
      await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
    }
    if (!(window as any).ReactDOM) {
      await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
    }
    if (!(window as any).io) {
      await loadScript('https://cdn.socket.io/4.6.1/socket.io.min.js');
    }
  };
  
  // Initialize the widget
  const initWidget = async () => {
    try {
      await loadDependencies();
      
      // Import and render the chat widget
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import { ChatWidget } from '${finalConfig.apiEndpoint}/chat-widget.js';
        
        const React = window.React;
        const ReactDOM = window.ReactDOM;
        
        ReactDOM.render(
          React.createElement(ChatWidget, ${JSON.stringify(finalConfig)}),
          document.getElementById('ccl-chat-container')
        );
      `;
      document.body.appendChild(script);
      
    } catch (error) {
      console.error('Failed to load CCL Chat Widget:', error);
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();

// Export for use in module environments
export const CCLChat = {
  init: function(config: any) {
    (window as any).CCLChatConfig = config;
    const script = document.createElement('script');
    script.src = config.scriptUrl || 'https://your-domain.com/chat-widget-embed.js';
    document.head.appendChild(script);
  },
  
  // Programmatic API
  show: function() {
    const event = new CustomEvent('ccl-chat-show');
    window.dispatchEvent(event);
  },
  
  hide: function() {
    const event = new CustomEvent('ccl-chat-hide');
    window.dispatchEvent(event);
  },
  
  minimize: function() {
    const event = new CustomEvent('ccl-chat-minimize');
    window.dispatchEvent(event);
  },
  
  sendMessage: function(message: string) {
    const event = new CustomEvent('ccl-chat-message', { detail: { message } });
    window.dispatchEvent(event);
  },
  
  updateMetadata: function(metadata: any) {
    const event = new CustomEvent('ccl-chat-metadata', { detail: { metadata } });
    window.dispatchEvent(event);
  }
};