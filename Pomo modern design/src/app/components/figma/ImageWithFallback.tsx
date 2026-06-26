import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHZpZXdCb3g9IjAgMCA4OCA4OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTY2LjM3NzkgMTQuNjczOEM3MC4yNTIzIDE0Ljg3MDUgNzMuMzMzOCAxOC4wNzM5IDczLjMzNCAyMS45OTcxVjY1Ljk5NzFMNzMuMzI0MiA2Ni4zNzVDNzMuMTMzOSA3MC4xMjQzIDcwLjEyNzIgNzMuMTMxIDY2LjM3NzkgNzMuMzIxM0w2NiA3My4zMzExSDIyTDIxLjYyMyA3My4zMjEzQzE3Ljg3MzUgNzMuMTMxMyAxNC44NjcxIDcwLjEyNDUgMTQuNjc2OCA2Ni4zNzVMMTQuNjY3IDY1Ljk5NzFWMjEuOTk3MUMxNC42NjcyIDE4LjA3MzcgMTcuNzQ4NCAxNC44NzAyIDIxLjYyMyAxNC42NzM4TDIyIDE0LjY2NDFINjZMNjYuMzc3OSAxNC42NzM4Wk0xOC4zMzQgNTcuNTg2OVY2NS45OTcxQzE4LjMzNDIgNjguMDIxOSAxOS45NzUyIDY5LjY2MzkgMjIgNjkuNjY0MUg1OS43NDEyTDMyLjk5OSA0Mi45MjE5TDE4LjMzNCA1Ny41ODY5Wk0yMiAxOC4zMzExQzE5Ljk3NTIgMTguMzMxMiAxOC4zMzQyIDE5Ljk3MjMgMTguMzM0IDIxLjk5NzFWNTIuNDA0M0wzMS43MDQxIDM5LjAzNDJMMzEuODQyOCAzOC45MDgyQzMyLjU2MjggMzguMzIwOSAzMy42MjQ3IDM4LjM2MzEgMzQuMjk1OSAzOS4wMzQyTDY0LjkyNjggNjkuNjY0MUg2NkM2OC4wMjQ4IDY5LjY2MzkgNjkuNjY2OCA2OC4wMjE5IDY5LjY2NyA2NS45OTcxVjIxLjk5NzFDNjkuNjY2OCAxOS45NzIzIDY4LjAyNDggMTguMzMxMiA2NiAxOC4zMzExSDIyWk01My42Mzg3IDI1LjY3NThDNTguNDgxOSAyNS45MjE0IDYyLjMzMyAyOS45MjY4IDYyLjMzMyAzNC44MzExTDYyLjMyMTMgMzUuMzAyN0M2Mi4wNzU1IDQwLjE0NTcgNTguMDcxIDQzLjk5NjkgNTMuMTY3IDQzLjk5NzFMNTIuNjk1MyA0My45ODU0QzQ4LjAwODIgNDMuNzQ3OSA0NC4yNDk2IDM5Ljk4OTcgNDQuMDExNyAzNS4zMDI3TDQ0IDM0LjgzMTFDNDQgMjkuNzY4NCA0OC4xMDQ0IDI1LjY2NDEgNTMuMTY3IDI1LjY2NDFMNTMuNjM4NyAyNS42NzU4Wk01My4xNjcgMjkuMzMxMUM1MC4xMjk0IDI5LjMzMTEgNDcuNjY3IDMxLjc5MzUgNDcuNjY3IDM0LjgzMTFDNDcuNjY3MyAzNy44NjgzIDUwLjEyOTYgNDAuMzMxMSA1My4xNjcgNDAuMzMxMUM1Ni4yMDQyIDQwLjMzMDkgNTguNjY2NiAzNy44NjgyIDU4LjY2NyAzNC44MzExQzU4LjY2NyAzMS43OTM2IDU2LjIwNDQgMjkuMzMxMiA1My4xNjcgMjkuMzMxMVoiIGZpbGw9ImJsYWNrIiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4K'

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
