import type { Lang } from "./i18n";

/**
 * Legal pages (privacy policy, terms, user data management) in English and Spanish.
 *
 * These are plain-language starting texts written around what this website actually does today
 * (a newsletter sign-up form, remembered language/theme, planned ebook sales). Have them reviewed
 * by a qualified lawyer for your country before relying on them, and update them whenever the
 * site starts collecting something new (analytics, accounts, checkout, ...).
 *
 * "{contact}" in a paragraph is replaced with your contact email (src/contact.ts) or, while that
 * is empty, a link to your Facebook page.
 */
export type LegalKey = "privacy" | "terms" | "data";

export type LegalDoc = {
  title: string;
  intro: string;
  updated: string;
  sections: { h: string; p?: string[]; ul?: string[] }[];
};

const en: Record<LegalKey, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: November 14, 2026",
    intro:
      "This Privacy Policy explains what information Positive Autism (\"we\", \"us\") collects through this website, how we use it, and the choices you have. We keep it short and plain on purpose.",
    sections: [
      {
        h: "Information we collect",
        ul: [
          "Information you give us. If you use the \"Stay Connected\" form, we receive your name and email address so we can tell you when a new ebook is released.",
          "Preferences saved in your browser. The site remembers your language (English or Spanish) and your light or dark theme using your browser's local storage. This stays on your device and is not sent to us.",
          "Technical data. Like most websites, our hosting provider may process basic technical data such as your IP address, browser type and the pages you request, in order to deliver the site and keep it secure.",
        ],
        p: [
          "We do not ask for health information about you or your child. Please do not send it to us through this website.",
        ],
      },
      {
        h: "How we use information",
        ul: [
          "To send you updates about new ebook releases, if you signed up for them.",
          "To run, protect and improve this website.",
          "To answer your messages and requests.",
        ],
        p: ["We do not sell your personal information."],
      },
      {
        h: "Services we use",
        ul: [
          "Hosting and delivery of the website, provided by Cloudflare.",
          "A form or email service that receives the name and email you submit in the sign-up form and sends our updates.",
          "Google Fonts. Your browser loads the site's typeface directly from Google, which may receive your IP address.",
          "A payment provider, if you buy an ebook. Payment happens on the provider's own checkout page. We do not see or store your full card details.",
          "Links to Facebook and YouTube. These services have their own privacy policies.",
        ],
      },
      {
        h: "Cookies and similar technologies",
        p: [
          "We do not set advertising or tracking cookies. We use your browser's local storage only for the language and theme preferences described above. The third-party services listed above may set their own cookies or similar technologies when you use them.",
        ],
      },
      {
        h: "How long we keep information",
        p: [
          "We keep your sign-up details until you unsubscribe or ask us to delete them. Records needed to deliver a purchase or meet legal obligations are kept for as long as the law requires.",
        ],
      },
      {
        h: "Your choices and rights",
        p: [
          "You can ask to see, correct, export or delete the personal information we hold about you, object to how we use it, or unsubscribe from our emails at any time. Depending on where you live (for example under the GDPR or California law) you may have additional rights. See our User Data Management page for how to make a request, or contact us {contact}.",
        ],
      },
      {
        h: "Children",
        p: [
          "This website is meant for parents, caregivers, educators and autistic adults. We do not knowingly collect personal information from children under 13 (or the minimum age set by local law). If you believe a child has given us information, contact us {contact} and we will delete it.",
        ],
      },
      {
        h: "Security",
        p: [
          "We take reasonable steps to protect your information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
        ],
      },
      {
        h: "Changes to this policy",
        p: [
          "We may update this policy as the website grows. The date at the top shows when it last changed. If we make a significant change, we will make it clear on the website.",
        ],
      },
      {
        h: "Contact",
        p: ["Questions about privacy? Contact us {contact}."],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    updated: "Last updated: November 14, 2026",
    intro:
      "Welcome to Positive Autism. By using this website you agree to these Terms and Conditions. If you do not agree, please do not use the website.",
    sections: [
      {
        h: "Information only, not professional advice",
        p: [
          "The content on this website is general information about autism and related topics. It is not medical, psychological, therapeutic or educational advice, and it does not replace a qualified professional. Always talk with a professional about your own or your child's situation. If someone may be in danger, contact your local emergency services.",
        ],
      },
      {
        h: "Using the website",
        ul: [
          "Use the website only for lawful purposes and in a respectful way.",
          "Do not try to disrupt, damage or gain unauthorized access to the website or its systems.",
          "Do not copy the website's content in bulk with automated tools without our written permission.",
        ],
      },
      {
        h: "Copyright and ownership",
        p: [
          "The content of this website, including its text, illustrations, images, design, and the Positive Autism name and logo, is protected by copyright. All rights reserved. You may view the website, share links to it, and print pages for your personal, non-commercial use. You may not copy, republish, sell or distribute our content without our written permission. Material that belongs to other people remains theirs.",
        ],
      },
      {
        h: "Ebooks and digital products",
        ul: [
          "Ebooks are digital products sold for your personal, non-commercial use. A purchase gives you a personal licence to read, store and print the ebook for yourself. You may not share, resell, upload or distribute it.",
          "Prices, payment and delivery details are shown at checkout. Payments are processed by a third-party payment provider.",
          "Refund and cancellation terms are shown at checkout or on the product page. Where the law gives you rights that cannot be limited, those rights remain.",
        ],
      },
      {
        h: "Email updates",
        p: [
          "If you sign up through the \"Stay Connected\" form, you agree to receive emails from us about new ebook releases. You can unsubscribe at any time. See our Privacy Policy for how we handle your information.",
        ],
      },
      {
        h: "Third-party links and services",
        p: [
          "The website may link to or use services run by others, such as social networks, video platforms and payment providers. We do not control them and are not responsible for their content or practices.",
        ],
      },
      {
        h: "Disclaimer",
        p: [
          "We work to keep the website accurate and available, but it is provided \"as is\" and \"as available\", without promises that it will be error-free, uninterrupted or suitable for a particular purpose.",
        ],
      },
      {
        h: "Limitation of liability",
        p: [
          "To the extent the law allows, Positive Autism is not liable for indirect or consequential losses arising from your use of the website or reliance on its content. Nothing in these terms limits liability that cannot be limited by law.",
        ],
      },
      {
        h: "Changes",
        p: [
          "We may change the website or these terms from time to time. The date at the top shows the latest version. Continuing to use the website after a change means you accept the updated terms.",
        ],
      },
      {
        h: "Governing law",
        p: [
          "These terms are governed by the laws that apply where Positive Autism is established, without taking away any rights that local consumer protection law gives you.",
        ],
      },
      {
        h: "Contact",
        p: ["Questions about these terms? Contact us {contact}."],
      },
    ],
  },
  data: {
    title: "User Data Management",
    updated: "Last updated: November 14, 2026",
    intro:
      "You are in control of your personal data. This page explains what we hold, how to see it, change it, export it or delete it, and how to manage what is saved on your device.",
    sections: [
      {
        h: "What data we hold",
        ul: [
          "Sign-up details: the name and email you enter in the \"Stay Connected\" form.",
          "Order details, once ebook sales start: the item you bought, your name and email, and delivery and payment records kept by us or our payment provider.",
          "Preferences on your device: your language and light or dark theme, stored in your browser only.",
        ],
      },
      {
        h: "What you can ask us to do",
        ul: [
          "Access: tell you what personal data we hold about you.",
          "Correct: fix anything that is wrong or out of date.",
          "Delete: remove your personal data, unless we must keep some of it by law.",
          "Export: give you a copy in a common, readable format.",
          "Object or restrict: stop or limit how we use your data.",
          "Unsubscribe: stop all email updates.",
        ],
      },
      {
        h: "How to make a request",
        p: [
          "Contact us {contact} and tell us what you would like us to do. Please include the name and email address you used on the website. We may ask you to confirm it is really you before we act, to protect your information. We will reply as soon as reasonably possible and within the time required by the law that applies to you.",
        ],
      },
      {
        h: "Unsubscribing from updates",
        p: [
          "Every update email will include an unsubscribe link. You can also ask us to remove you at any time using the contact method above.",
        ],
      },
      {
        h: "Managing data on your device",
        p: [
          "The website only saves your language and theme choices in your browser's local storage. To remove them, clear this website's data in your browser settings (usually under Privacy or Site data), or change the choices with the language and theme buttons at the top of the page.",
        ],
      },
      {
        h: "How long we keep data",
        p: [
          "Sign-up details are kept until you unsubscribe or ask us to delete them. Order records are kept for as long as needed to deliver your purchase and meet legal, tax and accounting duties.",
        ],
      },
      {
        h: "Service providers",
        p: [
          "To handle some requests we may need to work with the services we use, such as our email or form service and our payment provider. See the Privacy Policy for the list of services.",
        ],
      },
      {
        h: "Complaints",
        p: [
          "If you are not happy with how we handled your data, please contact us first. You also have the right to complain to your local data protection authority.",
        ],
      },
    ],
  },
};

