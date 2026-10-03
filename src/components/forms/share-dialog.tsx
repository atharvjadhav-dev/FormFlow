'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, ExternalLink, Share2, X, MessageCircle, QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareDialogProps {
  formTitle: string;
  slug: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'md' | 'icon';
}

const emptySubscribe = () => () => {};

export function ShareDialog({
  formTitle,
  slug,
  buttonVariant = 'outline',
  buttonSize = 'sm',
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const cleanSlug = (slug || '').replace(/^\/?(f\/)?/, '');

  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/f/${cleanSlug}`;
    }
    return `/f/${cleanSlug}`;
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleCopy = async () => {
    const url = getFullUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    const message = `Please fill out this form: "${formTitle}"\n${getFullUrl()}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    getFullUrl(),
  )}`;

  const handleDownloadQr = async () => {
    try {
      setDownloadingQr(true);
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${cleanSlug || 'form'}-qrcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrCodeUrl, '_blank');
    } finally {
      setDownloadingQr(false);
    }
  };

  const fullUrl = getFullUrl();

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="gap-1.5"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Share</span>
      </Button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150 select-text"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-[#1D1D1F]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 pr-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#007AFF]">
                  Quick Share Link
                </span>
                <h2 id="share-dialog-title" className="text-lg font-bold text-[#1D1D1F] truncate mt-0.5">
                  {formTitle}
                </h2>
                <p className="mt-1 text-xs text-[#86868B] leading-relaxed">
                  Anyone with this link can fill out and submit this form with no login required.
                </p>
              </div>

              {/* Link Box */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#F5F5F7] p-2">
                <input
                  type="text"
                  readOnly
                  value={fullUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-transparent px-2 text-xs font-mono text-[#1D1D1F] focus:outline-none select-all cursor-text"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5 shrink-0 h-8 px-3 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-[#FBFBFC] p-3 text-center transition-all hover:bg-black/[0.03] hover:border-black/[0.14] group"
                >
                  <ExternalLink className="h-4 w-4 text-[#007AFF] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-[#1D1D1F]">Open Form</span>
                </a>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-[#FBFBFC] p-3 text-center transition-all hover:bg-[#25D366]/5 hover:border-[#25D366]/40 group"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-[#1D1D1F]">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all group ${
                    showQr
                      ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                      : 'border-black/[0.08] bg-[#FBFBFC] text-[#1D1D1F] hover:bg-black/[0.03] hover:border-black/[0.14]'
                  }`}
                >
                  <QrCode className="h-4 w-4 text-[#007AFF] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">QR Code</span>
                </button>
              </div>

              {/* QR Code Section */}
              {showQr && (
                <div className="mt-4 flex flex-col items-center rounded-xl border border-black/[0.08] bg-[#F5F5F7] p-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt={`QR code for ${formTitle}`}
                      width={176}
                      height={176}
                      className="h-44 w-44 rounded-lg"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#86868B]">
                    Scan with phone camera to open form
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={downloadingQr}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[#007AFF] hover:underline font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{downloadingQr ? 'Downloading...' : 'Download QR Code image'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanSlug = (slug || '').replace(/^\/?(f\/)?/, '');
    const url = `${window.location.origin}/f/${cleanSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 text-xs h-8 px-2.5"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-500 font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy link</span>
        </>
      )}
    </Button>
  );
}
