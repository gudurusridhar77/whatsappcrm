// ContactsPage.mobile.tsx
// Mobile presentation for the Contacts page.
// Receives data + handlers as props from ContactsPage.tsx.
// Layout: header, search, card list of contacts, with bottom sheets for create/edit + import.

import React from 'react';
import { Contact, ContactRequest, ContactImportResult } from '../../api/contacts';

export interface MobileProps {
  contacts: Contact[];
  page: number; setPage: (n: number | ((p: number) => number)) => void;
  totalPages: number;
  search: string; setSearch: (s: string) => void;
  error: string;

  // Form
  showForm: boolean; setShowForm: (b: boolean) => void;
  editingId: number | null; setEditingId: (n: number | null) => void;
  form: ContactRequest; setForm: (f: ContactRequest) => void;
  emptyForm: ContactRequest;
  onSubmit: (e: React.FormEvent) => void;

  // Import
  showImport: boolean; setShowImport: (b: boolean) => void;
  importFile: File | null; setImportFile: (f: File | null) => void;
  importing: boolean;
  importResult: ContactImportResult | null;
  setImportResult: (r: ContactImportResult | null) => void;
  onImport: () => void;

  onDelete: (id: number) => void;
}

const ContactsPageMobile: React.FC<MobileProps> = (p) => {
  const handleEdit = (c: Contact) => {
    p.setForm({
      name: c.name,
      email: c.email || '',
      phoneNumber: c.phoneNumber || '',
      company: c.company || '',
      description: c.description || '',
    });
    p.setEditingId(c.id);
    p.setShowForm(true);
  };

  const openNew = () => {
    p.setForm(p.emptyForm);
    p.setEditingId(null);
    p.setShowForm(true);
  };

  const openImport = () => {
    p.setImportFile(null);
    p.setImportResult(null);
    p.setShowImport(true);
  };

  return (
    <div style={s.shell}>
      <div style={s.headerRow}>
        <h2 style={s.title}>Contacts</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={openImport} style={s.secondaryPill} aria-label="Import CSV">
            <SvgUpload /> CSV
          </button>
          <button onClick={openNew} style={s.primaryPill} aria-label="New contact">
            <SvgPlus /> New
          </button>
        </div>
      </div>

      <input
        type="search"
        value={p.search}
        onChange={e => { p.setSearch(e.target.value); p.setPage(0); }}
        placeholder="Search name, email, or phone…"
        style={s.search}
      />

      {p.error && <div style={s.error}>{p.error}</div>}

      {p.contacts.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
          <div style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 15 }}>
            {p.search ? 'No contacts match your search' : 'No contacts yet'}
          </div>
          {!p.search && (
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
              Tap “New” to create your first contact
            </div>
          )}
        </div>
      ) : (
        <div style={s.list}>
          {p.contacts.map(c => (
            <ContactCard key={c.id} c={c} onEdit={handleEdit} onDelete={p.onDelete} />
          ))}
        </div>
      )}

      {p.totalPages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => p.setPage((x: number) => Math.max(0, x - 1))}
            disabled={p.page === 0} style={s.pageBtn}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {p.page + 1} / {p.totalPages}
          </span>
          <button onClick={() => p.setPage((x: number) => Math.min(p.totalPages - 1, x + 1))}
            disabled={p.page >= p.totalPages - 1} style={s.pageBtn}>Next →</button>
        </div>
      )}

      {p.showForm && <FormSheet {...p} />}
      {p.showImport && <ImportSheet {...p} />}
    </div>
  );
};

export default ContactsPageMobile;

// ──────────────────────────────────────────────────────────────
// CONTACT CARD
// ──────────────────────────────────────────────────────────────

