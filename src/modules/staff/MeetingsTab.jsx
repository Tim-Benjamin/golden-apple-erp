import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchMeetings } from './meetingService';
import { TableRowSkeleton } from '../../components/shared/Skeleton';
import NewMeetingModal from './NewMeetingModal';
import MeetingDetailModal from './MeetingDetailModal';

const TYPE_LABELS = {
  management: 'Management',
  weekly_staff: 'Weekly Staff',
  department: 'Department',
  training: 'Training',
};

export default function MeetingsTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: meetings, loading } = useAsyncData(fetchMeetings, [refreshKey]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  return (
    <div>
      <div className="page-header-row">
        <div />
        <button className="primary-btn" onClick={() => setShowNewModal(true)}>+ New Meeting</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Date</th>
              <th>Recorded By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
            ) : meetings?.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No meetings recorded yet.</td></tr>
            ) : (
              meetings?.map((m) => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{TYPE_LABELS[m.meeting_type]}</td>
                  <td>{m.meeting_date}</td>
                  <td>{m.creator?.full_name ?? '—'}</td>
                  <td>
                    <button className="table-action-btn" onClick={() => setSelectedMeetingId(m.id)}>View / Manage</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <NewMeetingModal onClose={() => setShowNewModal(false)} onCreated={() => setRefreshKey((k) => k + 1)} />
      )}

      {selectedMeetingId && (
        <MeetingDetailModal
          meetingId={selectedMeetingId}
          onClose={() => setSelectedMeetingId(null)}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}