import { Loading } from '@/components/ui/Loading'

/**
 * Global loading page for Next.js
 * This will be shown during page transitions
 */
export default function LoadingPage() {
  return <Loading fullScreen text="載入中..." />
}
