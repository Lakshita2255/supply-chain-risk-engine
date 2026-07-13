import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Compass, 
  BrainCircuit,
  Bot
} from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your AI Supply Chain Risk Assistant. I analyze real-time shipment profiles, ML model outputs, and anomaly alerts.\n\nHow can I assist your logistics operations today?",
      suggested_questions: [
        "What is the status of shipment SHP-D4E5F6?",
        "Which routes are currently high-risk?",
        "How can we avoid weather delays?",
        "What are the best methods to tackle port congestion?"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Append user message
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev, 
        { 
          sender: 'bot', 
          text: data.response, 
          suggested_questions: data.suggested_questions 
        }
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev, 
        { 
          sender: 'bot', 
          text: "I apologize, but I am unable to connect to the prediction decision agent right now. Please check if the FastAPI backend server is running." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Convert basic markdown tags (* and **) into HTML elements dynamically
  const parseMarkdown = (text) => {
    return text.split('\n').map((line, idx) => {
      let formatted = line;
      // Handle bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      formatted = formatted.replace(boldRegex, '<strong>$1</strong>');
      // Handle bullet lists
      if (formatted.startsWith('- ')) {
        return <li key={idx} dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} style={{ marginLeft: '16px', listStyleType: 'disc', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }} />;
      }
      return <p key={idx} dangerouslySetInnerHTML={{ __html: formatted }} style={{ margin: '4px 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }} />;
    });
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-page-title">AI Operational Copilot</h2>
          <div className="dashboard-meta">Interact with predictive models, fetch shipment profiles, or review weather playbooks</div>
        </div>
      </div>

      <div className="chart-card" style={{ 
        background: 'var(--bg-card)', 
        height: 'calc(100vh - 260px)', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '0',
        overflow: 'hidden'
      }}>
        {/* Chat Header Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 800 }}>Decision Support Copilot</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Online - Ready to analyze logs</div>
          </div>
        </div>

        {/* Message Log */}
        <div style={{ 
          flex: 1, 
          padding: '24px', 
          overflowY: 'auto',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px'
        }}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              {/* Message Box */}
              <div style={{ 
                maxWidth: '75%', 
                padding: '14px 18px', 
                borderRadius: 'var(--radius-md)', 
                background: msg.sender === 'user' ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)', 
                border: msg.sender === 'user' ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}>
                {parseMarkdown(msg.text)}
              </div>

              {/* Suggestions for next action */}
              {msg.sender === 'bot' && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  flexWrap: 'wrap', 
                  marginTop: '10px',
                  maxWidth: '85%'
                }}>
                  {msg.suggested_questions.map((q, qIdx) => (
                    <button 
                      key={qIdx} 
                      onClick={() => handleSend(q)}
                      className="btn btn-outline"
                      style={{ 
                        fontSize: '11px', 
                        padding: '6px 12px', 
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-xs)', padding: '10px' }}>
              <RefreshCw className="rotating" size={14} />
              <span>Copilot is querying database parameters...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '12px' }}
          >
            <input 
              type="text" 
              placeholder="Ask about shipment status, route delays, or weather mitigation..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{ 
                flex: 1, 
                height: '46px', 
                borderRadius: 'var(--radius-sm)', 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border-subtle)', 
                padding: '0 16px',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)'
              }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: 'var(--radius-sm)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: 0
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
