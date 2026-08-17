import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { supabase } from '../../lib/supabaseClient';
import { markActionItemDone } from './meetingService';
import { useState } from 'react';

async function fetchMyMeetingsAndItems(staffId) {
  const { data: attendeeRows, error: attError } = await supabase
    .from('meeting_attendees')
    .select('meeting:staff_meetings(id, title, meeting_date, decisions)')
    .eq('staff_id', staffId);
  if (attError) throw attError;

  const { data: myItems, error: itemsError } = await supabase
    .from('meeting_action_items')
    .select('*, meeting:staff_meetings(title)')
    .eq('assigned_to', staffId)
    .eq('status', 'open');
  if (itemsError) throw itemsError;

  return {
    meetings: (attendeeRows ?? []).map((r) => r.meeting).filter(Boolean).sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date)),
    actionItems: myItems ?? [],
  };
}

export default function MyMeetingsWidget() {
  const { staffProfile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading } = useAsyncData(() => fetchMyMeetingsAndItems(staffProfile.id), [staffProfile.id, refreshKey]);

  if (loading || !data || (data.meetings.length === 0 && data.actionItems.length === 0)) return null;

  async function handleMarkDone(itemId) {
    await markActionItemDone(itemId);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="account-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="hk-section-title">Meetings &amp; Action Items</h3>

      {data.actionItems.length > 0 && (
        <>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>My Action Items</p>
          <ul className="detail-list" style={{ marginBottom: '1rem' }}>
            {data.actionItems.map((item) => (
              <li key={item.id}>
                <span>{item.description} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>({item.meeting?.title})</span></span>
                <button className="table-action-btn" onClick={() => handleMarkDone(item.id)}>Mark Done</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {data.meetings.length > 0 && (
        <>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Recent Meetings</p>
          <ul className="detail-list">
            {data.meetings.slice(0, 5).map((m) => (
              <li key={m.id}>
                <span>{m.title}</span>
                <span className="detail-list-date" style={{ marginRight: 0 }}>{m.meeting_date}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}