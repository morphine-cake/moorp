import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names, letting later Tailwind classes win (same helper as the codeva design system). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
