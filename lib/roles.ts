/**
 * Role helpers — pure, no server/NextAuth imports so this is safe to use in
 * both client components and server code.
 *
 * Role levels (from the `role` collection):
 *   1 = Member
 *   2 = Team Leader of Sub Department
 *   3 = Leader of Department (admin-level access)
 */

export const ROLE_LEVELS = {
  MEMBER: 1,
  SUB_DEPT_LEADER: 2,
  DEPT_LEADER: 3,
} as const

/**
 * Where a user lands after a successful login, based on their role level.
 */
export function roleHomePath(roleLevel?: number): string {
  switch (roleLevel) {
    case ROLE_LEVELS.DEPT_LEADER:
    case ROLE_LEVELS.SUB_DEPT_LEADER:
      return '/admin'
    case ROLE_LEVELS.MEMBER:
    default:
      return '/dashboard'
  }
}

/** Role level 2 and 3 have admin-level (oversight) access. */
export function isAdminLevel(roleLevel?: number): boolean {
  return roleLevel === ROLE_LEVELS.DEPT_LEADER ||
    roleLevel === ROLE_LEVELS.SUB_DEPT_LEADER
}
