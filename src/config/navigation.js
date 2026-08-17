// Each item: label, path, icon (emoji placeholder for now — swap for real icons later)
// roles: which user_role values can see this item. 'all' = every authenticated role.

export const navigationConfig = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: '🏠', roles: 'all' },
    ],
  },
  {
    section: 'Front Desk',
    items: [
      { label: 'Reservations', path: '/reservations', icon: '📅', roles: ['super_admin', 'general_manager', 'assistant_manager', 'front_desk'] },
      { label: 'Check In / Check Out', path: '/front-desk', icon: '🔑', roles: ['super_admin', 'general_manager', 'assistant_manager', 'front_desk'] },
      { label: 'Rooms', path: '/rooms', icon: '🛏️', roles: ['super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'housekeeper', 'maintenance_officer'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Housekeeping', path: '/housekeeping', icon: '🧹', roles: ['super_admin', 'general_manager', 'housekeeper'] },
      { label: 'Maintenance', path: '/maintenance', icon: '🔧', roles: ['super_admin', 'general_manager', 'maintenance_officer'] },
      { label: 'Inventory', path: '/inventory', icon: '📦', roles: ['super_admin', 'general_manager', 'store_manager'] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Payments', path: '/payments', icon: '💳', roles: ['super_admin', 'general_manager', 'accountant', 'front_desk'] },
      { label: 'Reports', path: '/reports', icon: '📊', roles: ['super_admin', 'general_manager', 'accountant', 'auditor'] },
      { label: 'Expenses', path: '/expenses', icon: '💸', roles: ['super_admin', 'general_manager', 'accountant'] },
    ],
  },
  {
    section: 'People',
    items: [
      { label: 'Staff Management', path: '/staff', icon: '👥', roles: ['super_admin', 'general_manager', 'hr'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Settings', path: '/admin', icon: '⚙️', roles: ['super_admin'] },
      { label: 'Audit Log', path: '/audit-log', icon: '📜', roles: ['super_admin', 'auditor'] },
    ],
  },

  {
    section: 'Account',
    items: [
      { label: 'My Account', path: '/my-account', icon: '👤', roles: 'all' },
    ],
  },
];

export function getVisibleNavigation(role) {
  return navigationConfig
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.roles === 'all' || item.roles.includes(role)
      ),
    }))
    .filter((section) => section.items.length > 0);
}