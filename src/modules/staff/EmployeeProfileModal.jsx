import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchEmployeeProfile } from './employeeProfileService';
import PersonalProfileForm from './PersonalProfileForm';
import { ROLE_LABELS } from '../../config/roles';
import './EmployeeProfileModal.css';

const CAN_EDIT_OTHERS_ROLES = ['super_admin', 'hr'];

export default function EmployeeProfileModal({ staffId, onClose, onUpdated }) {
  const { staffProfile, role } = useAuth();
  const { data: employee, loading } = useAsyncData(() => fetchEmployeeProfile(staffId), [staffId]);

  const isSelf = staffId === staffProfile?.id;
  const canEdit = isSelf || CAN_EDIT_OTHERS_ROLES.includes(role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Employee Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading || !employee ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        ) : (
          <>
            <div className="employee-profile-header">
              <h3>{employee.full_name}</h3>
              <span className="employee-profile-role table-capitalize">
                {ROLE_LABELS[employee.role] ?? employee.role.replace('_', ' ')}
              </span>
              <span className={employee.is_active ? 'staff-status-active' : 'staff-status-inactive'}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {employee.email}
            </p>

            <PersonalProfileForm
              staff={employee}
              currentActorId={staffProfile.id}
              editable={canEdit}
              onSaved={onUpdated}
            />
          </>
        )}
      </div>
    </div>
  );
}