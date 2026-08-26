export interface HowToPlaybook {
  slug: string;
  audience: string;
  title: string;
  summary: string;
  steps: string[];
  quickReply: string;
}

export function getHowToPlaybooks(locale: string = 'en'): HowToPlaybook[] {
  const isEs = locale.toLowerCase().startsWith('es');

  if (isEs) {
    return [
      {
        slug: 'account-activation',
        audience: 'Soporte Prado / Admin',
        title: 'Cómo activar la suscripción de un suscriptor',
        summary: 'Pasos para actualizar el estado del plan (Trial, Individual, Growth, Enterprise) desde la consola.',
        steps: [
          'Busca el suscriptor o la organización usando el correo o el UUID.',
          'Selecciona la nueva categoría de suscripción deseada.',
          'Haz clic en Guardar cambios para actualizar el estado en Supabase.',
          'Informa al usuario por medio del ticket de soporte.'
        ],
        quickReply: 'Hola,\n\nHemos actualizado el estado de tu suscripción en la plataforma Prado. Ya tienes acceso a los recursos asignados a tu plan.\n\nSaludos,\nEquipo Prado Support'
      },
      {
        slug: 'reset-user-password',
        audience: 'Soporte / Helpdesk',
        title: 'Restablecimiento de contraseña y acceso',
        summary: 'Instrucciones para generar un enlace de recuperación de contraseña para un usuario.',
        steps: [
          'Identifica el producto (Jobs, Fleet, Commerce) al que pertenece el usuario.',
          'Genera el enlace de recuperación usando Supabase Admin Auth.',
          'Envía las instrucciones al correo registrado.'
        ],
        quickReply: 'Hola,\n\nHemos generado una solicitud para restablecer tu contraseña. Revisa tu correo o haz clic en el enlace para actualizar tu clave.\n\nAtentamente,\nSoporte Prado'
      }
    ];
  }

  return [
    {
      slug: 'account-activation',
      audience: 'Prado Support / Admin',
      title: 'How to update subscriber status',
      summary: 'Steps to modify plan status (Trial, Individual, Growth, Enterprise, Cancelled) from the management console.',
      steps: [
        'Locate the subscriber using search by UUID or email.',
        'Select the appropriate subscription status tier.',
        'Click Save Changes to update their account state in Supabase.',
        'Notify the user in the corresponding support ticket.'
      ],
      quickReply: 'Hello,\n\nWe have updated your subscription status in the Prado platform. You now have full access to your plan features.\n\nBest regards,\nPrado Support Team'
    },
    {
      slug: 'reset-user-password',
      audience: 'Support / Helpdesk',
      title: 'Resetting subscriber access',
      summary: 'Instructions for sending password reset links for Jobs, Fleet, or Commerce subscribers.',
      steps: [
        'Identify which app (Jobs, Fleet, Commerce) the subscriber is registered in.',
        'Trigger the admin password reset request via Supabase Auth.',
        'Confirm dispatch with the customer via ticket comment.'
      ],
      quickReply: 'Hello,\n\nA password reset request has been dispatched to your registered email address. Please follow the instructions to set up your new credentials.\n\nBest regards,\nPrado Helpdesk'
    }
  ];
}
