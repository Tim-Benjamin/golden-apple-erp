import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchRooms, updateRoom } from './roomsService';
import RoomCard from './RoomCard';
import EditRoomModal from './EditRoomModal';
import { RoomCardSkeleton } from '../../components/shared/Skeleton';
import './RoomsPage.css';

const EDIT_ROLES = ['super_admin', 'general_manager', 'assistant_manager'];

export default function RoomsPage() {
  const { role } = useAuth();
  const canEdit = EDIT_ROLES.includes(role);

  const [refreshKey, setRefreshKey] = useState(0);
  const { data: rooms, loading, error } = useAsyncData(fetchRooms, [refreshKey]);

  const [editingRoom, setEditingRoom] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  async function handleSave(roomId, updates) {
    await updateRoom(roomId, updates);
    setRefreshKey((k) => k + 1);
  }

  const filteredRooms = rooms?.filter((r) => statusFilter === 'all' || r.status === statusFilter) ?? [];

  return (
    <div>
      <div className="rooms-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="page-subtitle">10 rooms · R1 – R10</p>
        </div>

        <select
          className="rooms-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="cleaning">Cleaning</option>
          <option value="out_of_service">Out of Service</option>
        </select>
      </div>

      {error && <p className="rooms-error">Failed to load rooms: {error.message}</p>}

      <div className="rooms-grid">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <RoomCardSkeleton key={i} />)
        ) : filteredRooms.length === 0 ? (
          <p className="rooms-empty">No rooms match this filter.</p>
        ) : (
          filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} canEdit={canEdit} onEdit={setEditingRoom} />
          ))
        )}
      </div>

      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}