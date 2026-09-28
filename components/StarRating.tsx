export default function StarRating({
  rating,
  count,
  size = 14,
}: {
  rating: number;
  count?: number;
  size?: number;
}) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-label={`Rated ${rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= rounded;
          const half = !filled && i + 0.5 === rounded;
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 20 20"
              className={filled || half ? "text-amber-400" : "text-ink-200"}
              fill={half ? "url(#half)" : "currentColor"}
            >
              {half && (
                <defs>
                  <linearGradient id="half">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8L10 1.5z" />
            </svg>
          );
        })}
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-ink-400">
          {rating > 0 ? rating.toFixed(1) : "New"} {count > 0 && `(${count})`}
        </span>
      )}
    </div>
  );
}
