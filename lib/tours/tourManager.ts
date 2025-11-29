import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export type TourStep = {
  element: string
  popover: {
    title: string
    description: string
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
  }
}

export class TourManager {
  private driver: Driver
  private tourId: string
  private onComplete?: () => void

  constructor(tourId: string, steps: TourStep[], onComplete?: () => void) {
    this.tourId = tourId
    this.onComplete = onComplete

    this.driver = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.75,
      steps: steps.map(step => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side || 'bottom',
          align: step.popover.align || 'start',
          className: 'turix-tour-popover',
          closeBtnText: '✕',
          showButtons: ['next', 'previous'],
          onNextClick: () => {
            this.driver.moveNext()
          },
          onPrevClick: () => {
            this.driver.movePrevious()
          },
        },
      })),
      onDestroyStarted: () => {
        this.markAsCompleted()
        if (this.onComplete) {
          this.onComplete()
        }
      },
      onDestroyed: () => {
        // Asegurar que el tour se cierre completamente
        this.markAsCompleted()
        if (this.onComplete) {
          this.onComplete()
        }
      },
    })

    // Aplicar estilos personalizados
    this.applyCustomStyles()
  }

  private applyCustomStyles() {
    // Los estilos se aplicarán mediante CSS global
    // Esta función puede usarse para ajustes dinámicos si es necesario
  }

  start() {
    this.driver.drive()
  }

  destroy() {
    this.driver.destroy()
  }

  private markAsCompleted() {
    if (typeof window !== 'undefined') {
      const completedTours = TourManager.getCompletedTours()
      completedTours.push(this.tourId)
      localStorage.setItem('turix_completed_tours', JSON.stringify(completedTours))
    }
  }

  static isTourCompleted(tourId: string): boolean {
    if (typeof window === 'undefined') return false
    const completedTours = TourManager.getCompletedTours()
    return completedTours.includes(tourId)
  }

  static getCompletedTours(): string[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('turix_completed_tours')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static resetTour(tourId: string) {
    if (typeof window === 'undefined') return
    const completedTours = TourManager.getCompletedTours()
    const filtered = completedTours.filter(id => id !== tourId)
    localStorage.setItem('turix_completed_tours', JSON.stringify(filtered))
  }

  static resetAllTours() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('turix_completed_tours')
  }
}

