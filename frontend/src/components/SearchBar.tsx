import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { searchApi, SearchResponse } from '../api/search';

const SearchBar: React.FC = () => {
  const { currentAccountId } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!currentAccountId || q.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchApi.search(currentAccountId, q);
      setResults(res.data);
      setIsOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleConvClick = (convId: number) => {
    setIsOpen(false);
    setQuery('');
    navigate('/conversations', { state: { openConversationId: convId } });
  };

  const handleContactClick = (contactId: number) => {
    setIsOpen(false);
    setQuery('');
    navigate('/contacts');
  };

  const handleMsgClick = (conversationId: number) => {
    setIsOpen(false);
    setQuery('');
    navigate('/conversations', { state: { openConversationId: conversationId } });
  };

  const totalResults = results
    ? results.conversations.length + results.contacts.length + results.messages.length
    : 0;

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results && totalResults > 0) setIsOpen(true); }}
        placeholder="Search conversations, contacts, messages..."
        style={styles.input}
      />
      {loading && <span style={styles.spinner}>...</span>}

      {isOpen && results && (
        <div style={styles.dropdown}>
          {totalResults === 0 ? (
            <div style={styles.noResults}>No results for "{query}"</div>
          ) : (
            <>
              {/* Conversations */}
              {results.conversations.length > 0 && (
                <div>
                  <div style={styles.sectionTitle}>Conversations ({results.conversations.length})</div>
                  {results.conversations.map(c => (
                    <div key={`conv-${c.id}`} onClick={() => handleConvClick(c.id)} style={styles.resultItem}>
                      <div style={styles.resultMain}>
                        <span style={styles.resultId}>#{c.displayId}</span>
                        <span style={styles.resultName}>{c.contactName}</span>
                        <span style={{ ...styles.statusBadge, color: c.status === 'OPEN' ? '#059669' : '#666' }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={styles.resultMeta}>
                        {c.inboxName}
                        {c.assigneeName && ` · ${c.assigneeName}`}
                        {c.teamName && ` · ${c.teamName}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div>
                  <div style={styles.sectionTitle}>Contacts ({results.contacts.length})</div>
                  {results.contacts.map(c => (
                    <div key={`contact-${c.id}`} onClick={() => handleContactClick(c.id)} style={styles.resultItem}>
                      <div style={styles.resultMain}>
                        <span style={styles.resultName}>{c.name}</span>
                      </div>
                      <div style={styles.resultMeta}>
                        {c.email || ''} {c.phoneNumber ? `· ${c.phoneNumber}` : ''} {c.company ? `· ${c.company}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              {results.messages.length > 0 && (
                <div>
                  <div style={styles.sectionTitle}>Messages ({results.messages.length})</div>
                  {results.messages.map(m => (
                    <div key={`msg-${m.id}`} onClick={() => handleMsgClick(m.conversationId)} style={styles.resultItem}>
                      <div style={styles.resultMain}>
                        <span style={styles.resultId}>#{m.conversationDisplayId}</span>
                        <span style={styles.resultName}>{m.contactName}</span>
                        {m.senderName && <span style={styles.resultMeta}>by {m.senderName}</span>}
                      </div>
                      <div style={styles.msgPreview}>{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', flex: 1, maxWidth: '400px' },
  input: {
    width: '100%', padding: '6px 14px', borderRadius: '20px', border: 'none',
    fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  },
  spinner: { position: 'absolute', right: '12px', top: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
    backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    maxHeight: '400px', overflowY: 'auto', zIndex: 1000,
  },
  noResults: { padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' },
  sectionTitle: {
    padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#999',
    textTransform: 'uppercase', backgroundColor: '#f9fafb', borderBottom: '1px solid #f0f0f0',
  },
  resultItem: {
    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
  },
  resultMain: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' },
  resultId: { fontSize: '12px', color: '#1b72e8', fontWeight: 600 },
  resultName: { fontSize: '13px', fontWeight: 500, color: '#333' },
  statusBadge: { fontSize: '10px', fontWeight: 600 },
  resultMeta: { fontSize: '11px', color: '#999' },
  msgPreview: {
    fontSize: '12px', color: '#666', lineHeight: '1.3',
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
  },
};

export default SearchBar;
