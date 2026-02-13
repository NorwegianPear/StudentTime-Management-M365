// Microsoft Graph types for Student Access Management

export interface StudentUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  mail?: string;
  jobTitle?: string;
  department?: string;
  // Enriched fields (populated by API when available)
  groups?: GroupInfo[];           // groups this student belongs to
  suspension?: Suspension | null; // active suspension if any
  appliedPolicy?: string;        // name of the active policy applying to them
}

export interface GroupInfo {
  id: string;
  displayName: string;
  description?: string;
  memberCount?: number;
  policyId?: string;       // which schedule policy applies to this group
  policyName?: string;     // display name of that policy
}

export interface AccessSchedule {
  id: string;
  name: string;
  enableTime: string; // HH:mm format
  disableTime: string; // HH:mm format
  daysOfWeek: string[];
  isActive: boolean;
  groupId?: string;
}

// ─── Schedule Policies (Logon Hours) ─────────────────────────────────────

export interface SchedulePolicy {
  id: string;
  name: string;
  description: string;
  enableTime: string;   // HH:mm — when students get enabled
  disableTime: string;  // HH:mm — when students get disabled
  daysOfWeek: string[]; // e.g. ["Monday","Tuesday",...]
  timezone: string;     // e.g. "W. Europe Standard Time"
  isActive: boolean;
  assignedGroupIds: string[];   // which student groups this policy applies to
  assignedGroupNames: string[]; // display names for UI
  createdAt: string;    // ISO date
  createdBy: string;    // UPN of who created it
  updatedAt: string;    // ISO date
}

export interface CreatePolicyRequest {
  name: string;
  description: string;
  enableTime: string;
  disableTime: string;
  daysOfWeek: string[];
  timezone?: string;
}

export interface AssignPolicyRequest {
  groupIds: string[];
}

// ─── Suspensions ─────────────────────────────────────────────────────────

export interface Suspension {
  id: string;
  studentId: string;
  studentName: string;
  studentUPN: string;
  reason: string;
  startDate: string;    // ISO date
  endDate: string;      // ISO date — auto-re-enable after this
  createdBy: string;    // UPN of who suspended
  createdAt: string;    // ISO date
  isActive: boolean;    // false once processed (expired or manually lifted)
}

export interface SuspendRequest {
  reason: string;
  endDate: string;      // ISO date
}

// ─── Student Operations ──────────────────────────────────────────────────

export interface TransferRequest {
  fromGroupId: string;
  toGroupId: string;
}

export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  groupId: string;      // which class to add to
  department?: string;
}

export interface BulkPromoteRequest {
  /** Map of source group ID → destination group ID */
  promotions: { fromGroupId: string; toGroupId: string }[];
}

// ─── Special Groups (Override Groups) ─────────────────────────────────────

export interface SpecialGroup {
  id: string;
  groupId: string;          // Entra ID group object ID
  groupName: string;        // display name e.g. "After-School Program"
  description: string;
  policyId: string;         // which schedule policy overrides for these students
  policyName: string;       // display name
  priority: number;         // higher = takes precedence (special groups should be > 0)
  memberCount: number;
  createdAt: string;
  createdBy: string;
}

export interface CreateSpecialGroupRequest {
  groupId: string;
  description: string;
  policyId: string;
  priority?: number;
}

// ─── Group Membership Changes (for automation) ───────────────────────────

export interface PendingGroupChange {
  id: string;
  studentId: string;
  studentName: string;
  action: "add" | "remove";
  groupId: string;
  groupName: string;
  reason: string;           // "class_transfer" | "special_group" | "manual"
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "completed" | "failed";
  completedAt?: string;
  error?: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────

export interface StudentFilter {
  search?: string;
  status?: "all" | "enabled" | "disabled" | "suspended";
  groupId?: string;
  policyId?: string;
  specialGroupId?: string;
  hasOverride?: boolean;    // true = only students in special/override groups
}

// ─── Dashboard & Audit ───────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number;
  enabledStudents: number;
  disabledStudents: number;
  suspendedStudents?: number;
  lastEnableRun?: string;
  lastDisableRun?: string;
  groups: GroupInfo[];
  activePolicies?: number;
  specialGroups?: number;
  pendingChanges?: number;
}

export interface AuditLogEntry {
  id: string;
  action:
    | "enable" | "disable" | "manual_toggle"
    | "policy_created" | "policy_deleted" | "policy_assigned" | "policy_updated"
    | "student_suspended" | "student_unsuspended"
    | "student_transferred" | "student_created" | "student_removed"
    | "bulk_promote"
    | "special_group_added" | "special_group_removed"
    | "group_membership_changed";
  targetUser?: string;
  targetGroup?: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Staff / User Administration ─────────────────────────────────────────

export type StaffRole = "Teacher" | "IT-Staff" | "Administrative" | "Principal" | "Other";

export interface StaffUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  accountEnabled: boolean;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  assignedLicenses?: LicenseAssignment[];
  createdDateTime?: string;
}

export interface LicenseAssignment {
  skuId: string;
  skuPartNumber?: string;
  displayName?: string;
  disabledPlans?: string[];
}

export interface AvailableLicense {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  consumedUnits: number;
  prepaidUnitsEnabled: number;
  availableUnits: number;
}

export interface OnboardStaffRequest {
  firstName: string;
  lastName: string;
  role: StaffRole;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  licenseSkuIds: string[];   // licenses to auto-assign
  groupIds?: string[];       // optional groups to add to
}

export interface OffboardStaffRequest {
  userId: string;
  removeLicenses: boolean;       // unassign all licenses
  disableAccount: boolean;        // disable sign-in
  revokeSessions: boolean;        // revoke all refresh tokens
  removeFromGroups: boolean;      // remove from all groups
  convertToSharedMailbox: boolean; // convert mailbox to shared
  forwardEmail?: string;           // set email forwarding to this address
  offboardReason: string;          // why they are leaving
}