const es: Record<LegalKey, LegalDoc> = {
  privacy: {
    title: "Política de Privacidad",
    updated: "Última actualización: 14 de noviembre de 2026",
    intro:
      "Esta Política de Privacidad explica qué información recopila Positive Autism (\"nosotros\") a través de este sitio web, cómo la usamos y qué opciones tienes. La escribimos de forma breve y sencilla a propósito.",
    sections: [
      {
        h: "Información que recopilamos",
        ul: [
          "Información que nos das. Si usas el formulario \"Mantente conectado\", recibimos tu nombre y tu correo electrónico para avisarte cuando salga un nuevo ebook.",
          "Preferencias guardadas en tu navegador. El sitio recuerda tu idioma (inglés o español) y tu tema claro u oscuro usando el almacenamiento local de tu navegador. Esto se queda en tu dispositivo y no se nos envía.",
          "Datos técnicos. Como la mayoría de los sitios web, nuestro proveedor de alojamiento puede procesar datos técnicos básicos, como tu dirección IP, el tipo de navegador y las páginas que solicitas, para entregar el sitio y mantenerlo seguro.",
        ],
        p: [
          "No pedimos información de salud sobre ti ni sobre tu hijo o hija. Por favor, no nos la envíes a través de este sitio web.",
        ],
      },
      {
        h: "Cómo usamos la información",
        ul: [
          "Para enviarte novedades sobre nuevos ebooks, si te suscribiste.",
          "Para operar, proteger y mejorar este sitio web.",
          "Para responder tus mensajes y solicitudes.",
        ],
        p: ["No vendemos tu información personal."],
      },
      {
        h: "Servicios que utilizamos",
        ul: [
          "Alojamiento y entrega del sitio web, a cargo de Cloudflare.",
          "Un servicio de formularios o correo que recibe el nombre y el correo que envías en el formulario de suscripción y envía nuestras novedades.",
          "Google Fonts. Tu navegador carga la tipografía del sitio directamente desde Google, que puede recibir tu dirección IP.",
          "Un proveedor de pagos, si compras un ebook. El pago se realiza en la página de pago del proveedor. No vemos ni guardamos los datos completos de tu tarjeta.",
          "Enlaces a Facebook y YouTube. Estos servicios tienen sus propias políticas de privacidad.",
        ],
      },
      {
        h: "Cookies y tecnologías similares",
        p: [
          "No usamos cookies publicitarias ni de seguimiento. Usamos el almacenamiento local de tu navegador solo para las preferencias de idioma y tema descritas arriba. Los servicios de terceros mencionados pueden usar sus propias cookies o tecnologías similares cuando los utilizas.",
        ],
      },
      {
        h: "Cuánto tiempo conservamos la información",
        p: [
          "Conservamos tus datos de suscripción hasta que te des de baja o nos pidas eliminarlos. Los registros necesarios para entregar una compra o cumplir obligaciones legales se conservan durante el tiempo que exija la ley.",
        ],
      },
      {
        h: "Tus opciones y derechos",
        p: [
          "Puedes pedirnos ver, corregir, exportar o eliminar la información personal que tenemos sobre ti, oponerte a cómo la usamos o darte de baja de nuestros correos en cualquier momento. Según el lugar donde vivas (por ejemplo, bajo el RGPD o la ley de California) puedes tener derechos adicionales. Consulta nuestra página de Gestión de Datos de Usuario para saber cómo hacer una solicitud, o escríbenos {contact}.",
        ],
      },
      {
        h: "Menores de edad",
        p: [
          "Este sitio web está dirigido a padres, cuidadores, educadores y adultos autistas. No recopilamos a sabiendas información personal de menores de 13 años (o de la edad mínima que fije la ley local). Si crees que un menor nos ha dado información, escríbenos {contact} y la eliminaremos.",
        ],
      },
      {
        h: "Seguridad",
        p: [
          "Tomamos medidas razonables para proteger tu información. Ningún método de transmisión o almacenamiento es completamente seguro, por lo que no podemos garantizar una seguridad absoluta.",
        ],
      },
      {
        h: "Cambios en esta política",
        p: [
          "Podemos actualizar esta política a medida que el sitio crezca. La fecha al inicio indica cuándo cambió por última vez. Si hacemos un cambio importante, lo indicaremos claramente en el sitio web.",
        ],
      },
      {
        h: "Contacto",
        p: ["¿Preguntas sobre privacidad? Escríbenos {contact}."],
      },
    ],
  },
  terms: {
    title: "Términos y Condiciones",
    updated: "Última actualización: 14 de noviembre de 2026",
    intro:
      "Te damos la bienvenida a Positive Autism. Al usar este sitio web aceptas estos Términos y Condiciones. Si no estás de acuerdo, por favor no uses el sitio.",
    sections: [
      {
        h: "Solo información, no asesoría profesional",
        p: [
          "El contenido de este sitio web es información general sobre el autismo y temas relacionados. No es asesoría médica, psicológica, terapéutica ni educativa, y no reemplaza a un profesional calificado. Consulta siempre con un profesional sobre tu situación o la de tu hijo o hija. Si alguien puede estar en peligro, comunícate con los servicios de emergencia de tu localidad.",
        ],
      },
      {
        h: "Uso del sitio web",
        ul: [
          "Usa el sitio solo con fines legales y de forma respetuosa.",
          "No intentes interrumpir, dañar ni acceder sin autorización al sitio web ni a sus sistemas.",
          "No copies el contenido del sitio de forma masiva con herramientas automatizadas sin nuestro permiso por escrito.",
        ],
      },
      {
        h: "Derechos de autor y propiedad",
        p: [
          "El contenido de este sitio web, incluidos sus textos, ilustraciones, imágenes, diseño y el nombre y logotipo de Positive Autism, está protegido por derechos de autor. Todos los derechos reservados. Puedes ver el sitio, compartir enlaces y imprimir páginas para tu uso personal y no comercial. No puedes copiar, republicar, vender ni distribuir nuestro contenido sin nuestro permiso por escrito. El material que pertenece a otras personas sigue siendo suyo.",
        ],
      },
      {
        h: "Ebooks y productos digitales",
        ul: [
          "Los ebooks son productos digitales vendidos para tu uso personal y no comercial. La compra te da una licencia personal para leer, guardar e imprimir el ebook para ti. No puedes compartirlo, revenderlo, subirlo ni distribuirlo.",
          "Los precios, el pago y los detalles de entrega se muestran al pagar. Los pagos los procesa un proveedor de pagos externo.",
          "Las condiciones de reembolso y cancelación se muestran al pagar o en la página del producto. Si la ley te otorga derechos que no pueden limitarse, esos derechos se mantienen.",
        ],
      },
      {
        h: "Novedades por correo",
        p: [
          "Si te suscribes mediante el formulario \"Mantente conectado\", aceptas recibir correos nuestros sobre nuevos ebooks. Puedes darte de baja en cualquier momento. Consulta nuestra Política de Privacidad para saber cómo tratamos tu información.",
        ],
      },
      {
        h: "Enlaces y servicios de terceros",
        p: [
          "El sitio puede enlazar o usar servicios de otras personas, como redes sociales, plataformas de video y proveedores de pago. No los controlamos y no somos responsables de su contenido ni de sus prácticas.",
        ],
      },
      {
        h: "Exención de responsabilidad",
        p: [
          "Trabajamos para que el sitio sea preciso y esté disponible, pero se ofrece \"tal cual\" y \"según disponibilidad\", sin garantizar que esté libre de errores, que no se interrumpa o que sirva para un fin en particular.",
        ],
      },
      {
        h: "Limitación de responsabilidad",
        p: [
          "En la medida en que la ley lo permita, Positive Autism no es responsable de pérdidas indirectas o consecuentes derivadas del uso del sitio o de confiar en su contenido. Nada de lo aquí dispuesto limita la responsabilidad que la ley no permita limitar.",
        ],
      },
      {
        h: "Cambios",
        p: [
          "Podemos modificar el sitio o estos términos de vez en cuando. La fecha al inicio indica la versión más reciente. Seguir usando el sitio después de un cambio significa que aceptas los términos actualizados.",
        ],
      },
      {
        h: "Ley aplicable",
        p: [
          "Estos términos se rigen por las leyes aplicables donde Positive Autism esté establecido, sin quitarte los derechos que te otorgue la ley local de protección al consumidor.",
        ],
      },
      {
        h: "Contacto",
        p: ["¿Preguntas sobre estos términos? Escríbenos {contact}."],
      },
    ],
  },
  data: {
    title: "Gestión de Datos de Usuario",
    updated: "Última actualización: 14 de noviembre de 2026",
    intro:
      "Tú controlas tus datos personales. Esta página explica qué datos tenemos, cómo verlos, cambiarlos, exportarlos o eliminarlos, y cómo gestionar lo que se guarda en tu dispositivo.",
    sections: [
      {
        h: "Qué datos tenemos",
        ul: [
          "Datos de suscripción: el nombre y el correo que escribes en el formulario \"Mantente conectado\".",
          "Datos de pedidos, cuando empiecen las ventas de ebooks: el artículo que compraste, tu nombre y correo, y los registros de entrega y pago que conservamos nosotros o nuestro proveedor de pagos.",
          "Preferencias en tu dispositivo: tu idioma y tu tema claro u oscuro, guardados solo en tu navegador.",
        ],
      },
      {
        h: "Qué puedes pedirnos",
        ul: [
          "Acceso: decirte qué datos personales tenemos sobre ti.",
          "Corrección: arreglar lo que sea incorrecto o esté desactualizado.",
          "Eliminación: borrar tus datos personales, salvo que la ley nos obligue a conservar parte de ellos.",
          "Exportación: darte una copia en un formato común y legible.",
          "Oposición o restricción: detener o limitar cómo usamos tus datos.",
          "Baja: dejar de recibir todas las novedades por correo.",
        ],
      },
      {
        h: "Cómo hacer una solicitud",
        p: [
          "Escríbenos {contact} y cuéntanos qué te gustaría que hagamos. Incluye el nombre y el correo que usaste en el sitio. Podemos pedirte que confirmes tu identidad antes de actuar, para proteger tu información. Responderemos lo antes posible y dentro del plazo que exija la ley que te aplique.",
        ],
      },
      {
        h: "Darte de baja de las novedades",
        p: [
          "Cada correo de novedades incluirá un enlace para darte de baja. También puedes pedirnos que te eliminemos en cualquier momento usando el medio de contacto indicado arriba.",
        ],
      },
      {
        h: "Gestionar los datos en tu dispositivo",
        p: [
          "El sitio solo guarda tus elecciones de idioma y tema en el almacenamiento local de tu navegador. Para eliminarlas, borra los datos de este sitio en la configuración de tu navegador (normalmente en Privacidad o Datos de sitios), o cambia las opciones con los botones de idioma y tema en la parte superior de la página.",
        ],
      },
      {
        h: "Cuánto tiempo conservamos los datos",
        p: [
          "Los datos de suscripción se conservan hasta que te des de baja o nos pidas eliminarlos. Los registros de pedidos se conservan el tiempo necesario para entregar tu compra y cumplir deberes legales, fiscales y contables.",
        ],
      },
      {
        h: "Proveedores de servicios",
        p: [
          "Para atender algunas solicitudes podemos necesitar trabajar con los servicios que usamos, como nuestro servicio de correo o formularios y nuestro proveedor de pagos. Consulta la Política de Privacidad para ver la lista de servicios.",
        ],
      },
      {
        h: "Reclamaciones",
        p: [
          "Si no estás conforme con cómo tratamos tus datos, por favor contáctanos primero. También tienes derecho a presentar una reclamación ante la autoridad de protección de datos de tu localidad.",
        ],
      },
    ],
  },
};

export const LEGAL: Record<Lang, Record<LegalKey, LegalDoc>> = { en, es };
