import { useState } from 'react';
import { sendPushNotification } from '../../lib/pushService';
import { useAuth } from '../../context/AuthContext';
import { assignHousekeeper } from './housekeepingService';
import { sendTransactionalEmail } from '../../lib/emailService';
import { logActivity } from '../../lib/activityLog';
import './AssignHousekeeperControl.css';

const CAN_ASSIGN_ROLES = ['super_admin', 'general_manager', 'assistant_manager'];

export default function AssignHousekeeperControl({ room, housekeepers, onAssigned }) {
  const { role, staffProfile } = useAuth();
  const [assigning, setAssigning] = useState(false);

  if (!CAN_ASSIGN_ROLES.includes(role)) {
    return (
      <div className="hk-assign-wrapper">
        <span className="hk-assign-label-text">Assigned To</span>
        <div className="hk-assigned-label">
          {room.housekeeper_id
            ? housekeepers.find((h) => h.id === room.housekeeper_id)?.full_name ?? 'Assigned'
            : 'Unassigned'}
        </div>
      </div>
    );
  }

  async function handleChange(e) {
    const housekeeperId = e.target.value || null;
    setAssigning(true);
    try {
      await assignHousekeeper(room.id, housekeeperId);

      logActivity({
        actorId: staffProfile.id,
        action: 'housekeeper_assigned',
        entityTable: 'rooms',
        entityId: room.id,
        details: { room: room.room_number, housekeeper_id: housekeeperId },
      });

      if (housekeeperId) {
        sendPushNotification({
          staffId: housekeeperId,
          title: 'New Room Assignment',
          body: `Room ${room.room_number} has been assigned to you for cleaning.`,
          url: '/housekeeping',
          tag: `room-assign-${room.id}`,
        }).catch(() => {});
      }

      if (housekeeperId) {
        const housekeeper = housekeepers.find((h) => h.id === housekeeperId);
        if (housekeeper?.email) {
          sendTransactionalEmail({
            to: housekeeper.email,
            subject: `Room ${room.room_number} Assigned to You — Golden Apple`,
            html: `<div style="font-family:sans-serif;"><h2 style="color:#a3872b;">Golden Apple Guest House</h2><p>Hi ${housekeeper.full_name},</p><p>Room ${room.room_number} has been assigned to you for cleaning. Please attend to it when convenient.</p></div>`,
          }).catch((err) => console.error('Email failed (non-blocking):', err));
        }
      }

      onAssigned();
    } catch (err) {
      console.error('Failed to assign housekeeper:', err);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="hk-assign-wrapper">
      <span className="hk-assign-label-text">Assign Housekeeper</span>
      <select
        className="hk-assign-select"
        value={room.housekeeper_id ?? ''}
        onChange={handleChange}
        disabled={assigning}
      >
        <option value="">Unassigned</option>
        {housekeepers.map((h) => (
          <option key={h.id} value={h.id}>{h.full_name}</option>
        ))}
      </select>
    </div>
  );
}