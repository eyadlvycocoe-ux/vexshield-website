type YouTubeEmbedProps = {
  videoId: string;
  title: string;
  className?: string;
  /** Use youtube-nocookie.com (default) for privacy-enhanced embeds. */
  privacyEnhanced?: boolean;
};

function buildEmbedSrc(videoId: string, privacyEnhanced: boolean): string {
  const host = privacyEnhanced ? "www.youtube-nocookie.com" : "www.youtube.com";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://aircore.xyz";
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    origin,
  });
  return `https://${host}/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/** YouTube iframe with referrer + origin (required to avoid Error 153). */
export function YouTubeEmbed({
  videoId,
  title,
  className = "absolute inset-0 h-full w-full border-0",
  privacyEnhanced = true,
}: YouTubeEmbedProps) {
  return (
    <iframe
      className={className}
      src={buildEmbedSrc(videoId, privacyEnhanced)}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

export const AIRSHIELD_SHOWCASE_VIDEO_ID = "a9A5feovE3o";
