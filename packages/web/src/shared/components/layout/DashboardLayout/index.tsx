import { useState } from 'react';
import { Button } from '@heroui/react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Search,
    Share2,
    Server,
    Sprout,
    SlidersHorizontal,
    Sun,
    Moon
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import type { ComponentType } from 'react';
import type { Theme } from '@/shared/utils/theme';
import type { ChannelStatus } from '@/shared/contracts/channel';

interface NavItem{
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/graph', label: 'Live Graph', icon: Share2 },
    { to: '/workers', label: 'Workers', icon: Server },
    { to: '/seeds', label: 'Seeds', icon: Sprout },
    { to: '/crawler', label: 'Crawler', icon: SlidersHorizontal }
];

const linkClass = (isActive: boolean): string =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive ? 'bg-surface-secondary text-foreground' : 'text-muted hover:text-foreground'
    }`;

interface ConnStyle{
    dot: string;
    label: string;
}

const CONN_STYLE: Record<ChannelStatus, ConnStyle> = {
    open: { dot: 'bg-success', label: 'Live' },
    connecting: { dot: 'bg-warning', label: 'Connecting' },
    reconnecting: { dot: 'bg-warning', label: 'Reconnecting' },
    closed: { dot: 'bg-danger', label: 'Offline' }
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const { status } = useCrawlLive();
    const conn = CONN_STYLE[status];
    const [theme, setTheme] = useState<Theme>(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    };

    const signOut = () => {
        useAuthStore.getState().clear();
        navigate('/sign-in');
    };

    return (
        <div className='flex min-h-dvh bg-background text-foreground'>
            <aside className='flex w-60 shrink-0 flex-col gap-1 border-r border-foreground/10 p-4'>
                <div className='px-3 py-2 text-lg font-semibold'>
                    Crawl<span className='text-primary'>m</span>
                </div>

                <nav className='mt-2 flex flex-col gap-1'>
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) => linkClass(isActive)}
                            >
                                <Icon className='size-4' />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            <div className='flex flex-1 flex-col'>
                <header className='flex items-center justify-end gap-3 border-b border-foreground/10 px-6 py-3'>
                    <span className='inline-flex items-center gap-2 text-xs text-muted'>
                        <span className={`size-2 rounded-full ${conn.dot}`} aria-hidden='true' />
                        {conn.label}
                    </span>

                    <Button
                        variant='secondary'
                        size='sm'
                        onPress={toggleTheme}
                        aria-label='Toggle theme'
                    >
                        {theme === 'dark' ? <Sun className='size-4' /> : <Moon className='size-4' />}
                    </Button>

                    <Button variant='secondary' size='sm' onPress={signOut}>
                        Sign out
                    </Button>
                </header>

                <main className='flex-1 overflow-y-auto p-6'>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
