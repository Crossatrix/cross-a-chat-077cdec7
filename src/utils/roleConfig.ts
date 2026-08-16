import { ShieldCheck, Shield, ShieldPlus, Crown, LucideIcon } from "lucide-react";

export type StaffRole = "moderator_lite" | "moderator" | "elder_moderator" | "admin";

export const ROLE_HIERARCHY: StaffRole[] = ["moderator_lite", "moderator", "elder_moderator", "admin"];

export const ROLE_CONFIG: Record<StaffRole, {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  badgeClass: string;
}> = {
  moderator_lite: {
    label: "Mod Lite",
    icon: ShieldCheck,
    colorClass: "text-sky-400",
    badgeClass: "bg-sky-500/20 text-sky-300",
  },
  moderator: {
    label: "Moderator",
    icon: Shield,
    colorClass: "text-blue-400",
    badgeClass: "bg-blue-500/20 text-blue-300",
  },
  elder_moderator: {
    label: "Elder Mod",
    icon: ShieldPlus,
    colorClass: "text-violet-400",
    badgeClass: "bg-violet-500/20 text-violet-300",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    colorClass: "text-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-300",
  },
};

export function getStaffRole(roles: { role: string }[]): StaffRole | null {
  for (const level of [...ROLE_HIERARCHY].reverse()) {
    if (roles.some(r => r.role === level)) return level;
  }
  return null;
}

export function isAtLeast(current: StaffRole | null, required: StaffRole): boolean {
  if (!current) return false;
  return ROLE_HIERARCHY.indexOf(current) >= ROLE_HIERARCHY.indexOf(required);
}

// Permission checks
export const CAN = {
  tempBan: (role: StaffRole | null) => isAtLeast(role, "moderator_lite"),
  readFeedback: (role: StaffRole | null) => isAtLeast(role, "moderator_lite"),
  markFeedbackImportant: (role: StaffRole | null) => isAtLeast(role, "moderator_lite"),
  seeErrors: (role: StaffRole | null) => isAtLeast(role, "moderator_lite"),
  permanentBan: (role: StaffRole | null) => isAtLeast(role, "moderator"),
  unban: (role: StaffRole | null) => isAtLeast(role, "moderator"),
  answerFeedback: (role: StaffRole | null) => isAtLeast(role, "moderator"),
  deleteFeedback: (role: StaffRole | null) => isAtLeast(role, "moderator"),
  seeReports: (role: StaffRole | null) => isAtLeast(role, "elder_moderator"),
  deleteReports: (role: StaffRole | null) => isAtLeast(role, "elder_moderator"),
  deleteErrors: (role: StaffRole | null) => isAtLeast(role, "elder_moderator"),
  manageEmojis: (role: StaffRole | null) => isAtLeast(role, "elder_moderator"),
  manageRoles: (role: StaffRole | null) => isAtLeast(role, "admin"),
  manageVersion: (role: StaffRole | null) => isAtLeast(role, "admin"),
  manageChangelog: (role: StaffRole | null) => isAtLeast(role, "admin"),
};