const ContactCard: React.FC<{
  c: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: number) => void;
}> = ({ c, onEdit, onDelete }) => (
  <div style={s.card}>
    <div style={s.cardTop}>
      <Avatar name={c.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.name}>{c.name}</div>
        {c.company && <div style={s.company}>{c.company}</div>}
      </div>
    </div>

    {(c.email || c.phoneNumber) && (
      <div style={s.detailList}>
        {c.email && (
          <a href={`mailto:${c.email}`} style={s.detailRow}>
            <SvgMail /> <span style={s.detailVal}>{c.email}</span>
          </a>
        )}
        {c.phoneNumber && (
          <a href={`tel:${c.phoneNumber}`} style={s.detailRow}>
            <SvgPhone /> <span style={s.detailVal}>{c.phoneNumber}</span>
          </a>
        )}
      </div>
    )}

    <div style={s.cardActions}>
      <button onClick={() => onEdit(c)} style={s.actionBtn}>Edit</button>
      <button onClick={() => onDelete(c.id)} style={{ ...s.actionBtn, ...s.actionDanger }}>Delete</button>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────
// FORM SHEET (create / edit)
// ──────────────────────────────────────────────────────────────

const FormSheet: React.FC<MobileProps> = (p) => {
  const close = () => {
    p.setShowForm(false);
    p.setEditingId(null);
    p.setForm(p.emptyForm);
  };
  return (
    <Sheet title={p.editingId ? 'Edit contact' : 'New contact'} onClose={close}
      footer={
        <>
          <button type="button" onClick={close} style={s.btnSecondary}>Cancel</button>
          <button type="submit" form="mobile-contact-form"
            disabled={!p.form.name.trim()}
            style={{ ...s.btnPrimary, ...(p.form.name.trim() ? {} : { opacity: 0.5 }) }}>
            {p.editingId ? 'Save' : 'Create'}
          </button>
        </>
      }>
      <form id="mobile-contact-form" onSubmit={p.onSubmit}>
        <Group title="Name *">
          <input type="text" value={p.form.name}
            onChange={e => p.setForm({ ...p.form, name: e.target.value })}
            placeholder="Jane Doe" style={s.input} required autoFocus />
        </Group>
        <Group title="Email">
          <input type="email" value={p.form.email || ''}
            onChange={e => p.setForm({ ...p.form, email: e.target.value })}
            placeholder="jane@company.com" style={s.input}
            autoCapitalize="none" autoCorrect="off" />
        </Group>
        <Group title="Phone">
          <input type="tel" value={p.form.phoneNumber || ''}
            onChange={e => p.setForm({ ...p.form, phoneNumber: e.target.value })}
            placeholder="+1 555 0100" style={s.input} />
        </Group>
        <Group title="Company">
          <input type="text" value={p.form.company || ''}
            onChange={e => p.setForm({ ...p.form, company: e.target.value })}
            placeholder="Acme Inc." style={s.input} />
        </Group>
        <Group title="Notes">
          <textarea value={p.form.description || ''}
            onChange={e => p.setForm({ ...p.form, description: e.target.value })}
            rows={4} style={{ ...s.input, height: 'auto', padding: 12, resize: 'none' }}
            placeholder="Anything worth remembering…" />
        </Group>
      </form>
    </Sheet>
  );
};

// ──────────────────────────────────────────────────────────────
// IMPORT CSV SHEET
// ──────────────────────────────────────────────────────────────

const ImportSheet: React.FC<MobileProps> = (p) => {
  const close = () => p.setShowImport(false);
  return (
    <Sheet title="Import from CSV" onClose={close}
      footer={
        <>
          <button type="button" onClick={close} style={s.btnSecondary}>
            {p.importResult ? 'Close' : 'Cancel'}
          </button>
          {!p.importResult && (
            <button type="button" onClick={p.onImport}
              disabled={!p.importFile || p.importing}
              style={{ ...s.btnPrimary, ...(p.importFile && !p.importing ? {} : { opacity: 0.5 }) }}>
              {p.importing ? 'Importing…' : 'Import'}
            </button>
          )}
        </>
      }>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 0 }}>
        Upload a CSV with columns: <strong>name</strong>, <strong>email</strong>,{' '}
        <strong>phone</strong> (or phone_number / mobile / whatsapp), <strong>company</strong>,{' '}
        <strong>description</strong>.
      </p>

      <label style={s.fileDrop}>
        <input type="file" accept=".csv"
          onChange={e => p.setImportFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }} />
        <SvgUpload />
        <span style={{ marginTop: 8, fontWeight: 600, color: 'var(--ink-2)' }}>
          {p.importFile ? p.importFile.name : 'Tap to choose CSV'}
        </span>
        {p.importFile && (
          <span style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-4)' }}>
            {(p.importFile.size / 1024).toFixed(1)} KB
          </span>
        )}
      </label>

      {p.importResult && (
        <div style={{
          background: p.importResult.failed > 0 ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${p.importResult.failed > 0 ? '#fde68a' : '#86efac'}`,
          borderRadius: 10, padding: 12, marginTop: 16, fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Results</div>
          <div>Total rows: {p.importResult.totalRows}</div>
          <div style={{ color: 'var(--ok)' }}>Imported: {p.importResult.imported}</div>
          <div style={{ color: 'var(--warn)' }}>Skipped (duplicates): {p.importResult.skipped}</div>
          <div style={{ color: 'var(--danger)' }}>Failed: {p.importResult.failed}</div>
          {p.importResult.errors.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto', fontSize: 12, color: 'var(--danger)' }}>
              {p.importResult.errors.map((err, i) => <div key={i}>{err}</div>)}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
};

// ──────────────────────────────────────────────────────────────
// ATOMS
// ──────────────────────────────────────────────────────────────

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
  <div style={{ marginBottom: 14 }}>
    <label style={s.groupLabel}>{title}</label>
    {children}
  </div>
);

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const palette: [string, string][] = [
    ['#eef2ff', '#4f46e5'], ['#fef3c7', '#b45309'],
    ['#dcfce7', '#16a34a'], ['#fce7f3', '#be185d'],
    ['#e0f2fe', '#0369a1'], ['#fee2e2', '#b91c1c'],
  ];
  const seed = (name || '?').charCodeAt(0) + (name || '').length;
  const idx = seed % palette.length;
  const [bg, fg] = palette[idx];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', background: bg, color: fg,
      display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
};

// SVG icons
const SvgPlus = () => <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;
const SvgUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SvgMail = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.6"/></svg>;
const SvgPhone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 4h3l2 5-2 1a12 12 0 006 6l1-2 5 2v3a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: { position: 'relative' },

  headerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, gap: 8,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' },

  primaryPill: {
    height: 36, padding: '0 12px', borderRadius: 999, border: 0,
    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  secondaryPill: {
    height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },

  search: {
    width: '100%', height: 44, padding: '0 14px',
    border: '1px solid var(--line)', borderRadius: 12,
    background: 'var(--surface)', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', marginBottom: 14,
  },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    background: 'var(--surface)', borderRadius: 12, padding: 14,
    border: '1px solid var(--line)', boxShadow: 'var(--sh-1)',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12 },
  name: { fontWeight: 600, fontSize: 15, color: 'var(--ink)' },
  company: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 },

  detailList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 },
  detailRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none',
  },
  detailVal: {
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1,
  },

  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, height: 40, borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  actionDanger: { color: 'var(--danger)', borderColor: '#fecaca' },

  empty: { textAlign: 'center', padding: '60px 24px', color: 'var(--ink-4)' },

  error: {
    background: '#fef2f2', color: 'var(--danger)', padding: '8px 12px',
    borderRadius: 8, marginBottom: 12, fontSize: 13,
  },

  pagination: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, padding: '0 4px',
  },
  pageBtn: {
    height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  // Sheet
  sheetOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,22,28,0.5)', zIndex: 100,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', maxHeight: '92dvh',
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

  fileDrop: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: '100%', minHeight: 110, padding: 16, marginTop: 4,
    border: '2px dashed var(--line)', borderRadius: 12, background: 'var(--surface-2)',
    color: 'var(--ink-3)', cursor: 'pointer', textAlign: 'center',
  },
};
