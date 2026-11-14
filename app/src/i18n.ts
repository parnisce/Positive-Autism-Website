export type Lang = "en" | "es";

/**
 * Link targets. Everything points at sections of this page for now (the site's own pages are
 * still to be built); only the social profiles are external.
 */
export const LINKS = {
  resources: "#resources",
  film: "https://www.youtube.com/channel/UCgMx6kRjfPaXH6XFvsTFd8A",
  subscribe: "#stay-connected",
  facebook: "https://www.facebook.com/PositiveAutism.org/",
  youtube: "https://www.youtube.com/channel/UCgMx6kRjfPaXH6XFvsTFd8A",
};

/** Thumbnails for the six "Latest from Autism Info" articles (same order as the copy). */
export const ARTICLE_IMAGES = [
  "/assets/img/articles/anxiety.webp",
  "/assets/img/articles/eye-contact.jpg",
  "/assets/img/articles/correct-child.jpg",
  "/assets/img/articles/positive-discipline.jpg",
  "/assets/img/articles/sleep.jpg",
  "/assets/img/articles/girls-women.jpg",
];

const en = {
  skip: "Skip to content",
  legalBack: "Back to home",
  homeLabel: "Positive Autism home",
  menu: "Menu",
  shop: "Shop ebooks",
  mainNav: "Main",
  langLabel: "Language",
  toDark: "Switch to dark theme",
  toLight: "Switch to light theme",
  nav: {
    home: "Home",
    info: "Autism Info",
    resources: "Resources",
    ebooks: "Ebooks",
    news: "News",
    neuro: "Neurodiversity",
    about: "About Us",
  },
  hero: {
    eyebrow: "Autism learning, resources and ebooks",
    before: "Autism, understood with ",
    em: "hope.",
    lead:
      "Learn at your own pace with practical guides, research news and ebooks for autistic people, parents and the teachers who support them.",
    start: "Start learning",
    browse: "Browse ebooks",
  },
  info: {
    h2: "Autism Info",
    sub: "Clear, positive explanations of autism, written for the people who live it and the people who love them.",
    leadTitle: "What is autism?",
    imgAlt: "A paper boy and girl holding hands in a heart-shaped garden",
    leadText:
      "Autism is a neurodevelopmental condition that affects communication, social interaction and behavior. It is not a disease. It is a different way of experiencing the world, and it looks different in every person.",
    points: [
      {
        title: "Communication and social life",
        text: "Speaking, reading nonverbal cues, keeping a conversation going or reading emotions can be hard.",
      },
      {
        title: "Routines and repetition",
        text: "Many autistic people rely on routines or repeat movements such as rocking, and find change difficult.",
      },
      {
        title: "Deep interests",
        text: "Intense focus on specific topics is common, and it can grow into real knowledge and skill.",
      },
      {
        title: "Sensory differences",
        text: "Sounds, lights, smells, tastes and textures can feel much stronger, or much weaker, than usual.",
      },
      {
        title: "Strengths",
        text: "Many autistic people have gifts in memory, logical thinking, mathematics or creativity.",
      },
      {
        title: "Different support needs",
        text: "Some people need support every day and others live independently. Support is grouped in three levels.",
      },
    ],
    articlesTitle: "Latest from Autism Info",
    articles: [
      { title: "When an Autistic Person Cannot Explain Their Anxiety", date: "Nov 3, 2026" },
      { title: "Why Do Many Autistic People Avoid Eye Contact?", date: "Nov 4, 2025" },
      { title: "How to Correct (Well) an Autistic Child: Why \"NO\" Doesn't Work", date: "Oct 15, 2025" },
      { title: "Positive Discipline for Autistic Children and Youth", date: "Apr 24, 2025" },
      { title: "The Importance of Sleep in Autistic Individuals", date: "Apr 7, 2025" },
      { title: "Why Is Autism More Difficult to Diagnose in Girls and Women?", date: "Mar 10, 2025" },
    ],
  },
  audience: {
    h2: "Information for every journey",
    sub: "Choose the path that fits you, and find guidance written with respect and hope.",
    imgAlt: "A paper-craft heart blossom with two figures holding hands at its center",
    panels: [
      {
        title: "For autistic people",
        text: "Understand your strengths, your needs and the skills that help you thrive every day.",
        cta: "Explore resources",
        alt: "Two paper figures standing together inside a blossom",
      },
      {
        title: "For parents",
        text: "Gentle strategies, research updates and ideas to support your child at home and at school.",
        cta: "Explore resources",
        alt: "A paper boy and girl holding hands in a heart-shaped garden",
      },
    ],
  },
  resources: {
    h2: "Resources that build skills",
    sub: "Activities and guides organized by the area of development you want to support. Keep scrolling to explore them all.",
    items: [
      "Social and emotional skills",
      "Communication and language",
      "Conversation skills",
      "Intelligence and potential development",
      "Attention and focus",
      "Imaginative play and creativity",
      "Independence and life skills",
      "Gross and fine motor skills",
      "Anxiety and tolerance to change",
      "Learning videos",
      "Information for parents",
      "For autistic people",
    ],
  },
  ebooks: {
    h2: "Autism learning ebooks",
    sub: "Worksheets and reading activities you can print and use again and again. Browse the full shop to search by topic or price.",
    coverAlt: "Cover of the ebook",
    view: "View in shop",
    viewAll: "Browse all ebooks",
  },
  film: {
    h2: "Accepted As I Am",
    sub: "A short film made to raise acceptance of autism. Share it with autistic people, parents, teachers, therapists and friends, and talk about it together.",
    cta: "Watch the film",
    label: "Watch the film Accepted As I Am",
    alt: "Still from the film Accepted As I Am",
  },
  news: {
    h2: "Positive news and research",
    sub: "The latest on what is moving in the world of autism.",
    items: [
      {
        date: "Nov 3, 2026",
        title: "When an Autistic Person Cannot Explain Their Anxiety",
        text: "How can anxiety be recognized when a person cannot put it into words?",
        alt: "A child feeling overstimulated in a classroom",
      },
      {
        date: "Oct 16, 2026",
        title: "Reading Comprehension in Autistic People: Which Strategies Work",
        text: "For people who read words easily but struggle with their meaning.",
        alt: "Illustration about reading comprehension",
      },
      {
        date: "Oct 5, 2026",
        title: "When Eating Becomes a Sensory Experience",
        text: "Understanding mealtime difficulties for some autistic children and adults.",
        alt: "A sensory-friendly mealtime with healthy foods",
      },
      {
        date: "Sep 29, 2026",
        title: "Daily Living Skills May Play an Important Role",
        text: "A study that follows autistic people from childhood into adulthood.",
        alt: "A person practicing a daily living skill",
      },
    ],
  },
  neuro: {
    h2: "Every mind grows in its own way",
    text:
      "Neurodiversity is the idea that brains work in many different ways, and that those differences deserve respect. We share information that focuses on strengths, dignity and real support.",
  },
  about: {
    h2: "About Us",
    quote: "Each autistic person, whatever the severity, has a high potential for development.",
    p1:
      "Positive Autism gives parents, caregivers and educators positive tools to help autistic children work through their challenges, discover their abilities and improve their quality of life.",
    p2:
      "The project is led by its director, Silvia Gonzalez, the mother of a child diagnosed with severe autism. After years of researching and building her own programs at home, she shares what she learned as ideas, recommendations and activities that families can use as fun lessons rather than therapy.",
    values: [
      {
        title: "Patience and positivity",
        text: "Self-control, patience and a positive attitude are the skills that families need most.",
      },
      {
        title: "Realistic hope",
        text: "Steady progress can lead to a good quality of life, even if it is not in the way we are used to.",
      },
      {
        title: "Practical independence",
        text: "The goal is to help children face life on their own when their parents are not there.",
      },
    ],
  },
  community: {
    h2: "Follow along",
    sub: "Follow Positive Autism for news and announcements, or reach out with a question.",
    contact: "Get updates",
  },
  footer: {
    tagline: "Positive information and resources about autism.",
    explore: "Explore",
    learn: "Learn",
    connect: "Connect",
    made: "Made for you ❤️",
    legal: "Legal",
    userData: "User Data Management",
    terms: "Terms And Conditions",
    privacy: "Privacy Policy",
    credit:
      "Copyright 2026 Positive Autism. The content of this website is protected by copyright. All rights reserved.",
    film: "Accepted As I Am",
  },
  subscribe: {
    h3: "Stay Connected",
    text: "Be the first to know when a new ebook is released.",
    name: "Name",
    email: "Email",
    button: "Subscribe",
    sending: "Subscribing...",
    done: "Thank you! We will email you when a new ebook is released.",
    error: "Something went wrong. Please try again in a moment.",
    unconfigured: "Sign-ups are not connected yet. Please check back soon.",
  },
};

