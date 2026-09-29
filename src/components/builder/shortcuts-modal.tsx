'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

export function ShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform));
    }
  }, []);

  if (!isOpen) return null;

  const mod = isMac ? '⌘' : 'Ctrl';
  const shift = isMac ? '⇧' : 'Shift';
  const enter = isMac ? '↵' : 'Enter';

  const SHORTCUTS_LIST = [
    { key: `${mod} + Z`, desc: 'Undo' },
    { key: `${mod} + ${shift} + Z`, desc: 'Redo' },
    { key: `${mod} + D`, desc: 'Duplicate selected field' },
    { key: '↑ / ↓', desc: 'Move field up / down' },
    { key: `${shift} + ↑ / ↓`, desc: 'Move field faster' },
    { key: 'Delete / Backspace', desc: 'Delete selected field' },
    { key: `${mod} + S`, desc: 'Save draft' },
    { key: `${mod} + ${enter}`, desc: 'Preview form' },
    { key: '/', desc: 'Quick add component' },
    { key: 'Esc', desc: 'Deselect field' },
    { key: '?', desc: 'Toggle shortcuts help' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-black/[0.08] text-sm animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[#007AFF]" />
            <h2 className="font-semibold text-[#1D1D1F]">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS_LIST.map((item) => (
            <div key={item.desc} className="flex items-center justify-between py-1 text-xs">
              <span className="text-[#86868B]">{item.desc}</span>
              <kbd className="font-mono text-[11px] font-semibold text-[#1D1D1F] bg-black/[0.04] border border-black/[0.08] px-2 py-0.5 rounded shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-black/[0.06] text-center">
          <p className="text-[11px] text-[#86868B]">
            Shortcuts are disabled while typing inside form inputs.
          </p>
        </div>
      </div>
    </div>
  );
}
