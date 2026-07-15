import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Search,
    FileText,
    Globe,
    ListOrdered,
    Sprout,
    SlidersHorizontal,
    Sun,
    Moon,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import type { ComponentType } from 'react';
import type { Theme } from '@/shared/utils/theme';

interface NavItem{
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/pages', label: 'Pages', icon: FileText },
    { to: '/domains', label: 'Domains', icon: Globe },
    { to: '/queue', label: 'Queue', icon: ListOrdered },
    { to: '/seeds', label: 'Seeds', icon: Sprout },
    { to: '/crawler', label: 'Crawler', icon: SlidersHorizontal }
];

// Borderless nav row, Pollium style: active = weight + full-strength ink, no pill.
const linkClass = (isActive: boolean): string =>
    `flex h-8 items-center gap-2.5 px-2 text-sm transition-colors ${
        isActive ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
    }`;

const DashboardLayout = () => {
    const navigate = useNavigate();
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

    const iconButton = 'grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-foreground/10 hover:text-foreground';

    return (
        <div className='flex h-dvh gap-1 bg-background p-2 text-foreground'>
            <aside className='flex w-56 shrink-0 flex-col px-2 py-2'>
                <nav className='mt-2 flex flex-col gap-0.5'>
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkClass(isActive)}>
                                <span className='flex size-6 shrink-0 items-center justify-center'>
                                    <Icon className='size-[18px]' />
                                </span>
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className='mt-auto flex items-center justify-between px-1 pt-3'>
                    <span className='inline-flex items-center gap-2'>
                        <span className='grid size-6 place-items-center rounded-full bg-foreground/10 text-[11px] font-medium text-foreground'>
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
            </aside>

            <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl'>
                <main className='relative min-h-0 flex-1 overflow-y-scroll px-6 pb-8'>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
