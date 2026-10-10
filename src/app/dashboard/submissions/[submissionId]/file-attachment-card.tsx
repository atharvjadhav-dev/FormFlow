'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  FileImage,
  Download,
  Eye,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface FileAttachmentCardProps {
  fileName: string;
  sizeBytes: number;
  mimeType?: string;
  url?: string;
  fieldLabel?: string;
}

const emptySubscribe = () => () => {};

export function FileAttachmentCard({
  fileName,
  sizeBytes,
  mimeType,
  url,
  fieldLabel,
}: FileAttachmentCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isImage =
    (mimeType && mimeType.startsWith('image/')) ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf';

  const formattedSize =
    sizeBytes < 1024 * 1024
      ? `${Math.round(sizeBytes / 1024)} KB`
      : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  // Close preview on Escape key
  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isPreviewOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isPreviewOpen]);

  const handleOpenPreview = () => {
    setZoomLevel(1);
    setImageLoaded(false);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setZoomLevel(1);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-[#F5F5F7]/70 hover:bg-[#F5F5F7] p-3.5 transition-all max-w-lg shadow-craft-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Thumbnail / Icon */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#007AFF] shadow-sm border border-black/[0.06] overflow-hidden">
            {isImage && url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={url}
                alt={fileName}
                className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={handleOpenPreview}
              />
            ) : isImage ? (
              <FileImage className="h-5 w-5 text-[#007AFF]" />
            ) : isPdf ? (
              <FileText className="h-5 w-5 text-rose-600" />
            ) : (
              <FileText className="h-5 w-5 text-[#007AFF]" />
            )}
          </div>

          <div className="min-w-0">
            <p
              className="text-xs font-semibold text-[#1D1D1F] truncate hover:text-[#007AFF] cursor-pointer transition-colors"
              onClick={url ? handleOpenPreview : undefined}
              title={fileName}
            >
              {fileName}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-[#86868B] mt-0.5">
              <span>{formattedSize}</span>
              <span>•</span>
              <span className="uppercase font-mono">{ext || 'FILE'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          {url ? (
            <>
              <button
                type="button"
                onClick={handleOpenPreview}
                className="inline-flex items-center justify-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#18181B] shadow-sm border border-black/[0.08] hover:bg-[#18181B] hover:text-white hover:border-transparent active:scale-95 transition-all cursor-pointer"
                title="Preview file"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>

              <a
                href={url}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#007AFF] shadow-sm border border-black/[0.08] hover:bg-[#007AFF] hover:text-white hover:border-transparent active:scale-95 transition-all"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            </>
          ) : (
            <span className="text-[11px] text-[#86868B]">Stored</span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PREVIEW MODAL DIALOG */}
      {/* ========================================================================= */}
      {isPreviewOpen && mounted && url &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
              onClick={handleClosePreview}
              aria-hidden="true"
            />

            {/* Modal Container */}
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-modal-title"
              className="relative z-10 flex flex-col w-full max-w-5xl h-[88vh] max-h-[900px] rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#1F1F23]/80 backdrop-blur-sm text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white shrink-0">
                    {isImage ? (
                      <FileImage className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="preview-modal-title"
                      className="text-sm font-semibold truncate text-white"
                      title={fileName}
                    >
                      {fileName}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {fieldLabel ? `${fieldLabel} • ` : ''}
                      {formattedSize}
                    </p>
                  </div>
                </div>

                {/* Header Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Image Zoom Toolbar */}
                  {isImage && (
                    <div className="hidden sm:flex items-center bg-white/10 rounded-full px-1.5 py-0.5 border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        disabled={zoomLevel <= 0.5}
                        className="p-1 rounded-full text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                        title="Zoom out"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-1.5 font-mono text-[10px] text-zinc-300 min-w-[38px] text-center">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                        disabled={zoomLevel >= 3}
                        className="p-1 rounded-full text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                        title="Zoom in"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className="p-1 rounded-full text-zinc-300 hover:text-white transition-colors ml-0.5"
                        title="Reset zoom"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all border border-white/10"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </a>

                  <a
                    href={url}
                    download={fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-xs font-medium text-white transition-all shadow-sm"
                    title="Download file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors ml-1"
                    title="Close (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="relative flex-1 bg-[#0F0F11] overflow-auto flex items-center justify-center p-4">
                {isImage ? (
                  <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto">
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
                        <span className="text-xs">Loading image...</span>
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={fileName}
                      onLoad={() => setImageLoaded(true)}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className={`max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl transition-opacity duration-200 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={url}
                    title={fileName}
                    className="w-full h-full rounded-2xl border border-white/10 bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-[#007AFF]">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-white">{fileName}</h4>
                      <p className="text-xs text-zinc-400">
                        Direct preview is not available for this file type ({ext.toUpperCase() || 'document'}).
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in Browser</span>
                      </a>
                      <a
                        href={url}
                        download={fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-xs font-semibold text-white transition-all shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
