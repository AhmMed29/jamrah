window.jamrahZoom = (function(){
    let currentPage = null;
    let currentZoom = 1;
    function apply(z){
        currentZoom = Math.max(0.5, Math.min(2.5, z));
        document.documentElement.style.zoom = currentZoom;
        try { if(window.chrome && window.chrome.webview) window.chrome.webview.postMessage(JSON.stringify({type:'zoom', page: currentPage, zoom: currentZoom})); } catch(e){}
    }
    let _inited = false;
    return {
        init: function(pageKey, zoom){
            currentPage = pageKey;
            currentZoom = zoom || 1;
            function doApply(){
                try { document.documentElement.style.zoom = currentZoom; } catch(e){}
            }
            if(document.readyState === 'loading'){
                document.addEventListener('DOMContentLoaded', doApply, {once:true});
            } else {
                doApply();
            }
            if(_inited) return;
            _inited = true;
            // Ctrl +/-/0
            document.addEventListener('keydown', function(e){
                if(e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_' || e.key === '0')){
                    e.preventDefault();
                    if(e.key === '+' || e.key === '=') apply(currentZoom + 0.1);
                    else if(e.key === '-' || e.key === '_') apply(currentZoom - 0.1);
                    else if(e.key === '0') apply(1);
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
        },
        set: function(z){ apply(z); }
    };
})();
