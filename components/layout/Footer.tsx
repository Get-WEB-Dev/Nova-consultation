import React from "react";

export default function Footer() {
    return (
        <footer className="w-full bg-[#0c192c] py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-[12px] font-medium text-slate-400">
                    © {new Date().getFullYear()} Nova Health Consultancy. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
