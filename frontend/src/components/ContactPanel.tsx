import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notesApi, NoteResponse, activityLogsApi, ActivityLogResponse } from '../api/notes';

interface ContactPanelProps {
  contactId: number;
  contactName: string;
  contactEmail: string | null;
  conversationId: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  conversation_created: 'Conversation created',
  status_changed: 'Status changed',
  assignee_changed: 'Assignee changed',
  team_changed: 'Team changed',
  note_added: 'Note added',
  note_deleted: 'Note deleted',
  label_added: 'Label added',
  label_removed: 'Label removed',
};

const ContactPanel: React.FC<ContactPanelProps> = ({ contactId, contactName, contactEmail, conversationId }) => {
  const { currentAccountId } = useAuth();
  const [activeTab, setActiveTab] = useState<'notes' | 'activity'>('notes');
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [activities, setActivities] = useState<ActivityLogResponse[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await notesApi.getNotes(currentAccountId, contactId);
      setNotes(res.data.content);
    } catch { /* ignore */ }
  }, [currentAccountId, contactId]);

  const loadActivities = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await activityLogsApi.getConversationLogs(currentAccountId, conversationId);
      setActivities(res.data.content);
    } catch { /* ignore */ }
  }, [currentAccountId, conversationId]);

  useEffect(() => {
    loadNotes();
    loadActivities();
  }, [loadNotes, loadActivities]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !newNote.trim()) return;
    setError('');
    try {
      await notesApi.createNote(currentAccountId, contactId, newNote.trim());
      setNewNote('');
      loadNotes();
      loadActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add note');
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!currentAccountId || !editContent.trim()) return;
    try {
      await notesApi.updateNote(currentAccountId, contactId, noteId, editContent.trim());
      setEditingNote(null);
      loadNotes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!currentAccountId || !window.confirm('Delete this note?')) return;
    try {
      await notesApi.deleteNote(currentAccountId, contactId, noteId);
      loadNotes();
      loadActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="app-contact-panel" style={styles.panel}>
      {/* Contact Header */}
      <div style={styles.contactHeader}>
        <div style={styles.avatar}>{contactName.charAt(0).toUpperCase()}</div>
        <div>
          <div style={styles.contactName}>{contactName}</div>
          {contactEmail && <div style={styles.contactEmail}>{contactEmail}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('notes')}
          style={{ ...styles.tab, ...(activeTab === 'notes' ? styles.tabActive : {}) }}>
          Notes ({notes.length})
        </button>
        <button onClick={() => setActiveTab('activity')}
          style={{ ...styles.tab, ...(activeTab === 'activity' ? styles.tabActive : {}) }}>
          Activity
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div style={styles.tabContent}>
          <form onSubmit={handleAddNote} style={styles.noteForm}>
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
              style={styles.noteInput} placeholder="Add a note about this contact..."
              rows={2} />
            <button type="submit" style={styles.noteBtn} disabled={!newNote.trim()}>Add</button>
          </form>

          <div style={styles.notesList}>
            {notes.length === 0 ? (
              <div style={styles.empty}>No notes yet</div>
            ) : (
              notes.map(note => (
                <div key={note.id} style={styles.noteCard}>
                  {editingNote === note.id ? (
                    <div>
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                        style={styles.noteInput} rows={2} />
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <button onClick={() => handleUpdateNote(note.id)} style={styles.miniBtn}>Save</button>
                        <button onClick={() => setEditingNote(null)} style={styles.miniBtnGray}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.noteContent}>{note.content}</div>
                      <div style={styles.noteMeta}>
                        <span>{note.userName} · {formatTime(note.createdAt)}</span>
                        <span>
                          <button onClick={() => { setEditingNote(note.id); setEditContent(note.content); }}
                            style={styles.tinyBtn}>Edit</button>
                          <button onClick={() => handleDeleteNote(note.id)}
                            style={styles.tinyBtnDanger}>Delete</button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div style={styles.tabContent}>
          {activities.length === 0 ? (
            <div style={styles.empty}>No activity yet</div>
          ) : (
            <div style={styles.timeline}>
              {activities.map(act => (
                <div key={act.id} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  <div style={styles.timelineContent}>
                    <div style={styles.activityTitle}>
                      {ACTIVITY_LABELS[act.activityType] || act.activityType}
                    </div>
                    <div style={styles.activityMeta}>
                      {act.userName} · {formatTime(act.createdAt)}
                    </div>
                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <div style={styles.activityDetail}>
                        {act.metadata.newStatus && <span>→ {act.metadata.newStatus}</span>}
                        {act.metadata.assigneeName && <span>→ {act.metadata.assigneeName}</span>}
                        {act.metadata.teamName && <span>→ {act.metadata.teamName}</span>}
                        {act.metadata.contactName && <span>Contact: {act.metadata.contactName}</span>}
                        {act.metadata.preview && <span>"{act.metadata.preview}"</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '280px', borderLeft: '1px solid var(--line)', display: 'flex',
    flexDirection: 'column', flexShrink: 0, backgroundColor: '#fafbfc',
  },
  contactHeader: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '16px',
    borderBottom: '1px solid var(--line)',
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366f1',
    color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: 600, flexShrink: 0,
  },
  contactName: { fontSize: '14px', fontWeight: 600, color: 'var(--ink)' },
  contactEmail: { fontSize: '12px', color: 'var(--ink-4)' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--line)' },
  tab: {
    flex: 1, padding: '8px', border: 'none', backgroundColor: 'transparent',
    cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--ink-3)',
    borderBottom: '2px solid transparent',
  },
  tabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' },
  tabContent: { flex: 1, overflowY: 'auto' as const, padding: '12px' },
  error: { backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '6px 12px', fontSize: '12px', margin: '0 12px' },
  noteForm: { marginBottom: '12px' },
  noteInput: {
    width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '13px', boxSizing: 'border-box' as const, fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  noteBtn: {
    marginTop: '4px', padding: '4px 12px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
  },
  notesList: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  empty: { textAlign: 'center' as const, color: 'var(--ink-4)', fontSize: '13px', padding: '20px 0' },
  noteCard: {
    backgroundColor: 'var(--surface)', padding: '10px', borderRadius: '6px',
    border: '1px solid var(--line)',
  },
  noteContent: { fontSize: '13px', color: 'var(--ink)', lineHeight: '1.4', marginBottom: '6px' },
  noteMeta: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '11px', color: 'var(--ink-4)',
  },
  tinyBtn: {
    background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
    fontSize: '11px', padding: '0 4px',
  },
  tinyBtnDanger: {
    background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer',
    fontSize: '11px', padding: '0 4px',
  },
  miniBtn: {
    padding: '2px 8px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
  },
  miniBtnGray: {
    padding: '2px 8px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
  },
  timeline: { display: 'flex', flexDirection: 'column' as const, gap: '0' },
  timelineItem: {
    display: 'flex', gap: '10px', paddingBottom: '14px',
    borderLeft: '2px solid var(--line)', marginLeft: '5px', paddingLeft: '14px',
    position: 'relative' as const,
  },
  timelineDot: {
    position: 'absolute' as const, left: '-5px', top: '2px',
    width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)',
  },
  timelineContent: {},
  activityTitle: { fontSize: '13px', fontWeight: 500, color: 'var(--ink)' },
  activityMeta: { fontSize: '11px', color: 'var(--ink-4)', marginTop: '2px' },
  activityDetail: {
    fontSize: '12px', color: 'var(--ink-3)', marginTop: '4px', fontStyle: 'italic' as const,
  },
};

export default ContactPanel;
