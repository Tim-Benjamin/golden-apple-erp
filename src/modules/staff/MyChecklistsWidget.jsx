import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchTemplatesForRole, fetchOrCreateTodayCompletion, toggleChecklistItem } from './checklistService';

export default function MyChecklistsWidget() {
  const { staffProfile, role } = useAuth();
  const { data: templates, loading } = useAsyncData(() => fetchTemplatesForRole(role), [role]);

  if (loading || !templates || templates.length === 0) return null;

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">My Checklists — Today</h3>
      {templates.map((template) => (
        <ChecklistCard key={template.id} template={template} staffId={staffProfile.id} />
      ))}
    </div>
  );
}

function ChecklistCard({ template, staffId }) {
  const [completion, setCompletion] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchOrCreateTodayCompletion(template.id, staffId).then(setCompletion);
  }, [template.id, staffId]);

  if (!completion) return null;

  const checkedItems = completion.checked_items?.length === template.items.length
    ? completion.checked_items
    : template.items.map(() => false);

  async function handleToggle(index) {
    const updated = [...checkedItems];
    updated[index] = !updated[index];
    setBusy(true);
    try {
      const result = await toggleChecklistItem(completion.id, updated, template.items.length, staffId);
      setCompletion(result);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  const checkedCount = checkedItems.filter(Boolean).length;

  return (
    <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{template.title}</strong>
        {completion.completed ? (
          <span style={{ color: 'var(--color-success)', fontSize: '0.78rem' }}>✓ Completed</span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{checkedCount}/{template.items.length}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {template.items.map((item, i) => (
          <label key={i} className="checklist-item" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            <input type="checkbox" checked={checkedItems[i] ?? false} disabled={busy} onChange={() => handleToggle(i)} />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}