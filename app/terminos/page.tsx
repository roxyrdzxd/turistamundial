'use client'

import Link from 'next/link'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Inicio</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Términos y Condiciones</h1>
          <p className="text-white/80">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 sm:p-8 border border-white/20 space-y-6 text-white/90">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Aceptación de los Términos</h2>
            <p className="mb-4">
              Al acceder y utilizar Turix - Turista Mundial Virtual ("la Plataforma", "nosotros", "nuestro"), usted acepta estar sujeto a estos Términos y Condiciones y a todas las leyes y regulaciones aplicables.
            </p>
            <p className="mb-4">
              Si no está de acuerdo con alguno de estos términos, no debe usar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Descripción del Servicio</h2>
            <p className="mb-4">
              Turix es una plataforma de juego en línea que permite a los usuarios jugar una versión virtual del juego de mesa "Turista Mundial" con otros jugadores en tiempo real.
            </p>
            <p className="mb-4">
              La plataforma incluye:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Juego multijugador en tiempo real</li>
              <li>Sistema de moneda virtual (TuristaCoins)</li>
              <li>Tienda de avatares y personalización</li>
              <li>Sistema de misiones y logros</li>
              <li>Tableros temáticos múltiples</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Registro y Cuenta de Usuario</h2>
            <p className="mb-4">
              Para usar nuestros servicios, debe:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Tener al menos 13 años de edad</li>
              <li>Proporcionar información precisa y completa</li>
              <li>Mantener la seguridad de su cuenta y contraseña</li>
              <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
              <li>Ser responsable de todas las actividades bajo su cuenta</li>
            </ul>
            <p className="mb-4">
              Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Conducta del Usuario</h2>
            <p className="mb-4">Usted se compromete a:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Usar la plataforma de manera legal y ética</li>
              <li>No realizar actividades fraudulentas o engañosas</li>
              <li>No interferir con el funcionamiento de la plataforma</li>
              <li>No intentar acceder a áreas restringidas</li>
              <li>No usar bots, scripts o herramientas automatizadas</li>
              <li>No acosar, amenazar o dañar a otros usuarios</li>
              <li>No compartir contenido ofensivo, ilegal o inapropiado</li>
              <li>Respetar los derechos de propiedad intelectual</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Moneda Virtual y Compras</h2>
            <p className="mb-4">
              <strong>TuristaCoins:</strong> La moneda virtual de la plataforma puede obtenerse mediante:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Completar misiones y logros</li>
              <li>Compras con dinero real a través de Mercado Pago</li>
              <li>Sistema de referidos</li>
            </ul>
            <p className="mb-4">
              <strong>Compras:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Las compras de TuristaCoins son finales y no reembolsables, excepto según lo requerido por ley</li>
              <li>Los precios pueden cambiar sin previo aviso</li>
              <li>Las compras se procesan a través de Mercado Pago, sujeto a sus términos y condiciones</li>
            </ul>
            <p className="mb-4">
              <strong>Propiedad:</strong> Los TuristaCoins y los items comprados son licencias de uso dentro de la plataforma y no tienen valor monetario real.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Propiedad Intelectual</h2>
            <p className="mb-4">
              Todo el contenido de la plataforma, incluyendo pero no limitado a diseño, gráficos, código, logos, y nombres, es propiedad de Turix o sus licenciantes y está protegido por leyes de propiedad intelectual.
            </p>
            <p className="mb-4">
              Usted no puede:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Copiar, modificar o distribuir el contenido sin autorización</li>
              <li>Usar nuestros nombres o marcas sin permiso</li>
              <li>Realizar ingeniería inversa del software</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Disponibilidad del Servicio</h2>
            <p className="mb-4">
              Nos esforzamos por mantener la plataforma disponible, pero no garantizamos:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Disponibilidad ininterrumpida o libre de errores</li>
              <li>Corrección inmediata de todos los errores</li>
              <li>Compatibilidad con todos los dispositivos o navegadores</li>
            </ul>
            <p className="mb-4">
              Podemos realizar mantenimiento programado o de emergencia que puede resultar en interrupciones temporales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Modificaciones del Servicio</h2>
            <p className="mb-4">
              Nos reservamos el derecho de:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Modificar, suspender o discontinuar cualquier aspecto del servicio</li>
              <li>Cambiar reglas de juego, precios o características</li>
              <li>Eliminar o modificar contenido sin previo aviso</li>
            </ul>
            <p className="mb-4">
              Notificaremos cambios significativos cuando sea posible, pero no estamos obligados a hacerlo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Limitación de Responsabilidad</h2>
            <p className="mb-4">
              En la máxima medida permitida por la ley:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>La plataforma se proporciona "tal cual" sin garantías de ningún tipo</li>
              <li>No garantizamos que el servicio satisfaga sus requisitos específicos</li>
              <li>No somos responsables de pérdidas de datos, interrupciones o errores</li>
              <li>No somos responsables de acciones de otros usuarios</li>
              <li>Nuestra responsabilidad total está limitada al monto que haya pagado en los últimos 12 meses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Indemnización</h2>
            <p className="mb-4">
              Usted acepta indemnizar y eximir de responsabilidad a Turix, sus afiliados, y sus empleados de cualquier reclamo, daño, pérdida, responsabilidad y gasto (incluyendo honorarios legales) que surjan de:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Su uso o mal uso del servicio</li>
              <li>Su violación de estos términos</li>
              <li>Su violación de derechos de terceros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Terminación</h2>
            <p className="mb-4">
              Podemos terminar o suspender su acceso al servicio inmediatamente, sin previo aviso, por cualquier motivo, incluyendo:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Violación de estos términos</li>
              <li>Actividad fraudulenta o sospechosa</li>
              <li>Uso no autorizado de la plataforma</li>
              <li>Solicitud de las autoridades</li>
            </ul>
            <p className="mb-4">
              Usted puede terminar su cuenta en cualquier momento eliminándola desde su perfil.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Ley Aplicable y Jurisdicción</h2>
            <p className="mb-4">
              Estos términos se rigen por las leyes aplicables en México. Cualquier disputa será resuelta en los tribunales competentes de México.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Modificaciones de los Términos</h2>
            <p className="mb-4">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor al publicarse en la plataforma.
            </p>
            <p className="mb-4">
              Su uso continuado del servicio después de las modificaciones constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Disposiciones Generales</h2>
            <p className="mb-4">
              Si alguna disposición de estos términos se considera inválida o inaplicable, las disposiciones restantes permanecerán en pleno vigor.
            </p>
            <p className="mb-4">
              Estos términos constituyen el acuerdo completo entre usted y Turix respecto al uso del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">15. Contacto</h2>
            <p className="mb-4">
              Para preguntas sobre estos términos, puede contactarnos a través de:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>La plataforma: turix.club</li>
              <li>A través de su perfil en la plataforma</li>
            </ul>
          </section>

          <div className="pt-6 border-t border-white/20 mt-8">
            <p className="text-sm text-white/70">
              Al usar nuestros servicios, usted reconoce haber leído, entendido y aceptado estos Términos y Condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

