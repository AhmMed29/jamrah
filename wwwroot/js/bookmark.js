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
// Sidebar inline helpers: focus the folder rename input / page search box.
window.bmShell = window.bmShell || {
    focusRename: function (id) {
        try {
            var e = document.getElementById('sb-ren-' + id);
            if (e) { e.focus(); e.select(); }
        } catch (err) {}
    },
    focusSearch: function () {
        try {
            var e = document.querySelector('.bmk-q');
            if (e) { e.focus(); e.select(); }
        } catch (err) {}
    },
    // Fixed-position context menus are laid out in zoomed CSS pixels while the
    // click coordinates are viewport pixels. Measure/reposition in viewport
    // pixels, then convert the final left/top back into layout pixels.
    placeCtxMenu: function (el, x, y) {
        if (!el) return;
        var z = parseFloat(document.documentElement.style.zoom) || 1;
        if (!(z > 0)) z = 1;
        var gap = 8;
        try {
            el.style.maxHeight = Math.max(120, (window.innerHeight - gap * 2) / z) + 'px';
            el.style.left = (x / z) + 'px';
            el.style.top = (y / z) + 'px';
            el.style.visibility = 'hidden';

            var r = el.getBoundingClientRect();
            var w = r.width || (242 * z);
            var h = r.height || 0;
            var left = x;
            var top = y;

            if (left + w + gap > window.innerWidth) left = x - w - gap;
            if (left < gap) left = gap;
            if (top + h + gap > window.innerHeight) top = y - h - gap;
            if (top < gap) top = gap;

            el.style.left = (left / z) + 'px';
            el.style.top = (top / z) + 'px';
        } catch (err) {
            el.style.left = '8px';
            el.style.top = '8px';
        }
        el.style.visibility = 'visible';
    }
};
// Resizable sidebar: pointer drag updates --sbw live, persists on release.
window.bmSidebar = window.bmSidebar || {
    init: function (dotNet, current) {
        var shell = document.querySelector('.page-shell');
        var grip = document.querySelector('.sb-rz');
        if (!shell || !grip || grip.dataset.bound === '1') return;
        grip.dataset.bound = '1';
        var clamp = function (w) { return Math.max(170, Math.min(420, w)); };
        var dragging = false, startX = 0, startW = current || 200;
        var read = function () {
            return parseFloat(getComputedStyle(shell).getPropertyValue('--sbw')) || 200;
        };
        var save = function (w) {
            try { dotNet.invokeMethodAsync('ReportSidebarWidth', clamp(w)); } catch (e) {}
        };
        grip.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            dragging = true; startX = e.clientX; startW = read();
            try { grip.setPointerCapture(e.pointerId); } catch (err) {}
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        grip.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var w = clamp(startW + (e.clientX - startX));
            shell.style.setProperty('--sbw', w + 'px');
        });
        var end = function () {
            if (!dragging) return;
            dragging = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            save(read());
        };
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
        grip.addEventListener('dblclick', function () {
            shell.style.setProperty('--sbw', '200px');
            save(200);
        });
        grip.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            var step = e.key === 'ArrowLeft' ? -10 : 10;
            var w = clamp(read() + step);
            shell.style.setProperty('--sbw', w + 'px');
            save(w);
        });
        grip.tabIndex = 0;
    }
};
// v2 parity (quickCapture): paste (Ctrl+V) / drag-drop images into the capture
// modal — canvas-compressed (maxW 480, jpeg .72) like v2 imgCompact, then sent to .NET.
window.bmCap = window.bmCap || {
    init: function (zoneId, taId, ref) {
        try {
            var zone = document.getElementById(zoneId), ta = document.getElementById(taId);
            if (!zone || !ta || zone._capWired || !ref) return;
            zone._capWired = true;
            function compact(file, cb) {
                try {
                    var fr = new FileReader();
                    fr.onload = function () {
                        var img = new Image();
                        img.onload = function () {
                            var sc = Math.min(1, 480 / img.width);
                            var c = document.createElement('canvas');
                            c.width = Math.max(1, Math.round(img.width * sc));
                            c.height = Math.max(1, Math.round(img.height * sc));
                            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                            cb(c.toDataURL('image/jpeg', .72));
                        };
                        img.onerror = function () { cb(''); };
                        img.src = fr.result;
                    };
                    fr.readAsDataURL(file);
                } catch (e) { cb(''); }
            }
            function pushFiles(fs) {
                try {
                    ref.invokeMethodAsync('CapSlots').then(function (left) {
                        (fs || []).slice(0, 6).forEach(function (f) {
                            if (left <= 0) return;
                            if (f.type && f.type.indexOf('image/') === 0) {
                                left--;
                                compact(f, function (url) {
                                    if (url) ref.invokeMethodAsync('CapAddImage', url).catch(function () {});
                                });
                            } else if (f.name) {
                                left--;
                                ref.invokeMethodAsync('CapAddFile', f.name).catch(function () {});
                            }
                        });
                    }).catch(function () {});
                } catch (e) {}
            }
            ta.addEventListener('paste', function (e) {
                var fs = [];
                try {
                    var items = (e.clipboardData && e.clipboardData.items) || [];
                    for (var i = 0; i < items.length; i++) {
                        var f = items[i].getAsFile && items[i].getAsFile();
                        if (f) fs.push(f);
                    }
                } catch (err) {}
                if (fs.length) { e.preventDefault(); pushFiles(fs); }
            });
            zone.addEventListener('dragover', function (e) { e.preventDefault(); ta.classList.add('cap-drop'); });
            zone.addEventListener('dragleave', function (e) { if (!zone.contains(e.relatedTarget)) ta.classList.remove('cap-drop'); });
            zone.addEventListener('drop', function (e) {
                e.preventDefault(); e.stopPropagation(); ta.classList.remove('cap-drop');
                var fs = [];
                try { fs = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []); } catch (err) {}
                if (fs.length) pushFiles(fs);
            });
            ta.focus();
        } catch (e) {}
    }
};
// Width lives on the .bmk-app3 element (Blazor paints the DB value inline);
// on release the width is reported to .NET which persists it in the database.
window.bmPv = window.bmPv || {
    init: function (ref) {
        try {
            document.querySelectorAll('.bmk-app3 .bmk-rz').forEach(function (h) {
                if (h._wired) return;
                h._wired = true;
                var drag = false;
                function app() { return h.closest('.bmk-app3'); }
                function colLeft(a) {
                    var c = a ? a.querySelector('.bmk-col') : null;
                    return (c && c.getBoundingClientRect().left) || 0;
                }
                function cur(a) {
                    var v = parseInt(a.style.getPropertyValue('--listw'), 10);
                    if (!isNaN(v)) return v;
                    var c = a ? a.querySelector('.bmk-col') : null;
                    v = c ? Math.round(c.getBoundingClientRect().width) : 370;
                    return Math.max(280, Math.min(680, v));
                }
                function move(cx) {
                    if (!drag) return;
                    var a = app();
                    if (!a || !a.classList.contains('hasPv')) return;
                    var v = Math.max(280, Math.min(680, Math.round(cx - colLeft(a))));
                    a.style.setProperty('--listw', v + 'px');
                }
                function up() {
                    if (!drag) return;
                    drag = false;
                    h.classList.remove('drag');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', up);
                    try {
                        var a = app();
                        if (a && ref) ref.invokeMethodAsync('ReportPreviewWidth', cur(a)).catch(function () {});
                    } catch (e) {}
                }
                function onMouseMove(e) { move(e.clientX); }
                h.addEventListener('mousedown', function (e) {
                    var a = app();
                    if (!a || !a.classList.contains('hasPv')) return;
                    drag = true;
                    h.classList.add('drag');
                    e.preventDefault();
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', up);
                });
                h.addEventListener('touchstart', function (e) {
                    drag = true;
                    h.classList.add('drag');
                }, { passive: true });
                h.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
                h.addEventListener('touchend', up);
            });
        } catch (e) {}
    }
};
