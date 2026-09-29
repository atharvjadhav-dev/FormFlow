'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Share2, X, MessageCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareDialogProps {
  formTitle: string;
  slug: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'md' | 'icon';
}

export function ShareDialog({
  formTitle,
  slug,
  buttonVariant = 'outline',
  buttonSize = 'sm',
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/f/${slug}`;
    }
    return `/f/${slug}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const input = document.createElement('input');
      input.value = getFullUrl();
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

  return (
    <>
      <Button
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

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Quick Share Link
              </span>
              <h2 className="text-lg font-bold text-foreground">{formTitle}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Anyone with this link can fill out and submit this form with no login required.
              </p>
            </div>

            {/* Link Box */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
              <input
                type="text"
                readOnly
                value={getFullUrl()}
                className="w-full bg-transparent px-2 text-xs font-mono text-foreground focus:outline-none"
              />
              <Button size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span>Copied!</span>
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
                href={getFullUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background p-3 text-center transition-colors hover:border-primary hover:bg-muted/50"
              >
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Open Form</span>
              </a>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background p-3 text-center transition-colors hover:border-[#25D366] hover:bg-muted/50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span className="text-xs font-medium text-foreground">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                  showQr
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary hover:bg-muted/50'
                }`}
              >
                <QrCode className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">QR Code</span>
              </button>
            </div>

            {/* QR Code Section */}
            {showQr && (
              <div className="mt-4 flex flex-col items-center rounded-lg border border-border bg-muted/20 p-4">
                <img
                  src={qrCodeUrl}
                  alt={`QR code for ${formTitle}`}
                  className="h-44 w-44 rounded-md border border-border bg-white p-2 shadow-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Scan with phone camera to open form
                </p>
                <a
                  href={qrCodeUrl}
                  download={`${slug}-qrcode.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 text-xs text-primary hover:underline font-medium"
                >
                  Download QR Code image
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/f/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 text-xs h-8 px-2.5"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-success" />
          <span className="text-success font-medium">Copied!</span>
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
