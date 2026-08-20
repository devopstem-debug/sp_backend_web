import { LockClosedIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function Forbidden() {
    return (
        <ErrorPage
            code="403"
            title="Доступ запрещён"
            message="У вас нет прав для просмотра этой страницы"
            icon={LockClosedIcon}
            color="red"
            actionLabel="Вернуться на дашборд"
            actionHref="/dashboard"
        />
    );
}
