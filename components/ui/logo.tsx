import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  href?: string
  className?: string
  showText?: boolean
}

export function Logo({ href = "/", className, showText = true }: LogoProps) {
  const logoContent = (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center">
        <span className="text-2xl font-mono font-bold text-primary">&lt;/&gt;</span>
      </div>
      {showText && (
        <span className="text-xl font-bold">Snipt</span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
