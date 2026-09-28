// Inline SVG brand mark - no external image file to go missing or slow
// down the header/footer on every single page load.
export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#08090b" />
      <path
        d="M10 8h8.5a4 4 0 0 1 2.1 7.4A4.5 4.5 0 0 1 19 24H10V8Zm3.4 3.2v5h4.6a2.5 2.5 0 0 0 0-5h-4.6Zm0 8.1v4.9h5.1a2.45 2.45 0 0 0 0-4.9h-5.1Z"
        fill="#fff"
      />
      <circle cx="24.5" cy="9.5" r="2" fill="#3452ff" />
    </svg>
  );
}
