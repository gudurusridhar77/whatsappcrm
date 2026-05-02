// Drop-in replacement for SearchBar.tsx — restyled to match Pulse design system.
// Key change: input lives on a neutral surface (was rgba over blue header).

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!currentAccountId || q.trim().length < 2) { setResults(null); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await searchApi.search(currentAccountId, q);
      setResults(res.data); setIsOpen(true);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, [currentAccountId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const total = results ? results.conversations.length + results.contacts.length + results.messages.length : 0;

  return (
    <div ref={wrapperRef} style={s.wrap}>
      <div style={s.field}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" />
        </svg>
        <input value={query} onChange={handleChange}
          onFocus={() => { if (results && total > 0) setIsOpen(true); }}
          placeholder="Search conversations, contacts, messages..."
          style={s.input} />
        {loading && <span style={s.spinner}>…</span>}
      </div>

      {isOpen && results && (
        <div style={s.dropdown}>
          {total === 0 ? (
            <div style={s.noResults}>No results for “{query}”</div>
          ) : (
            <>
              {results.conversations.length > 0 && (
                <div>
                  <div style={s.section}>Conversations · {results.conversations.length}</div>
                  {results.conversations.map(c => (
                    <div key={c.id} style={s.item}
                      onClick={() => { setIsOpen(false); setQuery(''); navigate('/conversations', { state: { openConversationId: c.id } }); }}>
                      <div style={s.row}>
                        <span style={s.id}>#{c.displayId}</span>
                        <span style={s.name}>{c.contactName}</span>
                        <span style={{ ...s.status, color: c.status === 'OPEN' ? 'var(--ok)' : 'var(--ink-3)' }}>{c.status}</span>
                      </div>
                      <div style={s.meta}>{c.inboxName}{c.assigneeName && ` · ${c.assigneeName}`}{c.teamName && ` · ${c.teamName}`}</div>
                    </div>
                  ))}
                </div>
              )}
              {results.contacts.length > 0 && (
                <div>
                  <div style={s.section}>Contacts · {results.contacts.length}</div>
                  {results.contacts.map(c => (
                    <div key={c.id} style={s.item} onClick={() => { setIsOpen(false); setQuery(''); navigate('/contacts'); }}>
                      <div style={s.row}><span style={s.name}>{c.name}</span></div>
                      <div style={s.meta}>{c.email || ''}{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}{c.company ? ` · ${c.company}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {results.messages.length > 0 && (
                <div>
                  <div style={s.section}>Messages · {results.messages.length}</div>
                  {results.messages.map(m => (
                    <div key={m.id} style={s.item}
                      onClick={() => { setIsOpen(false); setQuery(''); navigate('/conversations', { state: { openConversationId: m.conversationId } }); }}>
                      <div style={s.row}>
                        <span style={s.id}>#{m.conversationDisplayId}</span>
                        <span style={s.name}>{m.contactName}</span>
                        {m.senderName && <span style={s.meta}>by {m.senderName}</span>}
                      </div>
                      <div style={s.preview}>{m.content}</div>
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

const s: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', flex: 1, maxWidth: 420 },
  field: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--surface-3)', border: '1px solid transparent',
    borderRadius: 999, padding: '8px 14px', color: 'var(--ink-3)',
  },
  input: {
    flex: 1, background: 'transparent', border: 0, outline: 0,
    fontSize: 14, color: 'var(--ink)', minWidth: 0,
  },
  spinner: { color: 'var(--ink-4)', fontSize: 14 },

  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
    background: 'var(--surface)', borderRadius: 12,
    border: '1px solid var(--line)', boxShadow: 'var(--sh-2)',
    maxHeight: 440, overflowY: 'auto', zIndex: 1000,
  },
  noResults: { padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 },
  section: {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: 'var(--surface-2)', borderBottom: '1px solid var(--line)',
  },
  item: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line)' },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  id: { fontSize: 12, color: 'var(--accent)', fontWeight: 600 },
  name: { fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' },
  status: { fontSize: 11, fontWeight: 600 },
  meta: { fontSize: 12, color: 'var(--ink-3)' },
  preview: {
    fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4,
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
  },
};

export default SearchBar;
