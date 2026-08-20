import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function NotFound() {
    return (
        <ErrorPage
            code="404"
            title="Страница не найдена"
            message="То, что вы ищете, не существует"
            icon={MagnifyingGlassIcon}
            color="yellow"
            actionLabel="Вернуться на дашборд"
            actionHref="/dashboard"
        />
    );
}
