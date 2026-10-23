// ADDITIVE: receives real shell paths from the native WebView2 drop handler.
window.jamrahLocalDrop = (function () {
    var ref = null;
    return {
        register: function (dotnetRef) { ref = dotnetRef; },
        deliver: function (pathsJson) {
            try {
                var paths = typeof pathsJson === 'string' ? JSON.parse(pathsJson) : pathsJson;
                if (ref && paths && paths.length) ref.invokeMethodAsync('OnLocalDrop', paths).catch(function () {});
            } catch (e) { }
        }
    };
})();

// ADDITIVE: WebView2 would otherwise open dropped files; the native drop handler supplies real paths.
(function () {
    function isFileDrag(e) {
        try {
            var dt = e.dataTransfer;
            if (!dt) return false;
            if (dt.types && Array.prototype.indexOf.call(dt.types, 'Files') >= 0) return true;
            return !!(dt.files && dt.files.length);
        } catch (err) { return false; }
    }
    document.addEventListener('dragover', function (e) { if (isFileDrag(e)) e.preventDefault(); });
    document.addEventListener('drop', function (e) { if (isFileDrag(e)) e.preventDefault(); });
})();

