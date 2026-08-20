import { usePage } from '@inertiajs/react';

export function usePermissions() {
    return usePage().props.auth?.permissions || [];
}

export function useCan() {
    const permissions = usePermissions();

    return (name, ...rest) => {
        const names = [name, ...rest].filter(Boolean);

        return names.some((permission) => permissions.includes(permission));
    };
}
