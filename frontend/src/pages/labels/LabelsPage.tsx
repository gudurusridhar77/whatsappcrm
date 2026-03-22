import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { labelsApi, LabelResponse } from '../../api/labels';

const PRESET_COLORS = [
  '#1b72e8', '#059669', '#dc2626', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
];

const LabelsPage: React.FC = () => {
  const { currentAccountId } = useAuth();
  const [labels, setLabels] = useState<LabelResponse[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#1b72e8');
  const [showOnSidebar, setShowOnSidebar] = useState(true);

  const loadLabels = useCallback(async () => {
    if (!currentAccountId) return;
    try {
      const res = await labelsApi.getLabels(currentAccountId);
      setLabels(res.data);
    } catch {
      setError('Failed to load labels');
    }
  }, [currentAccountId]);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setColor('#1b72e8');
    setShowOnSidebar(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (label: LabelResponse) => {
    setTitle(label.title);
    setDescription(label.description || '');
    setColor(label.color);
    setShowOnSidebar(label.showOnSidebar);
    setEditingId(label.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId || !title.trim()) return;
    setError('');
    try {
      if (editingId) {
        await labelsApi.updateLabel(currentAccountId, editingId, {
          title: title.trim(),
          description: description.trim() || undefined,
          color,
          showOnSidebar,
        });
        setSuccess('Label updated');
      } else {
        await labelsApi.createLabel(currentAccountId, {
          title: title.trim(),
          description: description.trim() || undefined,
          color,
          showOnSidebar,
        });
        setSuccess('Label created');
      }
      resetForm();
      loadLabels();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save label');
    }
  };

  const handleDelete = async (labelId: number, labelTitle: string) => {
    if (!currentAccountId) return;
    if (!window.confirm(`Delete label "${labelTitle}"? It will be removed from all conversations.`)) return;
    try {
      await labelsApi.deleteLabel(currentAccountId, labelId);
      setSuccess('Label deleted');
      loadLabels();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete label');
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Labels</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>
          + New Label
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Create/Edit Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
            {editingId ? 'Edit Label' : 'Create Label'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  style={styles.input} placeholder="e.g. Bug, Feature, Urgent" required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  style={styles.input} placeholder="Optional description" />
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Color</label>
                <div style={styles.colorPicker}>
                  {PRESET_COLORS.map((c) => (
                    <div key={c} onClick={() => setColor(c)} style={{
                      ...styles.colorSwatch,
                      backgroundColor: c,
                      ...(color === c ? styles.colorSwatchActive : {}),
                    }} />
                  ))}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    style={styles.colorInput} title="Custom color" />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={showOnSidebar}
                    onChange={(e) => setShowOnSidebar(e.target.checked)} />
                  Show on sidebar
                </label>
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.primaryBtn}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Labels List */}
      <div style={styles.grid}>
        {labels.length === 0 ? (
          <div style={styles.empty}>No labels yet. Create one to organize your conversations.</div>
        ) : (
          labels.map((label) => (
            <div key={label.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={{ ...styles.dot, backgroundColor: label.color }} />
                  <span style={styles.cardName}>{label.title}</span>
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => handleEdit(label)} style={styles.iconBtn} title="Edit">
                    &#9998;
                  </button>
                  <button onClick={() => handleDelete(label.id, label.title)} style={styles.iconBtnDanger} title="Delete">
                    &#10005;
                  </button>
                </div>
              </div>
              {label.description && (
                <div style={styles.cardDesc}>{label.description}</div>
              )}
              <div style={styles.cardMeta}>
                <span style={styles.convCount}>
                  {label.conversationCount ?? 0} conversation{(label.conversationCount ?? 0) !== 1 ? 's' : ''}
                </span>
                {label.showOnSidebar && (
                  <span style={styles.sidebarBadge}>Sidebar</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px',
  },
  title: { margin: 0, fontSize: '22px', color: '#333' },
  addBtn: {
    padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
  },
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px 14px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  success: {
    backgroundColor: '#f0fdf4', color: '#16a34a', padding: '10px 14px',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
  },
  formCard: {
    backgroundColor: '#fff', borderRadius: '8px', padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
  },
  formRow: { display: 'flex', gap: '16px', marginBottom: '12px' },
  field: { flex: 1 },
  label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500, color: '#555' },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const,
  },
  colorPicker: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' as const },
  colorSwatch: {
    width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
    border: '2px solid transparent',
  },
  colorSwatchActive: { border: '2px solid #333', transform: 'scale(1.2)' },
  colorInput: { width: '28px', height: '28px', border: 'none', cursor: 'pointer', padding: 0 },
  checkLabel: { fontSize: '14px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '24px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#333',
    border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  empty: {
    padding: '40px', textAlign: 'center' as const, color: '#999', fontSize: '14px',
    gridColumn: '1 / -1',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '8px', padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px',
  },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  cardName: { fontSize: '15px', fontWeight: 600, color: '#333' },
  cardActions: { display: 'flex', gap: '4px' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    color: '#666', padding: '4px 6px', borderRadius: '4px',
  },
  iconBtnDanger: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    color: '#dc2626', padding: '4px 6px', borderRadius: '4px',
  },
  cardDesc: { fontSize: '13px', color: '#666', marginBottom: '8px' },
  cardMeta: { display: 'flex', gap: '8px', alignItems: 'center' },
  convCount: { fontSize: '12px', color: '#999' },
  sidebarBadge: {
    fontSize: '11px', backgroundColor: '#eff6ff', color: '#1b72e8',
    padding: '2px 6px', borderRadius: '4px',
  },
};

export default LabelsPage;
