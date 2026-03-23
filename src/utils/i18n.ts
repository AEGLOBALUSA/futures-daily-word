// Shared i18n utility for Futures Daily Word
// All UI string translations for en, es, pt, id

export function getLang(): string {
  try { return localStorage.getItem('dw_lang') || 'en'; } catch { return 'en'; }
}

type LangMap = Record<string, string>;
type Translations = Record<string, LangMap>;

const UI: Translations = {
  // ── HOME SCREEN ──
  daily_word_title: { en: 'Daily Word', es: 'Palabra Diaria', pt: 'Palavra Di\u00e1ria', id: 'Firman Harian' },
  todays_reading: { en: "TODAY'S READING", es: 'LECTURA DE HOY', pt: 'LEITURA DE HOJE', id: 'BACAAN HARI INI' },
  todays_reflection: { en: "TODAY'S REFLECTION", es: "REFLEXI\u00d3N DE HOY", pt: "REFLEX\u00c3O DE HOJE", id: "REFLEKSI HARI INI" },
  listen_now: { en: 'Listen Now', es: 'Escuchar ahora', pt: 'Ouvir agora', id: 'Dengarkan' },
  read_btn: { en: 'Read', es: 'Leer', pt: 'Ler', id: 'Baca' },
  font_size: { en: 'FONT SIZE', es: 'TAMA\u00d1O DE FUENTE', pt: 'TAMANHO DA FONTE', id: 'UKURAN FONT' },
  select_campus: { en: 'Select Campus', es: 'Seleccionar sede', pt: 'Selecionar campus', id: 'Pilih Kampus' },
  search: { en: 'Search', es: 'Buscar', pt: 'Pesquisar', id: 'Cari' },
  welcome_msg: { en: 'Welcome, friend. We\'re glad you\'re here.', es: 'Bienvenido, amigo. Nos alegra que est\u00e9s aqu\u00ed.', pt: 'Bem-vindo, amigo. Estamos felizes que voc\u00ea est\u00e1 aqui.', id: 'Selamat datang, teman. Kami senang Anda di sini.' },
  im_new_to_this: { en: "I'm New to This", es: 'Soy Nuevo en Esto', pt: 'Sou Novo Nisso', id: 'Saya Baru' },
  mark_complete: { en: 'Mark Complete', es: 'Marcar completo', pt: 'Marcar completo', id: 'Tandai Selesai' },
  share: { en: 'Share', es: 'Compartir', pt: 'Compartilhar', id: 'Bagikan' },
  day_x_of_y: { en: 'DAY {x} OF {y}', es: 'D\u00cdA {x} DE {y}', pt: 'DIA {x} DE {y}', id: 'HARI {x} DARI {y}' },
  note_label: { en: 'Note', es: 'Nota', pt: 'Nota', id: 'Catatan' },
  commentary_label: { en: 'Commentary', es: 'Comentario', pt: 'Coment\u00e1rio', id: 'Komentar' },
  save_to_notes: { en: 'Save to Notes', es: 'Guardar en Notas', pt: 'Salvar nas Notas', id: 'Simpan ke Catatan' },
  previous_day: { en: 'Previous Day', es: 'D\u00eda anterior', pt: 'Dia anterior', id: 'Hari Sebelumnya' },
  next_day: { en: 'Next Day', es: 'D\u00eda siguiente', pt: 'Pr\u00f3ximo dia', id: 'Hari Berikutnya' },
  esv_human: { en: 'ESV \u00b7 HUMAN READER', es: 'ESV \u00b7 LECTOR HUMANO', pt: 'ESV \u00b7 LEITOR HUMANO', id: 'ESV \u00b7 PEMBACA MANUSIA' },
  credits: { en: 'Created & Developed by Ashley Evans for Futures Church', es: 'Creado y desarrollado por Ashley Evans para Futures Church', pt: 'Criado e desenvolvido por Ashley Evans para Futures Church', id: 'Dibuat dan dikembangkan oleh Ashley Evans untuk Futures Church' },

  // ── TAB BAR ──
  tab_home: { en: 'Home', es: 'Inicio', pt: 'In\u00edcio', id: 'Beranda' },
  tab_notes: { en: 'Notes', es: 'Notas', pt: 'Notas', id: 'Catatan' },
  tab_campus: { en: 'Campus', es: 'Sede', pt: 'Campus', id: 'Kampus' },
  tab_plans: { en: 'Plans', es: 'Planes', pt: 'Planos', id: 'Rencana' },
  tab_settings: { en: 'Settings', es: 'Ajustes', pt: 'Configura\u00e7\u00f5es', id: 'Pengaturan' },

  // ── SETTINGS / MORE SCREEN ──
  back: { en: 'Back', es: 'Atr\u00e1s', pt: 'Voltar', id: 'Kembali' },
  settings_title: { en: 'Settings', es: 'Ajustes', pt: 'Configura\u00e7\u00f5es', id: 'Pengaturan' },
  guest: { en: 'Guest', es: 'Invitado', pt: 'Convidado', id: 'Tamu' },
  tap_setup_profile: { en: 'Tap to set up your profile', es: 'Toca para configurar tu perfil', pt: 'Toque para configurar seu perfil', id: 'Ketuk untuk mengatur profil Anda' },
  profile: { en: 'PROFILE', es: 'PERFIL', pt: 'PERFIL', id: 'PROFIL' },
  name_label: { en: 'Name', es: 'Nombre', pt: 'Nome', id: 'Nama' },
  email_label: { en: 'Email', es: 'Correo', pt: 'E-mail', id: 'Email' },
  not_set: { en: 'Not set', es: 'No configurado', pt: 'N\u00e3o definido', id: 'Belum diatur' },
  your_journey: { en: 'YOUR JOURNEY', es: 'TU CAMINO', pt: 'SUA JORNADA', id: 'PERJALANAN ANDA' },
  persona_new: { en: "I'm New to This", es: 'Soy Nuevo en Esto', pt: 'Sou Novo Nisso', id: 'Saya Baru' },
  persona_new_desc: { en: 'Starting or reigniting my faith journey', es: 'Comenzando o reavivando mi camino de fe', pt: 'Come\u00e7ando ou reacendendo minha jornada de f\u00e9', id: 'Memulai atau menghidupkan kembali perjalanan iman saya' },
  persona_member: { en: 'Church Member', es: 'Miembro de la Iglesia', pt: 'Membro da Igreja', id: 'Anggota Gereja' },
  persona_member_desc: { en: 'Growing in my daily walk with God', es: 'Creciendo en mi caminar diario con Dios', pt: 'Crescendo em minha caminhada di\u00e1ria com Deus', id: 'Bertumbuh dalam perjalanan harian saya bersama Tuhan' },
  persona_study: { en: 'Deep Bible Study', es: 'Estudio B\u00edblico Profundo', pt: 'Estudo B\u00edblico Profundo', id: 'Studi Alkitab Mendalam' },
  persona_study_desc: { en: 'Original languages, commentary, depth', es: 'Idiomas originales, comentarios, profundidad', pt: 'L\u00ednguas originais, coment\u00e1rios, profundidade', id: 'Bahasa asli, komentar, kedalaman' },
  persona_leader: { en: 'Leader / Pastor', es: 'L\u00edder / Pastor', pt: 'L\u00edder / Pastor', id: 'Pemimpin / Pendeta' },
  persona_leader_desc: { en: 'For leaders who serve and shepherd others', es: 'Para l\u00edderes que sirven y pastorean a otros', pt: 'Para l\u00edderes que servem e pastoreiam outros', id: 'Untuk pemimpin yang melayani dan menggembalakan orang lain' },
  persona_comfort: { en: 'I Need Comfort Right Now', es: 'Necesito Consuelo Ahora', pt: 'Preciso de Conforto Agora', id: 'Saya Butuh Penghiburan Sekarang' },
  persona_comfort_desc: { en: 'Encouragement for a difficult season', es: 'Aliento para una temporada dif\u00edcil', pt: 'Encorajamento para uma esta\u00e7\u00e3o dif\u00edcil', id: 'Dorongan untuk musim yang sulit' },
  my_season: { en: 'MY SEASON & CONTEXT', es: 'MI TEMPORADA Y CONTEXTO', pt: 'MINHA ESTA\u00c7\u00c3O E CONTEXTO', id: 'MUSIM & KONTEKS SAYA' },
  my_season_desc: { en: 'Tell Bible AI about your life right now \u2014 season, what you\'re studying, what you need. This shapes every conversation.', es: 'Cu\u00e9ntale a Biblia IA sobre tu vida ahora \u2014 temporada, qu\u00e9 estudias, qu\u00e9 necesitas. Esto moldea cada conversaci\u00f3n.', pt: 'Conte \u00e0 B\u00edblia IA sobre sua vida agora \u2014 esta\u00e7\u00e3o, o que est\u00e1 estudando, o que precisa. Isso molda cada conversa.', id: 'Ceritakan kepada Alkitab AI tentang hidup Anda sekarang \u2014 musim, apa yang Anda pelajari, apa yang Anda butuhkan.' },
  save: { en: 'Save', es: 'Guardar', pt: 'Salvar', id: 'Simpan' },
  bible_translation: { en: 'BIBLE TRANSLATION', es: 'TRADUCCI\u00d3N DE LA BIBLIA', pt: 'TRADU\u00c7\u00c3O DA B\u00cdBLIA', id: 'TERJEMAHAN ALKITAB' },
  your_campus: { en: 'YOUR CAMPUS', es: 'TU SEDE', pt: 'SEU CAMPUS', id: 'KAMPUS ANDA' },
  select_your_campus: { en: 'Select your campus', es: 'Selecciona tu sede', pt: 'Selecione seu campus', id: 'Pilih kampus Anda' },
  notifications: { en: 'NOTIFICATIONS', es: 'NOTIFICACIONES', pt: 'NOTIFICA\u00c7\u00d5ES', id: 'NOTIFIKASI' },
  turn_on_push: { en: 'Turn On Push Notifications', es: 'Activar notificaciones push', pt: 'Ativar notifica\u00e7\u00f5es push', id: 'Aktifkan Notifikasi Push' },
  library: { en: 'LIBRARY', es: 'BIBLIOTECA', pt: 'BIBLIOTECA', id: 'PERPUSTAKAAN' },
  essays_resources: { en: 'Essays & Bible Resources', es: 'Ensayos y recursos b\u00edblicos', pt: 'Ensaios e recursos b\u00edblicos', id: 'Esai & Sumber Daya Alkitab' },
  content_label: { en: 'CONTENT', es: 'CONTENIDO', pt: 'CONTE\u00daDO', id: 'KONTEN' },
  offline_bible: { en: 'Offline Bible', es: 'Biblia sin conexi\u00f3n', pt: 'B\u00edblia offline', id: 'Alkitab Offline' },
  about: { en: 'ABOUT', es: 'ACERCA DE', pt: 'SOBRE', id: 'TENTANG' },
  about_daily_word: { en: 'About Daily Word', es: 'Acerca de Palabra Diaria', pt: 'Sobre Palavra Di\u00e1ria', id: 'Tentang Firman Harian' },
  privacy_policy: { en: 'Privacy Policy', es: 'Pol\u00edtica de privacidad', pt: 'Pol\u00edtica de privacidade', id: 'Kebijakan Privasi' },
  characters: { en: 'characters', es: 'caracteres', pt: 'caracteres', id: 'karakter' },

  // ── PLANS SCREEN ──
  plans_title: { en: 'Plans', es: 'Planes', pt: 'Planos', id: 'Rencana' },
  plans_and_more: { en: 'Plans & More', es: 'Planes y m\u00e1s', pt: 'Planos e mais', id: 'Rencana & Lainnya' },
  plans_subtitle: { en: 'Your reading plans, devotion, and community', es: 'Tus planes de lectura, devocional y comunidad', pt: 'Seus planos de leitura, devo\u00e7\u00e3o e comunidade', id: 'Rencana bacaan, devosi, dan komunitas Anda' },
  your_plans: { en: 'YOUR PLANS', es: 'TUS PLANES', pt: 'SEUS PLANOS', id: 'RENCANA ANDA' },
  no_active_plans: { en: 'No active plans', es: 'Sin planes activos', pt: 'Sem planos ativos', id: 'Tidak ada rencana aktif' },
  browse_plans: { en: 'Browse Plans', es: 'Explorar planes', pt: 'Explorar planos', id: 'Jelajahi Rencana' },
  add_to_reading_plan: { en: '+ Add to Reading Plan', es: '+ A\u00f1adir al plan de lectura', pt: '+ Adicionar ao plano de leitura', id: '+ Tambah ke Rencana Baca' },
  coming_soon: { en: 'Coming Soon', es: 'Pr\u00f3ximamente', pt: 'Em breve', id: 'Segera Hadir' },
  essays: { en: 'ESSAYS', es: 'ENSAYOS', pt: 'ENSAIOS', id: 'ESAI' },
  reading_plan: { en: 'Reading Plan', es: 'Plan de lectura', pt: 'Plano de leitura', id: 'Rencana Baca' },
  start_plan: { en: 'Start Plan', es: 'Iniciar plan', pt: 'Iniciar plano', id: 'Mulai Rencana' },
  days: { en: 'days', es: 'd\u00edas', pt: 'dias', id: 'hari' },

  // ── NOTES / JOURNAL SCREEN ──
  notes_title: { en: 'Notes', es: 'Notas', pt: 'Notas', id: 'Catatan' },
  record: { en: 'Record', es: 'Grabar', pt: 'Gravar', id: 'Rekam' },
  new_entry: { en: 'New Entry', es: 'Nueva entrada', pt: 'Nova entrada', id: 'Entri Baru' },
  today: { en: 'Today', es: 'Hoy', pt: 'Hoje', id: 'Hari ini' },
  all_notes: { en: 'All Notes', es: 'Todas las notas', pt: 'Todas as notas', id: 'Semua Catatan' },
  prayer: { en: 'Prayer', es: 'Oraci\u00f3n', pt: 'Ora\u00e7\u00e3o', id: 'Doa' },
  no_passages: { en: 'No passages scheduled for today', es: 'No hay pasajes programados para hoy', pt: 'Nenhuma passagem programada para hoje', id: 'Tidak ada bagian yang dijadwalkan untuk hari ini' },
  add_reading_plan_cta: { en: 'Add a reading plan in Plans & More', es: 'A\u00f1ade un plan de lectura en Planes y m\u00e1s', pt: 'Adicione um plano de leitura em Planos e mais', id: 'Tambahkan rencana baca di Rencana & Lainnya' },

  // ── CAMPUS / MESSAGES SCREEN ──
  campus_title: { en: 'Campus', es: 'Sede', pt: 'Campus', id: 'Kampus' },
  pastors_corner: { en: "Pastor's Corner", es: 'Rinc\u00f3n del Pastor', pt: 'Cantinho do Pastor', id: 'Pojok Pendeta' },
  sermons: { en: 'Sermons', es: 'Sermones', pt: 'Serm\u00f5es', id: 'Khotbah' },
  prayer_wall: { en: 'Prayer Wall', es: 'Muro de oraci\u00f3n', pt: 'Mural de ora\u00e7\u00e3o', id: 'Dinding Doa' },
  select_campus_settings: { en: 'Select your campus in Settings to see updates from your pastor.', es: 'Selecciona tu sede en Ajustes para ver actualizaciones de tu pastor.', pt: 'Selecione seu campus em Configura\u00e7\u00f5es para ver atualiza\u00e7\u00f5es do seu pastor.', id: 'Pilih kampus Anda di Pengaturan untuk melihat pembaruan dari pendeta Anda.' },

  // ── BIBLE AI ──
  bible_ai: { en: 'BIBLE AI', es: 'BIBLIA IA', pt: 'B\u00cdBLIA IA', id: 'ALKITAB AI' },
  bible_ai_label: { en: 'Bible AI', es: 'Biblia IA', pt: 'B\u00edblia IA', id: 'Alkitab AI' },
  ask_anything: { en: 'Ask anything about the Bible', es: 'Pregunta lo que quieras sobre la Biblia', pt: 'Pergunte qualquer coisa sobre a B\u00edblia', id: 'Tanyakan apa saja tentang Alkitab' },
  type_question: { en: 'Type your question below and press send', es: 'Escribe tu pregunta abajo y presiona enviar', pt: 'Digite sua pergunta abaixo e pressione enviar', id: 'Ketik pertanyaan Anda di bawah dan tekan kirim' },
  got_it: { en: 'Got it', es: 'Entendido', pt: 'Entendi', id: 'Mengerti' },
  new_here: { en: 'New here? Ask Bible AI anything', es: '\u00bfNuevo aqu\u00ed? Pregunta lo que quieras a Biblia IA', pt: 'Novo aqui? Pergunte qualquer coisa \u00e0 B\u00edblia IA', id: 'Baru di sini? Tanyakan apa saja ke Alkitab AI' },
  bible_ai_hint: { en: "Not sure what this passage means? Tap here \u2014 it's like having a friend who knows the Bible really well.", es: '\u00bfNo est\u00e1s seguro de lo que significa este pasaje? Toca aqu\u00ed \u2014 es como tener un amigo que conoce muy bien la Biblia.', pt: 'N\u00e3o tem certeza do que essa passagem significa? Toque aqui \u2014 \u00e9 como ter um amigo que conhece muito bem a B\u00edblia.', id: 'Tidak yakin apa arti bagian ini? Ketuk di sini \u2014 seperti punya teman yang sangat mengenal Alkitab.' },
  tip_season: { en: "Tip: Tell Bible AI about your life season in Settings \u2192 My Season & Context. This makes every conversation more personal.", es: 'Consejo: Cu\u00e9ntale a Biblia IA sobre tu temporada de vida en Ajustes \u2192 Mi Temporada y Contexto.', pt: 'Dica: Conte \u00e0 B\u00edblia IA sobre sua esta\u00e7\u00e3o de vida em Configura\u00e7\u00f5es \u2192 Minha Esta\u00e7\u00e3o e Contexto.', id: 'Tips: Ceritakan kepada Alkitab AI tentang musim hidup Anda di Pengaturan \u2192 Musim & Konteks Saya.' },
  quick_meaning: { en: 'What does this passage mean?', es: '\u00bfQu\u00e9 significa este pasaje?', pt: 'O que essa passagem significa?', id: 'Apa arti bagian ini?' },
  quick_history: { en: 'Give me historical context', es: 'Dame el contexto hist\u00f3rico', pt: 'D\u00ea-me o contexto hist\u00f3rico', id: 'Berikan konteks sejarah' },
  quick_apply: { en: 'How does this apply to my life?', es: '\u00bfC\u00f3mo aplico esto a mi vida?', pt: 'Como isso se aplica \u00e0 minha vida?', id: 'Bagaimana ini berlaku dalam hidup saya?' },
  quick_greek: { en: 'What do Greek/Hebrew words reveal here?', es: '\u00bfQu\u00e9 revelan las palabras en griego/hebreo?', pt: 'O que as palavras em grego/hebraico revelam aqui?', id: 'Apa yang diungkapkan kata-kata Yunani/Ibrani di sini?' },
  quick_connect: { en: 'Connect this to the rest of Scripture', es: 'Conecta esto con el resto de las Escrituras', pt: 'Conecte isso com o restante das Escrituras', id: 'Hubungkan ini dengan seluruh Kitab Suci' },
  quick_god: { en: 'What is God saying to me through this?', es: '\u00bfQu\u00e9 me est\u00e1 diciendo Dios a trav\u00e9s de esto?', pt: 'O que Deus est\u00e1 me dizendo atrav\u00e9s disso?', id: 'Apa yang Tuhan katakan kepada saya melalui ini?' },
  greek_hebrew: { en: 'Greek & Hebrew Word Meanings', es: 'Significados de palabras en griego y hebreo', pt: 'Significados de palavras em grego e hebraico', id: 'Arti Kata Yunani & Ibrani' },
  original_lang: { en: 'Original language breakdown', es: 'Desglose del idioma original', pt: 'Detalhamento do idioma original', id: 'Rincian bahasa asli' },
  or_choose_quick: { en: '\u2014 or choose a quick question \u2014', es: '\u2014 o elige una pregunta r\u00e1pida \u2014', pt: '\u2014 ou escolha uma pergunta r\u00e1pida \u2014', id: '\u2014 atau pilih pertanyaan cepat \u2014' },
};

export function t(key: string, lang?: string): string {
  const l = lang || getLang();
  return UI[key]?.[l] || UI[key]?.['en'] || key;
}

export function useTranslation() {
  const lang = getLang();
  return (key: string) => UI[key]?.[lang] || UI[key]?.['en'] || key;
}
