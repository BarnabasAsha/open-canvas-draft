interface GoogleIconProps {
  size?: number;
}

export function GoogleIcon({ size = 17 }: GoogleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3a11.5 11.5 0 0 0 10.3 6.4Z"
      />
      <path fill="#FBBC05" d="M5.5 14.1a7 7 0 0 1 0-4.4v-3H1.7a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
      <path
        fill="#EA4335"
        d="M12 5c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.7 6.7l3.8 3C6.4 7 9 5 12 5Z"
      />
    </svg>
  );
}
