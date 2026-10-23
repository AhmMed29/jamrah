window.jamrahMobile = (function () {
    function isAndroid() {
        try { return document.documentElement.classList.contains('maui-android'); } catch (e) { return false; }
    }
    return {
        isAndroid: isAndroid,
        shouldAutoCollapse: function () {
            return isAndroid() && window.innerWidth <= 768;
        }
    };
})();

window.jamrahTouchDrag = (function () {
    var ref = null;
    var wired = false;
    var timer = null;
    var pressedId = null;
    var startX = 0, startY = 0;
    var dragging = false;
    var container = null;
    var lastHot = '';
    var LONG_PRESS_MS = 350;
    var MOVE_TOLERANCE = 8;

    function clearPress() {
        if (timer) { clearTimeout(timer); timer = null; }
        pressedId = null;
    }

    function addDragListeners() {
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd, { passive: false });
        document.addEventListener('touchcancel', onDragEnd, { passive: false });
        document.addEventListener('contextmenu', suppressContextMenu, true);
    }

    function removeDragListeners() {
        document.removeEventListener('touchmove', onDragMove, { passive: false });
        document.removeEventListener('touchend', onDragEnd, { passive: false });
        document.removeEventListener('touchcancel', onDragEnd, { passive: false });
        document.removeEventListener('contextmenu', suppressContextMenu, true);
    }

    function onTouchStart(e) {
        if (dragging || timer || e.touches.length !== 1) { clearPress(); return; }
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('button')) { clearPress(); return; }
        var row = t.closest('.task-row');
        container = t.closest('.today-free');
        if (!row || !container) { clearPress(); return; }
        var taskId = row.getAttribute('data-task-id');
        if (!taskId) { clearPress(); return; }
        pressedId = taskId;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        var pressedContainer = container;
        timer = setTimeout(function () {
            timer = null;
            if (!pressedId || !ref) { clearPress(); return; }
            dragging = true;
            lastHot = '';
            try { pressedContainer.classList.add('ts-dragging'); } catch (er) { }
            addDragListeners();
            var id = pressedId;
            pressedId = null;
            try { ref.invokeMethodAsync('OnTouchDragStart', id, startX, startY); } catch (er) { }
        }, LONG_PRESS_MS);
    }

    function onPressMove(e) {
        if (!timer) return;
        if (!e.touches || e.touches.length !== 1) { clearPress(); return; }
        var t = e.touches[0];
        if (Math.abs(t.clientX - startX) + Math.abs(t.clientY - startY) > MOVE_TOLERANCE) clearPress();
    }

    function onDragMove(e) {
        if (!dragging) return;
        e.preventDefault();
        var t = e.touches[0];
        if (!t) return;
        try { ref.invokeMethodAsync('OnTouchDragMove', t.clientX, t.clientY); } catch (er) { }
        var el = document.elementFromPoint(t.clientX, t.clientY);
        var dz = el && el.closest ? el.closest('.dz[data-dz-third]') : null;
        var hot = '';
        if (dz && container && container.contains(dz)) {
            hot = (dz.getAttribute('data-dz-task') || '') + '|' + (dz.getAttribute('data-dz-third') || '');
        }
        if (hot !== lastHot) {
            lastHot = hot;
            var taskId = '', third = '';
            if (hot) {
                var parts = hot.split('|');
                taskId = parts[0];
                third = parts[1];
            }
            try { ref.invokeMethodAsync('OnTouchDragHover', taskId, third); } catch (er) { }
        }
    }

    function onDragEnd(e) {
        if (!dragging) return;
        var cancelled = e.type === 'touchcancel';
        if (!cancelled) e.preventDefault();
        dragging = false;
        if (container) { try { container.classList.remove('ts-dragging'); } catch (er) { } }
        container = null;
        lastHot = '';
        removeDragListeners();
        try { ref.invokeMethodAsync(cancelled ? 'OnTouchDragCancel' : 'OnTouchDragEnd'); } catch (er) { }
    }

    function suppressContextMenu(e) {
        if (dragging || timer) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    function onPassiveTouchEnd() {
        if (!dragging && timer) clearPress();
    }

    return {
        init: function (dotnetRef) {
            if (!window.jamrahMobile.isAndroid()) return;
            ref = dotnetRef;
            if (wired) return;
            wired = true;
            document.addEventListener('touchstart', onTouchStart, { passive: true });
            document.addEventListener('touchmove', onPressMove, { passive: true });
            document.addEventListener('touchend', onPassiveTouchEnd, { passive: true });
            document.addEventListener('touchcancel', onPassiveTouchEnd, { passive: true });
        }
    };
})();
