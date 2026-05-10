// ConversationsPage.mobile.tsx
// Mobile presentation for the Conversations page.
// Receives all data + handlers as props from ConversationsPage.tsx (the controller).
// Master-detail nav: list | thread | contact (one at a time, full screen).
//
// Drop into: frontend/src/pages/conversations/ConversationsPage.mobile.tsx
//
// In ConversationsPage.tsx, replace the current `return (...)` JSX with:
//
//   import { useIsMobile } from '../../hooks/useIsMobile';
//   import ConversationsPageMobile from './ConversationsPage.mobile';
//   ...
//   const isMobile = useIsMobile();
//   if (isMobile) {
//     return <ConversationsPageMobile
//       conversations={conversations} counts={counts} activeConv={activeConv}
//       messages={messages} filterStatus={filterStatus} setFilterStatus={setFilterStatus}
//       filterAssigneeId={filterAssigneeId} setFilterAssigneeId={setFilterAssigneeId}
//       filterTeamId={filterTeamId} setFilterTeamId={setFilterTeamId}
//       allAgents={allAgents} allTeams={allTeams} allLabels={allLabels}
//       cannedResponses={cannedResponses} contacts={contacts} inboxes={inboxes}
//       newMessage={newMessage} setNewMessage={setNewMessage}
//       isPrivate={isPrivate} setIsPrivate={setIsPrivate}
//       selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
//       fileInputRef={fileInputRef}
//       error={error} setError={setError}
//       typingUser={typingUser} connected={connected}
//       onSelect={selectConversation}
//       onSend={handleSend} onFileSelect={handleFileSelect} onRemoveFile={removeFile}
//       onStatusChange={handleStatusChange}
//       onAssigneeChange={handleAssigneeChange} onTeamChange={handleTeamChange}
//       onToggleLabel={toggleConversationLabel}
//       onOpenNew={openNewModal} onCreateConversation={handleCreateConversation}
//       newContactId={newContactId} setNewContactId={setNewContactId}
//       newInboxId={newInboxId} setNewInboxId={setNewInboxId}
//       newInitialMsg={newInitialMsg} setNewInitialMsg={setNewInitialMsg}
//       showNew={showNew} setShowNew={setShowNew}
//       sendTyping={sendTyping}
//     />;
//   }
//   // ... existing desktop JSX

import React, { useState, useRef, useEffect } from 'react';
import {
  ConversationResponse, MessageResponse, ConversationCounts, AttachmentResponse,
} from '../../api/conversations';
import { Contact } from '../../api/contacts';
import { Inbox } from '../../api/inboxes';
import { LabelResponse } from '../../api/labels';
import { CannedResponse } from '../../api/cannedResponses';
import { TeamResponse, AgentResponse } from '../../api/teams';
import ContactPanel from '../../components/ContactPanel';

export interface MobileProps {
  conversations: ConversationResponse[];
  counts: ConversationCounts;
  activeConv: ConversationResponse | null;
  messages: MessageResponse[];

  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterAssigneeId?: number;
  setFilterAssigneeId: (n: number | undefined) => void;
  filterTeamId?: number;
  setFilterTeamId: (n: number | undefined) => void;

  allAgents: AgentResponse[];
  allTeams: TeamResponse[];
  allLabels: LabelResponse[];
  cannedResponses: CannedResponse[];
  contacts: Contact[];
  inboxes: Inbox[];

