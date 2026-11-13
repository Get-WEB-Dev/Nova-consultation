/**
 * Who may do what in the admin portal.
 *
 * - Every admin may READ most things.
 * - Writes are protected by a permission. A write endpoint that is not listed
 *   below is allowed for SUPER ADMINS ONLY (deny by default), so a new admin
 *   feature is never accidentally open to everyone.
 * - Admins created before permissions existed have ['all'] and keep working.
 *
 * No server imports here: the Admins page uses the same list to show the options.
 */

export const PERMISSIONS = [
    'users.manage', 'doctors.verify', 'consultations.manage', 'reviews.moderate', 'content.manage',
    'support.manage', 'pii.reveal', 'reports.view', 'audit.view', 'data.export', 'privacy.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
    'users.manage': 'Change roles, suspend, delete and notify users',
    'doctors.verify': 'Approve, reject and publish doctors; open license documents',
    'consultations.manage': 'Cancel stuck consultations',
    'reviews.moderate': 'Hide or delete reviews',
    'content.manage': 'Hide or delete blog posts',
    'support.manage': 'Handle contact messages',
    'pii.reveal': 'Open medical and clinical information (with a recorded reason)',
    'reports.view': 'View reports',
    'audit.view': 'View the activity log',
    'data.export': 'Download CSV exports',
    'privacy.manage': 'Handle data requests (access, deletion, correction)',
};

export interface Preset { label: string; description: string; permissions: string[] }

export const PRESETS: Record<string, Preset> = {
    full: { label: 'Full access', description: 'Everything except super-admin actions', permissions: ['all'] },
    operations: {
        label: 'Operations', description: 'Runs the platform day to day',
        permissions: ['users.manage', 'doctors.verify', 'consultations.manage', 'reviews.moderate', 'content.manage', 'support.manage', 'reports.view'],
    },
    support: {
        label: 'Support', description: 'Helps users; may open sensitive data with a reason',
        permissions: ['consultations.manage', 'reviews.moderate', 'support.manage', 'pii.reveal'],
    },
    content: { label: 'Content moderator', description: 'Moderates posts and reviews', permissions: ['content.manage', 'reviews.moderate'] },
    analyst: { label: 'Analyst', description: 'Reports, activity log and exports; cannot change anything', permissions: ['reports.view', 'audit.view', 'data.export'] },
    compliance: {
        label: 'Compliance', description: 'Privacy requests and audit review',
        permissions: ['privacy.manage', 'pii.reveal', 'audit.view', 'data.export'],
    },
};

/** Stored value → clean list. Empty or unknown means ['all'] so nobody is locked out by accident. */
export function normalizePermissions(raw: unknown): string[] {
    if (!Array.isArray(raw)) return ['all'];
    const clean = raw.filter((p): p is string => typeof p === 'string' && (p === 'all' || (PERMISSIONS as readonly string[]).includes(p)));
    return clean.length ? clean : ['all'];
}

/** Which preset does this permission list match? 'custom' if none. */
export function presetOf(perms: string[]): string {
    const set = new Set(perms);
    for (const [key, p] of Object.entries(PRESETS)) {
        if (p.permissions.length === set.size && p.permissions.every((x) => set.has(x))) return key;
    }
    return 'custom';
}

type Need = Permission | 'super' | null; // null = any admin

const RULES: { pattern: RegExp; methods: string[]; need: Need }[] = [
    { pattern: /^\/api\/admin\/reveal$/, methods: ['POST'], need: 'pii.reveal' },
    { pattern: /^\/api\/admin\/doctors$/, methods: ['PATCH'], need: 'doctors.verify' },
    { pattern: /^\/api\/admin\/doctors\/credentials$/, methods: ['GET'], need: 'doctors.verify' },
    { pattern: /^\/api\/admin\/users$/, methods: ['PATCH', 'DELETE'], need: 'users.manage' },
    { pattern: /^\/api\/admin\/users\/[^/]+$/, methods: ['POST'], need: 'users.manage' },
    { pattern: /^\/api\/admin\/consultations$/, methods: ['PATCH'], need: 'consultations.manage' },
    { pattern: /^\/api\/admin\/reviews$/, methods: ['PATCH', 'DELETE'], need: 'reviews.moderate' },
    { pattern: /^\/api\/admin\/posts$/, methods: ['PATCH', 'DELETE'], need: 'content.manage' },
    { pattern: /^\/api\/admin\/messages(\/[^/]+)?$/, methods: ['PATCH', 'DELETE'], need: 'support.manage' },
    { pattern: /^\/api\/admin\/notes$/, methods: ['POST', 'DELETE'], need: null },
    { pattern: /^\/api\/admin\/data-requests$/, methods: ['GET', 'POST', 'PATCH'], need: 'privacy.manage' },
    { pattern: /^\/api\/admin\/reports$/, methods: ['GET'], need: 'reports.view' },
    { pattern: /^\/api\/admin\/activity$/, methods: ['GET'], need: 'audit.view' },
    { pattern: /^\/api\/admin\/announcements$/, methods: ['POST'], need: 'super' },
    { pattern: /^\/api\/admin\/platform-settings$/, methods: ['PUT'], need: 'super' },
    { pattern: /^\/api\/admin\/admins$/, methods: ['PATCH'], need: 'super' },
];

export function requiredPermission(method: string, url: string): Need {
    const m = method.toUpperCase();
    let pathname: string;
    let params: URLSearchParams;
    try {
        const u = new URL(url);
        pathname = u.pathname;
        params = u.searchParams;
    } catch {
        return 'super'; // cannot read the request: refuse
    }
    if (!pathname.startsWith('/api/admin/')) return null;
    if (m === 'GET' && params.get('export') === 'csv') return 'data.export';
    for (const rule of RULES) {
        if (rule.methods.includes(m) && rule.pattern.test(pathname)) return rule.need;
    }
    if (m === 'GET' || m === 'HEAD') return null; // reads are open to every admin
    return 'super'; // unknown write: super admins only
}

export function isAllowed(user: { isSuperAdmin: boolean; permissions: string[] }, need: Need): boolean {
    if (!need) return true;
    if (user.isSuperAdmin) return true;
    if (need === 'super') return false;
    return user.permissions.includes('all') || user.permissions.includes(need);
}