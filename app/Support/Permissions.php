<?php

declare(strict_types=1);

namespace App\Support;

final class Permissions
{
    public const VIEW_STORES = 'view-stores';

    public const CREATE_STORES = 'create-stores';

    public const EDIT_STORES = 'edit-stores';

    public const DELETE_STORES = 'delete-stores';

    public const RESTORE_STORES = 'restore-stores';

    public const VIEW_DEPARTMENTS = 'view-departments';

    public const CREATE_DEPARTMENTS = 'create-departments';

    public const EDIT_DEPARTMENTS = 'edit-departments';

    public const DELETE_DEPARTMENTS = 'delete-departments';

    public const VIEW_SHELVES = 'view-shelves';

    public const CREATE_SHELVES = 'create-shelves';

    public const EDIT_SHELVES = 'edit-shelves';

    public const DELETE_SHELVES = 'delete-shelves';

    public const VIEW_COOLERS = 'view-coolers';

    public const CREATE_COOLERS = 'create-coolers';

    public const EDIT_COOLERS = 'edit-coolers';

    public const DELETE_COOLERS = 'delete-coolers';

    public const VIEW_STANDS = 'view-stands';

    public const CREATE_STANDS = 'create-stands';

    public const EDIT_STANDS = 'edit-stands';

    public const DELETE_STANDS = 'delete-stands';

    public const VIEW_PRODUCTS = 'view-products';

    public const CREATE_PRODUCTS = 'create-products';

    public const EDIT_PRODUCTS = 'edit-products';

    public const DELETE_PRODUCTS = 'delete-products';

    public const IMPORT_PRODUCTS = 'import-products';

    public const VIEW_PLANOGRAMS = 'view-planograms';

    public const CREATE_PLANOGRAMS = 'create-planograms';

    public const EDIT_PLANOGRAMS = 'edit-planograms';

    public const DELETE_PLANOGRAMS = 'delete-planograms';

    public const MANAGE_PLANOGRAMS = 'manage-planograms';

    public const VIEW_EXPORT = 'view-export';

    public const GENERATE_EXPORT = 'generate-export';

    public const DOWNLOAD_EXPORT = 'download-export';

    public const FIREBASE_EXPORT = 'firebase-export';

    public const VIEW_USERS = 'view-users';

    public const CREATE_USERS = 'create-users';

    public const EDIT_USERS = 'edit-users';

    public const BLOCK_USERS = 'block-users';

    public const DELETE_USERS = 'delete-users';

    public const VIEW_AUDIT_LOGS = 'view-audit-logs';

    public const VIEW_LOGIN_LOGS = 'view-login-logs';

    public const VIEW_SYSTEM_LOGS = 'view-system-logs';

    public const EDIT_PROFILE = 'edit-profile';

    public const EDIT_SECURITY = 'edit-security';

    public const EDIT_INTEGRATIONS = 'edit-integrations';

    public const VIEW_ANALYTICS = 'view-analytics';

    public const MANAGE_TENANTS = 'manage-tenants';

    public const MANAGE_PLANS = 'manage-plans';

    public const MANAGE_BILLING = 'manage-billing';

    public const MANAGE_INVOICES = 'manage-invoices';

    public const MANAGE_LEGAL = 'manage-legal';

    public const MANAGE_DATABASE = 'manage-database';

    public const ROLE_SUPER_ADMIN = 'Super Admin';

    public const ROLE_DEPUTY = 'Заместитель';

    public const ROLE_HEAD = 'Заведующий';

    public const ROLE_PROGRAMMER = 'Программист';