  newMessage: string;
  setNewMessage: (s: string) => void;
  isPrivate: boolean;
  setIsPrivate: (b: boolean) => void;
  selectedFiles: File[];
  setSelectedFiles: (f: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  error: string;
  setError: (s: string) => void;
  typingUser: string | null;
  connected: boolean;

  onSelect: (c: ConversationResponse) => void;
  onSend: (e: React.FormEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (i: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onAssigneeChange: (id: number, agentId: number) => void;
  onTeamChange: (id: number, teamId: number) => void;
  onToggleLabel: (id: number, labelId: number, current: { id: number; title: string; color: string }[]) => void;

  onOpenNew: () => void;
  onCreateConversation: (e: React.FormEvent) => void;
  onCsat: (conversationId: number) => void;
  newContactId: number; setNewContactId: (n: number) => void;
  newInboxId: number;   setNewInboxId: (n: number) => void;
  newInitialMsg: string; setNewInitialMsg: (s: string) => void;
  showNew: boolean; setShowNew: (b: boolean) => void;

  sendTyping: (typing: boolean) => void;
}

type View = 'list' | 'thread' | 'contact';

const ConversationsPageMobile: React.FC<MobileProps> = (p) => {
  const [view, setView] = useState<View>('list');
  const [showFilter, setShowFilter] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When user picks a conversation, push thread view.
  const handleSelect = (c: ConversationResponse) => { p.onSelect(c); setView('thread'); };

  // Auto-scroll on new messages.
  useEffect(() => {
    if (view === 'thread') setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [p.messages, view]);

  // Pop back to list if thread/contact is shown but no active conv.
  useEffect(() => {
    if (!p.activeConv && view !== 'list') setView('list');
  }, [p.activeConv, view]);

  return (
    <div style={s.shell}>
      {view === 'list' && (
        <ListView {...p}
          onSelect={handleSelect}
          showFilter={showFilter}
          setShowFilter={setShowFilter}
        />
      )}
      {view === 'thread' && p.activeConv && (
        <ThreadView {...p}
          conv={p.activeConv}
          onBack={() => setView('list')}
          onContact={() => setView('contact')}
          showActions={showActions} setShowActions={setShowActions}
          messagesEndRef={messagesEndRef}
        />
      )}
      {view === 'contact' && p.activeConv && (
        <ContactView conv={p.activeConv} onBack={() => setView('thread')} />
      )}

      {p.showNew && <NewSheet {...p} />}
    </div>
  );
};

export default ConversationsPageMobile;

// ──────────────────────────────────────────────────────────────
// LIST VIEW
// ──────────────────────────────────────────────────────────────

const ListView: React.FC<MobileProps & {
  onSelect: (c: ConversationResponse) => void;
  showFilter: boolean;
  setShowFilter: (b: boolean) => void;
}> = (p) => {
  const tabs = [
    { id: 'OPEN', label: 'Open', n: p.counts.open },
    { id: 'PENDING', label: 'Pending', n: p.counts.pending },
    { id: 'RESOLVED', label: 'Resolved', n: p.counts.resolved },
    { id: 'SNOOZED', label: 'Snoozed', n: p.counts.snoozed },
  ];
  const filterActive = !!(p.filterAssigneeId || p.filterTeamId);

  return (
    <>
      <header style={s.header}>
        <div style={s.headerTop}>
          <h1 style={s.h1}>Conversations</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn ariaLabel="Filters" onClick={() => p.setShowFilter(true)} badge={filterActive}>
              <SvgFilter />
            </IconBtn>
            <IconBtn ariaLabel="New" primary onClick={p.onOpenNew}>
              <SvgPlus />
            </IconBtn>
          </div>
        </div>
        <div style={s.tabs}>
          {tabs.map(t => {
            const active = p.filterStatus === t.id;
            return (
              <button key={t.id} onClick={() => p.setFilterStatus(t.id)}
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
                {t.label}
                <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>{t.n}</span>
              </button>
            );
          })}
        </div>
      </header>

      {p.error && <div style={s.error}>{p.error}</div>}

      <div style={s.list}>
        {p.conversations.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📥</div>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 15 }}>
              No {p.filterStatus.toLowerCase()} conversations
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
              You're all caught up
            </div>
          </div>
        ) : p.conversations.map(c => (
          <button key={c.id} onClick={() => p.onSelect(c)} style={s.row}>
            <Avatar name={c.contactName} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.rowTop}>
                <span style={s.rowName}>{c.contactName}</span>
                <span style={s.rowTime}>
                  {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div style={s.rowMeta}>
                <span style={s.rowId}>#{c.displayId}</span>
                <span style={s.rowInbox}>{c.inboxName}</span>
                {c.assigneeName && <span style={s.rowAssignee}>· {c.assigneeName}</span>}
              </div>
              {c.lastMessage && <div style={s.rowPreview}>{c.lastMessage}</div>}
              {c.labels && c.labels.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {c.labels.map(l => (
                    <span key={l.id} style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 3,
                      background: l.color + '22', color: l.color, fontWeight: 600,
                    }}>{l.title}</span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {p.showFilter && <FilterSheet {...p} />}
    </>
  );
};

// ──────────────────────────────────────────────────────────────
// THREAD VIEW
// ──────────────────────────────────────────────────────────────

const ThreadView: React.FC<MobileProps & {
  conv: ConversationResponse;
  onBack: () => void;
  onContact: () => void;
  showActions: boolean;
  setShowActions: (b: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}> = (p) => {
  return (
    <>
      <header style={s.threadHeader}>
        <button onClick={p.onBack} style={s.iconOnlyBtn} aria-label="Back">
          <SvgChevronLeft />
        </button>
        <button onClick={p.onContact} style={s.threadTitle}>
          <Avatar name={p.conv.contactName} />
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={s.threadName}>{p.conv.contactName}</div>
            <div style={s.threadSubtitle}>
              {p.connected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', display: 'inline-block', marginRight: 4 }} />}
              #{p.conv.displayId} · {p.conv.inboxName}
            </div>
          </div>
        </button>
        <button onClick={() => p.setShowActions(!p.showActions)} style={s.iconOnlyBtn} aria-label="Actions">
          <SvgDots />
        </button>
      </header>

      {p.showActions && (
        <>
          <div style={s.actionBackdrop} onClick={() => p.setShowActions(false)} />
          <div style={s.actionMenu}>
            <select value={p.conv.status}
              onChange={e => { p.onStatusChange(p.conv.id, e.target.value); p.setShowActions(false); }}
              style={s.actionSelect}>
              <option value="OPEN">Mark as Open</option>
              <option value="PENDING">Mark as Pending</option>
              <option value="RESOLVED">Mark as Resolved</option>
              <option value="SNOOZED">Snooze</option>
            </select>
            <select value={p.conv.assigneeId || 0}
              onChange={e => { p.onAssigneeChange(p.conv.id, Number(e.target.value)); p.setShowActions(false); }}
              style={s.actionSelect}>
              <option value={0}>Unassigned</option>
              {p.allAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={p.conv.teamId || 0}
              onChange={e => { p.onTeamChange(p.conv.id, Number(e.target.value)); p.setShowActions(false); }}
              style={s.actionSelect}>
              <option value={0}>No team</option>
              {p.allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {p.conv.status === 'RESOLVED' && (
              <button onClick={() => { p.onCsat(p.conv.id); p.setShowActions(false); }}
                style={{ ...s.actionSelect, background: 'var(--ok)', color: '#fff', border: 0, fontWeight: 600, cursor: 'pointer' }}>
                Send CSAT survey
              </button>
            )}
          </div>
        </>
      )}

      {p.error && <div style={s.error}>{p.error}</div>}

      <div style={s.messages}>
        {p.messages.map((m, i) => {
          const out = m.messageType === 'OUTGOING';
          const activity = m.messageType === 'ACTIVITY';
          const prev = p.messages[i - 1];
          const same = !!prev && prev.messageType === m.messageType && !activity;
          if (activity) return (
            <div key={m.id} style={s.activity}>— {m.content} —</div>
          );
          const iData = (m.contentType && m.contentType !== 'text' && m.contentAttributes?.interactiveData) as any;
          return (
            <div key={m.id} style={{
              alignSelf: out ? 'flex-end' : 'flex-start',
              maxWidth: '82%', marginTop: same ? 1 : 8,
            }}>
              {!out && !same && (
                <div style={s.bubbleSender}>{m.senderName || 'Contact'}</div>
              )}
              <div style={{
                ...s.bubble,
                ...(out ? s.bubbleOut : s.bubbleIn),
                ...(m.privateFlag ? s.bubblePrivate : {}),
              }}>
                {m.content && <div>{m.content}</div>}
                {iData && (
                  <div style={{ marginTop: m.content ? 6 : 0 }}>
                    {iData.header && <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>{iData.header}</div>}
                    {iData.body && <div style={{ fontSize: 13, lineHeight: 1.4 }}>{iData.body}</div>}
                    {m.contentType === 'interactive_buttons' && iData.buttons && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {(iData.buttons as any[]).map((b, i) => (
                          <div key={i} style={s.interactiveBtnDisplay}>{b.title}</div>
                        ))}
                      </div>
                    )}
                    {m.contentType === 'interactive_list' && iData.sections && (
                      <div style={{ marginTop: 6 }}>
                        {iData.buttonText && <div style={s.interactiveListBtn}>{iData.buttonText}</div>}
                        {(iData.sections as any[]).map((sec, si) => (
                          <div key={si}>
                            <div style={s.interactiveListSectionTitle}>{sec.title}</div>
                            {(sec.rows as any[]).map((row, ri) => (
                              <div key={ri} style={s.interactiveListRow}>
                                <div style={{ fontWeight: 500, fontSize: 12 }}>{row.title}</div>
                                {row.description && <div style={{ fontSize: 11, opacity: 0.75 }}>{row.description}</div>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {iData.footer && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, fontStyle: 'italic' }}>{iData.footer}</div>}
                  </div>
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: m.content || iData ? 6 : 0 }}>
                    {m.attachments.map(att => (
                      <AttachmentView key={att.id} att={att} outgoing={out && !m.privateFlag} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ ...s.bubbleTime, textAlign: out ? 'right' : 'left' }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.senderType === 'AGENT' && m.deliveryStatus && (
                  <span style={{ marginLeft: 4 }} title={m.deliveryStatus}>
                    {m.deliveryStatus === 'sent' && '✓'}
                    {m.deliveryStatus === 'delivered' && '✓✓'}
                    {m.deliveryStatus === 'read' && <span style={{ color: '#3b82f6' }}>✓✓</span>}
                    {m.deliveryStatus === 'failed' && <span style={{ color: 'var(--danger)' }}>!</span>}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={p.messagesEndRef} />
      </div>

      {p.typingUser && (
        <div style={s.typing}>{p.typingUser} is typing…</div>
      )}

      <form onSubmit={p.onSend} style={s.compose}>
        {p.isPrivate && (
          <div style={s.privateBar}>🔒 Private note — only your team will see this</div>
        )}
        {p.selectedFiles.length > 0 && (
          <div style={s.filePreview}>
            {p.selectedFiles.map((f, i) => (
              <div key={i} style={s.fileChip}>
                <span>📎 {f.name}</span>
                <button type="button" onClick={() => p.onRemoveFile(i)} style={s.fileRemove}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={s.composeRow}>
          <input ref={p.fileInputRef} type="file" multiple onChange={p.onFileSelect}
            style={{ display: 'none' }} />
          <button type="button" onClick={() => p.fileInputRef.current?.click()}
            style={s.composeIconBtn} aria-label="Attach"><SvgClip /></button>
          <button type="button" onClick={() => p.setIsPrivate(!p.isPrivate)}
            style={{ ...s.composeIconBtn, ...(p.isPrivate ? s.composeIconBtnActive : {}) }}
            aria-label="Private"><SvgLock /></button>
          <textarea
            value={p.newMessage}
            onChange={e => { p.setNewMessage(e.target.value); p.sendTyping(true); }}
            onBlur={() => p.sendTyping(false)}
            placeholder={p.isPrivate ? 'Add a private note…' : 'Message…'}
            rows={1}
            style={s.composeInput}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onSend(e); } }}
          />
          <button type="submit"
            disabled={!p.newMessage.trim() && p.selectedFiles.length === 0}
            style={{
              ...s.sendBtn,
              ...(p.newMessage.trim() || p.selectedFiles.length ? {} : s.sendBtnDisabled),
            }}
            aria-label="Send"><SvgSend /></button>
        </div>
      </form>
    </>
  );
};

// ──────────────────────────────────────────────────────────────
// CONTACT VIEW (re-uses ContactPanel)
// ──────────────────────────────────────────────────────────────

const ContactView: React.FC<{ conv: ConversationResponse; onBack: () => void }> = ({ conv, onBack }) => (
  <>
    <header style={s.threadHeader}>
      <button onClick={onBack} style={s.iconOnlyBtn} aria-label="Back"><SvgChevronLeft /></button>
      <h1 style={{ ...s.h1, flex: 1, fontSize: 17 }}>Contact details</h1>
    </header>
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      {/* The existing ContactPanel renders a side panel (~280px wide). On mobile we override its width to 100%. */}
      <div className="app-contact-panel-mobile" style={{ width: '100%' }}>
        <ContactPanel
          contactId={conv.contactId}
          contactName={conv.contactName}
          contactEmail={conv.contactEmail}
          conversationId={conv.id}
        />
      </div>
    </div>
  </>
);

// ──────────────────────────────────────────────────────────────
// SHEETS
// ──────────────────────────────────────────────────────────────

const FilterSheet: React.FC<MobileProps & {
  showFilter: boolean; setShowFilter: (b: boolean) => void;
}> = (p) => (
  <Sheet title="Filters" onClose={() => p.setShowFilter(false)}
    footer={
      <>
        <button onClick={() => { p.setFilterAssigneeId(undefined); p.setFilterTeamId(undefined); }}
          style={s.btnSecondary}>Reset</button>
        <button onClick={() => p.setShowFilter(false)} style={s.btnPrimary}>Apply</button>
      </>
    }>
    <Group title="Assigned to">
      <select value={p.filterAssigneeId || ''}
        onChange={e => p.setFilterAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
        style={s.input}>
        <option value="">All agents</option>
        {p.allAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </Group>
    <Group title="Team">
      <select value={p.filterTeamId || ''}
        onChange={e => p.setFilterTeamId(e.target.value ? Number(e.target.value) : undefined)}
        style={s.input}>
        <option value="">All teams</option>
        {p.allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </Group>
  </Sheet>
);

const NewSheet: React.FC<MobileProps> = (p) => (
  <Sheet title="New conversation" onClose={() => p.setShowNew(false)}
    footer={
      <>
        <button type="button" onClick={() => p.setShowNew(false)} style={s.btnSecondary}>Cancel</button>
        <button type="submit" form="mobile-new-conv-form"
          disabled={!p.newContactId || !p.newInboxId}
          style={{ ...s.btnPrimary, ...(p.newContactId && p.newInboxId ? {} : { opacity: 0.5 }) }}>
          Start
        </button>
      </>
    }>
    <form id="mobile-new-conv-form" onSubmit={p.onCreateConversation}>
      <Group title="Contact">
        <select value={p.newContactId} onChange={e => p.setNewContactId(Number(e.target.value))} style={s.input}>
          <option value={0}>Select a contact…</option>
          {p.contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email || c.phoneNumber || '—'})</option>)}
        </select>
      </Group>
      <Group title="Send via">
        <select value={p.newInboxId} onChange={e => p.setNewInboxId(Number(e.target.value))} style={s.input}>
          <option value={0}>Select an inbox…</option>
          {p.inboxes.map(i => <option key={i.id} value={i.id}>{i.name} ({i.channelType})</option>)}
        </select>
      </Group>
      <Group title="Initial message (optional)">
        <textarea value={p.newInitialMsg} onChange={e => p.setNewInitialMsg(e.target.value)}
          rows={4} style={{ ...s.input, resize: 'none' }} placeholder="Hi! Following up on…" />
      </Group>
    </form>
  </Sheet>
);

const Sheet: React.FC<{
  title: string; onClose: () => void;
  footer?: React.ReactNode; children: React.ReactNode;
}> = ({ title, onClose, footer, children }) => (
  <div onClick={onClose} style={s.sheetOverlay}>
    <div onClick={e => e.stopPropagation()} style={s.sheet}>
      <div style={s.sheetGrabber} />
      <div style={s.sheetHeader}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={s.sheetClose} aria-label="Close">×</button>
      </div>
      <div style={s.sheetBody}>{children}</div>
      {footer && <div style={s.sheetFooter}>{footer}</div>}
    </div>
  </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={s.groupLabel}>{title}</label>
    {children}
  </div>
);

// ──────────────────────────────────────────────────────────────
// ATOMS
// ──────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const AttachmentView: React.FC<{ att: AttachmentResponse; outgoing: boolean }> = ({ att, outgoing }) => {
  if (att.fileType === 'IMAGE') {
    return (
      <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">
        <img src={att.dataUrl} alt={att.fileName}
          style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, display: 'block' }} />
      </a>
    );
  }
  if (att.fileType === 'VIDEO') {
    return (
      <video controls style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10 }}>
        <source src={att.dataUrl} type={att.contentType} />
      </video>
    );
  }
  if (att.fileType === 'AUDIO') {
    return (
      <audio controls style={{ maxWidth: '100%' }}>
        <source src={att.dataUrl} type={att.contentType} />
      </audio>
    );
  }
  return (
    <a href={att.dataUrl} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
        borderRadius: 8, textDecoration: 'none', fontSize: 13,
        background: outgoing ? 'rgba(255,255,255,0.18)' : 'var(--surface-3)',
        color: outgoing ? '#fff' : 'var(--ink-2)',
      }}>
      <span style={{ fontSize: 16 }}>📎</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {att.fileName}
      </span>
      <span style={{ fontSize: 11, opacity: 0.75 }}>{formatFileSize(att.fileSize)}</span>
    </a>
  );
};

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const palette: [string, string][] = [
    ['#eef2ff', '#4f46e5'], ['#fef3c7', '#b45309'],
    ['#dcfce7', '#16a34a'], ['#fce7f3', '#be185d'],
    ['#e0f2fe', '#0369a1'], ['#fee2e2', '#b91c1c'],
  ];
  const idx = (name.charCodeAt(0) + name.length) % palette.length;
  const [bg, fg] = palette[idx];
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: bg, color: fg,
      display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700,
      flexShrink: 0,
    }}>{initials}</div>
  );
};

const IconBtn: React.FC<{
  children: React.ReactNode; ariaLabel: string;
  onClick?: () => void; primary?: boolean; badge?: boolean;
}> = ({ children, ariaLabel, onClick, primary, badge }) => (
  <button onClick={onClick} aria-label={ariaLabel} style={{
    width: 40, height: 40, borderRadius: 10,
    border: primary ? 0 : '1px solid var(--line)',
    background: primary ? 'var(--accent)' : 'var(--surface)',
    color: primary ? '#fff' : 'var(--ink-2)',
    display: 'inline-grid', placeItems: 'center', cursor: 'pointer', position: 'relative',
  }}>
    {children}
    {badge && (
      <span style={{
        position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%',
        background: 'var(--accent)', border: '2px solid var(--surface)',
      }} />
    )}
  </button>
);

// SVG icons
const SvgFilter = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M5 10h10M8 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
const SvgPlus = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const SvgChevronLeft = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SvgDots = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>;
const SvgClip = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11l-9 9a5 5 0 11-7-7l9-9a3.5 3.5 0 115 5l-9 9a2 2 0 11-3-3l8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SvgLock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>;
const SvgSend = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 10l14-7-5 17-3-7-6-3z"/></svg>;

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', flexDirection: 'column',
    // 100dvh accounts for the dynamic mobile address-bar; vh fallback for older browsers.
    height: 'calc(100vh - 64px - 56px)',
    minHeight: 'calc(100dvh - 64px - 56px)',
    maxHeight: 'calc(100dvh - 64px - 56px)',
    background: 'var(--bg)', position: 'relative', overflow: 'hidden',
  },

  header: { background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '12px 16px 0' },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h1: { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' },

  tabs: {
    display: 'flex', gap: 4, overflowX: 'auto',
    margin: '0 -16px', padding: '0 16px 12px', WebkitOverflowScrolling: 'touch',
  },
  tab: {
    flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 32, padding: '0 12px', borderRadius: 999,
    border: '1px solid var(--line)', background: 'var(--surface)',
    color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  tabActive: { border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff' },
  tabCount: {
    fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
    minWidth: 18, textAlign: 'center', background: 'var(--surface-3)', color: 'var(--ink-3)',
  },
  tabCountActive: { background: 'rgba(255,255,255,0.22)', color: '#fff' },

  list: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  row: {
    display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%',
    padding: '14px 16px', background: 'var(--surface)', border: 0,
    borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer',
  },
  rowTop: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  rowName: { fontWeight: 600, fontSize: 15, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowTime: { fontSize: 12, color: 'var(--ink-4)', flexShrink: 0 },
  rowMeta: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 },
  rowId: { fontSize: 11, color: 'var(--accent)', fontWeight: 600 },
  rowInbox: { fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--ink-3)' },
  rowAssignee: { fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowPreview: { fontSize: 13, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 },

  empty: { textAlign: 'center', padding: '80px 24px', color: 'var(--ink-4)' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },

  // Thread
  threadHeader: {
    background: 'var(--surface)', borderBottom: '1px solid var(--line)',
    padding: '8px 8px 8px 4px', display: 'flex', alignItems: 'center', gap: 4,
  },
  iconOnlyBtn: {
    width: 40, height: 40, border: 0, background: 'transparent', cursor: 'pointer',
    display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0,
  },
  threadTitle: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
    background: 'transparent', border: 0, padding: '4px', cursor: 'pointer', minWidth: 0,
  },
  threadName: { fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  threadSubtitle: { fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center' },

  actionBackdrop: {
    position: 'absolute', inset: 0, zIndex: 19, background: 'transparent',
  },
  actionMenu: {
    position: 'absolute', top: 60, right: 12, zIndex: 20,
    background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--sh-2)',
    minWidth: 220, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
  },
  actionSelect: {
    width: '100%', height: 40, padding: '0 12px',
    border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)',
    fontSize: 14, fontFamily: 'inherit',
  },

  messages: {
    flex: 1, overflowY: 'auto', padding: '16px 12px',
    display: 'flex', flexDirection: 'column', gap: 0,
    WebkitOverflowScrolling: 'touch', background: 'var(--bg)',
  },
  bubble: { padding: '8px 12px', borderRadius: 18, fontSize: 14.5, lineHeight: 1.4 },
  bubbleOut: { background: 'var(--accent)', color: '#fff' },
  bubbleIn: { background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 1px 1px rgba(20,22,28,0.05)' },
  bubblePrivate: { background: '#fef9c3', color: '#713f12', border: '1px dashed #d97706' },
  bubbleSender: { fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 2, paddingLeft: 12 },
  bubbleTime: { fontSize: 10, color: 'var(--ink-4)', marginTop: 2, paddingRight: 8, paddingLeft: 12 },
  activity: { alignSelf: 'center', fontSize: 11, color: 'var(--ink-4)', padding: '4px 12px', textAlign: 'center', maxWidth: '85%' },

  typing: { padding: '4px 16px', fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' },

  compose: {
    background: 'var(--surface)', borderTop: '1px solid var(--line)',
    padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
  },
  privateBar: {
    background: '#fef9c3', color: '#713f12', padding: '6px 12px',
    borderRadius: 8, fontSize: 12, marginBottom: 8, fontWeight: 500,
  },
  composeRow: { display: 'flex', gap: 6, alignItems: 'flex-end' },
  composeIconBtn: {
    width: 40, height: 40, borderRadius: '50%', border: 0, background: 'transparent',
    color: 'var(--ink-3)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
  },
  composeIconBtnActive: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  composeInput: {
    flex: 1, minHeight: 40, maxHeight: 120, padding: '10px 14px',
    border: '1px solid var(--line)', borderRadius: 20, background: 'var(--surface-2)',
    fontSize: 15, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.4,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: '50%', border: 0,
    background: 'var(--accent)', color: '#fff',
    display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
  },
  sendBtnDisabled: { background: 'var(--surface-3)', color: 'var(--ink-4)', cursor: 'default' },

  filePreview: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  fileChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px',
    background: 'var(--surface-3)', borderRadius: 6, fontSize: 12, color: 'var(--ink-2)',
  },
  fileRemove: { border: 0, background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, padding: 0 },

  error: { background: '#fef2f2', color: 'var(--danger)', padding: '8px 16px', fontSize: 13 },

  // Sheets
  sheetOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(20,22,28,0.5)', zIndex: 50,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', maxHeight: '92%',
    background: 'var(--surface)', borderRadius: '20px 20px 0 0',
    display: 'flex', flexDirection: 'column',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  sheetGrabber: {
    width: 40, height: 5, borderRadius: 999, background: 'var(--surface-3)',
    margin: '8px auto 0',
  },
  sheetHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px',
  },
  sheetClose: {
    width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--surface-3)',
    display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)',
    fontSize: 18, lineHeight: 1, padding: 0,
  },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '4px 16px 16px' },
  sheetFooter: { borderTop: '1px solid var(--line)', padding: '12px 16px', display: 'flex', gap: 8 },

  groupLabel: {
    display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
  },
  input: {
    width: '100%', height: 48, padding: '0 14px',
    border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)',
    fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },

  btnPrimary: {
    flex: 2, height: 48, borderRadius: 12, border: 0,
    background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    flex: 1, height: 48, borderRadius: 12, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },

  interactiveBtnDisplay: {
    padding: '6px 10px', borderRadius: 14, fontSize: 12, fontWeight: 500,
    textAlign: 'center', border: '1px solid currentColor', opacity: 0.9,
  },
  interactiveListBtn: {
    padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    textAlign: 'center', marginBottom: 6, border: '1px solid currentColor', opacity: 0.9,
  },
  interactiveListSectionTitle: {
    fontSize: 10, fontWeight: 700, opacity: 0.7, marginTop: 6, marginBottom: 3,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  interactiveListRow: {
    padding: '4px 8px', borderRadius: 4, marginBottom: 3,
    background: 'rgba(0,0,0,0.06)',
  },
};
