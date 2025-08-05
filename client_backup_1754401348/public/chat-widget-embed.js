// CCL Chat Widget Embed Script
// This script can be embedded via Google Tag Manager or directly on any website
// Usage:
// 1. Google Tag Manager: Add as Custom HTML tag
// 2. Direct embed: <script src="https://your-domain.com/chat-widget-embed.js"></script>
// 3. With configuration:
//    <script>
//      window.CCLChatConfig = {
//        position: 'bottom-left',
//        primaryColor: '#ff6b35',
//        headerText: 'Need Help?',
//        leadId: 'user-123',
//        metadata: { source: 'homepage' }
//      };
//    </script>
//    <script src="https://your-domain.com/chat-widget-embed.js"></script>

(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.CCLChatInitialized) return;
  window.CCLChatInitialized = true;
  
  // Get configuration
  const config = window.CCLChatConfig || {};
  
  // Auto-detect client from domain
  const detectClient = function() {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    if (subdomain && subdomain !== 'www' && subdomain !== hostname) {
      return subdomain;
    }
    
    return hostname === 'localhost' ? 'localhost' : null;
  };
  
  const clientId = config.clientId || detectClient();
  
  // Default configuration
  const defaults = {
    apiEndpoint: window.location.origin,
    position: 'bottom-right',
    primaryColor: '#2563eb',
    headerText: 'Chat with us',
    placeholderText: 'Type your message...',
    welcomeMessage: 'Hi! How can I help you today?',
    startMinimized: false,
    soundEnabled: true,
    clientId: clientId,
    agentId: null,
    agentPersonality: null,
    agentTone: null
  };
  
  // Merge configurations
  for (const key in defaults) {
    if (!config.hasOwnProperty(key)) {
      config[key] = defaults[key];
    }
  }
  
  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    #ccl-chat-root {
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    /* Ensure widget stays on top */
    #ccl-chat-root * {
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
  
  // Create root element
  const root = document.createElement('div');
  root.id = 'ccl-chat-root';
  document.body.appendChild(root);
  
  // Load branding first, then widget
  loadBranding(function() {
    // Load the widget bundle
    const script = document.createElement('script');
    script.src = config.apiEndpoint + '/chat-widget.bundle.js';
    script.async = true;
    script.onload = function() {
      console.log('CCL Chat Widget loaded successfully');
    };
    script.onerror = function() {
      console.error('Failed to load CCL Chat Widget');
    };
    document.body.appendChild(script);
  });
  
  // Fetch client branding if clientId is detected
  var loadBranding = function(callback) {
    if (!clientId) {
      callback();
      return;
    }
    
    fetch(config.apiEndpoint + '/api/branding/' + clientId)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success && data.branding) {
          const branding = data.branding.branding;
          // Apply branding to config
          config.primaryColor = branding.primaryColor || config.primaryColor;
          config.headerText = branding.companyName || config.headerText;
          config.welcomeMessage = 'Hi! Welcome to ' + branding.companyName + '. How can I help you today?';
        }
        callback();
      })
      .catch(function(error) {
        console.warn('Failed to load branding:', error);
        callback();
      });
  };
  
  // Expose API
  window.CCLChat = {
    show: function() {
      window.dispatchEvent(new CustomEvent('ccl-chat-show'));
    },
    hide: function() {
      window.dispatchEvent(new CustomEvent('ccl-chat-hide'));
    },
    toggle: function() {
      window.dispatchEvent(new CustomEvent('ccl-chat-toggle'));
    },
    minimize: function() {
      window.dispatchEvent(new CustomEvent('ccl-chat-minimize'));
    },
    maximize: function() {
      window.dispatchEvent(new CustomEvent('ccl-chat-maximize'));
    },
    sendMessage: function(message) {
      window.dispatchEvent(new CustomEvent('ccl-chat-send', { 
        detail: { message: message } 
      }));
    },
    setMetadata: function(metadata) {
      window.dispatchEvent(new CustomEvent('ccl-chat-metadata', { 
        detail: { metadata: metadata } 
      }));
    },
    setAgentConfig: function(agentConfig) {
      window.dispatchEvent(new CustomEvent('ccl-chat-agent-config', { 
        detail: { agentConfig: agentConfig } 
      }));
    },
    setBranding: function(branding) {
      Object.assign(config, branding);
      window.dispatchEvent(new CustomEvent('ccl-chat-branding', {
        detail: { branding: branding }
      }));
    }
  };
  
  // Track page views (useful for analytics)
  if (config.trackPageViews !== false) {
    window.CCLChat.setMetadata({
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }
})();