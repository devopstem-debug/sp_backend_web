import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const darkPopupClasses = {
    popup: '!rounded-2xl !border !border-slate-700 !bg-slate-900 !text-slate-100 !shadow-2xl',
    title: '!text-lg !font-semibold !text-white',
    htmlContainer: '!text-sm !text-slate-300',
    actions: '!gap-3',
    confirmButton:
        '!m-0 !rounded-xl !border-0 !bg-indigo-600 !px-4 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-indigo-500 focus:!ring-2 focus:!ring-indigo-400 focus:!ring-offset-2 focus:!ring-offset-slate-900',
    cancelButton:
        '!m-0 !rounded-xl !border !border-slate-600 !bg-slate-800 !px-4 !py-2.5 !text-sm !font-semibold !text-slate-200 hover:!bg-slate-700 focus:!ring-2 focus:!ring-slate-500 focus:!ring-offset-2 focus:!ring-offset-slate-900',
    denyButton:
        '!m-0 !rounded-xl !border-0 !bg-red-600 !px-4 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-red-500',
    icon: '!border-slate-600',
};

const darkToastClasses = {
    popup: '!rounded-xl !border !border-slate-700 !bg-slate-900 !text-slate-100 !shadow-lg',
    title: '!text-sm !font-medium !text-slate-100',
    htmlContainer: '!text-sm !text-slate-300',
    timerProgressBar: '!bg-indigo-500',
};

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: darkToastClasses,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

/**
 * Диалог подтверждения (удаление и т.п.).
 * @returns {Promise<boolean>} true, если пользователь подтвердил
 */
export async function fireConfirm(
    title = 'Удалить?',
    text = 'Это действие нельзя отменить.',
    confirmButtonText = 'Удалить',
) {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        reverseButtons: true,
        focusCancel: true,
        confirmButtonText,
        cancelButtonText: 'Отмена',
        buttonsStyling: false,
        customClass: {
            ...darkPopupClasses,
            confirmButton:
                confirmButtonText === 'Удалить' || confirmButtonText === 'Удалить навсегда'
                    ? '!m-0 !rounded-xl !border-0 !bg-red-600 !px-4 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-red-500 focus:!ring-2 focus:!ring-red-400 focus:!ring-offset-2 focus:!ring-offset-slate-900'
                    : darkPopupClasses.confirmButton,
        },
    });

    return result.isConfirmed;
}

/**
 * Toast-уведомление.
 * @param {'success'|'error'|'warning'|'info'|'question'} type
 * @param {string} message
 */
export function fireToast(type, message) {
    return Toast.fire({
        icon: type,
        title: message,
    });
}

/**
 * Toast об успехе.
 * @param {string} message
 */
export function fireSuccess(message) {
    return fireToast('success', message);
}

/**
 * Toast об ошибке.
 * @param {string} message
 */
export function fireError(message) {
    return fireToast('error', message);
}

/**
 * Модальное окно блокировки с обратным отсчётом.
 * @param {number} seconds
 */
export function fireLockout(seconds) {
    const total = Math.max(1, Math.ceil(seconds));
    const endAt = Date.now() + total * 1000;

    const format = (value) => {
        const mins = Math.floor(value / 60);
        const secs = value % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return Swal.fire({
        icon: 'warning',
        title: 'Вход временно заблокирован',
        html: `<p class="mb-2">Слишком много неудачных попыток.</p>
               <p class="text-2xl font-bold tracking-widest text-white" id="swal-lockout-timer">${format(total)}</p>
               <p class="mt-2 text-slate-400">Повторите попытку после окончания таймера.</p>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        buttonsStyling: false,
        customClass: darkPopupClasses,
        didOpen: () => {
            const timerEl = document.getElementById('swal-lockout-timer');
            const tick = () => {
                const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
                if (timerEl) {
                    timerEl.textContent = format(left);
                }
                if (left <= 0) {
                    Swal.close();
                }
            };
            tick();
            const intervalId = window.setInterval(tick, 250);
            Swal.getPopup()?.setAttribute('data-lockout-interval', String(intervalId));
        },
        willClose: () => {
            const popup = Swal.getPopup();
            const intervalId = popup?.getAttribute('data-lockout-interval');
            if (intervalId) {
                window.clearInterval(Number(intervalId));
            }
        },
    });
}

export default {
    fireConfirm,
    fireToast,
    fireSuccess,
    fireError,
    fireLockout,
};
