import InstallAppPrompt from './components/shared/InstallAppPrompt';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './modules/auth/Login';
import DashboardLayout from './components/shared/DashboardLayout';
import DashboardHome from './modules/dashboard/DashboardHome';
import RoomsPage from './modules/rooms/RoomsPage';
import ReservationsPage from './modules/reservations/ReservationsPage';
import FrontDeskPage from './modules/frontdesk/FrontDeskPage';
import HousekeepingPage from './modules/housekeeping/HousekeepingPage';
import StaffManagementPage from './modules/staff/StaffManagementPage';
import MaintenancePage from './modules/maintenance/MaintenancePage';
import InventoryPage from './modules/inventory/InventoryPage';
import ReportsPage from './modules/finance/ReportsPage';
import ExpensesPage from './modules/finance/ExpensesPage';
import AuditLogPage from './modules/admin/AuditLogPage';
import MyAccountPage from './modules/account/MyAccountPage';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
     <>
      <InstallAppPrompt />
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/rooms" element={<RoomsPage />} />
        {/* More module routes will be added here as we build them:
            /reservations, /front-desk, /housekeeping,
            /maintenance, /inventory, /payments, /reports,
            /staff, /admin, /audit-log */}
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/front-desk" element={<FrontDeskPage />} />
        <Route path="/housekeeping" element={<HousekeepingPage />} />
        <Route path="/staff" element={<StaffManagementPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/my-account" element={<MyAccountPage />} />
        
      </Route>
    </Routes>
    </>
  );
}