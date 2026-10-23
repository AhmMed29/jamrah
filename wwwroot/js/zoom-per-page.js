window.jamrahZoom = (function(){
    let currentPage = null;
    let currentZoom = 1.7;
    let unifiedDefault = null;
    let _dotnetRef = null;
    const pageDefaults = { tasks: 1.25, pomodoro: 1.25 };
    function defaultFor(pageKey){
        // UNIFIED mode: Ctrl+0 always resets to the single unified zoom.
        if(unifiedDefault !== null) return unifiedDefault;
        return pageDefaults[pageKey] || 1;
    }
    function apply(z){
        currentZoom = Math.max(0.5, Math.min(2.5, z));
        document.documentElement.style.zoom = currentZoom;
        try { document.documentElement.style.setProperty('--z', currentZoom); } catch(e){}
        try { if(window.chrome && window.chrome.webview) window.chrome.webview.postMessage(JSON.stringify({type:'zoom', page: currentPage, zoom: currentZoom})); } catch(e){}
        try { if(_dotnetRef) _dotnetRef.invokeMethodAsync('ReportZoom', currentZoom); } catch(e){}
    }
    let _inited = false;
    function wireShortcutsOnce(){
        if(_inited) return;
        _inited = true;
        // Ctrl +/-/0
        document.addEventListener('keydown', function(e){
            if(e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_' || e.key === '0')){
                e.preventDefault();
                if(e.key === '+' || e.key === '=') apply(currentZoom + 0.1);
                else if(e.key === '-' || e.key === '_') apply(currentZoom - 0.1);
                else if(e.key === '0') apply(defaultFor(currentPage));
            }
        });
        // Ctrl + wheel
        document.addEventListener('wheel', function(e){
            if(e.ctrlKey){
                e.preventDefault();
                if(e.deltaY < 0) apply(currentZoom + 0.05);
                else apply(currentZoom - 0.05);
            }
        }, {passive:false});
    }
    // Self-wire shortcuts on document load so Ctrl +/-/wheel work (and persist
    // via postMessage) even before native/Blazor init runs.
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', wireShortcutsOnce, {once:true});
    } else {
        wireShortcutsOnce();
    }
    return {
        init: function(pageKey, zoom, dotnetRef){
            // Android phones: root zoom stays 1 (no Ctrl +/- keys on touch), so the
            // stored desktop zoom (1.7) is ignored and the UI fits the screen.
            var isAndroid = false;
            try { isAndroid = document.documentElement.classList.contains('maui-android'); } catch(e){}
            if(isAndroid) zoom = 1;
            currentPage = pageKey;
            currentZoom = zoom || defaultFor(pageKey);
            if(dotnetRef) _dotnetRef = dotnetRef;
            if(pageKey === 'unified' && typeof zoom === 'number' && isFinite(zoom)) unifiedDefault = zoom;
            function doApply(){
                try { document.documentElement.style.zoom = currentZoom; } catch(e){}
                try { document.documentElement.style.setProperty('--z', currentZoom); } catch(e){}
            }
            if(document.readyState === 'loading'){
                document.addEventListener('DOMContentLoaded', doApply, {once:true});
            } else {
                doApply();
            }
            wireShortcutsOnce();
        },
        // UNIFIED (single-WebView fixed sidebar): one document zoom for all pages.
        // switchPage only updates the context (for Ctrl+0 default + native persist);
        // it does NOT change the zoom value, so no flicker on navigation.
        switchPage: function(pageKey, zoom){
            currentPage = pageKey || currentPage;
            wireShortcutsOnce();
            if(typeof zoom === 'number' && isFinite(zoom)){
                currentZoom = Math.max(0.5, Math.min(2.5, zoom));
                unifiedDefault = currentZoom;
                try { document.documentElement.style.zoom = currentZoom; } catch(e){}
                try { document.documentElement.style.setProperty('--z', currentZoom); } catch(e){}
            }
        },
        set: function(z){ apply(z); }
    };
})();
