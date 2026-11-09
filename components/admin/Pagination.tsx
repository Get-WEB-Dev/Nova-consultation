import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pageSize, total, onPage, disabled }: {
    page: number; pageSize: number; total: number; onPage: (p: number) => void; disabled?: boolean;
}) {
    if (total === 0) return null;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 flex-wrap">
            <span>{first}–{last} of {total.toLocaleString()}</span>
            {pages > 1 && (
                <div className="flex items-center gap-2">
                    <button className="btn btn-sm btn-secondary" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span>Page {page} / {pages}</span>
                    <button className="btn btn-sm btn-secondary" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>
                        Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}