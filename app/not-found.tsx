import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <p className="text-5xl font-extrabold text-slate-200">404</p>
                <h1 className="text-xl font-bold text-slate-800 mt-2">Page not found</h1>
                <p className="text-sm text-slate-500 mt-2">The page you are looking for doesn't exist or has moved.</p>
                <Link href="/" className="inline-block mt-6 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Go home</Link>
            </div>
        </div>
    );
}