"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import { useEffect } from "react"

const BrandingHelmet = () => {
  const { brandName } = useThemeStore()

  useEffect(() => {
    if (brandName) {
      document.title = brandName
    }
  }, [brandName])

  return null
}

export default BrandingHelmet
