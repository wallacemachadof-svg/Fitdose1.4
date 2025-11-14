import type { SVGProps } from "react";

export function StethoscopeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3" />
      <path d="M6.4 4c-.2-1.2-1-2-2.2-2.2" />
      <path d="M12.5 6.5A2.5 2.5 0 0 1 15 9V12c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1V9a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="M8 13v1.9c0 1.4-1.1 2.6-2.5 2.6S3 16.3 3 14.9V13" />
      <path d="M16 13v1.9c0 1.4 1.1 2.6 2.5 2.6s2.5-1.2 2.5-2.6V13" />
      <path d="M18.8 2.3A.3.3 0 1 1 19 2a.3.3 0 0 1 .2.3" />
      <path d="M17.6 4c.2-1.2 1-2 2.2-2.2" />
      <path d="M14 9.5V6.5" />
      <path d="M11 9.5V6.5" />
      <path d="m5.2 2.5 2.3 2.3" />
      <path d="m18.8 2.5-2.3 2.3" />
      <circle cx="12" cy="18" r="3" />
    </svg>
  );
}
