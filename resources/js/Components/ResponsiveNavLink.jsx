import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-indigo-400 bg-indigo-500/15 text-indigo-300 focus:border-indigo-700 focus:bg-indigo-500/20 focus:text-indigo-200'
                    : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:border-slate-700 focus:bg-[#1a2740] focus:text-white'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
