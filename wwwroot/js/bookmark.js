// Minimal Blazor interop for the Bookmarks page (all logic lives in C#).
window.bmInterop = window.bmInterop || {
    copyText: async function (t) {
        try { await navigator.clipboard.writeText(t); return true; }
        catch (e) { return false; }
    },
    download: function (name, text) {
        try {
            const b = new Blob([text], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = name;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            return true;
        } catch (e) { return false; }
    }
};
