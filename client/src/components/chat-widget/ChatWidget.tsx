import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Maximize2 } from 'lucide-react';
import io from 'socket.io-client';
import './ChatWidget.css';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface ChatWidgetProps {
  // Positioning props
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
  customPosition?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  
  // Appearance props
  primaryColor?: string;
  headerText?: string;
  placeholderText?: string;
  welcomeMessage?: string;
  
  // Behavior props
  startMinimized?: boolean;
  soundEnabled?: boolean;
  
  // Integration props
  apiEndpoint?: string;
  leadId?: string;
  metadata?: Record<string, any>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  position = 'bottom-right',
  customPosition,
  primaryColor = '#2563eb',
  headerText = 'Chat with us',
  placeholderText = 'Type your message...',
  welcomeMessage = 'Hi! How can I help you today?',
  startMinimized = false,
  soundEnabled = true,
  apiEndpoint = window.location.origin,
  leadId,
  metadata = {}
}) => {
  const [isOpen, setIsOpen] = useState(!startMinimized);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(apiEndpoint, {
      transports: ['websocket'],
      query: {
        type: 'chat',
        leadId: leadId || 'anonymous',
        ...metadata
      }
    });

    newSocket.on('connect', () => {
      console.log('Chat connected');
      const sid = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(sid);
      
      // Send initial connection
      newSocket.emit('chat:init', {
        sessionId: sid,
        leadId,
        metadata
      });
    });

    newSocket.on('chat:message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      setIsTyping(false);
      if (soundEnabled && message.sender === 'agent') {
        playNotificationSound();
      }
    });

    newSocket.on('chat:typing', () => {
      setIsTyping(true);
    });

    newSocket.on('chat:stopTyping', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [apiEndpoint, leadId, metadata, soundEnabled]);

  // Add welcome message
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: welcomeMessage,
        sender: 'agent',
        timestamp: new Date()
      }]);
    }
  }, [welcomeMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for external API events
  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    const handleHide = () => setIsOpen(false);
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleMinimize = () => setIsMinimized(true);
    const handleMaximize = () => setIsMinimized(false);
    
    const handleSendMessage = (e: CustomEvent) => {
      if (e.detail?.message) {
        setInputValue(e.detail.message);
        sendMessage();
      }
    };
    
    const handleMetadata = (e: CustomEvent) => {
      if (e.detail?.metadata && socket) {
        socket.emit('chat:metadata', {
          sessionId,
          metadata: e.detail.metadata
        });
      }
    };
    
    const handleLeadId = (e: CustomEvent) => {
      if (e.detail?.leadId && socket) {
        socket.emit('chat:updateLead', {
          sessionId,
          leadId: e.detail.leadId
        });
      }
    };
    
    window.addEventListener('ccl-chat-show', handleShow as EventListener);
    window.addEventListener('ccl-chat-hide', handleHide as EventListener);
    window.addEventListener('ccl-chat-toggle', handleToggle as EventListener);
    window.addEventListener('ccl-chat-minimize', handleMinimize as EventListener);
    window.addEventListener('ccl-chat-maximize', handleMaximize as EventListener);
    window.addEventListener('ccl-chat-send', handleSendMessage as EventListener);
    window.addEventListener('ccl-chat-metadata', handleMetadata as EventListener);
    window.addEventListener('ccl-chat-leadid', handleLeadId as EventListener);
    
    return () => {
      window.removeEventListener('ccl-chat-show', handleShow as EventListener);
      window.removeEventListener('ccl-chat-hide', handleHide as EventListener);
      window.removeEventListener('ccl-chat-toggle', handleToggle as EventListener);
      window.removeEventListener('ccl-chat-minimize', handleMinimize as EventListener);
      window.removeEventListener('ccl-chat-maximize', handleMaximize as EventListener);
      window.removeEventListener('ccl-chat-send', handleSendMessage as EventListener);
      window.removeEventListener('ccl-chat-metadata', handleMetadata as EventListener);
      window.removeEventListener('ccl-chat-leadid', handleLeadId as EventListener);
    };
  }, [socket, sessionId]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !socket) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    socket.emit('chat:message', {
      sessionId,
      content: inputValue,
      leadId,
      metadata
    });

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPositionStyles = () => {
    if (position === 'custom' && customPosition) {
      return customPosition;
    }

    const positions: Record<string, Record<string, string>> = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };

    return positions[position] || positions['bottom-right'];
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) {
    return (
      <button
        className="ccl-chat-bubble"
        style={{ ...getPositionStyles(), backgroundColor: primaryColor }}
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
        </svg>
      </button>
    );
  }

  return (
    <>
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" type="audio/wav" />
      </audio>
      
      <div 
        className={`ccl-chat-widget ${isMinimized ? 'minimized' : ''}`}
        style={getPositionStyles()}
      >
        <div 
          className="ccl-chat-header"
          style={{ backgroundColor: primaryColor }}
        >
          <h3>{headerText}</h3>
          <div className="ccl-chat-header-actions">
            <button onClick={() => setIsMinimized(!isMinimized)} aria-label="Minimize">
              {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
            <button onClick={() => setIsOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="ccl-chat-messages">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`ccl-chat-message ${message.sender}`}
                >
                  <div className="ccl-chat-message-bubble">
                    {message.content}
                  </div>
                  <div className="ccl-chat-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="ccl-chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="ccl-chat-input">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholderText}
              />
              <button 
                onClick={sendMessage}
                disabled={!inputValue.trim()}
                style={{ backgroundColor: primaryColor }}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};