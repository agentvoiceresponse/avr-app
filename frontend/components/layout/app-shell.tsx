/* eslint-disable react/no-children-prop */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Server,
  Bot,
  LogOut,
  Menu,
  Phone,
  Hash,
  PhoneCall,
  Shield,
  X,
  MessageCircle,
  Github,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarOverlay,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { env } from 'next-runtime-env';


type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SocialLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { dictionary } = useI18n();
  const webRtcClientUrl = env('NEXT_PUBLIC_WEBRTC_CLIENT_URL');
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);

  const navPrimaryItems = useMemo<NavItem[]>(
    () => [
      { href: '/overview', label: dictionary.navigation.dashboard, icon: LayoutDashboard },
    ],
    [dictionary],
  );

  const navBuildItems = useMemo<NavItem[]>(
    () => [
      { href: '/providers', label: dictionary.navigation.providers, icon: Server },
      { href: '/agents', label: dictionary.navigation.agents, icon: Bot },
    ],
    [dictionary],
  );

  const navTelephonyItems = useMemo<NavItem[]>(
    () => [
      { href: '/numbers', label: dictionary.navigation.numbers, icon: Hash },
      { href: '/trunks', label: dictionary.navigation.trunks, icon: Shield },
      { href: '/phones', label: dictionary.navigation.phones, icon: Phone },
    ],
    [dictionary],
  );

  const navAdministrationItems = useMemo<NavItem[]>(
    () => [
      { href: '/users', label: dictionary.navigation.users, icon: Users },
    ],
    [dictionary],
  );

  const navObserveItems = useMemo<NavItem[]>(
    () => [
      { href: '/calls', label: dictionary.navigation.calls, icon: PhoneCall },
      { href: '/dockers', label: dictionary.navigation.dockers, icon: Server },
    ],
    [dictionary],
  );

  const socialLinks = useMemo<SocialLink[]>(
    () => [
      {
        href: 'https://discord.gg/DFTU69Hg74',
        label: 'Discord community',
        icon: MessageCircle,
      },
      {
        href: 'https://github.com/orgs/agentvoiceresponse/repositories',
        label: 'GitHub repositories',
        icon: Github,
      },
      {
        href: 'https://wiki.agentvoiceresponse.com/',
        label: 'AVR wiki',
        icon: BookOpen,
      },
    ],
    [],
  );

  return (
    <SidebarProvider>
      <AppShellContent
        pathname={pathname}
        navPrimaryItems={navPrimaryItems}
        navBuildItems={navBuildItems}
        navTelephonyItems={navTelephonyItems}
        navAdministrationItems={navAdministrationItems}
        navObserveItems={navObserveItems}
        socialLinks={socialLinks}
        userName={user?.username ?? ''}
        userRole={user?.role ?? ''}
        onLogout={logout}
        dictionary={dictionary}
        children={children}
        webRtcClientUrl={webRtcClientUrl}
        isPhoneOpen={isPhoneOpen}
        setIsPhoneOpen={setIsPhoneOpen}
      />
    </SidebarProvider>
  );
}

type AppShellContentProps = {
  pathname: string;
  navPrimaryItems: NavItem[];
  navObserveItems: NavItem[];
  navBuildItems: NavItem[];
  navTelephonyItems: NavItem[];
  navAdministrationItems: NavItem[];
  socialLinks: SocialLink[];
  userName: string;
  userRole: string;
  onLogout: () => void;
  dictionary: ReturnType<typeof useI18n>['dictionary'];
  children: PropsWithChildren['children'];
  webRtcClientUrl?: string;
  isPhoneOpen: boolean;
  setIsPhoneOpen: Dispatch<SetStateAction<boolean>>;
};

