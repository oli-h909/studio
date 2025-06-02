import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CyberGuardLogo({ className, size = "md" }: { className?: string, size?: "sm" | "md" }) {
  const isSmall = size === "sm";
  return (
    <div className={cn("flex items-center gap-2 text-primary-foreground", className)}>
      <ShieldCheck className={cn("text-primary", isSmall ? "h-6 w-6" : "h-8 w-8")} />
      <span className={cn("font-headline font-bold", isSmall ? "text-xl" : "text-2xl")}>
        КіберСтраж AI
      </span>
    </div>
  );
}
