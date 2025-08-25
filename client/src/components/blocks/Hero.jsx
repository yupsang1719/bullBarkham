// src/components/blocks/Hero.jsx
export default function Hero({
  headline,
  subhead,
  ctas = [],
  bgImage,
  rightImage,
  rightImageAlt = "",
  overlay = true,
  minH = "min-h-[420px] md:min-h-[520px]"
}) {
  return (
    <section
      className={`section relative isolate ${bgImage ? 'bg-black' : 'bg-white'}`}
      aria-label="Hero section"
    >
      {/* Background image */}
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          {overlay && (
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/80 to-transparent" />
          )}
        </>
      )}

      {/* Content */}
      <div
        className={`container-outer grid gap-6 md:grid-cols-2 items-center relative z-10 ${bgImage ? 'text-white' : ''} ${minH}`}
      >
        <div>
          <h1 className="h1 relative inline-block pb-2">
            {headline}
            {/* Gold underline */}
            <span className="absolute left-0 bottom-0 w-16 h-1 bg-bull-gold rounded-full"></span>
          </h1>
          <p className={`mt-4 text-lg ${bgImage ? 'text-white/85' : 'text-black/70'}`}>
            {subhead}
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            {ctas.map((c, i) => {
              const base = i === 0 ? 'btn btn-primary' : 'btn btn-ghost'
              const darkClasses = bgImage
                ? (i === 0
                    ? 'bg-white text-bull-ink hover:opacity-90'
                    : 'border-white text-white hover:bg-white/10')
                : ''
              return (
                <a
                  key={i}
                  href={c.href}
                  className={`${base} ${darkClasses}`}
                  aria-label={c.label}
                >
                  {c.label}
                </a>
              )
            })}
          </div>
        </div>

        {/* Right side visual */}
        <div>
          {rightImage ? (
            <img
              src={rightImage}
              alt={rightImageAlt}
              className="h-56 md:h-72 w-full rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`h-56 md:h-72 rounded-lg ${
                bgImage ? 'bg-white/15' : 'bg-bull-green/10'
              }`}
            />
          )}
        </div>
      </div>
    </section>
  )
}
