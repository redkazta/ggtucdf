/**
 * Muestra un toast temporal en la esquina inferior derecha.
 * @param message - Texto del mensaje
 * @param type - 'success' | 'error'
 */
export function toast(message: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div');
  el.className = `fixed bottom-4 right-4 z-50 p-4 rounded shadow-lg ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
