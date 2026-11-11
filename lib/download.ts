/** Saves text as a file in the browser (used for CSV and JSON exports built on the page). */
export function saveText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}