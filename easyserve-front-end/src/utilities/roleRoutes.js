// Landing route for each role, shared by the login redirect, RoleGuard and
// the header so they always agree on where a user belongs.
const ROLE_HOME = {
  waiter: '/waiter',
  chef: '/chef',
  manager: '/manager',
  restaurant_owner: '/manager',
  super_admin: '/super-admin',
  user: '/profile',
};

export const MANAGER_ROLES = ['manager', 'restaurant_owner', 'super_admin'];
export const STAFF_ROLES = [...MANAGER_ROLES, 'waiter', 'chef'];

// Which roles may open each staff area. Paths not listed here are public or
// guarded per page.
const AREA_ROLES = [
  ['/super-admin', ['super_admin']],
  ['/manager', MANAGER_ROLES],
  ['/waiter', ['waiter']],
  ['/chef', ['chef']],
  ['/admin', STAFF_ROLES],
];

export const getRoleHome = (role) => ROLE_HOME[role] || '/';

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

// True when `role` may open `path` (query string and hash are ignored).
export const canRoleOpen = (role, path = '') => {
  const pathname = String(path).split(/[?#]/)[0];
  const area = AREA_ROLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return !area || area[1].includes(role);
};

// Login URL that brings the user back to `path` after signing in. `reason`
// lets the login page say why the user was sent there.
export const loginUrlFor = (path, reason) => {
  const params = new URLSearchParams();
  if (path && !path.startsWith('/auth/')) params.set('next', path);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `/auth/login?${query}` : '/auth/login';
};