export type Copy = typeof en;

const es: Copy = {
  skip: "Saltar al contenido",
  legalBack: "Volver al inicio",
  homeLabel: "Inicio de Positive Autism",
  menu: "Menú",
  shop: "Ver ebooks",
  mainNav: "Principal",
  langLabel: "Idioma",
  toDark: "Cambiar al tema oscuro",
  toLight: "Cambiar al tema claro",
  nav: {
    home: "Inicio",
    info: "Info sobre autismo",
    resources: "Recursos",
    ebooks: "Ebooks",
    news: "Noticias",
    neuro: "Neurodiversidad",
    about: "Quiénes somos",
  },
  hero: {
    eyebrow: "Aprendizaje, recursos y ebooks sobre autismo",
    before: "Autismo, comprendido con ",
    em: "esperanza.",
    lead:
      "Aprende a tu ritmo con guías prácticas, noticias de investigación y ebooks para personas autistas, familias y docentes que las apoyan.",
    start: "Empezar a aprender",
    browse: "Ver ebooks",
  },
  info: {
    h2: "Info sobre autismo",
    sub: "Explicaciones claras y positivas sobre el autismo, escritas para quienes lo viven y para quienes los quieren.",
    leadTitle: "¿Qué es el autismo?",
    imgAlt: "Un niño y una niña de papel tomados de la mano en un jardín con forma de corazón",
    leadText:
      "El autismo es una condición del neurodesarrollo que afecta la comunicación, la interacción social y la conducta. No es una enfermedad. Es una manera diferente de experimentar el mundo y se manifiesta distinto en cada persona.",
    points: [
      {
        title: "Comunicación y vida social",
        text: "Hablar, interpretar señales no verbales, mantener una conversación o reconocer emociones puede ser difícil.",
      },
      {
        title: "Rutinas y repetición",
        text: "Muchas personas autistas dependen de rutinas o repiten movimientos, como mecerse, y los cambios les cuestan.",
      },
      {
        title: "Intereses profundos",
        text: "Es común concentrarse intensamente en temas específicos, y eso puede convertirse en conocimiento y habilidad.",
      },
      {
        title: "Diferencias sensoriales",
        text: "Los sonidos, las luces, los olores, los sabores y las texturas pueden sentirse mucho más fuertes, o mucho más débiles.",
      },
      {
        title: "Fortalezas",
        text: "Muchas personas autistas tienen talento en la memoria, el pensamiento lógico, las matemáticas o la creatividad.",
      },
      {
        title: "Distintos niveles de apoyo",
        text: "Algunas personas necesitan apoyo a diario y otras viven de forma independiente. El apoyo se agrupa en tres niveles.",
      },
    ],
    articlesTitle: "Lo más reciente de Info sobre autismo",
    articles: [
      { title: "Cuando una persona autista no puede explicar su ansiedad", date: "3 nov 2026" },
      { title: "¿Por qué muchas personas autistas evitan el contacto visual?", date: "4 nov 2025" },
      { title: "Cómo corregir (bien) a un niño autista: por qué el \"NO\" no funciona", date: "15 oct 2025" },
      { title: "Disciplina positiva para niños y jóvenes autistas", date: "24 abr 2025" },
      { title: "La importancia del sueño en las personas autistas", date: "7 abr 2025" },
      { title: "¿Por qué es más difícil diagnosticar el autismo en niñas y mujeres?", date: "10 mar 2025" },
    ],
  },
  audience: {
    h2: "Información para cada camino",
    sub: "Elige el camino que va contigo y encuentra orientación escrita con respeto y esperanza.",
    imgAlt: "Una flor de papel en forma de corazón con dos figuras tomadas de la mano en el centro",
    panels: [
      {
        title: "Para personas autistas",
        text: "Conoce tus fortalezas, tus necesidades y las habilidades que te ayudan a crecer cada día.",
        cta: "Explorar recursos",
        alt: "Dos figuras de papel juntas dentro de una flor",
      },
      {
        title: "Para padres y madres",
        text: "Estrategias amables, novedades de investigación e ideas para apoyar a tu hijo o hija en casa y en la escuela.",
        cta: "Explorar recursos",
        alt: "Un niño y una niña de papel tomados de la mano en un jardín con forma de corazón",
      },
    ],
  },
  resources: {
    h2: "Recursos que desarrollan habilidades",
    sub: "Actividades y guías organizadas por el área de desarrollo que quieres apoyar. Sigue desplazándote para verlas todas.",
    items: [
      "Habilidades sociales y emocionales",
      "Comunicación y lenguaje",
      "Habilidades de conversación",
      "Inteligencia y desarrollo del potencial",
      "Atención y concentración",
      "Juego imaginativo y creatividad",
      "Independencia y habilidades para la vida",
      "Motricidad gruesa y fina",
      "Ansiedad y tolerancia al cambio",
      "Videos de aprendizaje",
      "Información para padres",
      "Para personas autistas",
    ],
  },
  ebooks: {
    h2: "Ebooks de aprendizaje sobre autismo",
    sub: "Hojas de trabajo y actividades de lectura que puedes imprimir y usar una y otra vez. Explora toda la tienda para buscar por tema o precio.",
    coverAlt: "Portada del ebook",
    view: "Ver en la tienda",
    viewAll: "Ver todos los ebooks",
  },
  film: {
    h2: "Accepted As I Am",
    sub: "Un cortometraje creado para promover la aceptación del autismo. Compártelo con personas autistas, familias, docentes, terapeutas y amigos, y conversen sobre él.",
    cta: "Ver el cortometraje",
    label: "Ver el cortometraje Accepted As I Am",
    alt: "Imagen del cortometraje Accepted As I Am",
  },
  news: {
    h2: "Noticias positivas e investigación",
    sub: "Lo más reciente de lo que se mueve en el mundo del autismo.",
    items: [
      {
        date: "3 nov 2026",
        title: "Cuando una persona autista no puede explicar su ansiedad",
        text: "¿Cómo reconocer la ansiedad cuando la persona no puede ponerla en palabras?",
        alt: "Un niño abrumado por los estímulos en un salón de clases",
      },
      {
        date: "16 oct 2026",
        title: "Comprensión lectora en personas autistas: qué estrategias funcionan",
        text: "Para quienes leen las palabras con facilidad pero les cuesta entender su significado.",
        alt: "Ilustración sobre la comprensión lectora",
      },
      {
        date: "5 oct 2026",
        title: "Cuando comer se vuelve una experiencia sensorial",
        text: "Cómo entender las dificultades en las comidas de algunos niños y adultos autistas.",
        alt: "Una comida amigable con los sentidos con alimentos saludables",
      },
      {
        date: "29 sep 2026",
        title: "Las habilidades de la vida diaria pueden tener un papel importante",
        text: "Un estudio que sigue a personas autistas desde la infancia hasta la adultez.",
        alt: "Una persona practicando una habilidad de la vida diaria",
      },
    ],
  },
  neuro: {
    h2: "Cada mente crece a su manera",
    text:
      "La neurodiversidad es la idea de que los cerebros funcionan de muchas maneras distintas y de que esas diferencias merecen respeto. Compartimos información centrada en las fortalezas, la dignidad y el apoyo real.",
  },
  about: {
    h2: "Quiénes somos",
    quote: "Cada persona autista, sin importar la severidad, tiene un alto potencial de desarrollo.",
    p1:
      "Positive Autism ofrece a padres, cuidadores y educadores herramientas positivas para ayudar a los niños autistas a superar sus dificultades, descubrir sus capacidades y mejorar su calidad de vida.",
    p2:
      "El proyecto está dirigido por Silvia Gonzalez, madre de un niño diagnosticado con autismo severo. Después de años de investigar y crear sus propios programas en casa, comparte lo aprendido en forma de ideas, recomendaciones y actividades que las familias pueden usar como lecciones divertidas y no como terapia.",
    values: [
      {
        title: "Paciencia y positivismo",
        text: "El autocontrol, la paciencia y una actitud positiva son las habilidades que más necesitan las familias.",
      },
      {
        title: "Esperanza realista",
        text: "El progreso constante puede llevar a una buena calidad de vida, aunque no sea del modo al que estamos acostumbrados.",
      },
      {
        title: "Independencia práctica",
        text: "La meta es ayudar a los niños a enfrentar la vida por sí mismos cuando sus padres ya no estén.",
      },
    ],
  },
  community: {
    h2: "Síguenos",
    sub: "Sigue a Positive Autism para ver noticias y anuncios, o escríbenos si tienes una pregunta.",
    contact: "Recibir novedades",
  },
  footer: {
    tagline: "Información y recursos positivos sobre el autismo.",
    explore: "Explorar",
    learn: "Aprender",
    connect: "Conecta",
    made: "Hecho para ti ❤️",
    legal: "Legal",
    userData: "Gestión de Datos de Usuario",
    terms: "Términos y Condiciones",
    privacy: "Política de Privacidad",
    credit:
      "Copyright 2026 Positive Autism. El contenido de este sitio web está protegido por derechos de autor. Todos los derechos reservados.",
    film: "Accepted As I Am",
  },
  subscribe: {
    h3: "Mantente conectado",
    text: "Sé la primera persona en enterarte cuando salga un nuevo ebook.",
    name: "Nombre",
    email: "Correo electrónico",
    button: "Suscribirme",
    sending: "Suscribiendo...",
    done: "¡Gracias! Te escribiremos cuando se publique un nuevo ebook.",
    error: "Algo salió mal. Inténtalo de nuevo en un momento.",
    unconfigured: "Las suscripciones aún no están conectadas. Vuelve pronto.",
  },
};

export const COPY: Record<Lang, Copy> = { en, es };
