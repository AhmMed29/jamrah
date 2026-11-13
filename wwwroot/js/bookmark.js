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
// Landscape media (regular video / wide image) expands the preview modal;
// portrait media (Shorts, vertical video, phone photos) keeps the tall layout.
// Called from img onload / video onloadedmetadata in BookmarkPreviewModal.
window.pvmOrient = function (el) {
    try {
        var p = el && el.closest ? el.closest('.pvm') : null;
        if (!p) return;
        var w = el.naturalWidth || el.videoWidth || 0;
        var h = el.naturalHeight || el.videoHeight || 0;
        if (!w || !h) return;
        var ar = w / h;
        p.style.setProperty('--pvm-ar', ar.toFixed(4));
        p.setAttribute('data-pvm-wide', ar >= 1.05 ? '1' : '0');
    } catch (e) {}
};

// Custom local-video controls. Chromium's native control bar renders its
// progress fill/thumb misaligned under the app's root CSS zoom, so the
// preview uses a small DOM bar driven by this initializer.
window.pvmVideoInit = function (v) {
    try {
        if (!v || v.dataset.pvInit === '1') return;
        var p = v.closest('.pvm-player');
        if (!p) return;
        var bar = p.querySelector('.pvm-vbar');
        if (!bar) return;
        v.dataset.pvInit = '1';
        p.classList.add('pv-ready');

        var play = bar.querySelector('.pvm-vplay');
        var seek = bar.querySelector('.pvm-vseek');
        var cur = bar.querySelector('.pvm-vcur');
        var dur = bar.querySelector('.pvm-vdur');
        var mute = bar.querySelector('.pvm-vmute');
        var full = bar.querySelector('.pvm-vfull');
        var hideT = null;

        function fmt(s) {
            if (!isFinite(s) || s < 0) s = 0;
            s = Math.floor(s);
            var m = Math.floor(s / 60), sec = s % 60, h = Math.floor(m / 60);
            if (h > 0) return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
            return m + ':' + String(sec).padStart(2, '0');
        }
        function paint() {
            var d = v.duration || 0, t = v.currentTime || 0;
            cur.textContent = fmt(t);
            dur.textContent = fmt(d);
            var pct = d > 0 ? (t / d) * 100 : 0;
            seek.value = d > 0 ? Math.round((t / d) * 1000) : 0;
            seek.style.setProperty('--p', pct.toFixed(3) + '%');
        }
        function sync() {
            p.classList.toggle('playing', !v.paused);
            p.classList.toggle('muted', v.muted || v.volume === 0);
            paint();
        }
        function show() {
            p.classList.add('show-bar');
            if (hideT) { clearTimeout(hideT); hideT = null; }
            if (v.paused) return;
            hideT = setTimeout(function () {
                if (!v.paused && !bar.contains(document.activeElement)) p.classList.remove('show-bar');
            }, 2400);
        }
        function toggle() {
            if (v.paused) {
                var pr = v.play();
                if (pr && pr.catch) pr.catch(function () {});
            } else {
                v.pause();
            }
        }

        play.addEventListener('click', function (e) { e.stopPropagation(); toggle(); show(); });
        v.addEventListener('click', function () { show(); });
        v.addEventListener('play', function () { sync(); show(); });
        v.addEventListener('pause', function () { sync(); show(); });
        v.addEventListener('ended', function () { sync(); show(); });
        v.addEventListener('volumechange', sync);
        v.addEventListener('loadedmetadata', paint);
        v.addEventListener('timeupdate', paint);
        v.addEventListener('progress', paint);
        seek.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        seek.addEventListener('input', function () {
            var d = v.duration || 0;
            if (d > 0) { v.currentTime = (Number(seek.value) / 1000) * d; paint(); }
        });
        mute.addEventListener('click', function (e) {
            e.stopPropagation();
            v.muted = !v.muted;
            if (!v.muted && v.volume === 0) v.volume = 1;
            sync(); show();
        });
        full.addEventListener('click', function (e) {
            e.stopPropagation();
            try {
                if (document.fullscreenElement) document.exitFullscreen();
                else if (p.requestFullscreen) p.requestFullscreen();
                else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
            } catch (err) {}
            show();
        });
        v.addEventListener('dblclick', function (e) {
            e.preventDefault();
            try {
                if (document.fullscreenElement) document.exitFullscreen();
                else if (p.requestFullscreen) p.requestFullscreen();
            } catch (err) {}
        });
        p.addEventListener('mousemove', show);
        p.addEventListener('mouseenter', show);
        p.addEventListener('mouseleave', function () {
            if (!v.paused && !bar.contains(document.activeElement)) p.classList.remove('show-bar');
        });
        p.addEventListener('touchstart', show, { passive: true });
        bar.addEventListener('mouseenter', function () { p.classList.add('show-bar'); if (hideT) { clearTimeout(hideT); hideT = null; } });
        bar.addEventListener('mouseleave', show);

        sync();
        show();
    } catch (e) {}
};

// PERF: the bookmarks grid/list used to render every card at once and were
// hard-capped (60 media + 60 text cards, 120 list rows) - so anything past
// the cap was invisible. Cards are now revealed progressively: this sentinel
// sits at the end of the list and asks for the next batch when it scrolls
// into view. The .NET side stops asking once everything is on screen.
window.bmkWatchEnd = function (el, dotNetRef) {
    try {
        window.bmkUnwatchEnd();
        if (!el || !dotNetRef) return;
        // The bookmarks content scrolls inside .bmk-col, not the window, so the
        // root is left unset (the viewport): the intersection is then computed
        // against the visible area and the ancestor clipping, which works for
        // both a window scroll and a nested scroll container.
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (!entries[i].isIntersecting) continue;
                try { dotNetRef.invokeMethodAsync('OnEndReached'); } catch (e) {}
            }
        }, { root: null, rootMargin: '600px' });
        io.observe(el);
        window.__bmkEndObserver = io;
    } catch (e) {}
};

