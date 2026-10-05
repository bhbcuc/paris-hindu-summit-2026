import NextImage from "next/image"
import type { CSSProperties } from "react"

/**
 * Image that bypasses the `/_next/image` optimizer for R2-backed file URLs.
 *
 * The vinext images optimizer (`imagesOptimizer()` in vite.config.ts, backed by
 * the IMAGES binding) cannot resolve the dynamic Hono file route, so
 * `/_next/image?url=/api/v1/files/*` returns 404 on Cloudflare Workers while
 * the raw `/api/v1/files/:key` route returns 200. R2 file URLs are relative,
 * so they need no `remotePatterns` entry — they are rendered as a plain
 * unoptimized `<img>` instead. Static paths (`/images/*`, Convex URLs) keep
 * full Next.js optimization.
 */
export type SmartImageProps = {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  className?: string
  style?: CSSProperties
  /**
   * Deprecated in Next.js 16 in favor of `preload`, but still honored here:
   * passed through to Next.js `Image`, mapped to eager loading on plain `<img>`.
   */
  priority?: boolean
  preload?: boolean
  "aria-hidden"?: boolean | "true" | "false"
}

const R2_FILE_PREFIX = "/api/v1/files/"

export function SmartImage({
  src,
  fill,
  priority,
  preload,
  style,
  ...rest
}: SmartImageProps) {
  if (!src.startsWith(R2_FILE_PREFIX)) {
    return (
      <NextImage
        src={src}
        fill={fill}
        priority={priority}
        preload={preload}
        style={style}
        {...rest}
      />
    )
  }

  const eager = priority || preload || undefined

  if (fill) {
    return (
      <img
        src={src}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          ...style,
        }}
        {...rest}
      />
    )
  }

  return (
    <img
      src={src}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      style={style}
      {...rest}
    />
  )
}
