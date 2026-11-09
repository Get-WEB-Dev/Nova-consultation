/** Plain-English wording for admin audit-log action codes (shared by Overview and Activity Log). */
export const ACTION_LABELS: Record<string, string> = {
    'user.role_changed': "changed a user's role",
    'user.suspended': 'suspended a user',
    'user.reactivated': 'reactivated a user',
    'user.deleted': 'deleted a user',
    'doctor.verified': 'approved a doctor',
    'doctor.rejected': "rejected a doctor's credentials",
    'doctor.unverified': "revoked a doctor's verification",
    'doctor.published': 'published a doctor',
    'doctor.unpublished': 'hid a doctor',
    'doctor.credentials_viewed': "viewed a doctor's license document",
    'consultation.cancelled': 'cancelled a consultation',
    'post.published': 'published a post',
    'post.hidden': 'hid a post',
    'post.deleted': 'deleted a post',
    'review.hidden': 'hid a review',
    'review.published': 'published a review',
    'review.deleted': 'deleted a review',
    'message.resolved': 'resolved a contact message',
    'message.deleted': 'deleted a contact message',
    'announcement.sent': 'sent an announcement',
    'export.users': 'exported the user list',
    'export.consultations': 'exported consultations',
    'export.audit_log': 'exported the activity log',
};

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;