import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function TooManyRequests() {
    return (
        <ErrorPage
            code="429"
            title="Слишком много запросов"
            message="Подождите немного и попробуйте снова"
            icon={ExclamationTriangleIcon}
            color="purple"
            actionLabel="Обновить"
            onAction={() => window.location.reload()}
        />
    );
}
