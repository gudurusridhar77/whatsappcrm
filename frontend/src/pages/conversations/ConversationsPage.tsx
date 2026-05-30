import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { conversationsApi, ConversationResponse, MessageResponse, ConversationCounts, AttachmentResponse, InteractiveData, InteractiveButton, ListSection, ListRow } from '../../api/conversations';
import { contactsApi, Contact } from '../../api/contacts';
import { inboxesApi, Inbox } from '../../api/inboxes';
import { useWebSocket } from '../../hooks/useWebSocket';
import { labelsApi, LabelResponse } from '../../api/labels';
import { cannedResponsesApi, CannedResponse } from '../../api/cannedResponses';
import { teamsApi, TeamResponse, agentsApi, AgentResponse } from '../../api/teams';
import ContactPanel from '../../components/ContactPanel';
import { csatApi } from '../../api/csat';
import { useIsMobile } from '../../hooks/useIsMobile';
import ConversationsPageMobile from './ConversationsPage.mobile';

const statusColors: Record<string, string> = {
  OPEN: 'var(--ok)',
  PENDING: 'var(--warn)',
  RESOLVED: 'var(--ink-3)',
  SNOOZED: '#8b5cf6',
};

const ConversationsPage: React.FC = () => {
  const { user, currentAccountId } = useAuth();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [counts, setCounts] = useState<ConversationCounts>({ open: 0, pending: 0, resolved: 0, snoozed: 0 });
  const [activeConv, setActiveConv] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [filterTeamId, setFilterTeamId] = useState<number | undefined>(undefined);
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New conversation modal
  const [showNew, setShowNew] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [newContactId, setNewContactId] = useState<number>(0);
  const [newInboxId, setNewInboxId] = useState<number>(0);
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // Labels
  const [allLabels, setAllLabels] = useState<LabelResponse[]>([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  // Agents & Teams for assignment
  const [allAgents, setAllAgents] = useState<AgentResponse[]>([]);
  const [allTeams, setAllTeams] = useState<TeamResponse[]>([]);

  // Canned Responses
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [cannedFilter, setCannedFilter] = useState('');
  const [cannedIndex, setCannedIndex] = useState(0);

  // File attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive messages
  const [showInteractiveMenu, setShowInteractiveMenu] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState<'none' | 'buttons' | 'list'>('none');
  const [interactiveBody, setInteractiveBody] = useState('');
  const [interactiveHeader, setInteractiveHeader] = useState('');
  const [interactiveFooter, setInteractiveFooter] = useState('');
  const [interactiveButtons, setInteractiveButtons] = useState<InteractiveButton[]>([
    { id: 'btn_1', title: '' },
  ]);
  const [interactiveListBtnText, setInteractiveListBtnText] = useState('View Options');
  const [interactiveSections, setInteractiveSections] = useState<ListSection[]>([
    { title: 'Options', rows: [{ id: 'row_1', title: '', description: '' }] },
  ]);

  // WebSocket: real-time updates
  const handleWsConversationUpdate = useCallback(() => {
    // Refresh conversation list when any conversation is updated
    loadConversationsRef.current?.();
  }, []);

  const handleWsNewMessage = useCallback((msgData: MessageResponse) => {
    // Attachments arrive with relative URLs and no auth; append the JWT so
    // <img>/<video>/<a> can load them (same as getMessages does for REST).
    const token = localStorage.getItem('accessToken');
    if (token && msgData.attachments?.length) {
      const withToken = (url: string) => url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
      msgData.attachments = msgData.attachments.map((a) => ({
        ...a,
        dataUrl: a.dataUrl ? withToken(a.dataUrl) : a.dataUrl,
        thumbUrl: a.thumbUrl ? withToken(a.thumbUrl) : a.thumbUrl,
      }));
    }
    // Add message to the thread in real-time
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === msgData.id)) return prev;
      return [...prev, msgData];
    });
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const handleWsTyping = useCallback((data: { userName: string; isTyping: boolean }) => {
    if (data.isTyping) {
      setTypingUser(data.userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    } else {
      setTypingUser(null);
    }
  }, []);

  const { connected, sendTyping } = useWebSocket({
    accountId: currentAccountId,
    conversationId: activeConv?.id,
    onConversationUpdate: handleWsConversationUpdate,
    onNewMessage: handleWsNewMessage,
    onTyping: handleWsTyping,
  });

  // Ref to avoid stale closure in WebSocket callback
  const loadConversationsRef = useRef<(() => void) | null>(null);

  const loadConversations = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const params: any = { status: filterStatus };
      if (filterTeamId) params.teamId = filterTeamId;
      if (filterAssigneeId) params.assigneeId = filterAssigneeId;
      const [convRes, countRes] = await Promise.all([
        conversationsApi.getConversations(currentAccountId, params),
        conversationsApi.getCounts(currentAccountId),
      ]);
      setConversations(convRes.data.content);
      setCounts(countRes.data);
    } catch {
      setError('Failed to load conversations');
    }
  }, [currentAccountId, filterStatus, filterTeamId, filterAssigneeId]);

  // Keep ref in sync for WebSocket callback
  loadConversationsRef.current = loadConversations;

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: number) => {
    if (!currentAccountId) return;
    try {
      const res = await conversationsApi.getMessages(currentAccountId, convId);
      setMessages(res.data.content);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setError('Failed to load messages');
    }
  }, [currentAccountId]);

  const selectConversation = (conv: ConversationResponse) => {
    setActiveConv(conv);
    loadMessages(conv.id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !activeConv) return;

    // Handle interactive message send
    if (interactiveMode !== 'none') {
      await handleSendInteractive();
      return;
    }

    if (!newMessage.trim() && selectedFiles.length === 0) return;
    try {
      if (selectedFiles.length > 0) {
        await conversationsApi.sendMessageWithAttachments(currentAccountId, activeConv.id, {
          content: newMessage,
          privateFlag: isPrivate,
          files: selectedFiles,
        });
      } else {
        await conversationsApi.sendMessage(currentAccountId, activeConv.id, {
          content: newMessage,
          privateFlag: isPrivate,
        });
      }
      setNewMessage('');
      setIsPrivate(false);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMessages(activeConv.id);
      loadConversations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handleSendInteractive = async () => {
    if (!currentAccountId || !activeConv) return;
    if (!interactiveBody.trim()) { setError('Message body is required'); return; }

    try {
      const interactiveData: InteractiveData = {
        body: interactiveBody,
        header: interactiveHeader || undefined,
        footer: interactiveFooter || undefined,
      };

      let contentType = 'text';
      if (interactiveMode === 'buttons') {
        contentType = 'interactive_buttons';
        interactiveData.buttons = interactiveButtons.filter(b => b.title.trim());
        if (!interactiveData.buttons.length) { setError('At least one button is required'); return; }
      } else if (interactiveMode === 'list') {
        contentType = 'interactive_list';
        interactiveData.buttonText = interactiveListBtnText || 'View Options';
        interactiveData.sections = interactiveSections.map(s => ({
          ...s,
          rows: s.rows.filter(r => r.title.trim()),
        })).filter(s => s.rows.length > 0);
        if (!interactiveData.sections.length) { setError('At least one section with options is required'); return; }
      }

      await conversationsApi.sendInteractiveMessage(currentAccountId, activeConv.id, {
        contentType,
        interactiveData,
      });

      resetInteractiveMode();
      loadMessages(activeConv.id);
      loadConversations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send interactive message');
    }
  };

  const resetInteractiveMode = () => {
    setInteractiveMode('none');
    setInteractiveBody('');
    setInteractiveHeader('');
    setInteractiveFooter('');
    setInteractiveButtons([{ id: 'btn_1', title: '' }]);
    setInteractiveListBtnText('View Options');
    setInteractiveSections([{ title: 'Options', rows: [{ id: 'row_1', title: '', description: '' }] }]);
    setShowInteractiveMenu(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Max 5 files at a time
    if (selectedFiles.length + files.length > 5) {
      setError('Maximum 5 files per message');
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleStatusChange = async (convId: number, status: string) => {
    if (!currentAccountId) return;
    try {
      await conversationsApi.updateConversation(currentAccountId, convId, { status });
      loadConversations();
      if (activeConv?.id === convId) {
        const res = await conversationsApi.getConversation(currentAccountId, convId);
        setActiveConv(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  // Load all labels, canned responses, agents, and teams for the account
  useEffect(() => {
    if (!currentAccountId) return;
    labelsApi.getLabels(currentAccountId).then(res => setAllLabels(res.data)).catch(() => {});
    cannedResponsesApi.getAll(currentAccountId).then(res => setCannedResponses(res.data)).catch(() => {});
    agentsApi.getAgents(currentAccountId).then(res => setAllAgents(res.data)).catch(() => {});
    teamsApi.getTeams(currentAccountId).then(res => setAllTeams(res.data)).catch(() => {});
  }, [currentAccountId]);

  const toggleConversationLabel = async (convId: number, labelId: number, currentLabels: { id: number; title: string; color: string }[]) => {
    if (!currentAccountId) return;
    const hasLabel = currentLabels.some(l => l.id === labelId);
    const newLabelIds = hasLabel
      ? currentLabels.filter(l => l.id !== labelId).map(l => l.id)
      : [...currentLabels.map(l => l.id), labelId];
    try {
      await labelsApi.setConversationLabels(currentAccountId, convId, newLabelIds);
      // Refresh conversation to get updated labels
      const res = await conversationsApi.getConversation(currentAccountId, convId);
      setActiveConv(res.data);
      loadConversations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update labels');
    }
  };

  const handleAssigneeChange = async (convId: number, assigneeId: number) => {
    if (!currentAccountId) return;
    try {
      await conversationsApi.updateConversation(currentAccountId, convId, { assigneeId });
      const res = await conversationsApi.getConversation(currentAccountId, convId);
      setActiveConv(res.data);
      loadConversations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign agent');
    }
  };

  const handleTeamChange = async (convId: number, teamId: number) => {
    if (!currentAccountId) return;
    try {
      await conversationsApi.updateConversation(currentAccountId, convId, { teamId });
      const res = await conversationsApi.getConversation(currentAccountId, convId);
      setActiveConv(res.data);
      loadConversations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign team');
    }
  };

  const openNewModal = async () => {
    if (!currentAccountId) return;
    try {
      const [cRes, iRes] = await Promise.all([
        contactsApi.getContacts(currentAccountId, 0, 100),
        inboxesApi.getInboxes(currentAccountId),
      ]);
      setContacts(cRes.data.content);
      setInboxes(iRes.data);
      setShowNew(true);
    } catch {
      setError('Failed to load data');
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !newContactId || !newInboxId) return;
    try {
      const res = await conversationsApi.createConversation(currentAccountId, {
        contactId: newContactId,
        inboxId: newInboxId,
        initialMessage: newInitialMsg || undefined,
      });
      setShowNew(false);
      setNewContactId(0);
      setNewInboxId(0);
      setNewInitialMsg('');
      loadConversations();
      selectConversation(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create conversation');
    }
  };

  const handleSendCsat = useCallback(async (convId: number) => {
    if (!currentAccountId) return;
    try {
      const res = await csatApi.createSurvey(currentAccountId, convId);
      const url = window.location.origin + '/survey/' + res.data.token;
      try { await navigator.clipboard.writeText(url); } catch {}
      alert('CSAT survey link copied to clipboard!\n' + url);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create survey');
    }
  }, [currentAccountId]);

  // ── Mobile presentation ──────────────────────────────────────────
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <ConversationsPageMobile
        conversations={conversations} counts={counts} activeConv={activeConv}
        messages={messages}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterAssigneeId={filterAssigneeId} setFilterAssigneeId={setFilterAssigneeId}
        filterTeamId={filterTeamId} setFilterTeamId={setFilterTeamId}
        allAgents={allAgents} allTeams={allTeams} allLabels={allLabels}
        cannedResponses={cannedResponses} contacts={contacts} inboxes={inboxes}
        newMessage={newMessage} setNewMessage={setNewMessage}
        isPrivate={isPrivate} setIsPrivate={setIsPrivate}
        selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
        fileInputRef={fileInputRef}
        error={error} setError={setError}
        typingUser={typingUser} connected={connected}
        onSelect={selectConversation}
        onSend={handleSend} onFileSelect={handleFileSelect} onRemoveFile={removeFile}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange} onTeamChange={handleTeamChange}
        onToggleLabel={toggleConversationLabel}
        onOpenNew={openNewModal} onCreateConversation={handleCreateConversation}
        onCsat={handleSendCsat}
        newContactId={newContactId} setNewContactId={setNewContactId}
        newInboxId={newInboxId} setNewInboxId={setNewInboxId}
        newInitialMsg={newInitialMsg} setNewInitialMsg={setNewInitialMsg}
        showNew={showNew} setShowNew={setShowNew}
        sendTyping={sendTyping}
      />
    );
  }

  return (
    <div className="app-conv-wrapper" style={styles.wrapper}>
      {/* Left: Conversation List */}
      <div className="app-conv-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Conversations</h3>
          <button onClick={openNewModal} style={styles.newBtn}>+</button>
        </div>

        {/* Status tabs */}
        <div style={styles.tabs}>
          {(['OPEN', 'PENDING', 'RESOLVED', 'SNOOZED'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ ...styles.tab, ...(filterStatus === s ? styles.tabActive : {}) }}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
              <span style={styles.tabCount}>{counts[s.toLowerCase() as keyof ConversationCounts]}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <select value={filterAssigneeId || ''} onChange={(e) => setFilterAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
            style={styles.filterSelect}>
            <option value="">All Agents</option>
            {allAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterTeamId || ''} onChange={(e) => setFilterTeamId(e.target.value ? Number(e.target.value) : undefined)}
            style={styles.filterSelect}>
            <option value="">All Teams</option>
            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Conversation items */}
        <div style={styles.convList}>
          {conversations.length === 0 ? (
            <div style={styles.empty}>No {filterStatus.toLowerCase()} conversations</div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id}
                onClick={() => selectConversation(conv)}
                style={{
                  ...styles.convItem,
                  ...(activeConv?.id === conv.id ? styles.convItemActive : {}),
                }}>
                <div style={styles.convItemHeader}>
                  <span style={styles.convContact}>{conv.contactName}</span>
                  <span style={styles.convTime}>
                    {conv.lastActivityAt ? new Date(conv.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div style={styles.convMeta}>
                  <span style={styles.convId}>#{conv.displayId}</span>
                  <span style={styles.convInbox}>{conv.inboxName}</span>
                  {conv.assigneeName && <span style={styles.convAssignee}>{conv.assigneeName}</span>}
                </div>
                {conv.labels && conv.labels.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' as const }}>
                    {conv.labels.map(l => (
                      <span key={l.id} style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
                        backgroundColor: l.color + '20', color: l.color, fontWeight: 500,
                      }}>{l.title}</span>
                    ))}
                  </div>
                )}
                {conv.lastMessage && (
                  <div style={styles.convPreview}>{conv.lastMessage}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Message Thread */}
      <div style={styles.chatArea}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div>
                <span style={styles.chatContact}>{activeConv.contactName}</span>
                <span style={styles.chatId}> #{activeConv.displayId}</span>
                {activeConv.contactEmail && (
                  <span style={styles.chatEmail}> - {activeConv.contactEmail}</span>
                )}
              </div>
              <div style={styles.chatActions}>
                {connected && <span style={styles.connectedBadge}>Live</span>}
                <div style={{ position: 'relative' as const }}>
                  <button onClick={() => setShowLabelPicker(!showLabelPicker)}
                    style={{ ...styles.labelBtn, ...(activeConv.labels?.length ? {} : {}) }}
                    title="Manage labels">
                    Labels {activeConv.labels?.length ? `(${activeConv.labels.length})` : ''}
                  </button>
                  {showLabelPicker && (
                    <div style={styles.labelDropdown}>
                      <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid var(--line)' }}>
                        Assign Labels
                      </div>
                      {allLabels.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--ink-4)' }}>No labels created yet</div>
                      ) : (
                        allLabels.map(label => {
                          const isActive = activeConv.labels?.some(l => l.id === label.id);
                          return (
                            <div key={label.id}
                              onClick={() => toggleConversationLabel(activeConv.id, label.id, activeConv.labels || [])}
                              style={styles.labelOption}>
                              <span style={{ ...styles.labelDot, backgroundColor: label.color }} />
                              <span style={{ flex: 1, fontSize: '13px' }}>{label.title}</span>
                              {isActive && <span style={{ color: 'var(--ok)', fontWeight: 700 }}>&#10003;</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <select value={activeConv.assigneeId || 0}
                  onChange={(e) => handleAssigneeChange(activeConv.id, Number(e.target.value))}
                  style={styles.assignSelect} title="Assign Agent">
                  <option value={0}>Unassigned</option>
                  {allAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={activeConv.teamId || 0}
                  onChange={(e) => handleTeamChange(activeConv.id, Number(e.target.value))}
                  style={styles.assignSelect} title="Assign Team">
                  <option value={0}>No Team</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={activeConv.status}
                  onChange={(e) => handleStatusChange(activeConv.id, e.target.value)}
                  style={{
                    ...styles.statusSelect,
                    color: statusColors[activeConv.status] || 'var(--ink)',
                  }}>
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="SNOOZED">Snoozed</option>
                </select>
                {activeConv.status === 'RESOLVED' && (
                  <button onClick={async () => {
                    if (!currentAccountId) return;
                    try {
                      const res = await csatApi.createSurvey(currentAccountId, activeConv.id);
                      const url = window.location.origin + '/survey/' + res.data.token;
                      navigator.clipboard.writeText(url);
                      alert('CSAT survey link copied to clipboard!\n' + url);
                    } catch (err: any) {
                      alert(err.response?.data?.error || 'Failed to create survey');
                    }
                  }} style={styles.csatBtn} title="Send CSAT Survey">
                    CSAT
                  </button>
                )}
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {/* Messages */}
            <div style={styles.messages}>
              {messages.map((msg) => (
                <div key={msg.id} style={{
                  ...styles.msgRow,
                  justifyContent: msg.messageType === 'OUTGOING' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    ...styles.msgBubble,
                    ...(msg.messageType === 'OUTGOING'
                      ? (msg.privateFlag ? styles.msgPrivate : styles.msgOutgoing)
                      : msg.messageType === 'ACTIVITY'
                        ? styles.msgActivity
                        : styles.msgIncoming),
                  }}>
                    <div style={styles.msgSender}>
                      {msg.senderName || (msg.senderType === 'USER' ? 'Agent' : 'Contact')}
                      {msg.privateFlag && <span style={styles.privateBadge}>Private</span>}
                    </div>
                    {msg.content && <div style={styles.msgContent}>{msg.content}</div>}
                    {/* Interactive message rendering */}
                    {msg.contentType && msg.contentType !== 'text' && msg.contentAttributes?.interactiveData && (() => {
                      const iData = msg.contentAttributes.interactiveData as any;
                      return (
                        <div style={styles.interactiveMsg}>
                          {iData.header && <div style={styles.interactiveMsgHeader}>{iData.header}</div>}
                          {iData.footer && <div style={styles.interactiveMsgFooter}>{iData.footer}</div>}
                          {/* Buttons */}
                          {msg.contentType === 'interactive_buttons' && iData.buttons && (
                            <div style={styles.interactiveBtnGroup}>
                              {(iData.buttons as any[]).map((btn: any, i: number) => (
                                <div key={i} style={styles.interactiveBtnDisplay}>{btn.title}</div>
                              ))}
                            </div>
                          )}
                          {/* List */}
                          {msg.contentType === 'interactive_list' && iData.sections && (
                            <div style={styles.interactiveListGroup}>
                              {iData.buttonText && (
                                <div style={styles.interactiveListBtn}>{iData.buttonText}</div>
                              )}
                              {(iData.sections as any[]).map((section: any, si: number) => (
                                <div key={si}>
                                  <div style={styles.interactiveListSectionTitle}>{section.title}</div>
                                  {(section.rows as any[]).map((row: any, ri: number) => (
                                    <div key={ri} style={styles.interactiveListRow}>
                                      <div style={{ fontWeight: 500, fontSize: '12px' }}>{row.title}</div>
                                      {row.description && <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{row.description}</div>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={styles.attachmentList}>
                        {msg.attachments.map((att) => (
                          <div key={att.id} style={styles.attachmentItem}>
                            {att.fileType === 'IMAGE' ? (
                              <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">
                                <img src={att.dataUrl} alt={att.fileName}
                                  style={styles.attachmentImage} />
                              </a>
                            ) : att.fileType === 'VIDEO' ? (
                              <video controls style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '6px' }}>
                                <source src={att.dataUrl} type={att.contentType} />
                                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">Download Video</a>
                              </video>
                            ) : att.fileType === 'AUDIO' ? (
                              <audio controls style={{ maxWidth: '260px' }}>
                                <source src={att.dataUrl} type={att.contentType} />
                                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">Download Audio</a>
                              </audio>
                            ) : (
                              <a href={att.dataUrl} target="_blank" rel="noopener noreferrer"
                                style={{
                                  ...styles.attachmentFile,
                                  color: msg.messageType === 'OUTGOING' && !msg.privateFlag ? 'var(--surface)' : 'var(--accent)',
                                }}>
                                <span style={styles.attachmentIcon}>📎</span>
                                <span style={styles.attachmentName}>{att.fileName}</span>
                                <span style={styles.attachmentSize}>({formatFileSize(att.fileSize)})</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={styles.msgTime}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.senderType === 'AGENT' && msg.deliveryStatus && (
                        <span style={{ marginLeft: '4px' }} title={msg.deliveryStatus}>
                          {msg.deliveryStatus === 'sent' && '✓'}
                          {msg.deliveryStatus === 'delivered' && '✓✓'}
                          {msg.deliveryStatus === 'read' && <span style={{ color: '#3b82f6' }}>✓✓</span>}
                          {msg.deliveryStatus === 'failed' && <span style={{ color: 'var(--danger)' }}>!</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUser && (
              <div style={styles.typingIndicator}>
                {typingUser} is typing...
              </div>
            )}

            {/* Compose */}
            <form onSubmit={handleSend} style={styles.compose}>
              <div style={styles.composeTop}>
                <label style={styles.privateLabel}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  Private note
                </label>
                <span style={styles.cannedHint}>Type <code>/</code> for canned responses</span>
              </div>
              <div style={{ position: 'relative' as const }}>
                {/* Canned Response Dropdown */}
                {showCannedMenu && (() => {
                  const filtered = cannedResponses.filter(cr =>
                    cr.shortCode.toLowerCase().includes(cannedFilter.toLowerCase()) ||
                    cr.content.toLowerCase().includes(cannedFilter.toLowerCase())
                  );
                  return filtered.length > 0 ? (
                    <div style={styles.cannedDropdown}>
                      {filtered.map((cr, idx) => (
                        <div key={cr.id}
                          onClick={() => {
                            setNewMessage(cr.content);
                            setShowCannedMenu(false);
                            setCannedFilter('');
                          }}
                          style={{
                            ...styles.cannedItem,
                            ...(idx === cannedIndex ? styles.cannedItemActive : {}),
                          }}>
                          <code style={styles.cannedCode}>/{cr.shortCode}</code>
                          <span style={styles.cannedPreview}>
                            {cr.content.length > 80 ? cr.content.substring(0, 80) + '...' : cr.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                {/* Interactive Message Builder */}
                {interactiveMode !== 'none' && (
                  <div style={styles.interactiveBuilder}>
                    <div style={styles.interactiveBuilderHeader}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>
                        {interactiveMode === 'buttons' ? '🔘 Quick Reply Buttons' : '📋 List Message'}
                      </span>
                      <button type="button" onClick={resetInteractiveMode} style={styles.interactiveCloseBtn}>✕</button>
                    </div>
                    <div style={styles.interactiveBuilderBody}>
                      {/* Header (optional) */}
                      <input type="text" value={interactiveHeader} onChange={e => setInteractiveHeader(e.target.value)}
                        placeholder="Header (optional)" style={styles.interactiveInput} />
                      {/* Body */}
                      <textarea value={interactiveBody} onChange={e => setInteractiveBody(e.target.value)}
                        placeholder="Message body (required)" required
                        style={{ ...styles.interactiveInput, minHeight: '50px', resize: 'vertical' as const }} />
                      {/* Footer (optional) */}
                      <input type="text" value={interactiveFooter} onChange={e => setInteractiveFooter(e.target.value)}
                        placeholder="Footer (optional)" style={styles.interactiveInput} />

                      {/* Buttons mode */}
                      {interactiveMode === 'buttons' && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                            Buttons (max 3)
                          </div>
                          {interactiveButtons.map((btn, i) => (
                            <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                              <input type="text" value={btn.title}
                                onChange={e => {
                                  const updated = [...interactiveButtons];
                                  updated[i] = { ...updated[i], title: e.target.value };
                                  setInteractiveButtons(updated);
                                }}
                                placeholder={`Button ${i + 1} text`}
                                maxLength={20}
                                style={{ ...styles.interactiveInput, flex: 1, marginBottom: 0 }} />
                              {interactiveButtons.length > 1 && (
                                <button type="button" onClick={() => setInteractiveButtons(prev => prev.filter((_, j) => j !== i))}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}>✕</button>
                              )}
                            </div>
                          ))}
                          {interactiveButtons.length < 3 && (
                            <button type="button" onClick={() => setInteractiveButtons(prev => [
                              ...prev, { id: `btn_${prev.length + 1}`, title: '' }
                            ])} style={styles.interactiveAddBtn}>+ Add Button</button>
                          )}
                        </div>
                      )}

                      {/* List mode */}
                      {interactiveMode === 'list' && (
                        <div>
                          <input type="text" value={interactiveListBtnText}
                            onChange={e => setInteractiveListBtnText(e.target.value)}
                            placeholder="Button text (e.g. View Options)"
                            style={{ ...styles.interactiveInput, marginBottom: '8px' }} />

                          {interactiveSections.map((section, si) => (
                            <div key={si} style={styles.interactiveSection}>
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                <input type="text" value={section.title}
                                  onChange={e => {
                                    const updated = [...interactiveSections];
                                    updated[si] = { ...updated[si], title: e.target.value };
                                    setInteractiveSections(updated);
                                  }}
                                  placeholder="Section title"
                                  style={{ ...styles.interactiveInput, flex: 1, marginBottom: 0, fontWeight: 600 }} />
                                {interactiveSections.length > 1 && (
                                  <button type="button" onClick={() => setInteractiveSections(prev => prev.filter((_, j) => j !== si))}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px' }}>✕</button>
                                )}
                              </div>
                              {section.rows.map((row, ri) => (
                                <div key={ri} style={{ display: 'flex', gap: '4px', marginBottom: '3px', paddingLeft: '8px' }}>
                                  <input type="text" value={row.title}
                                    onChange={e => {
                                      const updated = [...interactiveSections];
                                      updated[si].rows[ri] = { ...updated[si].rows[ri], title: e.target.value };
                                      setInteractiveSections(updated);
                                    }}
                                    placeholder="Option title" maxLength={24}
                                    style={{ ...styles.interactiveInput, flex: 1, marginBottom: 0 }} />
                                  <input type="text" value={row.description || ''}
                                    onChange={e => {
                                      const updated = [...interactiveSections];
                                      updated[si].rows[ri] = { ...updated[si].rows[ri], description: e.target.value };
                                      setInteractiveSections(updated);
                                    }}
                                    placeholder="Description (optional)" maxLength={72}
                                    style={{ ...styles.interactiveInput, flex: 1, marginBottom: 0, fontSize: '11px' }} />
                                  {section.rows.length > 1 && (
                                    <button type="button" onClick={() => {
                                      const updated = [...interactiveSections];
                                      updated[si].rows = updated[si].rows.filter((_, j) => j !== ri);
                                      setInteractiveSections(updated);
                                    }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '12px' }}>✕</button>
                                  )}
                                </div>
                              ))}
                              <button type="button" onClick={() => {
                                const updated = [...interactiveSections];
                                const idx = updated[si].rows.length;
                                updated[si].rows.push({ id: `row_${si}_${idx}`, title: '', description: '' });
                                setInteractiveSections(updated);
                              }} style={{ ...styles.interactiveAddBtn, marginLeft: '8px' }}>+ Add Option</button>
                            </div>
                          ))}
                          {interactiveSections.length < 10 && (
                            <button type="button" onClick={() => {
                              const idx = interactiveSections.length;
                              setInteractiveSections(prev => [...prev, {
                                title: `Section ${idx + 1}`,
                                rows: [{ id: `row_${idx}_0`, title: '', description: '' }],
                              }]);
                            }} style={styles.interactiveAddBtn}>+ Add Section</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Preview */}
                {selectedFiles.length > 0 && (
                  <div style={styles.filePreview}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} style={styles.filePreviewItem}>
                        {file.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={file.name}
                            style={styles.filePreviewThumb} />
                        ) : (
                          <span style={styles.filePreviewIcon}>
                            {file.type.startsWith('video/') ? '🎬' : file.type.startsWith('audio/') ? '🎵' : '📎'}
                          </span>
                        )}
                        <span style={styles.filePreviewName}>{file.name}</span>
                        <span style={styles.filePreviewSize}>{formatFileSize(file.size)}</span>
                        <button type="button" onClick={() => removeFile(idx)}
                          style={styles.fileRemoveBtn}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={styles.composeRow}>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect}
                    multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                    style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={styles.attachBtn} title="Attach files (max 5)">
                    📎
                  </button>
                  <div style={{ position: 'relative' as const }}>
                    <button type="button" onClick={() => setShowInteractiveMenu(!showInteractiveMenu)}
                      style={{
                        ...styles.attachBtn,
                        backgroundColor: interactiveMode !== 'none' ? '#dbeafe' : undefined,
                        color: interactiveMode !== 'none' ? 'var(--accent)' : undefined,
                      }}
                      title="Send interactive message (buttons/list)">
                      🔘
                    </button>
                    {showInteractiveMenu && (
                      <div style={styles.interactiveMenu}>
                        <button onClick={() => { setInteractiveMode('buttons'); setShowInteractiveMenu(false); }}
                          style={styles.interactiveMenuItem}>
                          🔘 Quick Reply Buttons
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-3)' }}>Up to 3 reply buttons</span>
                        </button>
                        <button onClick={() => { setInteractiveMode('list'); setShowInteractiveMenu(false); }}
                          style={styles.interactiveMenuItem}>
                          📋 List Message
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-3)' }}>Menu with sections &amp; options</span>
                        </button>
                        {interactiveMode !== 'none' && (
                          <button onClick={resetInteractiveMode}
                            style={{ ...styles.interactiveMenuItem, color: 'var(--danger)' }}>
                            ✕ Cancel Interactive
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <textarea value={newMessage} onChange={(e) => {
                      const val = e.target.value;
                      setNewMessage(val);
                      sendTyping(true);
                      // Detect / trigger for canned responses
                      if (val.startsWith('/')) {
                        setShowCannedMenu(true);
                        setCannedFilter(val.substring(1));
                        setCannedIndex(0);
                      } else {
                        setShowCannedMenu(false);
                        setCannedFilter('');
                      }
                    }}
                    onBlur={() => { sendTyping(false); setTimeout(() => setShowCannedMenu(false), 200); }}
                    style={styles.composeInput}
                    placeholder={isPrivate ? 'Add a private note...' : 'Type a message... (/ for templates)'}
                    onKeyDown={(e) => {
                      if (showCannedMenu) {
                        const filtered = cannedResponses.filter(cr =>
                          cr.shortCode.toLowerCase().includes(cannedFilter.toLowerCase()) ||
                          cr.content.toLowerCase().includes(cannedFilter.toLowerCase())
                        );
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setCannedIndex(prev => Math.min(prev + 1, filtered.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setCannedIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter' && filtered.length > 0) {
                          e.preventDefault();
                          setNewMessage(filtered[cannedIndex].content);
                          setShowCannedMenu(false);
                          setCannedFilter('');
                        } else if (e.key === 'Escape') {
                          setShowCannedMenu(false);
                        }
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <button type="submit" style={styles.sendBtn}
                    disabled={interactiveMode === 'none' ? (!newMessage.trim() && selectedFiles.length === 0) : !interactiveBody.trim()}>
                    {interactiveMode !== 'none'
                      ? (interactiveMode === 'buttons' ? 'Send Buttons' : 'Send List')
                      : selectedFiles.length > 0
                        ? `Send (${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})`
                        : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div style={styles.noChat}>
            <h3 style={{ color: 'var(--ink-4)', fontWeight: 400 }}>Select a conversation to start messaging</h3>
          </div>
        )}
      </div>

      {/* Contact Side Panel */}
      {activeConv && (
        <ContactPanel
          contactId={activeConv.contactId}
          contactName={activeConv.contactName}
          contactEmail={activeConv.contactEmail}
          conversationId={activeConv.id}
        />
      )}

      {/* New Conversation Modal */}
      {showNew && (
        <div className="app-modal-overlay" style={styles.modalOverlay}>
          <div className="app-modal" style={styles.modal}>
            <h3 style={{ margin: '0 0 20px 0' }}>New Conversation</h3>
            <form onSubmit={handleCreateConversation}>
              <div style={styles.field}>
                <label style={styles.label}>Contact *</label>
                <select value={newContactId} onChange={(e) => setNewContactId(Number(e.target.value))}
                  style={styles.input} required>
                  <option value={0}>Select a contact...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email || c.phoneNumber || 'No info'})</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Inbox *</label>
                <select value={newInboxId} onChange={(e) => setNewInboxId(Number(e.target.value))}
                  style={styles.input} required>
                  <option value={0}>Select an inbox...</option>
                  {inboxes.map(i => <option key={i.id} value={i.id}>{i.name} ({i.channelType})</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Initial Message</label>
                <textarea value={newInitialMsg} onChange={(e) => setNewInitialMsg(e.target.value)}
                  style={{ ...styles.input, minHeight: '80px' }} placeholder="Type the first message..." />
              </div>
              <div className="app-modal-actions" style={styles.formActions}>
                <button type="button" onClick={() => setShowNew(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn} disabled={!newContactId || !newInboxId}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', height: 'calc(100vh - 110px)',
    backgroundColor: 'var(--surface)', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden',
  },
  // Sidebar
  sidebar: {
    width: '340px', borderRight: '1px solid var(--line)', display: 'flex',
    flexDirection: 'column', flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px', borderBottom: '1px solid var(--line)',
  },
  newBtn: {
    width: '32px', height: '32px', borderRadius: '50%', border: 'none',
    backgroundColor: 'var(--accent)', color: 'var(--surface)', fontSize: '18px', cursor: 'pointer',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 8px',
  },
  tab: {
    flex: 1, padding: '8px 4px', border: 'none', backgroundColor: 'transparent',
    cursor: 'pointer', fontSize: '12px', color: 'var(--ink-3)', borderBottom: '2px solid transparent',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '2px',
  },
  tabActive: {
    color: 'var(--accent)', borderBottom: '2px solid var(--accent)',
  },
  tabCount: { fontWeight: 700, fontSize: '14px' },
  filters: {
    display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: '1px solid var(--line)',
  },
  filterSelect: {
    flex: 1, padding: '4px 6px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '11px', color: '#555', cursor: 'pointer',
  },
  convList: { flex: 1, overflowY: 'auto' as const },
  convItem: {
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
  },
  convItemActive: { backgroundColor: '#eff6ff' },
  convItemHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '4px',
  },
  convContact: { fontWeight: 600, fontSize: '14px', color: 'var(--ink)' },
  convTime: { fontSize: '11px', color: 'var(--ink-4)' },
  convMeta: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' },
  convId: { fontSize: '12px', color: 'var(--accent)', fontWeight: 500 },
  convInbox: {
    fontSize: '11px', backgroundColor: 'var(--surface-3)', padding: '1px 6px',
    borderRadius: '4px', color: 'var(--ink-3)',
  },
  convAssignee: { fontSize: '11px', color: 'var(--ink-4)' },
  convPreview: {
    fontSize: '13px', color: 'var(--ink-3)', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  empty: { padding: '40px 16px', textAlign: 'center' as const, color: 'var(--ink-4)', fontSize: '14px' },

  // Chat Area
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  chatHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', borderBottom: '1px solid var(--line)',
  },
  chatContact: { fontWeight: 600, fontSize: '16px', color: 'var(--ink)' },
  chatId: { fontSize: '14px', color: 'var(--accent)' },
  chatEmail: { fontSize: '13px', color: 'var(--ink-4)' },
  chatActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  connectedBadge: {
    fontSize: '11px', color: 'var(--ok)', backgroundColor: '#ecfdf5',
    padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
  },
  labelBtn: {
    padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer', backgroundColor: 'var(--surface)', color: '#555',
  },
  labelDropdown: {
    position: 'absolute' as const, top: '100%', right: 0, marginTop: '4px',
    backgroundColor: 'var(--surface)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    width: '200px', zIndex: 100, maxHeight: '250px', overflowY: 'auto' as const,
  },
  labelOption: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
    cursor: 'pointer', fontSize: '13px',
  },
  labelDot: {
    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
  },
  assignSelect: {
    padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer', color: '#555', maxWidth: '120px',
  },
  statusSelect: {
    padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '4px',
    fontSize: '13px', cursor: 'pointer', fontWeight: 600,
  },
  csatBtn: {
    padding: '4px 10px', backgroundColor: 'var(--ok)', color: 'var(--surface)', border: 'none',
    borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  },
  noChat: {
    flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  error: {
    backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '8px 20px', fontSize: '13px',
  },

  // Messages
  messages: {
    flex: 1, overflowY: 'auto' as const, padding: '16px 20px',
    display: 'flex', flexDirection: 'column' as const, gap: '8px',
  },
  msgRow: { display: 'flex' },
  msgBubble: {
    maxWidth: '70%', padding: '8px 12px', borderRadius: '12px', fontSize: '14px',
  },
  msgOutgoing: { backgroundColor: 'var(--accent)', color: 'var(--surface)' },
  msgIncoming: { backgroundColor: 'var(--surface-3)', color: 'var(--ink)' },
  msgActivity: {
    backgroundColor: '#fef3c7', color: '#92400e', fontSize: '13px',
    fontStyle: 'italic' as const, maxWidth: '100%', textAlign: 'center' as const,
  },
  msgPrivate: { backgroundColor: '#fef9c3', color: '#713f12', border: '1px dashed var(--warn)' },
  msgSender: { fontSize: '11px', fontWeight: 600, marginBottom: '2px', opacity: 0.8 },
  msgContent: { lineHeight: '1.4' },
  msgTime: { fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' as const },
  privateBadge: {
    marginLeft: '6px', fontSize: '10px', backgroundColor: '#fbbf24',
    color: '#713f12', padding: '1px 4px', borderRadius: '3px',
  },

  // Typing indicator
  typingIndicator: {
    padding: '4px 20px', fontSize: '12px', color: 'var(--ink-4)', fontStyle: 'italic' as const,
  },

  // Compose
  compose: { borderTop: '1px solid var(--line)', padding: '12px 20px' },
  composeTop: { marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cannedHint: { fontSize: '11px', color: 'var(--ink-4)' },
  cannedDropdown: {
    position: 'absolute' as const, bottom: '100%', left: 0, right: 0,
    backgroundColor: 'var(--surface)', borderRadius: '8px 8px 0 0',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.12)', maxHeight: '200px',
    overflowY: 'auto' as const, zIndex: 50, marginBottom: '4px',
  },
  cannedItem: {
    display: 'flex', flexDirection: 'column' as const, padding: '8px 14px',
    cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
  },
  cannedItemActive: { backgroundColor: '#eff6ff' },
  cannedCode: {
    fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '2px',
  },
  cannedPreview: { fontSize: '13px', color: 'var(--ink-3)', lineHeight: '1.3' },
  privateLabel: { fontSize: '12px', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  composeRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
  attachBtn: {
    width: '44px', height: '44px', border: '1px solid var(--line)', borderRadius: '8px',
    backgroundColor: 'var(--surface)', fontSize: '20px', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  filePreview: {
    display: 'flex', gap: '8px', flexWrap: 'wrap' as const, padding: '8px 0',
    marginBottom: '4px',
  },
  filePreviewItem: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
    backgroundColor: 'var(--surface-3)', borderRadius: '6px', fontSize: '12px',
  },
  filePreviewThumb: {
    width: '32px', height: '32px', objectFit: 'cover' as const, borderRadius: '4px',
  },
  filePreviewIcon: { fontSize: '18px' },
  filePreviewName: {
    maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const, color: 'var(--ink)',
  },
  filePreviewSize: { color: 'var(--ink-4)', fontSize: '11px' },
  fileRemoveBtn: {
    width: '18px', height: '18px', borderRadius: '50%', border: 'none',
    backgroundColor: 'var(--danger)', color: 'var(--surface)', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, padding: 0,
  },
  attachmentList: {
    display: 'flex', flexDirection: 'column' as const, gap: '6px', marginTop: '6px',
  },
  attachmentItem: {},
  attachmentImage: {
    maxWidth: '240px', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer',
    display: 'block',
  },
  attachmentFile: {
    display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none',
    fontSize: '13px', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '6px',
  },
  attachmentIcon: { fontSize: '16px' },
  attachmentName: {
    maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  attachmentSize: { opacity: 0.7, fontSize: '11px' },
  composeInput: {
    flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px',
    fontSize: '14px', resize: 'none' as const, minHeight: '44px', maxHeight: '120px',
    fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '10px 20px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
    fontWeight: 500, alignSelf: 'flex-end',
  },

  // Modal
  modalOverlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '24px',
    width: '100%', maxWidth: '480px',
  },
  field: { marginBottom: '12px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid var(--line)',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const,
  },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'var(--surface)',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: 'var(--surface-3)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  // Interactive message styles
  interactiveMenu: {
    position: 'absolute' as const, bottom: '100%', left: 0, marginBottom: '6px',
    backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '220px', overflow: 'hidden', zIndex: 10,
  },
  interactiveMenuItem: {
    display: 'block', width: '100%', padding: '10px 12px', border: 'none',
    backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
    fontSize: '13px', fontWeight: 500, borderBottom: '1px solid var(--surface-3)',
  },
  interactiveBuilder: {
    backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px',
    marginBottom: '8px', overflow: 'hidden',
  },
  interactiveBuilderHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', backgroundColor: '#e0f2fe', borderBottom: '1px solid #bae6fd',
  },
  interactiveCloseBtn: {
    border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--ink-3)',
  },
  interactiveBuilderBody: {
    padding: '10px 12px', maxHeight: '250px', overflowY: 'auto' as const,
  },
  interactiveInput: {
    width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
    fontSize: '12px', boxSizing: 'border-box' as const, marginBottom: '6px',
  },
  interactiveAddBtn: {
    padding: '3px 8px', backgroundColor: 'transparent', border: '1px dashed #93c5fd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#2563eb', marginTop: '4px',
  },
  interactiveSection: {
    border: '1px solid var(--line)', borderRadius: '6px', padding: '8px',
    marginBottom: '8px', backgroundColor: 'var(--surface)',
  },
  // Interactive message display in chat
  interactiveMsg: {
    marginTop: '6px',
  },
  interactiveMsgHeader: {
    fontSize: '12px', fontWeight: 600, marginBottom: '4px', opacity: 0.8,
  },
  interactiveMsgFooter: {
    fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', fontStyle: 'italic' as const,
  },
  interactiveBtnGroup: {
    display: 'flex', flexDirection: 'column' as const, gap: '4px', marginTop: '8px',
  },
  interactiveBtnDisplay: {
    padding: '6px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: 500,
    textAlign: 'center' as const, cursor: 'default',
  },
  interactiveListGroup: {
    marginTop: '8px',
  },
  interactiveListBtn: {
    padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: 500,
    textAlign: 'center' as const, marginBottom: '6px', cursor: 'default',
  },
  interactiveListSectionTitle: {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: '6px',
    marginBottom: '3px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  interactiveListRow: {
    padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: '3px',
  },
};

export default ConversationsPage;
