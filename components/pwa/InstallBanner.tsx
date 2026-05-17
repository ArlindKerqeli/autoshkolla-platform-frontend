'use client';

import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';

export function InstallBanner() {
  const { canInstall, promptInstall, dismiss, platform, hasNativePrompt } = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!canInstall) return null;

  // iOS: show instructions to use Share → Add to Home Screen
  if (platform === 'ios') {
    return (
      <div className="relative border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Download className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Instalo Autoshkolla RINA
            </p>
            <p className="text-xs text-slate-500">
              Shto në ekranin kryesor si aplikacion
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowIOSGuide(!showIOSGuide)}
              className="h-8 bg-blue-600 px-3 text-xs font-semibold hover:bg-blue-700"
            >
              Si?
            </Button>
            <button
              onClick={dismiss}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              aria-label="Mbyll"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* iOS step-by-step guide */}
        {showIOSGuide && (
          <div className="mt-2.5 rounded-lg bg-white/80 p-3">
            <div className="space-y-2.5 text-sm text-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
                <span>
                  Shtyp butonin{' '}
                  <Share className="inline h-4 w-4 text-blue-600" />{' '}
                  <strong>Share</strong> në shiritin e poshtëm
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                <span>
                  Zgjedh <strong>&quot;Add to Home Screen&quot;</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
                <span>
                  Shtyp <strong>&quot;Add&quot;</strong> për ta instaluar
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Android / Desktop: use native beforeinstallprompt
  return (
    <div className="relative flex items-center gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 lg:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">
          Instalo Autoshkolla RINA
        </p>
        <p className="hidden text-xs text-slate-500 sm:block">
          Hap aplikacionin direkt nga ekrani kryesor
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          onClick={promptInstall}
          className="h-8 bg-blue-600 px-3 text-xs font-semibold hover:bg-blue-700"
        >
          Instalo
        </Button>
        <button
          onClick={dismiss}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          aria-label="Mbyll"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
