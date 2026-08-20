import { NoSymbolIcon as BanIcon } from '@heroicons/react/24/outline';
import ErrorPage from '@/Components/ErrorPage';

export default function AccountDeactivated() {
    return (
        <ErrorPage
            title="Аккаунт заблокирован"
            message="Ваш аккаунт был деактивирован. Обратитесь к администратору"
            icon={BanIcon}
            color="red"
            actionLabel="Выйти"
            actionHref="/logout"
            actionMethod="post"
        />
    );
}
