import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Search,
    Share2,
    Server,
    Sprout,
    SlidersHorizontal,
    Sun,
    Moon,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import { useCrawlLive } from '@/shared/hooks/live/useCrawlLive';
import { useGraphFeed } from '@/modules/graph/hooks/useGraphFeed';
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
    { to: '/graph', label: 'Graph', icon: Share2 },
    { to: '/workers', label: 'Workers', icon: Server },
    { to: '/seeds', label: 'Seeds', icon: Sprout },
    { to: '/crawler', label: 'Crawler', icon: SlidersHorizontal }
];

const linkClass = (isActive: boolean): string =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        isActive
            ? 'bg-foreground/[0.06] text-foreground'
            : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
    }`;

const STATUS_DOT: Record<ChannelStatus, string> = {
    open: 'bg-[var(--chart)]',
    connecting: 'bg-warning',
    reconnecting: 'bg-warning',
    closed: 'bg-danger'
};

const STATUS_LABEL: Record<ChannelStatus, string> = {
    open: 'Live',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    closed: 'Offline'
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const { status } = useCrawlLive();
    useGraphFeed();
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

    const iconButton = 'grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground';

    return (
        <div className='flex min-h-dvh bg-background text-foreground'>
            <aside className='flex w-56 shrink-0 flex-col border-r border-foreground/10 px-3 py-4'>
                <div className='flex items-center gap-2.5 px-2 py-1'>
                    <span className='grid size-6 place-items-center rounded-md bg-[var(--chart)] text-[11px] font-bold text-white'>
                        C
                    </span>
                    <span className='text-[15px] font-semibold tracking-tight'>Crawlm</span>
                </div>

                <nav className='mt-5 flex flex-col gap-0.5'>
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

                <div className='mt-auto flex flex-col gap-3'>
                    <span className='inline-flex items-center gap-2 px-2 text-xs text-muted'>
                        <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden='true' />
                        {STATUS_LABEL[status]}
                    </span>

                    <div className='flex items-center justify-between border-t border-foreground/10 pt-3'>
                        <span className='inline-flex items-center gap-2 px-1'>
                            <span className='grid size-6 place-items-center rounded-full bg-foreground/[0.08] text-[11px] font-medium text-foreground'>
                                A
                            </span>
                            <span className='text-xs text-muted'>Administrator</span>
                        </span>

                        <div className='flex items-center gap-0.5'>
                            <button type='button' onClick={toggleTheme} aria-label='Toggle theme' className={iconButton}>
                                {theme === 'dark' ? <Sun className='size-4' /> : <Moon className='size-4' />}
                            </button>
                            <button type='button' onClick={signOut} aria-label='Sign out' className={iconButton}>
                                <LogOut className='size-4' />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className='flex-1 overflow-y-auto px-8 py-10'>
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
