import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Globe,
    Sprout,
    SlidersHorizontal,
    KeyRound,
    Search,
    Map,
    Network,
    Flame,
    Sun,
    Moon,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown
} from 'lucide-react';
import GlobalSearch from '@/shared/components/layout/GlobalSearch';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import type { ComponentType } from 'react';
import type { Theme } from '@/shared/utils/theme';

const SIDEBAR_KEY = 'crawlm.sidebar';

interface NavItem{
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    end?: boolean;
}

interface NavSection{
    label?: string;
    items: NavItem[];
}

// Firecrawl-style grouped sidebar: the playground endpoints are first-class
// destinations, deep-linked through the ?endpoint= param.
const SECTIONS: NavSection[] = [
    {
        items: [{ to: '/', label: 'Overview', icon: LayoutDashboard, end: true }]
    },
    {
        label: 'Playground',
        items: [
            { to: '/playground?endpoint=search', label: 'Search the index', icon: Search },
            { to: '/playground?endpoint=scrape', label: 'Scrape a web page', icon: FileText },
            { to: '/playground?endpoint=map', label: 'Map website links', icon: Map },
            { to: '/playground?endpoint=crawl', label: 'Crawl entire website', icon: Network }
        ]
    },
    {
        label: 'Index',
        items: [
            { to: '/pages', label: 'Pages', icon: FileText },
            { to: '/domains', label: 'Domains', icon: Globe },
            { to: '/seeds', label: 'Seeds', icon: Sprout }
        ]
    },
    {
        label: 'System',
        items: [
            { to: '/crawler', label: 'Crawler', icon: SlidersHorizontal },
            { to: '/keys', label: 'API Keys', icon: KeyRound }
        ]
    }
];

const linkClass = (active: boolean, collapsed: boolean): string =>
    `mx-2 flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors ${
        collapsed ? 'justify-center px-0' : 'px-2'
    } ${
        active
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
    }`;

const DashboardLayout = () => {
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const [theme, setTheme] = useState<Theme>(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === 'collapsed');

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    };

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'open');
    };

    const signOut = () => {
        useAuthStore.getState().clear();
        navigate('/sign-in');
    };

    // NavLink can't see query strings, so playground links resolve their own active
    // state: same path + same ?endpoint= (absent param defaults to "search").
    const isItemActive = (item: NavItem, routeActive: boolean): boolean => {
        const [path, query] = item.to.split('?');
        if(!query) return routeActive;
        if(pathname !== path) return false;
        const want = new URLSearchParams(query).get('endpoint') ?? 'search';
        const got = new URLSearchParams(search).get('endpoint') ?? 'search';
        return want === got;
    };

    const iconButton = 'grid size-8 place-items-center rounded-lg border border-hairline text-muted transition-colors hover:bg-foreground/5 hover:text-foreground';
    const CollapseIcon = collapsed ? ChevronsRight : ChevronsLeft;

    return (
        <div className='flex h-dvh bg-background text-foreground'>
            <aside
                className={`flex shrink-0 flex-col border-r border-hairline transition-[width] duration-200 ${
                    collapsed ? 'w-[64px]' : 'w-60'
                }`}
            >
                <div className={`flex h-14 items-center gap-2 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
                    <Flame className='size-5 shrink-0 text-accent' fill='currentColor' />
                    {collapsed ? null : <span className='text-[15px] font-semibold tracking-tight'>Crawlm</span>}
                </div>

                <nav className='flex flex-1 flex-col overflow-x-hidden overflow-y-auto pt-1 pb-4'>
                    {SECTIONS.map((section, index) => (
                        <div key={section.label ?? index} className='flex flex-col gap-0.5'>
                            {section.label ? (
                                collapsed
                                    ? <div className='mx-3 mt-3 mb-2 border-t border-hairline' aria-hidden='true' />
                                    : (
                                        <span className='px-4 pt-5 pb-1.5 text-[10px] font-medium tracking-[0.1em] text-muted/60 uppercase'>
                                            {section.label}
                                        </span>
                                    )
                            ) : null}
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.end}
                                        title={collapsed ? item.label : undefined}
                                        className={({ isActive }) => linkClass(isItemActive(item, isActive), collapsed)}
                                    >
                                        <span className='flex size-5 shrink-0 items-center justify-center'>
                                            <Icon className='size-4' />
                                        </span>
                                        {collapsed ? null : <span className='truncate'>{item.label}</span>}
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className={`flex items-center gap-2.5 border-t border-hairline py-3 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
                    <span className='grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[10px] font-semibold text-accent'>
                        AD
                    </span>
                    {collapsed ? null : <span className='truncate text-xs text-muted'>Administrator</span>}
                </div>

                <div className={`pb-3 ${collapsed ? 'px-2' : 'px-3'}`}>
                    <button
                        type='button'
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className='flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-hairline text-[13px] text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                    >
                        <CollapseIcon className='size-4' />
                        {collapsed ? null : 'Collapse'}
                    </button>
                </div>
            </aside>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                <header className='flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-4'>
                    <span className='inline-flex items-center gap-2 rounded-lg border border-hairline px-2.5 py-1.5 text-[13px] text-foreground'>
                        <span className='grid size-[18px] shrink-0 place-items-center rounded bg-accent font-mono text-[10px] font-bold text-accent-foreground'>
                            P
                        </span>
                        Personal
                        <ChevronDown className='size-3.5 text-muted' />
                    </span>
                    <div className='min-w-0 flex-1' />
                    <GlobalSearch />
                    <button type='button' onClick={toggleTheme} aria-label='Toggle theme' className={iconButton}>
                        {theme === 'dark' ? <Sun className='size-4' /> : <Moon className='size-4' />}
                    </button>
                    <button type='button' onClick={signOut} aria-label='Sign out' className={iconButton}>
                        <LogOut className='size-4' />
                    </button>
                </header>
                <main className='relative min-h-0 flex-1 overflow-y-scroll px-8 pb-10'>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
