import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { NOTE_ENTITIES, type NoteEntity, listNotes, addNote, getNote, deleteNote } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const isEntity = (v: unknown): v is NoteEntity => NOTE_ENTITIES.includes(v as NoteEntity);

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    const sp = new URL(req.url).searchParams;
    const type = sp.get('entityType');
    const id = sp.get('entityId');
    if (!isEntity(type) || !isUuid(id)) return fail('entityType and entityId are required');
    try {
        return NextResponse.json({ data: await listNotes(type, id) });
    } catch (err: any) {
        const missing = /admin_notes|does not exist/i.test(err.message);
        return NextResponse.json({ data: [], error: missing ? 'Run the Phase 1 SQL (admin_notes table is missing).' : err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { entityType, entityId, note } = await req.json();
        const text = typeof note === 'string' ? note.trim() : '';
        if (!isEntity(entityType) || !isUuid(entityId)) return fail('entityType and entityId are required');
        if (text.length < 1 || text.length > 2000) return fail('A note must be 1–2000 characters');

        const created = await addNote(entityType, entityId, auth.user, text);
        // The audit entry says a note was added, never what it said (notes can hold private details)
        await logAdminAction(auth.user, 'note.added', entityType, entityId);
        return NextResponse.json({ data: created });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}

// Only the author or a super admin can remove a note
export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { noteId } = await req.json();
        if (!isUuid(noteId)) return fail('A valid noteId is required');
        const note = await getNote(noteId);
        if (!note) return fail('Note not found', 404);
        if (note.admin_id !== auth.user.id && !auth.user.isSuperAdmin) {
            return fail('Only the author or a super admin can delete this note', 403);
        }
        await deleteNote(noteId);
        await logAdminAction(auth.user, 'note.deleted', note.entity_type, note.entity_id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}