import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contactsApi, Contact, ContactRequest, ContactImportResult } from '../../api/contacts';

const emptyForm: ContactRequest = { name: '', email: '', phoneNumber: '', company: '', description: '' };

const ContactsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactRequest>(emptyForm);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ContactImportResult | null>(null);

  const loadContacts = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await contactsApi.getContacts(currentAccountId, page, 20, search);
      setContacts(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch {
      setError('Failed to load contacts');
    }
  }, [currentAccountId, page, search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    setError('');
    try {
      if (editingId) {
        await contactsApi.updateContact(currentAccountId, editingId, form);
      } else {
        await contactsApi.createContact(currentAccountId, form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save contact');
    }
  };

  const handleEdit = (contact: Contact) => {
    setForm({
      name: contact.name,
      email: contact.email || '',
      phoneNumber: contact.phoneNumber || '',
      company: contact.company || '',
      description: contact.description || '',
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!currentAccountId || !window.confirm('Delete this contact?')) return;
    try {
      await contactsApi.deleteContact(currentAccountId, id);
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete contact');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleImport = async () => {
    if (!currentAccountId || !importFile) return;
    setImporting(true); setError(''); setImportResult(null);
    try {
      const res = await contactsApi.importContacts(currentAccountId, importFile);
      setImportResult(res.data);
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  return (
    <div style={styles.container}>
      {/* Header bar */}
      <div style={styles.header}>
        <h2 style={styles.title}>Contacts</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setShowImport(true); setImportFile(null); setImportResult(null); }}
            style={styles.cancelBtn}>
            Import CSV
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} style={styles.primaryBtn}>
            + New Contact
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={styles.searchInput}
        />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Import CSV Modal */}
      {showImport && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 16px 0' }}>Import Contacts from CSV</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
              Upload a CSV file with columns: <strong>name</strong>, <strong>email</strong>, <strong>phone</strong> (or phone_number/mobile/whatsapp), <strong>company</strong>, <strong>description</strong>
            </p>
            <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)}
              style={{ marginBottom: '16px', fontSize: '14px' }} />

            {importResult && (
              <div style={{
                backgroundColor: importResult.failed > 0 ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${importResult.failed > 0 ? '#fde68a' : '#86efac'}`,
                borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Import Results</div>
                <div>Total rows: {importResult.totalRows}</div>
                <div style={{ color: '#059669' }}>Imported: {importResult.imported}</div>
                <div style={{ color: '#d97706' }}>Skipped (duplicates): {importResult.skipped}</div>
                <div style={{ color: '#dc2626' }}>Failed: {importResult.failed}</div>
                {importResult.errors.length > 0 && (
                  <div style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px', color: '#dc2626' }}>
                    {importResult.errors.map((err, i) => <div key={i}>{err}</div>)}
                  </div>
                )}
              </div>
            )}

            <div style={styles.formActions}>
              <button type="button" onClick={() => setShowImport(false)} style={styles.cancelBtn}>
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button onClick={handleImport} disabled={!importFile || importing}
                  style={{ ...styles.primaryBtn, opacity: !importFile || importing ? 0.6 : 1 }}>
                  {importing ? 'Importing...' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingId ? 'Edit Contact' : 'New Contact'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={styles.input} required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="text" value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Company</label>
                  <input
                    type="text" value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                />
              </div>
              <div style={styles.formActions}>
                <button type="button" onClick={handleCancel} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Company</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#999', padding: '40px' }}>
                {search ? 'No contacts found' : 'No contacts yet. Create your first contact!'}
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <tr key={contact.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 500 }}>{contact.name}</div>
                </td>
                <td style={styles.td}>{contact.email || '-'}</td>
                <td style={styles.td}>{contact.phoneNumber || '-'}</td>
                <td style={styles.td}>{contact.company || '-'}</td>
                <td style={styles.td}>{new Date(contact.createdAt).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button onClick={() => handleEdit(contact)} style={styles.actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(contact.id)}
                    style={{ ...styles.actionBtn, color: '#dc2626' }}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={styles.pageBtn}
          >
            Previous
          </button>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px',
  },
  title: { margin: 0, fontSize: '18px', color: '#333' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#333',
    border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  searchBar: { marginBottom: '16px' },
  searchInput: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const,
  },
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px',
    borderRadius: '4px', marginBottom: '16px', fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '8px', padding: '24px',
    width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' as const,
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
  },
  field: { marginBottom: '12px' },
  label: {
    display: 'block', marginBottom: '4px', fontSize: '13px',
    fontWeight: 500, color: '#555',
  },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const,
  },
  formActions: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const, padding: '12px 8px', borderBottom: '2px solid #eee',
    fontSize: '13px', color: '#666', textTransform: 'uppercase' as const,
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 8px', fontSize: '14px' },
  actionBtn: {
    padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px',
    color: '#333',
  },
  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '12px', marginTop: '20px',
  },
  pageBtn: {
    padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px',
    backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px',
  },
};

export default ContactsPage;
