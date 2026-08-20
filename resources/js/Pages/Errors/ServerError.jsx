import { ServerIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function ServerError() {
    return (
        <ErrorPage
            code="500"
            title="Ошибка сервера"
            message="Что-то пошло не так. Мы уже работаем над этим"
            icon={ServerIcon}
            color="red"
            actionLabel="Обновить"
            onAction={() => window.location.reload()}
        />
    );
}
