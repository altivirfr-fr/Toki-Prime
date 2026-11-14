import React from 'react';
import { AlertTriangle, Trash2, Calendar, Check, X } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col">
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`p-2.5 rounded-2xl border shrink-0 ${
              isDestructive
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5 text-rose-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">{title}</h3>
            <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all active:scale-95 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
