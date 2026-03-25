// Shared i18n utility for Futures Daily Word
// All UI string translations for en, es, pt, id

export function getLang(): string {
  try { return localStorage.getItem('dw_lang') || 'en'; } catch { return 'en'; }
}

type LangMap = Record<string, string>;
type Translations = Record<string, LangMap>;

const UI: Translations = {
  // ââ HOME SCREEN ââ
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

  // ââ TAB BAR ââ
  tab_home: { en: 'Home', es: 'Inicio', pt: 'In\u00edcio', id: 'Beranda' },
  tab_notes: { en: 'Notes', es: 'Notas', pt: 'Notas', id: 'Catatan' },
  tab_campus: { en: 'Campus', es: 'Sede', pt: 'Campus', id: 'Kampus' },
  tab_plans: { en: 'Plans', es: 'Planes', pt: 'Planos', id: 'Rencana' },
  tab_settings: { en: 'Settings', es: 'Ajustes', pt: 'Configura\u00e7\u00f5es', id: 'Pengaturan' },

  // ââ SETTINGS / MORE SCREEN ââ
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

  // ââ PLANS SCREEN ââ
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

  // ââ NOTES / JOURNAL SCREEN ââ
  notes_title: { en: 'Notes', es: 'Notas', pt: 'Notas', id: 'Catatan' },
  record: { en: 'Record', es: 'Grabar', pt: 'Gravar', id: 'Rekam' },
  new_entry: { en: 'New Entry', es: 'Nueva entrada', pt: 'Nova entrada', id: 'Entri Baru' },
  today: { en: 'Today', es: 'Hoy', pt: 'Hoje', id: 'Hari ini' },
  all_notes: { en: 'All Notes', es: 'Todas las notas', pt: 'Todas as notas', id: 'Semua Catatan' },
  prayer: { en: 'Prayer', es: 'Oraci\u00f3n', pt: 'Ora\u00e7\u00e3o', id: 'Doa' },
  no_passages: { en: 'No passages scheduled for today', es: 'No hay pasajes programados para hoy', pt: 'Nenhuma passagem programada para hoje', id: 'Tidak ada bagian yang dijadwalkan untuk hari ini' },
  add_reading_plan_cta: { en: 'Add a reading plan in Plans & More', es: 'A\u00f1ade un plan de lectura en Planes y m\u00e1s', pt: 'Adicione um plano de leitura em Planos e mais', id: 'Tambahkan rencana baca di Rencana & Lainnya' },

  // ââ CAMPUS / MESSAGES SCREEN ââ
  campus_title: { en: 'Campus', es: 'Sede', pt: 'Campus', id: 'Kampus' },
  pastors_corner: { en: "Pastor's Corner", es: 'Rinc\u00f3n del Pastor', pt: 'Cantinho do Pastor', id: 'Pojok Pendeta' },
  sermons: { en: 'Sermons', es: 'Sermones', pt: 'Serm\u00f5es', id: 'Khotbah' },
  prayer_wall: { en: 'Prayer Wall', es: 'Muro de oraci\u00f3n', pt: 'Mural de ora\u00e7\u00e3o', id: 'Dinding Doa' },
  select_campus_settings: { en: 'Select your campus in Settings to see updates from your pastor.', es: 'Selecciona tu sede en Ajustes para ver actualizaciones de tu pastor.', pt: 'Selecione seu campus em Configura\u00e7\u00f5es para ver atualiza\u00e7\u00f5es do seu pastor.', id: 'Pilih kampus Anda di Pengaturan untuk melihat pembaruan dari pendeta Anda.' },

  // ââ BIBLE AI ââ
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

  // JOURNAL SCREEN - Additional
  j_close: { en: 'Close', es: 'Cerrar', pt: 'Fechar', id: 'Tutup' },
  j_record_yourself: { en: 'Record Yourself', es: 'Grab\u00e1rte', pt: 'Gravar-se', id: 'Rekam Diri' },
  j_recording: { en: 'Recording', es: 'Grabando', pt: 'Gravando', id: 'Merekam' },
  j_copied: { en: 'Copied!', es: '\u00a1Copiado!', pt: 'Copiado!', id: 'Disalin!' },
  j_copy: { en: 'Copy', es: 'Copiar', pt: 'Copiar', id: 'Salin' },
  j_listen: { en: 'Listen', es: 'Escuchar', pt: 'Ouvir', id: 'Dengar' },
  j_stop: { en: 'Stop', es: 'Parar', pt: 'Parar', id: 'Berhenti' },
  j_share: { en: 'Share', es: 'Compartir', pt: 'Compartilhar', id: 'Bagikan' },
  j_note: { en: 'Note', es: 'Nota', pt: 'Nota', id: 'Catatan' },
  j_ask_ai: { en: 'Ask AI', es: 'Preguntar IA', pt: 'Perguntar IA', id: 'Tanya AI' },
  j_chapter: { en: 'Chapter', es: 'Cap\u00edtulo', pt: 'Cap\u00edtulo', id: 'Pasal' },
  j_key_verse: { en: 'Key verse:', es: 'Vers\u00edculo clave:', pt: 'Vers\u00edculo chave:', id: 'Ayat kunci:' },
  j_reading: { en: 'Reading', es: 'Lectura', pt: 'Leitura', id: 'Bacaan' },
  j_todays_devotional: { en: "Today's Devotional", es: 'Devocional de Hoy', pt: 'Devocional de Hoje', id: 'Renungan Hari Ini' },
  j_select_all: { en: 'Select All', es: 'Seleccionar Todo', pt: 'Selecionar Tudo', id: 'Pilih Semua' },
  j_reflect_respond: { en: 'Reflect & Respond', es: 'Reflexionar y Responder', pt: 'Refletir e Responder', id: 'Renungkan & Tanggapi' },
  j_tap_answer: { en: 'Tap to answer in notes \u2192', es: 'Toca para responder en notas \u2192', pt: 'Toque para responder nas notas \u2192', id: 'Ketuk untuk menjawab di catatan \u2192' },
  j_scripture: { en: 'Scripture', es: 'Escritura', pt: 'Escritura', id: 'Kitab Suci' },
  j_loading: { en: 'Loading', es: 'Cargando', pt: 'Carregando', id: 'Memuat' },
  j_load_error: { en: 'Could not load passage. Check your connection.', es: 'No se pudo cargar el pasaje. Verifica tu conexi\u00f3n.', pt: 'N\u00e3o foi poss\u00edvel carregar a passagem. Verifique sua conex\u00e3o.', id: 'Tidak dapat memuat bagian. Periksa koneksi Anda.' },
  j_my_notes: { en: 'My Notes', es: 'Mis Notas', pt: 'Minhas Notas', id: 'Catatan Saya' },
  j_what_god_saying: { en: 'What is God saying to you through', es: 'Qu\u00e9 te est\u00e1 diciendo Dios a trav\u00e9s de', pt: 'O que Deus est\u00e1 dizendo a voc\u00ea atrav\u00e9s de', id: 'Apa yang Tuhan katakan kepadamu melalui' },
  j_save_note: { en: 'Save Note', es: 'Guardar Nota', pt: 'Salvar Nota', id: 'Simpan Catatan' },
  j_saved: { en: 'Saved', es: 'Guardado', pt: 'Salvo', id: 'Tersimpan' },
  j_edit_note: { en: 'Edit note', es: 'Editar nota', pt: 'Editar nota', id: 'Edit catatan' },
  j_read_chapter_notes: { en: 'Read chapter & notes', es: 'Leer cap\u00edtulo y notas', pt: 'Ler cap\u00edtulo e notas', id: 'Baca pasal & catatan' },
  j_read_devotional_notes: { en: 'Read devotional & notes', es: 'Leer devocional y notas', pt: 'Ler devocional e notas', id: 'Baca renungan & catatan' },
  j_read_add_note: { en: 'Read & add note', es: 'Leer y agregar nota', pt: 'Ler e adicionar nota', id: 'Baca & tambah catatan' },
  j_tap_study: { en: 'Tap to study \u2192', es: 'Toca para estudiar \u2192', pt: 'Toque para estudar \u2192', id: 'Ketuk untuk belajar \u2192' },
  j_delete_entry: { en: 'Delete this entry? This cannot be undone.', es: 'Eliminar esta entrada? No se puede deshacer.', pt: 'Excluir esta entrada? Isso n\u00e3o pode ser desfeito.', id: 'Hapus entri ini? Ini tidak bisa dibatalkan.' },
  j_title_placeholder: { en: 'Title...', es: 'T\u00edtulo...', pt: 'T\u00edtulo...', id: 'Judul...' },
  j_todays_prompt: { en: "Today's Prompt", es: 'Mensaje de Hoy', pt: 'Prompt de Hoje', id: 'Prompt Hari Ini' },
  j_tap_start_prompt: { en: 'Tap to start with this prompt', es: 'Toca para comenzar con este mensaje', pt: 'Toque para come\u00e7ar com este prompt', id: 'Ketuk untuk memulai dengan prompt ini' },
  j_write_sermon: { en: 'Write your sermon notes...', es: 'Escribe tus notas del serm\u00f3n...', pt: 'Escreva suas notas do serm\u00e3o...', id: 'Tulis catatan khotbahmu...' },
  j_write_prayer: { en: "What's on your heart? Write a prayer...", es: 'Qu\u00e9 hay en tu coraz\u00f3n? Escribe una oraci\u00f3n...', pt: 'O que est\u00e1 no seu cora\u00e7\u00e3o? Escreva uma ora\u00e7\u00e3o...', id: 'Apa yang ada di hatimu? Tulis doa...' },
  j_sermon_prep: { en: 'Sermon prep, teaching notes...', es: 'Preparaci\u00f3n de serm\u00f3n, notas...', pt: 'Prepara\u00e7\u00e3o de serm\u00e3o, notas...', id: 'Persiapan khotbah, catatan...' },
  j_write_thoughts: { en: 'Write your thoughts...', es: 'Escribe tus pensamientos...', pt: 'Escreva seus pensamentos...', id: 'Tulis pikiranmu...' },
  j_tags: { en: 'Tags', es: 'Etiquetas', pt: 'Tags', id: 'Tag' },
  j_your_active_plans: { en: 'YOUR ACTIVE PLANS', es: 'TUS PLANES ACTIVOS', pt: 'SEUS PLANOS ATIVOS', id: 'RENCANA AKTIFMU' },
  j_up_next_day: { en: 'UP NEXT', es: 'SIGUIENTE', pt: 'PR\u00d3XIMO', id: 'BERIKUTNYA' },
  j_continue_reading: { en: 'Continue Reading', es: 'Continuar Leyendo', pt: 'Continuar Lendo', id: 'Lanjut Membaca' },
  j_no_prayers: { en: 'No prayers yet', es: 'Sin oraciones a\u00fan', pt: 'Nenhuma ora\u00e7\u00e3o ainda', id: 'Belum ada doa' },
  j_no_notes: { en: 'No notes yet', es: 'Sin notas a\u00fan', pt: 'Nenhuma nota ainda', id: 'Belum ada catatan' },
  j_create_first: { en: 'Create Your First Entry', es: 'Crea Tu Primera Entrada', pt: 'Crie Sua Primeira Entrada', id: 'Buat Entri Pertamamu' },
  j_showing_full_chapter: { en: 'showing full chapter', es: 'mostrando cap\u00edtulo completo', pt: 'mostrando cap\u00edtulo completo', id: 'menampilkan pasal lengkap' },
  j_listen_all: { en: 'Listen to all content', es: 'Escuchar todo el contenido', pt: 'Ouvir todo o conte\u00fado', id: 'Dengarkan semua konten' },
  j_camera_denied: { en: 'Camera access denied. Please allow camera and mic permissions and try again.', es: 'Acceso a c\u00e1mara denegado. Permite c\u00e1mara y micr\u00f3fono e int\u00e9ntalo de nuevo.', pt: 'Acesso \u00e0 c\u00e2mera negado. Permita c\u00e2mera e microfone e tente novamente.', id: 'Akses kamera ditolak. Izinkan kamera dan mikrofon dan coba lagi.' },
  j_camera_error: { en: 'Could not access camera:', es: 'No se pudo acceder a la c\u00e1mara:', pt: 'N\u00e3o foi poss\u00edvel acessar a c\u00e2mera:', id: 'Tidak dapat mengakses kamera:' },

  // PLANS SCREEN - Additional
  p_devotion_of_day: { en: 'DEVOTION OF THE DAY', es: 'DEVOCIONAL DEL D\u00cdA', pt: 'DEVOCIONAL DO DIA', id: 'RENUNGAN HARI INI' },
  p_prayer_wall: { en: 'Prayer Wall', es: 'Muro de Oraci\u00f3n', pt: 'Mural de Ora\u00e7\u00e3o', id: 'Dinding Doa' },
  p_live_stream: { en: 'Live Stream', es: 'En Vivo', pt: 'Ao Vivo', id: 'Siaran Langsung' },
  p_your_plans_header: { en: 'Your Plans', es: 'Tus Planes', pt: 'Seus Planos', id: 'Rencanamu' },
  p_browse_manage: { en: 'Browse and manage your reading plans', es: 'Explora y administra tus planes de lectura', pt: 'Navegue e gerencie seus planos de leitura', id: 'Jelajahi dan kelola rencana bacaanmu' },
  p_my_plans: { en: 'My Plans', es: 'Mis Planes', pt: 'Meus Planos', id: 'Rencanaku' },
  p_browse_all: { en: 'Browse All', es: 'Ver Todos', pt: 'Ver Todos', id: 'Lihat Semua' },
  p_no_active_yet: { en: 'No active plans yet', es: 'Sin planes activos a\u00fan', pt: 'Nenhum plano ativo ainda', id: 'Belum ada rencana aktif' },
  p_up_next: { en: 'Up next:', es: 'Siguiente:', pt: 'Pr\u00f3ximo:', id: 'Berikutnya:' },
  p_mark_day: { en: 'Mark Day', es: 'Marcar D\u00eda', pt: 'Marcar Dia', id: 'Tandai Hari' },
  p_complete_word: { en: 'Complete', es: 'Completo', pt: 'Completo', id: 'Selesai' },
  p_next_chapter: { en: 'Next Chapter', es: 'Siguiente Cap\u00edtulo', pt: 'Pr\u00f3ximo Cap\u00edtulo', id: 'Pasal Berikutnya' },
  p_restart: { en: 'Restart', es: 'Reiniciar', pt: 'Reiniciar', id: 'Mulai Ulang' },
  p_adjust_progress: { en: 'Adjust progress', es: 'Ajustar progreso', pt: 'Ajustar progresso', id: 'Sesuaikan progres' },
  p_remove_plan: { en: 'Remove this plan', es: 'Eliminar este plan', pt: 'Remover este plano', id: 'Hapus rencana ini' },
  p_run_multiple: { en: 'You can run multiple plans at once. Tap to select, then save.', es: 'Puedes ejecutar varios planes a la vez. Toca para seleccionar, luego guarda.', pt: 'Voc\u00ea pode executar v\u00e1rios planos ao mesmo tempo. Toque para selecionar, depois salve.', id: 'Kamu bisa menjalankan beberapa rencana sekaligus. Ketuk untuk memilih, lalu simpan.' },
  p_tap_remove: { en: 'Tap to remove', es: 'Toca para eliminar', pt: 'Toque para remover', id: 'Ketuk untuk menghapus' },
  p_active: { en: 'Active', es: 'Activo', pt: 'Ativo', id: 'Aktif' },
  p_day_of: { en: 'Day', es: 'D\u00eda', pt: 'Dia', id: 'Hari' },
  p_of: { en: 'of', es: 'de', pt: 'de', id: 'dari' },
  p_chapter_of: { en: 'Chapter', es: 'Cap\u00edtulo', pt: 'Cap\u00edtulo', id: 'Pasal' },
  p_see_schedule: { en: 'See schedule', es: 'Ver horario', pt: 'Ver cronograma', id: 'Lihat jadwal' },
  p_hide_schedule: { en: 'Hide schedule', es: 'Ocultar horario', pt: 'Ocultar cronograma', id: 'Sembunyikan jadwal' },
  p_reading_schedule: { en: 'Reading Schedule', es: 'Horario de Lectura', pt: 'Cronograma de Leitura', id: 'Jadwal Bacaan' },
  p_daily_schedule: { en: 'Daily Schedule', es: 'Horario Diario', pt: 'Cronograma Di\u00e1rio', id: 'Jadwal Harian' },
  p_ch: { en: 'Ch', es: 'Cap', pt: 'Cap', id: 'Psl' },
  p_save_plans: { en: 'Save', es: 'Guardar', pt: 'Salvar', id: 'Simpan' },
  p_plans_count: { en: 'Plan(s)', es: 'Plan(es)', pt: 'Plano(s)', id: 'Rencana' },
  p_day_streak: { en: 'Day Streak', es: 'Racha de D\u00edas', pt: 'Sequ\u00eancia de Dias', id: 'Hari Beruntun' },
  p_start_streak: { en: 'Start Your Streak', es: 'Comienza Tu Racha', pt: 'Comece Sua Sequ\u00eancia', id: 'Mulai Beruntunmu' },
  p_keep_going: { en: 'Keep going!', es: 'Sigue adelante!', pt: 'Continue!', id: 'Terus!' },
  p_read_for: { en: "You've read for", es: 'Has le\u00eddo por', pt: 'Voc\u00ea leu por', id: 'Kamu sudah membaca selama' },
  p_days_in_row: { en: 'day(s) in a row.', es: 'd\u00eda(s) seguido(s).', pt: 'dia(s) seguido(s).', id: 'hari berturut-turut.' },
  p_complete_to_start: { en: 'Complete a plan day to start your reading streak.', es: 'Completa un d\u00eda del plan para comenzar tu racha.', pt: 'Complete um dia do plano para come\u00e7ar sua sequ\u00eancia.', id: 'Selesaikan satu hari rencana untuk memulai beruntunmu.' },
  p_recommended: { en: 'RECOMMENDED FOR YOU', es: 'RECOMENDADO PARA TI', pt: 'RECOMENDADO PARA VOC\u00ca', id: 'DIREKOMENDASIKAN UNTUKMU' },
  p_faith_pathway: { en: '30-Day Faith Pathway', es: 'Camino de Fe de 30 D\u00edas', pt: 'Caminho de F\u00e9 de 30 Dias', id: 'Jalur Iman 30 Hari' },
  p_faith_desc: { en: 'Perfect for new believers \u2014 a guided journey through faith foundations.', es: 'Perfecto para nuevos creyentes \u2014 un viaje guiado por los fundamentos de la fe.', pt: 'Perfeito para novos crentes \u2014 uma jornada guiada pelos fundamentos da f\u00e9.', id: 'Sempurna untuk orang percaya baru \u2014 perjalanan terpandu melalui dasar-dasar iman.' },
  p_start_faith: { en: 'Start Faith Pathway', es: 'Comenzar Camino de Fe', pt: 'Iniciar Caminho de F\u00e9', id: 'Mulai Jalur Iman' },
  p_plans_and_more: { en: 'Plans & More', es: 'Planes y M\u00e1s', pt: 'Planos e Mais', id: 'Rencana & Lainnya' },
  p_plans_subtitle: { en: 'Your reading plans, devotion, and community', es: 'Tus planes de lectura, devocional y comunidad', pt: 'Seus planos de leitura, devocional e comunidade', id: 'Rencana bacaan, renungan, dan komunitasmu' },

  // HOME SCREEN - Additional
  h_welcome: { en: 'Welcome, friend', es: 'Bienvenido, amigo', pt: 'Bem-vindo, amigo', id: 'Selamat datang, teman' },
  h_font_size: { en: 'FONT SIZE', es: 'TAMA\u00d1O DE FUENTE', pt: 'TAMANHO DA FONTE', id: 'UKURAN FONT' },
  h_created_developed: { en: 'Created & Developed by', es: 'Creado y Desarrollado por', pt: 'Criado e Desenvolvido por', id: 'Dibuat & Dikembangkan oleh' },
  h_day_label: { en: 'DAY', es: 'D\u00cdA', pt: 'DIA', id: 'HARI' },

  // SETTINGS - Additional
  s_language: { en: 'LANGUAGE', es: 'IDIOMA', pt: 'IDIOMA', id: 'BAHASA' },
  s_daily_reading: { en: 'DAILY READING', es: 'LECTURA DIARIA', pt: 'LEITURA DI\u00c1RIA', id: 'BACAAN HARIAN' },
  s_media: { en: 'MEDIA', es: 'MEDIOS', pt: 'M\u00cdDIA', id: 'MEDIA' },
  s_font_size: { en: 'FONT SIZE', es: 'TAMA\u00d1O DE FUENTE', pt: 'TAMANHO DA FONTE', id: 'UKURAN FONT' },

  // ── HERO BUTTON STATES ──
  now_playing: { en: 'Now Playing', es: 'Reproduciendo', pt: 'Reproduzindo', id: 'Sedang Diputar' },
  paused_label: { en: 'Paused', es: 'Pausado', pt: 'Pausado', id: 'Dijeda' },
  loading_label: { en: 'Loading\u2026', es: 'Cargando\u2026', pt: 'Carregando\u2026', id: 'Memuat\u2026' },
  stop_all: { en: 'Stop All', es: 'Detener Todo', pt: 'Parar Tudo', id: 'Hentikan Semua' },
  select_all_passages: { en: 'Select All', es: 'Seleccionar Todo', pt: 'Selecionar Tudo', id: 'Pilih Semua' },
  passages_word: { en: 'Passages', es: 'Pasajes', pt: 'Passagens', id: 'Bagian' },
  close_label: { en: 'Close', es: 'Cerrar', pt: 'Fechar', id: 'Tutup' },
  esv_human_reader: { en: 'ESV \u00b7 Human Reader', es: 'ESV \u00b7 Lector Humano', pt: 'ESV \u00b7 Leitor Humano', id: 'ESV \u00b7 Pembaca Manusia' },
  audio_unavailable: { en: 'Audio unavailable \u2014 tap Read to follow along', es: 'Audio no disponible \u2014 toca Leer para seguir', pt: '\u00c1udio indispon\u00edvel \u2014 toque Ler para acompanhar', id: 'Audio tidak tersedia \u2014 ketuk Baca untuk mengikuti' },

  // ── EMOJI REACTIONS ──
  reaction_heart: { en: 'Touched my heart', es: 'Toc\u00f3 mi coraz\u00f3n', pt: 'Tocou meu cora\u00e7\u00e3o', id: 'Menyentuh hatiku' },
  reaction_thinking: { en: 'Made me think', es: 'Me hizo pensar', pt: 'Me fez pensar', id: 'Membuatku berpikir' },
  reaction_prayer: { en: 'I needed this', es: 'Necesitaba esto', pt: 'Eu precisava disso', id: 'Aku membutuhkan ini' },

  // ── WEEKLY STATS ──
  days_this_week: { en: 'days this week', es: 'd\u00edas esta semana', pt: 'dias esta semana', id: 'hari minggu ini' },
  day_streak: { en: 'day streak', es: 'd\u00edas seguidos', pt: 'dias seguidos', id: 'hari beruntun' },

  // ── FONT SIZES ──
  font_small: { en: 'Small', es: 'Peque\u00f1o', pt: 'Pequeno', id: 'Kecil' },
  font_medium: { en: 'Medium', es: 'Mediano', pt: 'M\u00e9dio', id: 'Sedang' },
  font_large: { en: 'Large', es: 'Grande', pt: 'Grande', id: 'Besar' },

  // ── ADMIN ──
  administrator: { en: 'ADMINISTRATOR', es: 'ADMINISTRADOR', pt: 'ADMINISTRADOR', id: 'ADMINISTRATOR' },
  app_analytics: { en: 'App Analytics', es: 'Anal\u00edticas de la App', pt: 'An\u00e1lises do App', id: 'Analitik Aplikasi' },
  enter_admin_pin: { en: 'Enter administrator PIN:', es: 'Ingresa el PIN de administrador:', pt: 'Digite o PIN de administrador:', id: 'Masukkan PIN administrator:' },
  incorrect_pin: { en: 'Incorrect PIN', es: 'PIN incorrecto', pt: 'PIN incorreto', id: 'PIN salah' },
  enter_admin_code: { en: 'Enter admin code:', es: 'Ingresa c\u00f3digo de admin:', pt: 'Digite c\u00f3digo de admin:', id: 'Masukkan kode admin:' },
  poll_results: { en: 'Poll Results', es: 'Resultados de Encuesta', pt: 'Resultados da Enquete', id: 'Hasil Polling' },
  admin_label: { en: 'ADMIN', es: 'ADMIN', pt: 'ADMIN', id: 'ADMIN' },

  // ── MESSAGE TYPES ──
  msg_announcement: { en: 'Announcement', es: 'Anuncio', pt: 'An\u00fancio', id: 'Pengumuman' },
  msg_sermon_note: { en: 'Sermon Note', es: 'Nota del Serm\u00f3n', pt: 'Nota do Serm\u00e3o', id: 'Catatan Khotbah' },
  msg_essay: { en: 'Essay', es: 'Ensayo', pt: 'Ensaio', id: 'Esai' },
  msg_note: { en: 'Note', es: 'Nota', pt: 'Nota', id: 'Catatan' },
  msg_prayer_point: { en: 'Prayer Point', es: 'Punto de Oraci\u00f3n', pt: 'Ponto de Ora\u00e7\u00e3o', id: 'Pokok Doa' },
  msg_video: { en: 'Video', es: 'Video', pt: 'V\u00eddeo', id: 'Video' },

  // ── PLACEHOLDERS ──
  write_message_placeholder: { en: 'Write your message to the campus...', es: 'Escribe tu mensaje al campus...', pt: 'Escreva sua mensagem para o campus...', id: 'Tulis pesanmu untuk kampus...' },
  enter_pastor_code_placeholder: { en: 'Enter your pastor code to publish', es: 'Ingresa tu c\u00f3digo de pastor para publicar', pt: 'Digite seu c\u00f3digo de pastor para publicar', id: 'Masukkan kode pastormu untuk menerbitkan' },
  your_notes_placeholder: { en: 'Your notes...', es: 'Tus notas...', pt: 'Suas notas...', id: 'Catatanmu...' },
  search_books: { en: 'Search books...', es: 'Buscar libros...', pt: 'Buscar livros...', id: 'Cari buku...' },
  write_reflection_placeholder: { en: 'Write your reflection, prayer, or observation...', es: 'Escribe tu reflexi\u00f3n, oraci\u00f3n u observaci\u00f3n...', pt: 'Escreva sua reflex\u00e3o, ora\u00e7\u00e3o ou observa\u00e7\u00e3o...', id: 'Tulis refleksi, doa, atau pengamatanmu...' },
  ask_passage_placeholder: { en: 'Ask anything about this passage...', es: 'Pregunta lo que quieras sobre este pasaje...', pt: 'Pergunte qualquer coisa sobre esta passagem...', id: 'Tanyakan apa saja tentang bagian ini...' },
  ask_bible_placeholder: { en: 'e.g. What does Romans 8:28 mean?', es: 'Ej. \u00bfQu\u00e9 significa Romanos 8:28?', pt: 'Ex. O que significa Romanos 8:28?', id: 'Mis. Apa arti Roma 8:28?' },
  personal_media_placeholder: { en: 'Paste Spotify, YouTube, or podcast link...', es: 'Pega enlace de Spotify, YouTube o podcast...', pt: 'Cole link do Spotify, YouTube ou podcast...', id: 'Tempel tautan Spotify, YouTube, atau podcast...' },
  my_season_placeholder: { en: "E.g. I'm walking through grief...", es: 'Ej. Estoy pasando por un duelo...', pt: 'Ex. Estou passando por um luto...', id: 'Mis. Saya sedang melewati duka...' },
  title_placeholder: { en: 'Title', es: 'T\u00edtulo', pt: 'T\u00edtulo', id: 'Judul' },
  pray_placeholder: { en: 'What would you like your church family to pray for?', es: '\u00bfPor qu\u00e9 te gustar\u00eda que tu familia de la iglesia ore?', pt: 'Pelo que voc\u00ea gostaria que sua fam\u00edlia da igreja orasse?', id: 'Apa yang ingin kamu minta doakan oleh keluarga gerejamu?' },

  // ── TOASTS / FEEDBACK ──
  copied_toast: { en: 'Copied!', es: '\u00a1Copiado!', pt: 'Copiado!', id: 'Disalin!' },
  copy_label: { en: 'Copy', es: 'Copiar', pt: 'Copiar', id: 'Salin' },
  ask_ai_label: { en: 'Ask AI', es: 'Preguntar IA', pt: 'Perguntar IA', id: 'Tanya AI' },
  failed_to_copy: { en: 'Failed to copy', es: 'Error al copiar', pt: 'Falha ao copiar', id: 'Gagal menyalin' },
  saved_to_notes: { en: 'Saved to Notes!', es: '\u00a1Guardado en Notas!', pt: 'Salvo nas Notas!', id: 'Tersimpan di Catatan!' },
  failed_to_save: { en: 'Failed to save', es: 'Error al guardar', pt: 'Falha ao salvar', id: 'Gagal menyimpan' },
  save_to_notes_btn: { en: 'Save to Notes', es: 'Guardar en Notas', pt: 'Salvar nas Notas', id: 'Simpan ke Catatan' },
  saved_label: { en: 'Saved!', es: '\u00a1Guardado!', pt: 'Salvo!', id: 'Tersimpan!' },

  // ── EMAILGATE ──
  first_name_label: { en: 'First name', es: 'Nombre', pt: 'Nome', id: 'Nama depan' },
  last_name_label: { en: 'Last name', es: 'Apellido', pt: 'Sobrenome', id: 'Nama belakang' },
  email_address_label: { en: 'Email address', es: 'Correo electr\u00f3nico', pt: 'Endere\u00e7o de e-mail', id: 'Alamat email' },
  select_campus_optional: { en: 'Select campus (optional)', es: 'Seleccionar sede (opcional)', pt: 'Selecionar campus (opcional)', id: 'Pilih kampus (opsional)' },

  // ── PATHWAY PICKER ──
  welcome_daily_word: { en: 'Welcome to Daily Word', es: 'Bienvenido a Palabra Diaria', pt: 'Bem-vindo ao Palavra Di\u00e1ria', id: 'Selamat datang di Firman Harian' },
  still_right_fit: { en: 'Still the right fit?', es: '\u00bfA\u00fan es lo correcto?', pt: 'Ainda \u00e9 a escolha certa?', id: 'Masih cocok?' },
  journey_changed: { en: "Your journey may have changed. Tap to update, or keep going.", es: 'Tu camino puede haber cambiado. Toca para actualizar o contin\u00faa.', pt: 'Sua jornada pode ter mudado. Toque para atualizar ou continue.', id: 'Perjalananmu mungkin sudah berubah. Ketuk untuk memperbarui atau lanjutkan.' },
  everyones_different: { en: "Everyone's journey is different. Where are you?", es: 'El camino de cada uno es diferente. \u00bfD\u00f3nde est\u00e1s?', pt: 'A jornada de cada um \u00e9 diferente. Onde voc\u00ea est\u00e1?', id: 'Perjalanan setiap orang berbeda. Di mana kamu?' },

  // ── GREEK HEBREW ──
  looking_up: { en: 'Looking up\u2026', es: 'Buscando\u2026', pt: 'Buscando\u2026', id: 'Mencari\u2026' },
  hebrew_label: { en: 'Hebrew', es: 'Hebreo', pt: 'Hebraico', id: 'Ibrani' },

  // ── ONBOARDING PERSONAS (Setup wizard) ──
  setup_personal_time: { en: 'Personal time in the Word', es: 'Tiempo personal en la Palabra', pt: 'Tempo pessoal na Palavra', id: 'Waktu pribadi dalam Firman' },
  setup_personal_desc: { en: 'Not for a sermon \u2014 just me and God', es: 'No para un serm\u00f3n \u2014 solo yo y Dios', pt: 'N\u00e3o para um serm\u00e3o \u2014 s\u00f3 eu e Deus', id: 'Bukan untuk khotbah \u2014 hanya aku dan Tuhan' },
  setup_deep_study: { en: 'Deep study with full tools', es: 'Estudio profundo con todas las herramientas', pt: 'Estudo profundo com todas as ferramentas', id: 'Studi mendalam dengan semua alat' },
  setup_deep_desc: { en: 'Commentary, Greek/Hebrew, cross-references', es: 'Comentario, griego/hebreo, referencias cruzadas', pt: 'Coment\u00e1rio, grego/hebraico, refer\u00eancias cruzadas', id: 'Komentar, Yunani/Ibrani, referensi silang' },
  setup_rhythm: { en: 'A reading rhythm I can stick to', es: 'Un ritmo de lectura que puedo mantener', pt: 'Um ritmo de leitura que posso manter', id: 'Ritme membaca yang bisa kupertahankan' },
  setup_rhythm_desc: { en: 'Consistent daily plan, right pace for my schedule', es: 'Plan diario constante, ritmo adecuado para mi horario', pt: 'Plano di\u00e1rio consistente, ritmo certo para minha agenda', id: 'Rencana harian konsisten, kecepatan tepat untuk jadwalku' },
  setup_read_ahead: { en: "Read ahead of what I'm preaching", es: 'Leer antes de lo que voy a predicar', pt: 'Ler adiante do que vou pregar', id: 'Membaca lebih dulu dari yang akan kukhotbahkan' },
  setup_read_ahead_desc: { en: 'Gospels, Acts, Letters \u2014 stay in the text', es: 'Evangelios, Hechos, Cartas \u2014 mantente en el texto', pt: 'Evangelhos, Atos, Cartas \u2014 fique no texto', id: 'Injil, Kisah, Surat \u2014 tetap dalam teks' },

  // ── CHAPTERS PER DAY ──
  chapters_1: { en: '1 chapter a day', es: '1 cap\u00edtulo al d\u00eda', pt: '1 cap\u00edtulo por dia', id: '1 pasal per hari' },
  chapters_1_desc: { en: 'A gentle pace', es: 'Un ritmo suave', pt: 'Um ritmo suave', id: 'Kecepatan lembut' },
  chapters_2: { en: '2 chapters a day', es: '2 cap\u00edtulos al d\u00eda', pt: '2 cap\u00edtulos por dia', id: '2 pasal per hari' },
  chapters_2_desc: { en: 'A steady rhythm', es: 'Un ritmo constante', pt: 'Um ritmo constante', id: 'Ritme yang stabil' },
  chapters_3: { en: '3 chapters a day', es: '3 cap\u00edtulos al d\u00eda', pt: '3 cap\u00edtulos por dia', id: '3 pasal per hari' },
  chapters_3_desc: { en: 'Deeper immersion', es: 'Inmersi\u00f3n m\u00e1s profunda', pt: 'Imers\u00e3o mais profunda', id: 'Pendalaman lebih' },

  // ── FONT SIZE CONTROLS ──
  font_size_label: { en: 'Font Size', es: 'Tama\u00f1o de Fuente', pt: 'Tamanho da Fonte', id: 'Ukuran Font' },

  // ── MESSAGES SCREEN ──
  publish: { en: 'Publish', es: 'Publicar', pt: 'Publicar', id: 'Terbitkan' },
  write_notes: { en: 'Write your notes...', es: 'Escribe tus notas...', pt: 'Escreva suas notas...', id: 'Tulis catatanmu...' },
  ask_about_passage: { en: 'Ask about this passage\u2026', es: 'Pregunta sobre este pasaje\u2026', pt: 'Pergunte sobre esta passagem\u2026', id: 'Tanyakan tentang bagian ini\u2026' },
};

export function t(key: string, lang?: string): string {
  const l = lang || getLang();
  return UI[key]?.[l] || UI[key]?.['en'] || key;
}

export function useTranslation() {
  const lang = getLang();
  return (key: string) => UI[key]?.[lang] || UI[key]?.['en'] || key;
}
