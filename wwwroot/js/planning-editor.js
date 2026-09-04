window.planningEditor = {
    insert: function(textBefore, textAfter, placeholder){
        const ta = document.getElementById('planning-textarea');
        if(!ta) return null;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = ta.value.substring(0, start);
        const sel = ta.value.substring(start, end) || (placeholder || '');
        const after = ta.value.substring(end);
        const updated = before + textBefore + sel + textAfter + after;
        ta.value = updated;
        // set cursor after inserted
        const cursor = start + textBefore.length + sel.length + textAfter.length;
        ta.selectionStart = ta.selectionEnd = cursor;
        ta.focus();
        // trigger input event for Blazor binding
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return updated;
    },
    getValue: function(){
        const ta = document.getElementById('planning-textarea');
        return ta ? ta.value : '';
    }
};
