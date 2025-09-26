'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebarContext() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

function useMediaQuery(query: string) {
  const getMatches = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState<boolean>(getMatches);

  React.useEffect(() => {
    const matchMedia = window.matchMedia(query);

    function handleChange() {
      setMatches(matchMedia.matches);
    }

    handleChange();

    matchMedia.addEventListener('change', handleChange);
    return () => {
      matchMedia.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [open, setOpen] = React.useState<boolean>(() => (isMobile ? false : defaultOpen));

  React.useEffect(() => {
    setOpen(isMobile ? false : defaultOpen);
  }, [isMobile, defaultOpen]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((prev) => !prev),
    }),
    [open],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useSidebarContext();
}

type SidebarProps = React.ComponentPropsWithoutRef<'aside'> & {
  collapsible?: boolean;
};

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { className, collapsible = true, ...props },
  ref,
) {
  const { open } = useSidebarContext();

  return (
    <aside
      ref={ref as React.ForwardedRef<HTMLElement>}
      data-state={open ? 'open' : 'collapsed'}
      className={cn(
        'relative z-40 flex h-full shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:static md:h-auto md:translate-x-0',
        collapsible
          ? open
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0',
        className,
      )}
      {...props}
    />
  );
});

export const SidebarOverlay = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarOverlay({ className, ...props }, ref) {
    const { open, setOpen } = useSidebarContext();
    return (
      <div
        ref={ref}
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity duration-200 ease-in-out md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          className,
        )}
        {...props}
      />
    );
  },
);

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-2 border-b border-border/60 px-4 py-4', className)}
        {...props}
      />
    );
  },
);

export const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarContent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-1 flex-col px-4 py-4 text-sm', className)}
        {...props}
      />
    );
  },
);

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarFooter({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('mt-auto px-4 py-4', className)} {...props} />
    );
  },
);

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarGroup({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
    );
  },
);

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarGroupLabel({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)} {...props} />
    );
  },
);

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarGroupContent({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
    );
  },
);

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  function SidebarMenu({ className, ...props }, ref) {
    return (
      <ul ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
    );
  },
);

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  function SidebarMenuItem({ className, ...props }, ref) {
    return <li ref={ref} className={cn('w-full', className)} {...props} />;
  },
);

type SidebarMenuButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
};

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  function SidebarMenuButton({ className, asChild, isActive, ...props }, ref) {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-active={isActive}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive ? 'bg-primary text-primary-foreground shadow' : null,
          className,
        )}
        {...props}
      />
    );
  },
);

export const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarInset({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-1 flex-col', className)} {...props} />
    );
  },
);

export const SidebarMain = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarMain({ className, ...props }, ref) {
    return <main ref={ref} className={cn('flex-1', className)} {...props} />;
  },
);

type SidebarTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  function SidebarTrigger({ className, onClick, asChild, ...props }, ref) {
    const { toggle } = useSidebarContext();
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          toggle();
          onClick?.(event);
        }}
        className={
          asChild
            ? className
            : cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
              )
        }
        {...props}
      />
    );
  },
);

export const SidebarRail = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  function SidebarRail({ className, ...props }, ref) {
    const { open } = useSidebarContext();
    return (
      <div
        ref={ref}
        data-state={open ? 'open' : 'collapsed'}
        className={cn(
          'hidden h-full w-2 shrink-0 border-r border-border bg-border/20 md:block',
          className,
        )}
        {...props}
      />
    );
  },
);
