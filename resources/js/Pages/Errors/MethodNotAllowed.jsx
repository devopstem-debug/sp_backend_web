import { NoSymbolIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function MethodNotAllowed() {
    return (
        <ErrorPage
            code="405"
            title="Метод не разрешён"
            message="Страница открыта неправильным способом (часто после обновления формы). Вернитесь и повторите действие."
            icon={NoSymbolIcon}
            color="orange"
            actionLabel="На главную"
            actionHref="/dashboard"
        />
    );
}