    public const ROLE_MERCHANDISER = 'Мерчандайзер';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::VIEW_STORES,
            self::CREATE_STORES,
            self::EDIT_STORES,
            self::DELETE_STORES,
            self::RESTORE_STORES,
            self::VIEW_DEPARTMENTS,
            self::CREATE_DEPARTMENTS,
            self::EDIT_DEPARTMENTS,
            self::DELETE_DEPARTMENTS,
            self::VIEW_SHELVES,
            self::CREATE_SHELVES,
            self::EDIT_SHELVES,
            self::DELETE_SHELVES,
            self::VIEW_COOLERS,
            self::CREATE_COOLERS,
            self::EDIT_COOLERS,
            self::DELETE_COOLERS,
            self::VIEW_STANDS,
            self::CREATE_STANDS,
            self::EDIT_STANDS,
            self::DELETE_STANDS,
            self::VIEW_PRODUCTS,
            self::CREATE_PRODUCTS,
            self::EDIT_PRODUCTS,
            self::DELETE_PRODUCTS,
            self::IMPORT_PRODUCTS,
            self::VIEW_PLANOGRAMS,
            self::CREATE_PLANOGRAMS,
            self::EDIT_PLANOGRAMS,
            self::DELETE_PLANOGRAMS,
            self::MANAGE_PLANOGRAMS,
            self::VIEW_EXPORT,
            self::GENERATE_EXPORT,
            self::DOWNLOAD_EXPORT,
            self::FIREBASE_EXPORT,
            self::VIEW_USERS,
            self::CREATE_USERS,
            self::EDIT_USERS,
            self::BLOCK_USERS,
            self::DELETE_USERS,
            self::VIEW_AUDIT_LOGS,
            self::VIEW_LOGIN_LOGS,
            self::VIEW_SYSTEM_LOGS,
            self::EDIT_PROFILE,
            self::EDIT_SECURITY,
            self::EDIT_INTEGRATIONS,
            self::VIEW_ANALYTICS,
            self::MANAGE_TENANTS,
            self::MANAGE_PLANS,
            self::MANAGE_BILLING,
            self::MANAGE_INVOICES,
            self::MANAGE_LEGAL,
            self::MANAGE_DATABASE,
        ];
    }

    /**
     * @return list<string>
     */
    public static function roles(): array
    {
        return [
            self::ROLE_SUPER_ADMIN,
            self::ROLE_DEPUTY,
            self::ROLE_HEAD,
            self::ROLE_PROGRAMMER,
            self::ROLE_MERCHANDISER,
        ];
    }

    /**
     * @return list<string>
     */
    public static function forDeputy(): array
    {
        $excluded = [
            self::DELETE_STORES,
            self::RESTORE_STORES,
            self::DELETE_DEPARTMENTS,
            self::DELETE_SHELVES,
            self::DELETE_COOLERS,
            self::DELETE_STANDS,
            self::DELETE_PRODUCTS,
            self::DELETE_PLANOGRAMS,
            self::DELETE_USERS,
            self::BLOCK_USERS,
            self::EDIT_INTEGRATIONS,
            self::VIEW_SYSTEM_LOGS,
            self::MANAGE_TENANTS,
            self::MANAGE_PLANS,
            self::MANAGE_INVOICES,
            self::MANAGE_LEGAL,
            self::MANAGE_DATABASE,
        ];

        return array_values(array_diff(self::all(), $excluded));
    }

    /**
     * @return list<string>
     */
    public static function forHead(): array
    {
        return [
            self::VIEW_STORES,
            self::VIEW_DEPARTMENTS,
            self::EDIT_DEPARTMENTS,
            self::VIEW_SHELVES,
            self::CREATE_SHELVES,
            self::EDIT_SHELVES,
            self::VIEW_COOLERS,
            self::CREATE_COOLERS,
            self::EDIT_COOLERS,
            self::VIEW_STANDS,
            self::CREATE_STANDS,
            self::EDIT_STANDS,
            self::VIEW_PRODUCTS,
            self::CREATE_PRODUCTS,
            self::EDIT_PRODUCTS,
            self::VIEW_PLANOGRAMS,
            self::CREATE_PLANOGRAMS,
            self::EDIT_PLANOGRAMS,
            self::MANAGE_PLANOGRAMS,
            self::EDIT_PROFILE,
        ];
    }

    /**
     * @return list<string>
     */
    public static function forProgrammer(): array
    {
        $views = array_values(array_filter(
            self::all(),
            fn (string $permission): bool => str_starts_with($permission, 'view-'),
        ));

        return array_values(array_unique([
            ...$views,
            self::GENERATE_EXPORT,
            self::DOWNLOAD_EXPORT,
            self::FIREBASE_EXPORT,
            self::EDIT_INTEGRATIONS,
        ]));
    }

    /**
     * @return list<string>
     */
    public static function forMerchandiser(): array
    {
        return [
            self::VIEW_PLANOGRAMS,
            self::VIEW_PRODUCTS,
        ];
    }

    /**
     * @return list<string>
     */
    public static function tenantRoles(): array
    {
        return [
            self::ROLE_DEPUTY,
            self::ROLE_HEAD,
            self::ROLE_PROGRAMMER,
            self::ROLE_MERCHANDISER,
        ];
    }
}
