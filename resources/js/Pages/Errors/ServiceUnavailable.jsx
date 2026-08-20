import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function ServiceUnavailable() {
    return (
        <ErrorPage
            code="503"
            title="Техобслуживание"
            message="Сайт временно недоступен"
            icon={WrenchScrewdriverIcon}
            color="blue"
            actionLabel="Обновить"
            onAction={() => window.location.reload()}
        />
    );
}
