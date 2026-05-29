// Helper de clases para estilos condicionales (similar a clsx + tailwind-merge)
export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
