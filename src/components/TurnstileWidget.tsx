'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void;
  className?: string;
}

export default function TurnstileWidget({ onVerify, className = 'my-4' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

    const renderWidget = () => {
      if (typeof window !== 'undefined' && (window as any).turnstile && containerRef.current) {
        if (widgetIdRef.current) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current);
          } catch {}
        }

        containerRef.current.innerHTML = '';
        try {
          const id = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              if (onVerify) onVerify(token);
            },
          });
          widgetIdRef.current = id;
        } catch (e) {
          console.error('Error rendering Cloudflare Turnstile:', e);
        }
      }
    };

    if (typeof window !== 'undefined' && !(window as any).turnstile) {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderWidget();
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    } else {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [onVerify]);

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
    </div>
  );
}
