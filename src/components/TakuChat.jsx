import React, { useState, useRef, useEffect } from 'react';
import { chatWithTaku, speakText } from '../utils/ai';
import { CHARACTER_VOICES } from '../utils/constants';
import { getSettings } from '../utils/storage';

export default function TakuChat({ onClose, onAction }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const settings = getSettings();
  const voice = CHARACTER_VOICES[settings.selectedVoice] || CHARACTER_VOICES.gojo;

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: voice.greeting }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const aiMessages = newMessages.filter(m => m.role !== 'system');
      const response = await chatWithTaku(aiMessages, onAction);
      const assistantMsg = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMsg]);
      if (settings.autoSpeak) {
        speakText(response, settings.selectedVoice);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const hasSpeechApi = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div style={{
        background: 'var(--bg-dark-secondary)',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700 }}>
              Taku
              <span style={{ color: 'var(--text-dark-secondary)', fontWeight: 400, marginLeft: 8, fontSize: 'var(--fs-caption)' }}>
                as {voice.name}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 'var(--fs-subheading)', padding: 8, color: 'var(--text-dark-secondary)' }}>
            X
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflow: 'auto', padding: 'var(--space-md) var(--space-lg)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                  : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #FFB7C5, #FF8FA3)'
                  : 'var(--bg-dark-card)',
                color: msg.role === 'user' ? '#2D2420' : 'var(--text-dark)',
                fontSize: 'var(--fs-body)',
                lineHeight: 1.5,
              }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => speakText(msg.content, settings.selectedVoice)}
                  style={{
                    fontSize: 'var(--fs-small)', color: 'var(--text-dark-secondary)',
                    marginTop: 4, padding: '2px 6px',
                  }}
                >
                  Speak
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', padding: '10px 14px',
              background: 'var(--bg-dark-card)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-dark-secondary)', fontSize: 'var(--fs-body)',
            }}>
              ...
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          display: 'flex', gap: 'var(--space-sm)',
          padding: 'var(--space-md) var(--space-lg) max(var(--space-md), env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {hasSpeechApi && (
            <button
              onClick={startListening}
              style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: listening ? 'var(--sakura)' : 'var(--bg-dark-card)',
                color: listening ? '#2D2420' : 'var(--text-dark-secondary)',
                fontSize: 'var(--fs-caption)', fontWeight: 600,
                flexShrink: 0,
              }}
            >
              MIC
            </button>
          )}
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask Taku anything..."
            style={{
              flex: 1, padding: '10px 14px',
              background: 'var(--bg-dark-card)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--fs-body)',
              color: 'var(--text-dark)',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 18px',
              background: input.trim() ? 'linear-gradient(135deg, #FFB7C5, #FF8FA3)' : 'var(--bg-dark-card)',
              color: input.trim() ? '#2D2420' : 'var(--text-dark-secondary)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700, fontSize: 'var(--fs-body)',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
