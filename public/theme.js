// Applies the saved theme before the page paints (no flash). Non-module and external, because the CSP forbids inline scripts.
try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch { /* storage blocked: follow the system setting */ }
