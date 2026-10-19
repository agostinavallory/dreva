export function HomeBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -right-24 -top-32 h-[24rem] w-[24rem] rounded-full bg-[var(--dreva-color-brand)] opacity-[0.08] blur-3xl sm:-right-32 sm:h-[32rem] sm:w-[32rem]" />
      <div className="absolute -left-28 top-1/3 h-[20rem] w-[20rem] rounded-full bg-[var(--dreva-color-brand)] opacity-[0.06] blur-3xl sm:h-[26rem] sm:w-[26rem]" />
      <div className="absolute -bottom-28 -left-24 h-[22rem] w-[22rem] rounded-full bg-[var(--dreva-color-soft)] opacity-70 blur-3xl sm:h-[28rem] sm:w-[28rem]" />

      <svg
        className="absolute bottom-0 left-0 h-[18rem] w-full sm:h-[24rem]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 224C180 160 360 288 540 256C720 224 900 128 1080 128C1260 128 1350 176 1440 208V320H0Z"
          fill="var(--dreva-color-brand)"
          fillOpacity="0.06"
        />
        <path
          d="M0 256C180 208 360 304 540 288C720 272 900 208 1080 208C1260 208 1350 240 1440 272V320H0Z"
          fill="var(--dreva-color-brand)"
          fillOpacity="0.09"
        />
      </svg>
    </div>
  );
}
