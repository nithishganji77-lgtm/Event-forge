export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  ORGANIZER: 'ORGANIZER',
  EMPLOYEE: 'EMPLOYEE',
});

export const ROLE_VALUES = Object.values(ROLES);

export const MEMBER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  INVITED: 'INVITED',
});

export const MEMBER_STATUS_VALUES = Object.values(MEMBER_STATUS);
