export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
export function showError(container, message) { container.innerHTML = message ? `<div class="alert">${escapeHtml(message)}</div>` : ''; }
