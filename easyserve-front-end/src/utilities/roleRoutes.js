// Landing route for each role, shared by the login redirect and RoleGuard so
// both always agree on where a user belongs.
const ROLE_HOME = {
  waiter: '/waiter',
  chef: '/chef',
  manager: '/manager',
  restaurant_owner: '/manager',
  user: '/profile',
};

export const getRoleHome = (role) => ROLE_HOME[role] || '/';
