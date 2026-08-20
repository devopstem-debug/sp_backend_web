export default function ApplicationLogo({ className = '', ...props }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M4 6.5h16M4 12h10M4 17.5h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx="18" cy="12" r="2" fill="currentColor" />
        </svg>
    );
}
