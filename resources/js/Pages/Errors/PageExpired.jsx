import { ClockIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function PageExpired() {
    return (
        <ErrorPage
            code="419"
            title="Страница устарела"
            message="CSRF токен истёк. Обновите страницу"
            icon={ClockIcon}
            color="orange"
            actionLabel="Обновить"
            onAction={() => window.location.reload()}
        />
    );
}
