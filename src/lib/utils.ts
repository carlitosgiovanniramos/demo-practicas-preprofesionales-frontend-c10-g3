import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind.config.ts define tamaños numéricos (`text-14`, `text-16`...). tailwind-merge
// solo reconoce tamaños con nombre (sm, base...) y los trata como color, así que
// `text-14` pisaba el color de `text-surface` y los botones primarios quedaban con
// texto oscuro sobre azul marino. Declaramos esos tamaños para que se fusionen bien.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["11", "12", "13", "14", "15", "16", "17", "19", "20", "22", "26", "28", "40"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Concuerda un sustantivo con su cantidad: `plural(1, 'oferta', 'ofertas')`
 * devuelve `"1 oferta"`. Vive acá para que las pantallas no repitan el mismo
 * ternario en cada contador.
 */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
