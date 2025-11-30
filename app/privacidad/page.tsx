'use client'

import Link from 'next/link'

export default function PrivacidadPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Aviso de Privacidad</h1>
          <p className="text-white/80">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 sm:p-8 border border-white/20 space-y-6 text-white/90">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Responsable del Tratamiento</h2>
            <p className="mb-4">
              Turix - Turista Mundial Virtual ("nosotros", "nuestro", "la plataforma") es responsable del tratamiento de sus datos personales.
            </p>
            <p className="mb-4">
              <strong>Datos de contacto:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Plataforma: Turix - Turista Mundial Virtual</li>
              <li>Dominio: turix.club</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Datos Personales que Recopilamos</h2>
            <p className="mb-4">Recopilamos los siguientes tipos de información:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li><strong>Información de cuenta:</strong> Nombre de usuario, dirección de correo electrónico, contraseña (encriptada)</li>
              <li><strong>Información de perfil:</strong> Avatar, preferencias de juego, estadísticas</li>
              <li><strong>Información de pago:</strong> Datos de transacciones realizadas a través de Mercado Pago (procesados por terceros)</li>
              <li><strong>Datos de uso:</strong> Registro de partidas, interacciones en la plataforma, preferencias</li>
              <li><strong>Información técnica:</strong> Dirección IP, tipo de navegador, dispositivo, sistema operativo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Finalidad del Tratamiento</h2>
            <p className="mb-4">Utilizamos sus datos personales para:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Proporcionar y mejorar nuestros servicios de juego</li>
              <li>Gestionar su cuenta y perfil de usuario</li>
              <li>Procesar transacciones y pagos</li>
              <li>Enviar notificaciones sobre su cuenta y partidas</li>
              <li>Personalizar su experiencia de juego</li>
              <li>Cumplir con obligaciones legales</li>
              <li>Prevenir fraudes y garantizar la seguridad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Base Legal</h2>
            <p className="mb-4">El tratamiento de sus datos personales se basa en:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li><strong>Consentimiento:</strong> Al registrarse y usar nuestros servicios, usted consiente el tratamiento de sus datos</li>
              <li><strong>Ejecución contractual:</strong> Para proporcionar los servicios solicitados</li>
              <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y prevenir fraudes</li>
              <li><strong>Obligación legal:</strong> Para cumplir con requisitos legales aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Compartir Información</h2>
            <p className="mb-4">Podemos compartir su información con:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li><strong>Proveedores de servicios:</strong> Supabase (almacenamiento de datos), Mercado Pago (procesamiento de pagos), Vercel (hosting)</li>
              <li><strong>Autoridades:</strong> Cuando sea requerido por ley o para proteger nuestros derechos</li>
              <li><strong>Otros usuarios:</strong> Información pública de su perfil (nombre de usuario, avatar, estadísticas públicas)</li>
            </ul>
            <p className="mb-4">
              No vendemos ni alquilamos sus datos personales a terceros para fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Seguridad de los Datos</h2>
            <p className="mb-4">
              Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales, incluyendo:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Encriptación de datos sensibles</li>
              <li>Autenticación segura</li>
              <li>Acceso restringido a datos personales</li>
              <li>Monitoreo regular de seguridad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Retención de Datos</h2>
            <p className="mb-4">
              Conservamos sus datos personales mientras su cuenta esté activa y durante el tiempo necesario para cumplir con nuestras obligaciones legales y resolver disputas.
            </p>
            <p className="mb-4">
              Puede solicitar la eliminación de su cuenta en cualquier momento, lo que resultará en la eliminación de sus datos personales, excepto cuando la retención sea requerida por ley.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Sus Derechos</h2>
            <p className="mb-4">Usted tiene derecho a:</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li><strong>Acceso:</strong> Solicitar información sobre sus datos personales</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos</li>
              <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
              <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
              <li><strong>Limitación:</strong> Solicitar la limitación del tratamiento</li>
              <li><strong>Retirar consentimiento:</strong> En cualquier momento</li>
            </ul>
            <p className="mb-4">
              Para ejercer estos derechos, puede contactarnos a través de su perfil en la plataforma o eliminando su cuenta directamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Cookies y Tecnologías Similares</h2>
            <p className="mb-4">
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso de la plataforma y personalizar el contenido.
            </p>
            <p className="mb-4">
              Puede gestionar sus preferencias de cookies a través de la configuración de su navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Menores de Edad</h2>
            <p className="mb-4">
              Nuestros servicios están dirigidos a usuarios mayores de 13 años. Si un menor de edad proporciona información personal sin el consentimiento de sus padres o tutores, nos contactaremos para eliminar dicha información.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Cambios a este Aviso</h2>
            <p className="mb-4">
              Nos reservamos el derecho de modificar este aviso de privacidad en cualquier momento. Le notificaremos sobre cambios significativos mediante notificaciones en la plataforma o por correo electrónico.
            </p>
            <p className="mb-4">
              La fecha de "Última actualización" al inicio de este documento indica cuándo se realizó la última modificación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Contacto</h2>
            <p className="mb-4">
              Si tiene preguntas o inquietudes sobre este aviso de privacidad o sobre el tratamiento de sus datos personales, puede contactarnos a través de:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>La plataforma: turix.club</li>
              <li>A través de su perfil en la plataforma</li>
            </ul>
          </section>

          <div className="pt-6 border-t border-white/20 mt-8">
            <p className="text-sm text-white/70">
              Al usar nuestros servicios, usted reconoce haber leído y entendido este Aviso de Privacidad y acepta el tratamiento de sus datos personales según se describe aquí.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