function AppShellContent({
  pathname,
  navPrimaryItems,
  navBuildItems,
  navTelephonyItems,
  navAdministrationItems,
  navObserveItems,
  socialLinks,
  userName,
  userRole,
  onLogout,
  dictionary,
  children,
  webRtcClientUrl,
  isPhoneOpen,
  setIsPhoneOpen,
}: AppShellContentProps) {
  const { setOpen } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isViewer = userRole === 'viewer';
  const displayednavBuildItems = isViewer
    ? navBuildItems.filter((item) => item.href === '/numbers')
    : navBuildItems;
  const displayednavAdministrationItems = isViewer ? [] : navAdministrationItems;
  const displayednavTelephonyItems = isViewer ? [] : navTelephonyItems;
  const displayednavObserveItems = isViewer ? [] : navObserveItems;

  const handleNavigate = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarOverlay />
      <Sidebar className="w-64 border-border bg-card/60 backdrop-blur">
        <div className="flex h-full flex-col gap-6 px-6 py-8">
          <SidebarHeader className="border-none p-0">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt={dictionary.common.appName} width={36} height={36} />
              <div className="text-lg font-semibold tracking-tight">
                {dictionary.common.panelName}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-1 flex-col gap-6 p-0 text-sm font-medium">
            <SidebarGroup className="gap-3">
              <SidebarGroupContent>
                <SidebarMenu>
                  {navPrimaryItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} className="flex items-center gap-3">
                          <Link href={item.href} onClick={handleNavigate}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {displayednavBuildItems.length > 0 ? (
              <SidebarGroup className="gap-3">
                <SidebarGroupLabel>{dictionary.sidebarGroups.build}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {displayednavBuildItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} className="flex items-center gap-3">
                            <Link href={item.href} onClick={handleNavigate}>
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
            {displayednavTelephonyItems.length > 0 ? (
              <SidebarGroup className="gap-3">
                <SidebarGroupLabel>{dictionary.sidebarGroups.telephony}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                      {displayednavTelephonyItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} className="flex items-center gap-3">
                            <Link href={item.href} onClick={handleNavigate}>
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
            {displayednavAdministrationItems.length > 0 ? (
              <SidebarGroup className="gap-3">
                <SidebarGroupLabel>{dictionary.sidebarGroups.administration}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {displayednavAdministrationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} className="flex items-center gap-3">
                            <Link href={item.href} onClick={handleNavigate}>
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
            {displayednavObserveItems.length > 0 ? (
              <SidebarGroup className="mt-auto gap-3">
                <SidebarGroupLabel>{dictionary.sidebarGroups.observe}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {displayednavObserveItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} className="flex items-center gap-3">
                            <Link href={item.href} onClick={handleNavigate}>
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </SidebarContent>
          <SidebarFooter className="border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
            {dictionary.common.loggedInAs}{' '}
            <span className="font-medium text-foreground">{userName}</span>
            <br />
            {dictionary.common.role}:{' '}
            <span className="font-medium text-foreground">{userRole}</span>
          </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <SidebarTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SidebarTrigger>
            <ThemeToggle />
            {webRtcClientUrl ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPhoneOpen((prev) => !prev)}
                aria-label={
                  isPhoneOpen
                    ? dictionary.common.buttons.hidePhone
                    : dictionary.common.buttons.openWebrtc
                }
                aria-pressed={isPhoneOpen}
                className="pointer-events-auto"
              >
                <PhoneCall className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <Button key={href} variant="ghost" size="icon" asChild>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon className="h-4 w-4" />
                </a>
              </Button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  {userName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> {dictionary.common.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 space-y-6 px-6 py-6"
        >
          {children}
        </motion.main>
      </SidebarInset>

      {webRtcClientUrl ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          <div
            className={cn(
              'flex h-[640px] w-[360px] flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl transition-all duration-300',
              isPhoneOpen
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-6 opacity-0'
            )}
            aria-hidden={!isPhoneOpen}
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-3 py-2 text-sm font-medium">
              <span>AVR Phone</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPhoneOpen(false)}
                aria-label={dictionary.common.buttons.hidePhone}
                className="pointer-events-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <iframe
              src={webRtcClientUrl}
              title="WebRTC Phone"
              className="h-full w-full border-0"
              allow="camera; microphone; autoplay"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPhoneOpen((prev) => !prev)}
            aria-label={
              isPhoneOpen
                ? dictionary.common.buttons.hidePhone
                : dictionary.common.buttons.openWebrtc
            }
            aria-pressed={isPhoneOpen}
            className="pointer-events-auto"
          >
            <PhoneCall className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handler = () => setMatches(mediaQueryList.matches);

    handler();

    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