window.bmkUnwatchEnd = function () {
    try {
        if (window.__bmkEndObserver) { window.__bmkEndObserver.disconnect(); window.__bmkEndObserver = null; }
    } catch (e) {}
};

// Masonry ("bubbles") grid: cards are handed out in DOM order (newest first)
// and every card is dropped into the currently shortest column, so a card
// always takes the empty space left above it instead of leaving a hole.
// Positions are written in layout pixels (offset* / clientWidth), which stays
// correct under the app's root CSS zoom.
var BMK_GAP = 14, BMK_MIN_COL = 190;

function bmkMasonryCards(el) {
    var cards = [];
    for (var i = 0; i < el.children.length; i++) {
        var c = el.children[i];
        if (c.classList && c.classList.contains('card')) cards.push(c);
    }
    return cards;
}

function bmkMasonryLayout(el) {
    var cards = bmkMasonryCards(el);
    if (!cards.length) { el.style.height = ''; return; }

    var width = el.clientWidth;
    if (width <= 0) return;

    var cols = Math.max(1, Math.floor((width + BMK_GAP) / (BMK_MIN_COL + BMK_GAP)));
    var colW = (width - BMK_GAP * (cols - 1)) / cols;
    var i;

    // Width first: card height depends on it, so it has to settle before the
    // heights are read for the column packing.
    for (i = 0; i < cards.length; i++) cards[i].style.width = colW + 'px';

    var heights = [];
    for (i = 0; i < cols; i++) heights.push(0);

    for (i = 0; i < cards.length; i++) {
        var card = cards[i];
        var h = card.offsetHeight;
        var col = 0;
        for (var j = 1; j < cols; j++) if (heights[j] < heights[col]) col = j;
        card.style.left = Math.round(col * (colW + BMK_GAP)) + 'px';
        card.style.top = Math.round(heights[col]) + 'px';
        heights[col] += h + BMK_GAP;
    }

    var total = 0;
    for (i = 0; i < cols; i++) total = Math.max(total, heights[i]);
    el.style.height = Math.max(0, Math.round(total - BMK_GAP)) + 'px';
}

window.bmkMasonry = function (el) {
    try {
        if (!el) return;
        if (!el.isConnected) { window.bmkMasonryDispose(el); return; }
        el.classList.add('bmk-masonry-ready');

        // Container: width changes => column count changes.
        if (!el.__bmkMasonryRO) {
            el.__bmkMasonryRO = new ResizeObserver(function () { window.bmkMasonry(el); });
            el.__bmkMasonryRO.observe(el);
        }
        // Cards: late images / expanded text change a card's height afterwards.
        if (!el.__bmkCardRO) {
            el.__bmkCardRO = new ResizeObserver(function () { window.bmkMasonry(el); });
        }
        var cards = bmkMasonryCards(el);
        for (var i = 0; i < cards.length; i++) {
            if (!cards[i].__bmkObserved) {
                cards[i].__bmkObserved = true;
                el.__bmkCardRO.observe(cards[i]);
            }
        }

        // Fallbacks for the cases ResizeObserver does not report: cards that
        // only get their final height once a thumbnail/font arrives.
        if (!el.__bmkLoadBound) {
            el.__bmkLoadBound = true;
            el.addEventListener('load', function () { window.bmkMasonry(el); }, true);
        }
        if (!window.__bmkMasonryContainers) window.__bmkMasonryContainers = [];
        if (window.__bmkMasonryContainers.indexOf(el) < 0) window.__bmkMasonryContainers.push(el);
        if (!window.__bmkMasonryResizeBound) {
            window.__bmkMasonryResizeBound = true;
            window.addEventListener('resize', function () {
                var list = window.__bmkMasonryContainers || [];
                for (var k = list.length - 1; k >= 0; k--) {
                    if (list[k].isConnected) window.bmkMasonry(list[k]);
                    else list.splice(k, 1);
                }
            });
        }
        if (!el.__bmkSettled) {
            el.__bmkSettled = true;
            setTimeout(function () { if (el.isConnected) window.bmkMasonry(el); }, 250);
            setTimeout(function () { if (el.isConnected) window.bmkMasonry(el); }, 900);
        }

        if (el.__bmkMasonryRaf) cancelAnimationFrame(el.__bmkMasonryRaf);
        el.__bmkMasonryRaf = requestAnimationFrame(function () {
            el.__bmkMasonryRaf = null;
            try { bmkMasonryLayout(el); } catch (e) {}
        });
    } catch (e) {}
};

window.bmkMasonryDispose = function (el) {
    try {
        if (!el) return;
        if (el.__bmkMasonryRO) { el.__bmkMasonryRO.disconnect(); el.__bmkMasonryRO = null; }
        if (el.__bmkCardRO) { el.__bmkCardRO.disconnect(); el.__bmkCardRO = null; }
        if (el.__bmkMasonryRaf) { cancelAnimationFrame(el.__bmkMasonryRaf); el.__bmkMasonryRaf = null; }
        var list = window.__bmkMasonryContainers || [];
        var at = list.indexOf(el);
        if (at >= 0) list.splice(at, 1);
    } catch (e) {}
};
