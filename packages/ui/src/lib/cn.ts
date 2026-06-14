import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names: `clsx` resolves conditionals/arrays, then
 * `tailwind-merge` de-duplicates conflicting utilities (last wins).
 *
 * Use everywhere a component accepts an external `className` so callers can
 * override token classes predictably.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
