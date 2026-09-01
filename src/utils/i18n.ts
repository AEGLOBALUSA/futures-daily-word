// Shared i18n utility for Futures Daily Word
// All UI string translations for en, es, pt, id

import { useState, useEffect } from 'react';

export function getLang(): string {
  try { return localStorage.getItem('dw_lang') || 'en'; } catch { return 'en'; }
}

/** BCP-47 locale for date formatting in the current app language. Display-only:
 *  stored entry dates stay 'en-US' (JournalScreen matches them by string equality). */
export function dateLocale(lang?: string): string {
  const map: Record<string, string> = { en: 'en-US', es: 'es', pt: 'pt-BR', id: 'id' };
  return map[lang || getLang()] || 'en-US';
}

/** Write language preference and dispatch event so listeners can react */
export function setLangPref(lang: string): void {
  try { localStorage.setItem('dw_lang', lang); } catch {}
  // Keep <html lang> in step with the in-place switch (main.tsx only sets it
  // on boot) so screen readers change voice without a full reload.
  try { document.documentElement.lang = lang; } catch { /* ignore */ }
  window.dispatchEvent(new Event('dw-lang-changed'));
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
  search_the_bible: { en: 'Search the Bible', es: 'Buscar en la Biblia', pt: 'Pesquisar na B\u00edblia', id: 'Cari di Alkitab' },
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
  campus_chip: { en: 'Campus', es: 'Sede', pt: 'Campus', id: 'Kampus' },
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
  plan_start_error: { en: 'Could not load this book. Please try again.', es: 'No se pudo cargar este libro.', pt: 'Erro ao carregar o livro.', id: 'Tidak dapat memuat buku ini.' },
  network_error: { en: 'Connection error. Please check your internet.', es: 'Error de conexion.', pt: 'Erro de conexao.', id: 'Kesalahan koneksi.' },
  stop: { en: 'Stop', es: 'Parar', pt: 'Parar', id: 'Berhenti' },

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
  j_save_failed: { en: "Couldn't save \u2014 device storage is full. Free up space and try again.", es: 'No se pudo guardar: el almacenamiento del dispositivo est\u00e1 lleno. Libera espacio e int\u00e9ntalo de nuevo.', pt: 'N\u00e3o foi poss\u00edvel salvar: o armazenamento do dispositivo est\u00e1 cheio. Libere espa\u00e7o e tente novamente.', id: 'Tidak dapat menyimpan \u2014 penyimpanan perangkat penuh. Kosongkan ruang dan coba lagi.' },
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
  j_my_sermon_notes: { en: 'MY SERMON NOTES', es: 'MIS NOTAS DEL SERM\u00d3N', pt: 'MINHAS NOTAS DO SERM\u00c3O', id: 'CATATAN KHOTBAH SAYA' },
  j_general_notes: { en: 'Other Notes', es: 'Otras notas', pt: 'Outras notas', id: 'Catatan Lainnya' },
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
  p_tap_remove: { en: 'Tap again to remove', es: 'Toca otra vez para eliminar', pt: 'Toque novamente para remover', id: 'Ketuk lagi untuk menghapus' },
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
  pause: { en: 'Pause', es: 'Pausar', pt: 'Pausar', id: 'Jeda' },
  chapter_navigator: { en: 'Chapter navigator', es: 'Navegador de cap\u00edtulos', pt: 'Navegador de cap\u00edtulos', id: 'Navigasi pasal' },
  loading_label: { en: 'Preparing audio \u2014 please wait\u2026', es: 'Preparando audio \u2014 espere\u2026', pt: 'Preparando \u00e1udio \u2014 aguarde\u2026', id: 'Menyiapkan audio \u2014 harap tunggu\u2026' },
  stop_all: { en: 'Stop All', es: 'Detener Todo', pt: 'Parar Tudo', id: 'Hentikan Semua' },
  select_all_passages: { en: 'Select All', es: 'Seleccionar Todo', pt: 'Selecionar Tudo', id: 'Pilih Semua' },
  passages_word: { en: 'Passages', es: 'Pasajes', pt: 'Passagens', id: 'Bagian' },
  close_label: { en: 'Close', es: 'Cerrar', pt: 'Fechar', id: 'Tutup' },
  hide_reading: { en: 'Hide', es: 'Ocultar', pt: 'Ocultar', id: 'Sembunyikan' },
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

  // \u2500\u2500 NOTE SAVING / READING ACTION BAR \u2500\u2500
  note_save_btn: { en: 'Save note', es: 'Guardar nota', pt: 'Salvar nota', id: 'Simpan catatan' },
  note_saving: { en: 'Saving\u2026', es: 'Guardando\u2026', pt: 'Salvando\u2026', id: 'Menyimpan\u2026' },
  note_saved: { en: 'Saved', es: 'Guardado', pt: 'Salvo', id: 'Tersimpan' },
  note_autosaves: { en: 'Saves automatically as you write', es: 'Se guarda autom\u00e1ticamente mientras escribes', pt: 'Salva automaticamente enquanto voc\u00ea escreve', id: 'Tersimpan otomatis saat kamu menulis' },
  listen_label: { en: 'Listen', es: 'Escuchar', pt: 'Ouvir', id: 'Dengarkan' },
  pause_label: { en: 'Pause', es: 'Pausar', pt: 'Pausar', id: 'Jeda' },
  compare_label: { en: 'Compare', es: 'Comparar', pt: 'Comparar', id: 'Bandingkan' },
  bookmark_label: { en: 'Bookmark', es: 'Marcador', pt: 'Marcador', id: 'Penanda' },
  bookmarked_label: { en: 'Saved', es: 'Guardado', pt: 'Salvo', id: 'Tersimpan' },
  verse_notes: { en: 'Verse Notes', es: 'Notas de versículos', pt: 'Notas de versículos', id: 'Catatan Ayat' },

  // ── SERMON WORKSPACE (Home one-tap + Sunday QR) ──
  todays_message: { en: "Today's Message", es: 'Mensaje de hoy', pt: 'Mensagem de hoje', id: 'Pesan Hari Ini' },
  view_sermon: { en: 'View Sermon', es: 'Ver sermón', pt: 'Ver sermão', id: 'Lihat Khotbah' },
  no_sermon_this_week: { en: 'No message this week — check back before service.', es: 'No hay mensaje esta semana; vuelve antes del servicio.', pt: 'Sem mensagem esta semana — volte antes do culto.', id: 'Belum ada pesan minggu ini — cek lagi sebelum ibadah.' },
  ws_my_notes: { en: 'My Notes', es: 'Mis notas', pt: 'Minhas notas', id: 'Catatan Saya' },
  ws_my_notes_ph: { en: 'Write freely as you listen…', es: 'Escribe libremente mientras escuchas…', pt: 'Escreva livremente enquanto ouve…', id: 'Tulis dengan bebas saat kamu mendengarkan…' },
  ws_key_takeaways: { en: 'Key Takeaways', es: 'Ideas clave', pt: 'Pontos principais', id: 'Poin Utama' },
  ws_key_takeaways_ph: { en: 'The points you want to remember…', es: 'Los puntos que quieres recordar…', pt: 'Os pontos que você quer lembrar…', id: 'Poin yang ingin kamu ingat…' },
  ws_what_god: { en: 'What God Is Saying to Me', es: 'Lo que Dios me está diciendo', pt: 'O que Deus está me dizendo', id: 'Apa yang Tuhan Katakan Padaku' },
  ws_what_god_ph: { en: 'What is stirring in your heart?', es: '¿Qué se está moviendo en tu corazón?', pt: 'O que está se movendo no seu coração?', id: 'Apa yang bergerak di hatimu?' },
  ws_prayer: { en: 'Prayer', es: 'Oración', pt: 'Oração', id: 'Doa' },
  ws_prayer_ph: { en: 'Turn it into a prayer…', es: 'Conviértelo en una oración…', pt: 'Transforme em oração…', id: 'Jadikan sebuah doa…' },
  ws_action_steps: { en: 'Action Steps', es: 'Pasos a seguir', pt: 'Próximos passos', id: 'Langkah Tindakan' },
  ws_action_steps_ph: { en: 'One thing I will do this week…', es: 'Una cosa que haré esta semana…', pt: 'Uma coisa que farei esta semana…', id: 'Satu hal yang akan kulakukan minggu ini…' },
  ws_follow_up: { en: 'Follow Up', es: 'Seguimiento', pt: 'Acompanhamento', id: 'Tindak Lanjut' },
  ws_follow_up_ph: { en: 'To revisit later this week…', es: 'Para retomar más tarde esta semana…', pt: 'Para revisitar mais tarde nesta semana…', id: 'Untuk ditinjau lagi minggu ini…' },

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

  // \u2500\u2500 COMFORT DAILY READING \u2500\u2500
  comfort_reading_x_of_y: { en: 'Reading {x} of {y}', es: 'Lectura {x} de {y}', pt: 'Leitura {x} de {y}', id: 'Bacaan {x} dari {y}' },
  comfort_change_daily: { en: 'Change daily amount', es: 'Cambiar la cantidad diaria', pt: 'Alterar a quantidade di\u00e1ria', id: 'Ubah jumlah harian' },

  // \u2500\u2500 PATHWAY COMPLETION MOMENT \u2500\u2500
  pathway_day_complete: { en: '\u2713 Day {x} complete \u2014 Day {y} will be here tomorrow', es: '\u2713 D\u00eda {x} completado \u2014 el d\u00eda {y} estar\u00e1 aqu\u00ed ma\u00f1ana', pt: '\u2713 Dia {x} conclu\u00eddo \u2014 o dia {y} estar\u00e1 aqui amanh\u00e3', id: '\u2713 Hari {x} selesai \u2014 hari {y} akan tersedia besok' },
  pathway_day_complete_final: { en: '\u2713 Day {x} complete', es: '\u2713 D\u00eda {x} completado', pt: '\u2713 Dia {x} conclu\u00eddo', id: '\u2713 Hari {x} selesai' },
  pathway_show_now: { en: 'Show me now', es: 'Mostrar ahora', pt: 'Mostrar agora', id: 'Tampilkan sekarang' },
  pathway_hero_loading: { en: 'Today\u2019s reading is loading\u2026', es: 'La lectura de hoy se est\u00e1 cargando\u2026', pt: 'A leitura de hoje est\u00e1 carregando\u2026', id: 'Bacaan hari ini sedang dimuat\u2026' },
  pathway_how_it_works: { en: 'Each day: one scripture, one short teaching, one step. About five minutes.', es: 'Cada d\u00eda: una escritura, una ense\u00f1anza breve, un paso. Unos cinco minutos.', pt: 'Cada dia: uma escritura, um ensino curto, um passo. Cerca de cinco minutos.', id: 'Setiap hari: satu ayat, satu pengajaran singkat, satu langkah. Sekitar lima menit.' },

  // ── FONT SIZE CONTROLS ──
  font_size_label: { en: 'Font Size', es: 'Tama\u00f1o de Fuente', pt: 'Tamanho da Fonte', id: 'Ukuran Font' },
  language_label: { en: 'LANGUAGE', es: 'IDIOMA', pt: 'IDIOMA', id: 'BAHASA' },
  sermon_notes_title: { en: 'Sermon Notes', es: 'Notas del Serm\u00f3n', pt: 'Notas do Serm\u00e3o', id: 'Catatan Khotbah' },

  // ── MESSAGES SCREEN ──
  publish: { en: 'Publish', es: 'Publicar', pt: 'Publicar', id: 'Terbitkan' },
  write_notes: { en: 'Write your notes...', es: 'Escribe tus notas...', pt: 'Escreva suas notas...', id: 'Tulis catatanmu...' },
  ask_about_passage: { en: 'Ask about this passage\u2026', es: 'Pregunta sobre este pasaje\u2026', pt: 'Pergunte sobre esta passagem\u2026', id: 'Tanyakan tentang bagian ini\u2026' },

  // -- STREAK RESET --
  streak_reset_best: { en: 'Day 1 \u2014 your longest run is {best} days. It starts the same way.', es: 'D\u00eda 1 \u2014 tu racha m\u00e1s larga es de {best} d\u00edas. Empieza de la misma manera.', pt: 'Dia 1 \u2014 sua maior sequ\u00eancia \u00e9 de {best} dias. Come\u00e7a do mesmo jeito.', id: 'Hari 1 \u2014 rekor terpanjangmu {best} hari. Semuanya dimulai dengan cara yang sama.' },

  // \u2500\u2500 NATIVE ORIGIN BRIDGE (church-proxy users \u2192 futuresdailyword.com) \u2500\u2500
  bridge_line1: { en: 'Want real notifications and a home-screen app?', es: '\u00bfQuieres notificaciones reales y la app en tu pantalla de inicio?', pt: 'Quer notifica\u00e7\u00f5es de verdade e um app na tela inicial?', id: 'Ingin notifikasi sungguhan dan aplikasi di layar utama?' },
  bridge_continue: { en: 'Continue at futuresdailyword.com', es: 'Contin\u00faa en futuresdailyword.com', pt: 'Continue em futuresdailyword.com', id: 'Lanjutkan di futuresdailyword.com' },
  bridge_line2: { en: 'sign in with the same email and everything comes with you.', es: 'inicia sesi\u00f3n con el mismo correo y todo te acompa\u00f1a.', pt: 'entre com o mesmo e-mail e tudo vai com voc\u00ea.', id: 'masuk dengan email yang sama dan semuanya ikut bersama Anda.' },

  // \u2500\u2500 ADMIN INLINE CODE ENTRY / DATA NOTICE \u2500\u2500
  enter_pastor_or_admin_code: { en: 'Enter your campus pastor code or admin PIN', es: 'Ingresa tu c\u00f3digo de pastor de sede o PIN de administrador', pt: 'Digite seu c\u00f3digo de pastor de campus ou PIN de administrador', id: 'Masukkan kode pendeta kampus Anda atau PIN admin' },
  open_label: { en: 'Open', es: 'Abrir', pt: 'Abrir', id: 'Buka' },
  data_notice_cloud: { en: "Your notes back up to your account when you're online. Clearing browser data before a sync can lose recent changes.", es: 'Tus notas se respaldan en tu cuenta cuando est\u00e1s en l\u00ednea. Borrar los datos del navegador antes de una sincronizaci\u00f3n puede perder cambios recientes.', pt: 'Suas notas s\u00e3o copiadas para sua conta quando voc\u00ea est\u00e1 on-line. Limpar os dados do navegador antes de uma sincroniza\u00e7\u00e3o pode perder altera\u00e7\u00f5es recentes.', id: 'Catatan Anda dicadangkan ke akun saat online. Menghapus data browser sebelum sinkronisasi dapat menghilangkan perubahan terbaru.' },
  pastor_code_hint: { en: 'Your code comes from the Daily Word team.', es: 'Tu c\u00f3digo lo proporciona el equipo de Daily Word.', pt: 'Seu c\u00f3digo vem da equipe do Daily Word.', id: 'Kode Anda berasal dari tim Daily Word.' },

  // \u2500\u2500 CAMPUS PICKER (Campus tab empty state) \u2500\u2500
  choose_campus_here: { en: 'Choose your campus to see updates from your pastor.', es: 'Elige tu sede para ver actualizaciones de tu pastor.', pt: 'Escolha seu campus para ver atualiza\u00e7\u00f5es do seu pastor.', id: 'Pilih kampus Anda untuk melihat pembaruan dari pendeta Anda.' },
  staff_intake: { en: 'Staff intake', es: 'Formulario del equipo', pt: 'Formul\u00e1rio da equipe', id: 'Formulir staf' },
  staff_intake_hint: { en: 'Campus updates and sermon notes go through one form. They go live after review.', es: 'Las actualizaciones del campus y las notas del serm\u00f3n pasan por un formulario. Se publican despu\u00e9s de la revisi\u00f3n.', pt: 'Atualiza\u00e7\u00f5es do campus e notas do serm\u00e3o passam por um formul\u00e1rio. Entram no ar depois da revis\u00e3o.', id: 'Pembaruan kampus dan catatan khotbah lewat satu formulir. Tayang setelah ditinjau.' },
  pastors_submit_staff: { en: 'Pastors submit campus updates through the staff form. They go live after review.', es: 'Los pastores env\u00edan actualizaciones del campus a trav\u00e9s del formulario del equipo. Se publican despu\u00e9s de la revisi\u00f3n.', pt: 'Pastores enviam atualiza\u00e7\u00f5es do campus pelo formul\u00e1rio da equipe. Entram no ar depois da revis\u00e3o.', id: 'Pendeta mengirim pembaruan kampus lewat formulir staf. Tayang setelah ditinjau.' },

  // \u2500\u2500 JOURNAL SERMON TAB \u2500\u2500
  j_from_campus_tab: { en: 'From the Campus tab', es: 'De la pesta\u00f1a Sede', pt: 'Da aba Campus', id: 'Dari tab Kampus' },

  // \u2500\u2500 PATHWAY PICKER (first-run bottom actions) \u2500\u2500
  keep_current_path: { en: 'Keep my current path \u2192', es: 'Mantener mi camino actual \u2192', pt: 'Manter meu caminho atual \u2192', id: 'Pertahankan jalurku saat ini \u2192' },
  not_sure_start_member: { en: 'Not sure? Start with Church Member \u2192', es: '\u00bfNo est\u00e1s seguro? Comienza como Miembro de la Iglesia \u2192', pt: 'N\u00e3o tem certeza? Comece como Membro da Igreja \u2192', id: 'Belum yakin? Mulai sebagai Anggota Gereja \u2192' },

  // \u2500\u2500 PUSH OPT-IN (first-run reminder gate) \u2500\u2500
  push_optin_title: { en: 'One gentle nudge a day', es: 'Un suave recordatorio al d\u00eda', pt: 'Um lembrete gentil por dia', id: 'Satu pengingat lembut setiap hari' },
  push_optin_body_push: { en: "We'll send today's Word at the time that fits your rhythm. No spam \u2014 just a daily invitation to show up.", es: 'Te enviaremos la Palabra de hoy a la hora que se ajuste a tu ritmo. Sin spam \u2014 solo una invitaci\u00f3n diaria a estar presente.', pt: 'Enviaremos a Palavra de hoje no hor\u00e1rio que combina com seu ritmo. Sem spam \u2014 apenas um convite di\u00e1rio para estar presente.', id: 'Kami akan mengirim Firman hari ini pada waktu yang cocok dengan ritmemu. Tanpa spam \u2014 hanya undangan harian untuk hadir.' },
  push_optin_body_calendar: { en: "We'll add a recurring daily reminder to your calendar \u2014 a gentle nudge to open today's Word at the time that fits your rhythm.", es: 'A\u00f1adiremos un recordatorio diario a tu calendario \u2014 un suave aviso para abrir la Palabra de hoy a la hora que se ajuste a tu ritmo.', pt: 'Adicionaremos um lembrete di\u00e1rio ao seu calend\u00e1rio \u2014 um toque gentil para abrir a Palavra de hoje no hor\u00e1rio que combina com seu ritmo.', id: 'Kami akan menambahkan pengingat harian ke kalendermu \u2014 dorongan lembut untuk membuka Firman hari ini pada waktu yang cocok dengan ritmemu.' },
  remind_me_at: { en: 'Remind me at', es: 'Recu\u00e9rdame a las', pt: 'Lembrar-me \u00e0s', id: 'Ingatkan saya pukul' },
  turning_on: { en: 'Turning on\u2026', es: 'Activando\u2026', pt: 'Ativando\u2026', id: 'Mengaktifkan\u2026' },
  opening_calendar: { en: 'Opening calendar\u2026', es: 'Abriendo calendario\u2026', pt: 'Abrindo calend\u00e1rio\u2026', id: 'Membuka kalender\u2026' },
  turn_on_daily_reminders: { en: 'Turn on daily reminders', es: 'Activar recordatorios diarios', pt: 'Ativar lembretes di\u00e1rios', id: 'Aktifkan pengingat harian' },
  add_to_calendar: { en: 'Add to my calendar', es: 'A\u00f1adir a mi calendario', pt: 'Adicionar ao meu calend\u00e1rio', id: 'Tambahkan ke kalender saya' },
  maybe_later: { en: 'Maybe later', es: 'Quiz\u00e1s luego', pt: 'Talvez depois', id: 'Nanti saja' },

  // \u2500\u2500 EMAIL GATE (profile onboarding) \u2500\u2500
  valid_email_error: { en: 'Please enter a valid email address', es: 'Ingresa un correo electr\u00f3nico v\u00e1lido', pt: 'Digite um endere\u00e7o de e-mail v\u00e1lido', id: 'Masukkan alamat email yang valid' },
  something_wrong_error: { en: 'Something went wrong. Please try again.', es: 'Algo sali\u00f3 mal. Int\u00e9ntalo de nuevo.', pt: 'Algo deu errado. Tente novamente.', id: 'Terjadi kesalahan. Silakan coba lagi.' },
  choose_focus_desc: { en: 'Choose your reading focus to personalize your experience.', es: 'Elige tu enfoque de lectura para personalizar tu experiencia.', pt: 'Escolha seu foco de leitura para personalizar sua experi\u00eancia.', id: 'Pilih fokus bacaanmu untuk mempersonalisasi pengalamanmu.' },
  setup_profile_title: { en: 'Set Up Your Profile', es: 'Configura tu perfil', pt: 'Configure seu perfil', id: 'Atur Profilmu' },
  setup_profile_desc: { en: 'Sync across devices and join your campus community.', es: 'Sincroniza entre dispositivos y \u00fanete a la comunidad de tu sede.', pt: 'Sincronize entre dispositivos e junte-se \u00e0 comunidade do seu campus.', id: 'Sinkronkan antar perangkat dan bergabunglah dengan komunitas kampusmu.' },
  setting_up: { en: 'Setting up...', es: 'Configurando...', pt: 'Configurando...', id: 'Menyiapkan...' },
  continue_label: { en: 'Continue', es: 'Continuar', pt: 'Continuar', id: 'Lanjutkan' },
  skip_for_now: { en: 'Skip for now', es: 'Omitir por ahora', pt: 'Pular por enquanto', id: 'Lewati untuk sekarang' },
  welcome_short: { en: 'Welcome!', es: '\u00a1Bienvenido!', pt: 'Bem-vindo!', id: 'Selamat datang!' },
  profile_ready: { en: 'Your profile is set up. Enjoy your reading.', es: 'Tu perfil est\u00e1 listo. Disfruta tu lectura.', pt: 'Seu perfil est\u00e1 pronto. Aproveite sua leitura.', id: 'Profilmu sudah siap. Selamat membaca.' },

  // \u2500\u2500 SETUP PROMPT MODAL (plan picker sheet) \u2500\u2500
  start_reading: { en: 'Start reading', es: 'Comienza a leer', pt: 'Comece a ler', id: 'Mulai membaca' },
  plans_for_faith_journey: { en: 'Plans for your faith journey', es: 'Planes para tu camino de fe', pt: 'Planos para sua jornada de f\u00e9', id: 'Rencana untuk perjalanan imanmu' },
  plans_for_daily_walk: { en: 'Plans for your daily walk', es: 'Planes para tu caminar diario', pt: 'Planos para sua caminhada di\u00e1ria', id: 'Rencana untuk perjalanan harianmu' },
  plans_for_deeper: { en: 'Plans for going deeper', es: 'Planes para profundizar', pt: 'Planos para se aprofundar', id: 'Rencana untuk mendalami lebih jauh' },
  plans_for_ministry: { en: 'Plans for ministry & leadership', es: 'Planes para ministerio y liderazgo', pt: 'Planos para minist\u00e9rio e lideran\u00e7a', id: 'Rencana untuk pelayanan & kepemimpinan' },
  plans_for_season: { en: 'Plans for your current season', es: 'Planes para tu temporada actual', pt: 'Planos para sua esta\u00e7\u00e3o atual', id: 'Rencana untuk musimmu saat ini' },
  pick_reading_plan: { en: 'Pick a reading plan', es: 'Elige un plan de lectura', pt: 'Escolha um plano de leitura', id: 'Pilih rencana baca' },
  plan_keeps_track: { en: 'A plan keeps you on track. Pick one or skip for now.', es: 'Un plan te mantiene en camino. Elige uno u om\u00edtelo por ahora.', pt: 'Um plano mant\u00e9m voc\u00ea no caminho. Escolha um ou pule por enquanto.', id: 'Rencana membantumu tetap konsisten. Pilih satu atau lewati untuk sekarang.' },
  popular_label: { en: 'Popular', es: 'Populares', pt: 'Populares', id: 'Populer' },
  more_plans: { en: 'More Plans', es: 'M\u00e1s planes', pt: 'Mais planos', id: 'Rencana Lainnya' },
  start_plans_one: { en: 'Start 1 Plan', es: 'Comenzar 1 plan', pt: 'Iniciar 1 plano', id: 'Mulai 1 Rencana' },
  start_plans_many: { en: 'Start {n} Plans', es: 'Comenzar {n} planes', pt: 'Iniciar {n} planos', id: 'Mulai {n} Rencana' },
  skip_plans: { en: 'Skip Plans', es: 'Omitir planes', pt: 'Pular planos', id: 'Lewati Rencana' },

  // \u2500\u2500 SETUP WIZARD (pastor / deeper-study onboarding) \u2500\u2500
  wiz_ready_pastor: { en: "Ready when you are. Let's set up your reading.", es: 'Cuando quieras. Configuremos tu lectura.', pt: 'Quando voc\u00ea quiser. Vamos configurar sua leitura.', id: 'Kapan pun kamu siap. Mari atur bacaanmu.' },
  wiz_ready_study: { en: "Whenever you're ready to set up your reading, we're here.", es: 'Cuando est\u00e9s listo para configurar tu lectura, aqu\u00ed estamos.', pt: 'Quando estiver pronto para configurar sua leitura, estamos aqui.', id: 'Kapan pun kamu siap mengatur bacaanmu, kami di sini.' },
  wiz_lets_go: { en: "Let's Go", es: 'Vamos', pt: 'Vamos l\u00e1', id: 'Ayo Mulai' },
  later_label: { en: 'Later', es: 'Luego', pt: 'Depois', id: 'Nanti' },
  wiz_get_set_up: { en: "Let's get you set up.", es: 'Vamos a configurarte.', pt: 'Vamos deixar tudo pronto.', id: 'Mari kita siapkan semuanya.' },
  wiz_pastor_intro: { en: "You've got commentary, Greek/Hebrew tools, word studies, and sermon prep built in. First, let's get the right reading plan locked in.", es: 'Tienes comentario, herramientas de griego/hebreo, estudios de palabras y preparaci\u00f3n de sermones integrados. Primero, asegura el plan de lectura correcto.', pt: 'Voc\u00ea tem coment\u00e1rio, ferramentas de grego/hebraico, estudos de palavras e prepara\u00e7\u00e3o de serm\u00f5es integrados. Primeiro, vamos definir o plano de leitura certo.', id: 'Kamu punya komentar, alat Yunani/Ibrani, studi kata, dan persiapan khotbah bawaan. Pertama, mari kunci rencana baca yang tepat.' },
  wiz_help_pick: { en: 'Help me pick the right plan', es: 'Ay\u00fadame a elegir el plan correcto', pt: 'Ajude-me a escolher o plano certo', id: 'Bantu aku memilih rencana yang tepat' },
  wiz_three_questions: { en: 'Three quick questions', es: 'Tres preguntas r\u00e1pidas', pt: 'Tr\u00eas perguntas r\u00e1pidas', id: 'Tiga pertanyaan singkat' },
  wiz_know_want: { en: 'I already know what I want', es: 'Ya s\u00e9 lo que quiero', pt: 'J\u00e1 sei o que quero', id: 'Aku sudah tahu yang kuinginkan' },
  wiz_straight_plans: { en: 'Go straight to plans', es: 'Ir directo a los planes', pt: 'Ir direto para os planos', id: 'Langsung ke rencana' },
  wiz_priority_q: { en: "What's the priority right now?", es: '\u00bfCu\u00e1l es la prioridad ahora?', pt: 'Qual \u00e9 a prioridade agora?', id: 'Apa prioritasmu sekarang?' },
  wiz_priority_sub: { en: 'This helps us match you with the right plan and tools.', es: 'Esto nos ayuda a darte el plan y las herramientas correctas.', pt: 'Isso nos ajuda a indicar o plano e as ferramentas certas.', id: 'Ini membantu kami mencocokkanmu dengan rencana dan alat yang tepat.' },
  wiz_where_time_q: { en: 'Where do you want to spend time?', es: '\u00bfD\u00f3nde quieres pasar tiempo?', pt: 'Onde voc\u00ea quer passar tempo?', id: 'Di mana kamu ingin menghabiskan waktu?' },
  wiz_pick_one_change: { en: 'Pick one. You can always change it later.', es: 'Elige uno. Siempre puedes cambiarlo despu\u00e9s.', pt: 'Escolha um. Voc\u00ea sempre pode mudar depois.', id: 'Pilih satu. Kamu selalu bisa mengubahnya nanti.' },
  wiz_plan_psalms: { en: 'Psalms & Proverbs', es: 'Salmos y Proverbios', pt: 'Salmos e Prov\u00e9rbios', id: 'Mazmur & Amsal' },
  wiz_plan_psalms_sub: { en: 'One chapter of each, daily.', es: 'Un cap\u00edtulo de cada uno, a diario.', pt: 'Um cap\u00edtulo de cada, diariamente.', id: 'Satu pasal dari masing-masing, setiap hari.' },
  wiz_plan_john: { en: 'Gospel of John', es: 'Evangelio de Juan', pt: 'Evangelho de Jo\u00e3o', id: 'Injil Yohanes' },
  wiz_plan_john_sub: { en: '21 days. One chapter a day.', es: '21 d\u00edas. Un cap\u00edtulo al d\u00eda.', pt: '21 dias. Um cap\u00edtulo por dia.', id: '21 hari. Satu pasal per hari.' },
  wiz_plan_nt: { en: 'New Testament', es: 'Nuevo Testamento', pt: 'Novo Testamento', id: 'Perjanjian Baru' },
  wiz_plan_nt_sub: { en: 'The whole NT in 90 days.', es: 'Todo el NT en 90 d\u00edas.', pt: 'Todo o NT em 90 dias.', id: 'Seluruh PB dalam 90 hari.' },
  wiz_study_q: { en: 'What do you want to study?', es: '\u00bfQu\u00e9 quieres estudiar?', pt: 'O que voc\u00ea quer estudar?', id: 'Apa yang ingin kamu pelajari?' },
  wiz_study_sub: { en: "You'll get full commentary, Greek/Hebrew tools, and word studies with all of these.", es: 'Tendr\u00e1s comentario completo, herramientas de griego/hebreo y estudios de palabras con todos estos.', pt: 'Voc\u00ea ter\u00e1 coment\u00e1rio completo, ferramentas de grego/hebraico e estudos de palavras com todos estes.', id: 'Kamu akan mendapat komentar lengkap, alat Yunani/Ibrani, dan studi kata di semuanya.' },
  wiz_plan_nt90: { en: 'New Testament in 90 days', es: 'Nuevo Testamento en 90 d\u00edas', pt: 'Novo Testamento em 90 dias', id: 'Perjanjian Baru dalam 90 hari' },
  wiz_plan_nt90_sub: { en: 'Entire NT in 90 days. 3\u20134 chapters a day.', es: 'Todo el NT en 90 d\u00edas. 3\u20134 cap\u00edtulos al d\u00eda.', pt: 'Todo o NT em 90 dias. 3\u20134 cap\u00edtulos por dia.', id: 'Seluruh PB dalam 90 hari. 3\u20134 pasal per hari.' },
  wiz_plan_year: { en: 'Through the Bible in a year', es: 'La Biblia en un a\u00f1o', pt: 'A B\u00edblia em um ano', id: 'Alkitab dalam setahun' },
  wiz_plan_year_sub: { en: 'Genesis to Revelation. 365 days.', es: 'De G\u00e9nesis a Apocalipsis. 365 d\u00edas.', pt: 'De G\u00eanesis a Apocalipse. 365 dias.', id: 'Kejadian sampai Wahyu. 365 hari.' },
  wiz_plan_each_daily_sub: { en: 'One of each, daily.', es: 'Uno de cada uno, a diario.', pt: 'Um de cada, diariamente.', id: 'Satu dari masing-masing, setiap hari.' },
  wiz_time_q: { en: 'How much time are you working with?', es: '\u00bfCu\u00e1nto tiempo tienes?', pt: 'Quanto tempo voc\u00ea tem?', id: 'Berapa banyak waktu yang kamu punya?' },
  wiz_time_sub: { en: 'Pick the pace that fits your schedule. A plan you finish beats a plan you quit.', es: 'Elige el ritmo que se ajuste a tu horario. Un plan que terminas vale m\u00e1s que uno que abandonas.', pt: 'Escolha o ritmo que cabe na sua agenda. Um plano que voc\u00ea termina vale mais que um que voc\u00ea abandona.', id: 'Pilih kecepatan yang sesuai jadwalmu. Rencana yang selesai lebih baik daripada rencana yang berhenti.' },
  wiz_min_5_10: { en: '5\u201310 minutes', es: '5\u201310 minutos', pt: '5\u201310 minutos', id: '5\u201310 menit' },
  wiz_min_5_10_sub: { en: 'Gospel of John \u2014 1 chapter a day, 21 days.', es: 'Evangelio de Juan \u2014 1 cap\u00edtulo al d\u00eda, 21 d\u00edas.', pt: 'Evangelho de Jo\u00e3o \u2014 1 cap\u00edtulo por dia, 21 dias.', id: 'Injil Yohanes \u2014 1 pasal per hari, 21 hari.' },
  wiz_min_10_15: { en: '10\u201315 minutes', es: '10\u201315 minutos', pt: '10\u201315 minutos', id: '10\u201315 menit' },
  wiz_min_10_15_sub: { en: 'New Testament in 90 days \u2014 about 3 chapters a day.', es: 'Nuevo Testamento en 90 d\u00edas \u2014 unos 3 cap\u00edtulos al d\u00eda.', pt: 'Novo Testamento em 90 dias \u2014 cerca de 3 cap\u00edtulos por dia.', id: 'Perjanjian Baru dalam 90 hari \u2014 sekitar 3 pasal per hari.' },
  wiz_min_15_20: { en: '15\u201320 minutes', es: '15\u201320 minutos', pt: '15\u201320 minutos', id: '15\u201320 menit' },
  wiz_min_15_20_sub: { en: 'Psalms & Proverbs \u2014 a few chapters a day.', es: 'Salmos y Proverbios \u2014 algunos cap\u00edtulos al d\u00eda.', pt: 'Salmos e Prov\u00e9rbios \u2014 alguns cap\u00edtulos por dia.', id: 'Mazmur & Amsal \u2014 beberapa pasal per hari.' },
  wiz_min_20: { en: '20+ minutes', es: 'M\u00e1s de 20 minutos', pt: 'Mais de 20 minutos', id: '20+ menit' },
  wiz_min_20_sub: { en: 'Through the Bible in a year \u2014 3\u20134 chapters a day.', es: 'La Biblia en un a\u00f1o \u2014 3\u20134 cap\u00edtulos al d\u00eda.', pt: 'A B\u00edblia em um ano \u2014 3\u20134 cap\u00edtulos por dia.', id: 'Alkitab dalam setahun \u2014 3\u20134 pasal per hari.' },
  wiz_preach_q: { en: 'What are you preaching through?', es: '\u00bfSobre qu\u00e9 est\u00e1s predicando?', pt: 'Sobre o que voc\u00ea est\u00e1 pregando?', id: 'Apa yang sedang kamu khotbahkan?' },
  wiz_preach_sub: { en: 'Pick the closest match. Full commentary, word studies, and cross-references come with every plan.', es: 'Elige lo m\u00e1s cercano. Cada plan incluye comentario completo, estudios de palabras y referencias cruzadas.', pt: 'Escolha o mais pr\u00f3ximo. Todo plano inclui coment\u00e1rio completo, estudos de palavras e refer\u00eancias cruzadas.', id: 'Pilih yang paling mendekati. Setiap rencana menyertakan komentar lengkap, studi kata, dan referensi silang.' },
  wiz_full_nt: { en: 'Full New Testament', es: 'Nuevo Testamento completo', pt: 'Novo Testamento completo', id: 'Perjanjian Baru Lengkap' },
  wiz_full_nt_sub: { en: 'The whole NT in 90 days. Great for a sermon series.', es: 'Todo el NT en 90 d\u00edas. Ideal para una serie de sermones.', pt: 'Todo o NT em 90 dias. \u00d3timo para uma s\u00e9rie de serm\u00f5es.', id: 'Seluruh PB dalam 90 hari. Cocok untuk seri khotbah.' },
  wiz_whole_bible: { en: 'Whole Bible', es: 'Biblia completa', pt: 'B\u00edblia completa', id: 'Seluruh Alkitab' },
  wiz_whole_bible_sub: { en: 'Genesis to Revelation in a year.', es: 'De G\u00e9nesis a Apocalipsis en un a\u00f1o.', pt: 'De G\u00eanesis a Apocalipse em um ano.', id: 'Kejadian sampai Wahyu dalam setahun.' },
  wiz_psalms_wisdom_sub: { en: 'One of each, daily. Good for a wisdom series.', es: 'Uno de cada uno, a diario. Bueno para una serie de sabidur\u00eda.', pt: 'Um de cada, diariamente. Bom para uma s\u00e9rie de sabedoria.', id: 'Satu dari masing-masing, setiap hari. Cocok untuk seri hikmat.' },
  wiz_church_book_sub: { en: "Ps A's book on purpose and identity of the church.", es: 'El libro del Pastor A sobre el prop\u00f3sito y la identidad de la iglesia.', pt: 'O livro do Pastor A sobre o prop\u00f3sito e a identidade da igreja.', id: 'Buku Ps A tentang tujuan dan identitas gereja.' },
  wiz_browse_all: { en: 'Browse all plans', es: 'Ver todos los planes', pt: 'Ver todos os planos', id: 'Jelajahi semua rencana' },
  wiz_setup_study: { en: "Let's set up your study.", es: 'Configuremos tu estudio.', pt: 'Vamos configurar seu estudo.', id: 'Mari atur studimu.' },
  wiz_study_intro: { en: "Pick a reading plan and you'll get full commentary, word studies, and Greek/Hebrew tools alongside every passage.", es: 'Elige un plan de lectura y tendr\u00e1s comentario completo, estudios de palabras y herramientas de griego/hebreo junto a cada pasaje.', pt: 'Escolha um plano de leitura e voc\u00ea ter\u00e1 coment\u00e1rio completo, estudos de palavras e ferramentas de grego/hebraico junto a cada passagem.', id: 'Pilih rencana baca dan kamu akan mendapat komentar lengkap, studi kata, dan alat Yunani/Ibrani di setiap bagian.' },
  wiz_help_choose: { en: 'Help me choose a plan', es: 'Ay\u00fadame a elegir un plan', pt: 'Ajude-me a escolher um plano', id: 'Bantu aku memilih rencana' },
  wiz_recommend_pace: { en: "We'll recommend one based on your pace", es: 'Te recomendaremos uno seg\u00fan tu ritmo', pt: 'Recomendaremos um conforme seu ritmo', id: 'Kami akan merekomendasikan sesuai kecepatanmu' },
  wiz_know_want_short: { en: 'I know what I want', es: 'S\u00e9 lo que quiero', pt: 'Sei o que quero', id: 'Aku tahu yang kuinginkan' },
  wiz_few_recommend: { en: "Here are a few we'd recommend.", es: 'Aqu\u00ed tienes algunos que recomendamos.', pt: 'Aqui est\u00e3o alguns que recomendamos.', id: 'Ini beberapa yang kami rekomendasikan.' },
  wiz_pick_one_in: { en: "Pick one and you're in. You can always switch later.", es: 'Elige uno y listo. Siempre puedes cambiar despu\u00e9s.', pt: 'Escolha um e pronto. Voc\u00ea sempre pode trocar depois.', id: 'Pilih satu dan mulai. Kamu selalu bisa berganti nanti.' },

  // \u2500\u2500 DONE CELEBRATION \u2500\u2500
  done_title: { en: "Today's reading, done.", es: 'La lectura de hoy, completada.', pt: 'A leitura de hoje, conclu\u00edda.', id: 'Bacaan hari ini, selesai.' },
  plan_complete_title: { en: 'Plan complete \ud83c\udf89', es: 'Plan completado \ud83c\udf89', pt: 'Plano conclu\u00eddo \ud83c\udf89', id: 'Rencana selesai \ud83c\udf89' },
  done_days_counting: { en: "{x} days and counting \u2014 you're building something.", es: '{x} d\u00edas y contando \u2014 est\u00e1s construyendo algo.', pt: '{x} dias e contando \u2014 voc\u00ea est\u00e1 construindo algo.', id: '{x} hari dan terus bertambah \u2014 kamu sedang membangun sesuatu.' },
  done_showed_up: { en: 'You showed up today. That\u2019s how it starts.', es: 'Hoy te presentaste. As\u00ed es como empieza.', pt: 'Voc\u00ea apareceu hoje. \u00c9 assim que come\u00e7a.', id: 'Kamu hadir hari ini. Begitulah semuanya dimulai.' },
  done_plan_body: { en: '{title} \u2014 {days} days in the Word. You finished.', es: '{title} \u2014 {days} d\u00edas en la Palabra. Lo terminaste.', pt: '{title} \u2014 {days} dias na Palavra. Voc\u00ea terminou.', id: '{title} \u2014 {days} hari dalam Firman. Kamu menyelesaikannya.' },
  done_streak_line: { en: '{x}-day streak', es: 'racha de {x} d\u00edas', pt: 'sequ\u00eancia de {x} dias', id: '{x} hari beruntun' },
  amen: { en: 'Amen', es: 'Am\u00e9n', pt: 'Am\u00e9m', id: 'Amin' },

  // \u2500\u2500 STREAK MILESTONES \u2500\u2500
  milestone_days: { en: '{x} Days!', es: '\u00a1{x} d\u00edas!', pt: '{x} dias!', id: '{x} Hari!' },
  milestone_100: { en: 'Extraordinary dedication.', es: 'Dedicaci\u00f3n extraordinaria.', pt: 'Dedica\u00e7\u00e3o extraordin\u00e1ria.', id: 'Dedikasi yang luar biasa.' },
  milestone_30: { en: 'A full month in the Word.', es: 'Un mes completo en la Palabra.', pt: 'Um m\u00eas inteiro na Palavra.', id: 'Satu bulan penuh dalam Firman.' },
  milestone_14: { en: 'Two solid weeks.', es: 'Dos semanas s\u00f3lidas.', pt: 'Duas semanas s\u00f3lidas.', id: 'Dua minggu penuh.' },
  milestone_7: { en: 'One week strong.', es: 'Una semana firme.', pt: 'Uma semana firme.', id: 'Satu minggu penuh semangat.' },
  day_word: { en: 'day', es: 'd\u00eda', pt: 'dia', id: 'hari' },
  days_word: { en: 'days', es: 'd\u00edas', pt: 'dias', id: 'hari' },
  streak_enc_1: { en: 'Welcome back.', es: 'Bienvenido de nuevo.', pt: 'Bem-vindo de volta.', id: 'Selamat datang kembali.' },
  streak_enc_2: { en: 'Two in a row.', es: 'Dos seguidos.', pt: 'Dois seguidos.', id: 'Dua hari berturut-turut.' },
  streak_enc_3: { en: 'Building a habit.', es: 'Formando un h\u00e1bito.', pt: 'Criando um h\u00e1bito.', id: 'Membangun kebiasaan.' },
  streak_enc_5: { en: 'Five days strong.', es: 'Cinco d\u00edas firmes.', pt: 'Cinco dias firmes.', id: 'Lima hari penuh semangat.' },
  streak_enc_7: { en: 'One week!', es: '\u00a1Una semana!', pt: 'Uma semana!', id: 'Satu minggu!' },
  streak_enc_10: { en: 'Ten days.', es: 'Diez d\u00edas.', pt: 'Dez dias.', id: 'Sepuluh hari.' },
  streak_enc_14: { en: 'Two weeks!', es: '\u00a1Dos semanas!', pt: 'Duas semanas!', id: 'Dua minggu!' },
  streak_enc_21: { en: 'Three weeks.', es: 'Tres semanas.', pt: 'Tr\u00eas semanas.', id: 'Tiga minggu.' },
  streak_enc_30: { en: 'One month!', es: '\u00a1Un mes!', pt: 'Um m\u00eas!', id: 'Satu bulan!' },
  streak_enc_40: { en: 'Forty days.', es: 'Cuarenta d\u00edas.', pt: 'Quarenta dias.', id: 'Empat puluh hari.' },
  streak_enc_60: { en: 'Two months!', es: '\u00a1Dos meses!', pt: 'Dois meses!', id: 'Dua bulan!' },
  streak_enc_90: { en: 'Three months.', es: 'Tres meses.', pt: 'Tr\u00eas meses.', id: 'Tiga bulan.' },
  streak_enc_100: { en: 'One hundred days!', es: '\u00a1Cien d\u00edas!', pt: 'Cem dias!', id: 'Seratus hari!' },
  streak_enc_180: { en: 'Half a year!', es: '\u00a1Medio a\u00f1o!', pt: 'Meio ano!', id: 'Setengah tahun!' },
  streak_enc_365: { en: 'One full year!', es: '\u00a1Un a\u00f1o completo!', pt: 'Um ano inteiro!', id: 'Satu tahun penuh!' },

  // \u2500\u2500 HOME HERO + SECTIONS \u2500\u2500
  choose_reading_plan: { en: 'Choose your reading plan', es: 'Elige tu plan de lectura', pt: 'Escolha seu plano de leitura', id: 'Pilih rencana bacamu' },
  pick_plan_syncs: { en: 'Pick a plan and everything here syncs to your daily reading.', es: 'Elige un plan y todo aqu\u00ed se sincroniza con tu lectura diaria.', pt: 'Escolha um plano e tudo aqui se sincroniza com sua leitura di\u00e1ria.', id: 'Pilih rencana dan semua di sini tersinkron dengan bacaan harianmu.' },
  resume_label: { en: 'Resume', es: 'Reanudar', pt: 'Retomar', id: 'Lanjutkan' },
  loading_audio: { en: 'Loading audio', es: 'Cargando audio', pt: 'Carregando \u00e1udio', id: 'Memuat audio' },
  mark_as_read: { en: 'Mark as read', es: 'Marcar como le\u00eddo', pt: 'Marcar como lido', id: 'Tandai sudah dibaca' },
  read_today: { en: '\u2713 Read today', es: '\u2713 Le\u00eddo hoy', pt: '\u2713 Lido hoje', id: '\u2713 Dibaca hari ini' },
  loading_scripture: { en: 'Loading scripture...', es: 'Cargando escritura...', pt: 'Carregando escritura...', id: 'Memuat ayat...' },
  your_faith_journey: { en: 'YOUR FAITH JOURNEY', es: 'TU CAMINO DE FE', pt: 'SUA JORNADA DE F\u00c9', id: 'PERJALANAN IMANMU' },
  day_x_of_y_title: { en: 'Day {x} of {y}', es: 'D\u00eda {x} de {y}', pt: 'Dia {x} de {y}', id: 'Hari {x} dari {y}' },
  pastoral_care: { en: 'PASTORAL CARE', es: 'CUIDADO PASTORAL', pt: 'CUIDADO PASTORAL', id: 'PELAYANAN PASTORAL' },
  report_a_bug: { en: 'REPORT A BUG', es: 'REPORTAR UN PROBLEMA', pt: 'RELATAR UM PROBLEMA', id: 'LAPORKAN MASALAH' },
  bug_thank_you: { en: 'Thank you!', es: '\u00a1Gracias!', pt: 'Obrigado!', id: 'Terima kasih!' },
  bug_received: { en: 'Your report has been received.', es: 'Hemos recibido tu reporte.', pt: 'Seu relato foi recebido.', id: 'Laporan Anda telah diterima.' },
  bug_intro: { en: "Found something not working? Let us know and we'll fix it.", es: '\u00bfEncontraste algo que no funciona? Av\u00edsanos y lo arreglaremos.', pt: 'Encontrou algo que n\u00e3o funciona? Avise-nos e vamos corrigir.', id: 'Menemukan sesuatu yang tidak berfungsi? Beri tahu kami dan kami akan memperbaikinya.' },
  bug_placeholder: { en: 'Describe what happened...', es: 'Describe lo que pas\u00f3...', pt: 'Descreva o que aconteceu...', id: 'Jelaskan apa yang terjadi...' },
  bug_sending: { en: 'Sending...', es: 'Enviando...', pt: 'Enviando...', id: 'Mengirim...' },
  bug_send: { en: 'Send Report', es: 'Enviar reporte', pt: 'Enviar relato', id: 'Kirim Laporan' },
  bug_cat_audio: { en: 'Audio', es: 'Audio', pt: '\u00c1udio', id: 'Audio' },
  bug_cat_display: { en: 'Display', es: 'Pantalla', pt: 'Tela', id: 'Tampilan' },
  bug_cat_navigation: { en: 'Navigation', es: 'Navegaci\u00f3n', pt: 'Navega\u00e7\u00e3o', id: 'Navigasi' },
  bug_cat_other: { en: 'Other', es: 'Otro', pt: 'Outro', id: 'Lainnya' },
  email_nudge_title: { en: 'Back up your progress', es: 'Respalda tu progreso', pt: 'Fa\u00e7a backup do seu progresso', id: 'Cadangkan progres Anda' },
  email_nudge_body: { en: 'Your streak and journal live only on this device. Add your email and they follow you everywhere.', es: 'Tu racha y tu diario solo viven en este dispositivo. Agrega tu correo y te seguir\u00e1n a todas partes.', pt: 'Sua sequ\u00eancia e seu di\u00e1rio vivem apenas neste aparelho. Adicione seu e-mail e eles v\u00e3o com voc\u00ea.', id: 'Rangkaian dan jurnal Anda hanya tersimpan di perangkat ini. Tambahkan email Anda agar tersimpan di mana saja.' },
  email_nudge_cta: { en: 'Back it up', es: 'Respaldar', pt: 'Fazer backup', id: 'Cadangkan' },
  email_nudge_later: { en: 'Not now', es: 'Ahora no', pt: 'Agora n\u00e3o', id: 'Nanti saja' },
  sermon_notes_moved: { en: 'Sermon notes live on Home', es: 'Las notas de sermones est\u00e1n en Inicio', pt: 'As notas de serm\u00e3o est\u00e3o em In\u00edcio', id: 'Catatan khotbah ada di Beranda' },
  sermon_notes_home_sub: { en: 'Take notes during the message', es: 'Toma notas durante el mensaje', pt: 'Anote durante a mensagem', id: 'Catat selama khotbah' },
  reference_label: { en: 'REFERENCE', es: 'REFERENCIA', pt: 'REFER\u00caNCIA', id: 'REFERENSI' },
  reference_title: { en: 'Reference Library', es: 'Biblioteca de referencia', pt: 'Biblioteca de refer\u00eancia', id: 'Perpustakaan Referensi' },
  reference_sub: { en: 'Essays, Bible characters, places & timeline', es: 'Ensayos, personajes b\u00edblicos, lugares y cronolog\u00eda', pt: 'Ensaios, personagens b\u00edblicos, lugares e linha do tempo', id: 'Esai, tokoh Alkitab, tempat & garis waktu' },
  now_in_read: { en: 'Now in Read', es: 'Ahora en Leer', pt: 'Agora em Ler', id: 'Kini di Baca' },
  file_to_sermon: { en: 'To sermon', es: 'Al serm\u00f3n', pt: 'Ao serm\u00e3o', id: 'Ke khotbah' },
  filed_toast: { en: 'Filed', es: 'Guardado', pt: 'Arquivado', id: 'Tersimpan' },
  ws_my_prep: { en: 'MY PREPARATION', es: 'MI PREPARACI\u00d3N', pt: 'MINHA PREPARA\u00c7\u00c3O', id: 'PERSIAPANKU' },
  ws_prep_focus_ph: { en: "What are you preaching through right now?", es: '\u00bfSobre qu\u00e9 est\u00e1s predicando ahora?', pt: 'Sobre o que voc\u00ea est\u00e1 pregando agora?', id: 'Apa yang sedang Anda khotbahkan sekarang?' },
  ws_prep_empty: { en: 'Highlight any verse while you read and tap "To sermon" — it lands here.', es: 'Resalta cualquier vers\u00edculo mientras lees y toca "Al serm\u00f3n" — aparecer\u00e1 aqu\u00ed.', pt: 'Destaque qualquer vers\u00edculo enquanto l\u00ea e toque em "Ao serm\u00e3o" — ele aparece aqui.', id: 'Tandai ayat mana pun saat membaca lalu ketuk "Ke khotbah" — akan muncul di sini.' },
  ws_past_notes: { en: 'PAST SERMON NOTES', es: 'NOTAS DE SERMONES ANTERIORES', pt: 'NOTAS DE SERM\u00d5ES ANTERIORES', id: 'CATATAN KHOTBAH SEBELUMNYA' },
  ws_show_n: { en: 'Show {n}', es: 'Mostrar {n}', pt: 'Mostrar {n}', id: 'Tampilkan {n}' },
  ws_hide: { en: 'Hide', es: 'Ocultar', pt: 'Ocultar', id: 'Sembunyikan' },
  remove_label: { en: 'Remove', es: 'Quitar', pt: 'Remover', id: 'Hapus' },
  promo_books_label: { en: 'Free books', es: 'Libros gratis', pt: 'Livros gr\u00e1tis', id: 'Buku gratis' },
  promo_books_title: { en: 'Books by Ps Ashley & Jane', es: 'Libros de los pastores Ashley y Jane', pt: 'Livros dos pastores Ashley e Jane', id: 'Buku dari Ps Ashley & Jane' },
  promo_books_sub: { en: 'Read them free at futures.church', es: 'L\u00e9elos gratis en futures.church', pt: 'Leia gr\u00e1tis em futures.church', id: 'Baca gratis di futures.church' },
  promo_college_sub: { en: 'Train for what God has called you to.', es: 'F\u00f3rmate para lo que Dios te ha llamado a hacer.', pt: 'Prepare-se para o que Deus te chamou a fazer.', id: 'Bersiaplah untuk panggilan Tuhan atasmu.' },
  promo_college_cta: { en: 'Explore the college', es: 'Conoce el instituto', pt: 'Conhe\u00e7a a faculdade', id: 'Jelajahi kampusnya' },
  promo_college_loc_au: { en: 'Paradise, Adelaide + Online', es: 'Paradise, Adelaida + en l\u00ednea', pt: 'Paradise, Adelaide + online', id: 'Paradise, Adelaide + Online' },
  promo_college_loc_us: { en: 'Alpharetta, GA + Online', es: 'Alpharetta, GA + en l\u00ednea', pt: 'Alpharetta, GA + online', id: 'Alpharetta, GA + Online' },
  promo_college_choose: { en: 'Choose your campus', es: 'Elige tu campus', pt: 'Escolha seu campus', id: 'Pilih kampusmu' },
  promo_selah_label: { en: 'Selah, our app', es: 'Selah, nuestra app', pt: 'Selah, nosso app', id: 'Selah, aplikasi kami' },
  promo_selah_title: { en: 'Coming 1 October', es: 'Llega el 1 de octubre', pt: 'Chega em 1\u00ba de outubro', id: 'Hadir 1 Oktober' },
  promo_selah_sub: { en: 'A daily pastoral companion. For the questions you can\u2019t google.', es: 'Un acompa\u00f1ante pastoral diario. Para las preguntas que no puedes googlear.', pt: 'Um companheiro pastoral di\u00e1rio. Para as perguntas que voc\u00ea n\u00e3o googleia.', id: 'Pendamping pastoral harian. Untuk pertanyaan yang tak bisa digoogle.' },
  promo_selah_cta: { en: 'Learn more', es: 'Saber m\u00e1s', pt: 'Saiba mais', id: 'Pelajari' },
  continue_journey: { en: 'Continue Journey', es: 'Continuar el camino', pt: 'Continuar a jornada', id: 'Lanjutkan Perjalanan' },
  todays_study: { en: "TODAY'S STUDY", es: 'ESTUDIO DE HOY', pt: 'ESTUDO DE HOJE', id: 'STUDI HARI INI' },
  for_you: { en: 'FOR YOU', es: 'PARA TI', pt: 'PARA VOC\u00ca', id: 'UNTUKMU' },
  remove_reading_slot: { en: 'Remove reading slot', es: 'Eliminar espacio de lectura', pt: 'Remover espa\u00e7o de leitura', id: 'Hapus slot bacaan' },
  remove_slot_confirm: { en: 'Remove this reading slot?', es: '\u00bfEliminar este espacio de lectura?', pt: 'Remover este espa\u00e7o de leitura?', id: 'Hapus slot bacaan ini?' },
  next_lesson_ready: { en: 'Your next lesson is ready', es: 'Tu pr\u00f3xima lecci\u00f3n est\u00e1 lista', pt: 'Sua pr\u00f3xima li\u00e7\u00e3o est\u00e1 pronta', id: 'Pelajaran berikutnya sudah siap' },
  just_getting_started: { en: 'Just getting started', es: 'Apenas comenzando', pt: 'Apenas come\u00e7ando', id: 'Baru saja mulai' },
  days_completed: { en: '{n} days completed', es: '{n} d\u00edas completados', pt: '{n} dias conclu\u00eddos', id: '{n} hari selesai' },
  completed_check: { en: '\u2713 Completed', es: '\u2713 Completado', pt: '\u2713 Conclu\u00eddo', id: '\u2713 Selesai' },
  tap_to_read: { en: 'Tap to read \u203a', es: 'Toca para leer \u203a', pt: 'Toque para ler \u203a', id: 'Ketuk untuk membaca \u203a' },
  reading_now: { en: 'READING NOW', es: 'LEYENDO AHORA', pt: 'LENDO AGORA', id: 'SEDANG DIBACA' },
  recommended_label: { en: 'RECOMMENDED', es: 'RECOMENDADO', pt: 'RECOMENDADO', id: 'DIREKOMENDASIKAN' },
  tap_continue_reading: { en: 'Tap to continue reading', es: 'Toca para seguir leyendo', pt: 'Toque para continuar lendo', id: 'Ketuk untuk lanjut membaca' },
  read_own_pace: { en: 'Read at your own pace', es: 'Lee a tu propio ritmo', pt: 'Leia no seu pr\u00f3prio ritmo', id: 'Baca dengan kecepatanmu sendiri' },
  from_todays_devotion: { en: "From today's devotion", es: 'Del devocional de hoy', pt: 'Do devocional de hoje', id: 'Dari renungan hari ini' },
  change_label: { en: 'Change', es: 'Cambiar', pt: 'Alterar', id: 'Ubah' },
  select_label: { en: 'Select', es: 'Seleccionar', pt: 'Selecionar', id: 'Pilih' },

  // \u2500\u2500 SCRIPTURE PASSAGE / TOOLBAR \u2500\u2500
  deselect_all: { en: 'Deselect All', es: 'Deseleccionar todo', pt: 'Desmarcar tudo', id: 'Batalkan Pilih Semua' },
  tap_word_hint: { en: 'Tap any word to explore its original meaning', es: 'Toca cualquier palabra para explorar su significado original', pt: 'Toque em qualquer palavra para explorar seu significado original', id: 'Ketuk kata mana pun untuk menjelajahi makna aslinya' },
  gk_heb: { en: 'Gk/Heb', es: 'Gr/Heb', pt: 'Gr/Heb', id: 'Yun/Ibr' },

  // \u2500\u2500 INLINE REFLECTION \u2500\u2500
  reflect_label: { en: 'Reflect', es: 'Reflexiona', pt: 'Reflita', id: 'Renungkan' },
  sit_with_this: { en: 'Sit with this', es: 'Med\u00edtalo', pt: 'Medite nisso', id: 'Renungkan ini' },
  reflect_prompt_default: { en: "What stood out to you in today's reading?", es: '\u00bfQu\u00e9 te llam\u00f3 la atenci\u00f3n en la lectura de hoy?', pt: 'O que chamou sua aten\u00e7\u00e3o na leitura de hoje?', id: 'Apa yang menonjol bagimu dari bacaan hari ini?' },
  reflect_prompt_comfort: { en: 'Which words brought you the most peace today?', es: '\u00bfQu\u00e9 palabras te trajeron m\u00e1s paz hoy?', pt: 'Quais palavras trouxeram mais paz a voc\u00ea hoje?', id: 'Kata-kata mana yang paling memberimu kedamaian hari ini?' },
  save_reflection: { en: 'Save reflection', es: 'Guardar reflexi\u00f3n', pt: 'Salvar reflex\u00e3o', id: 'Simpan refleksi' },
  saved_to_journal: { en: 'Saved to your journal', es: 'Guardado en tu diario', pt: 'Salvo no seu di\u00e1rio', id: 'Tersimpan di jurnalmu' },
  write_thought_placeholder: { en: 'Write your thought\u2026', es: 'Escribe tu pensamiento\u2026', pt: 'Escreva seu pensamento\u2026', id: 'Tulis pemikiranmu\u2026' },
  view_journal_label: { en: 'View journal', es: 'Ver diario', pt: 'Ver di\u00e1rio', id: 'Lihat jurnal' },

  // \u2500\u2500 WEEKLY REVIEW \u2500\u2500
  week_in_word: { en: 'YOUR WEEK IN THE WORD', es: 'TU SEMANA EN LA PALABRA', pt: 'SUA SEMANA NA PALAVRA', id: 'MINGGUMU DALAM FIRMAN' },
  week_of: { en: 'Week of {x}', es: 'Semana del {x}', pt: 'Semana de {x}', id: 'Minggu {x}' },

  // \u2500\u2500 COMFORT FLOW \u2500\u2500
  comfort_word_for_you: { en: 'A WORD FOR YOU TODAY', es: 'UNA PALABRA PARA TI HOY', pt: 'UMA PALAVRA PARA VOC\u00ca HOJE', id: 'FIRMAN UNTUKMU HARI INI' },
  comfort_take_time: { en: 'Take your time', es: 'T\u00f3mate tu tiempo', pt: 'Sem pressa', id: 'Tidak perlu buru-buru' },
  comfort_finished_reading: { en: "I've finished reading", es: 'Termin\u00e9 de leer', pt: 'Terminei de ler', id: 'Aku sudah selesai membaca' },
  comfort_peace_prompt: { en: 'Which words brought you the most peace?', es: '\u00bfQu\u00e9 palabras te trajeron m\u00e1s paz?', pt: 'Quais palavras trouxeram mais paz a voc\u00ea?', id: 'Kata-kata mana yang paling memberimu kedamaian?' },
  comfort_thought_header: { en: 'A THOUGHT FROM THIS CHAPTER', es: 'UNA REFLEXI\u00d3N DE ESTE CAP\u00cdTULO', pt: 'UMA REFLEX\u00c3O DESTE CAP\u00cdTULO', id: 'RENUNGAN DARI PASAL INI' },
  comfort_read_another: { en: "Would you like to read another passage from God's Word?", es: '\u00bfTe gustar\u00eda leer otro pasaje de la Palabra de Dios?', pt: 'Gostaria de ler outra passagem da Palavra de Deus?', id: 'Mau membaca bagian lain dari Firman Tuhan?' },
  comfort_yes_more: { en: 'Yes, keep going', es: 'S\u00ed, sigamos', pt: 'Sim, continuar', id: 'Ya, lanjutkan' },
  comfort_enough_today: { en: "That's enough for today", es: 'Suficiente por hoy', pt: 'Por hoje \u00e9 suficiente', id: 'Cukup untuk hari ini' },
  comfort_doing_great: { en: "You're doing great.", es: 'Lo est\u00e1s haciendo muy bien.', pt: 'Voc\u00ea est\u00e1 indo muito bem.', id: 'Kamu melakukannya dengan baik.' },
  comfort_set_daily_q: { en: 'Would you like to set a daily reading amount so we can have something ready for you each day?', es: '\u00bfQuieres fijar una cantidad de lectura diaria para que tengamos algo listo para ti cada d\u00eda?', pt: 'Quer definir uma quantidade de leitura di\u00e1ria para termos algo pronto para voc\u00ea a cada dia?', id: 'Mau menetapkan jumlah bacaan harian agar kami menyiapkan sesuatu untukmu setiap hari?' },
  comfort_one_more: { en: 'Just give me one more for now', es: 'Dame solo uno m\u00e1s por ahora', pt: 'S\u00f3 mais um por enquanto', id: 'Beri aku satu lagi untuk sekarang' },
  comfort_good_today: { en: "I'm good for today", es: 'Estoy bien por hoy', pt: 'Estou bem por hoje', id: 'Sudah cukup untukku hari ini' },
  comfort_set_daily_one: { en: "You're set for 1 chapter a day. We'll have something ready for you tomorrow.", es: 'Quedaste con 1 cap\u00edtulo al d\u00eda. Tendremos algo listo para ti ma\u00f1ana.', pt: 'Ficou definido 1 cap\u00edtulo por dia. Teremos algo pronto para voc\u00ea amanh\u00e3.', id: 'Kamu diatur untuk 1 pasal per hari. Kami akan menyiapkan sesuatu untukmu besok.' },
  comfort_set_daily_many: { en: "You're set for {n} chapters a day. We'll have something ready for you tomorrow.", es: 'Quedaste con {n} cap\u00edtulos al d\u00eda. Tendremos algo listo para ti ma\u00f1ana.', pt: 'Ficaram definidos {n} cap\u00edtulos por dia. Teremos algo pronto para voc\u00ea amanh\u00e3.', id: 'Kamu diatur untuk {n} pasal per hari. Kami akan menyiapkan sesuatu untukmu besok.' },
  comfort_god_with_you: { en: 'God is with you. Come back whenever you need Him.', es: 'Dios est\u00e1 contigo. Vuelve cuando lo necesites.', pt: 'Deus est\u00e1 com voc\u00ea. Volte sempre que precisar Dele.', id: 'Tuhan besertamu. Kembalilah kapan pun kamu membutuhkan-Nya.' },
  comfort_word_header: { en: 'A Word of Comfort', es: 'Una palabra de consuelo', pt: 'Uma palavra de consolo', id: 'Firman Penghiburan' },
  pray_label: { en: 'Pray', es: 'Orar', pt: 'Orar', id: 'Berdoa' },
  praying_label: { en: 'Praying', es: 'Orando', pt: 'Orando', id: 'Mendoakan' },

  // \u2500\u2500 PRAYER WALL \u2500\u2500
  all_campuses: { en: 'All Campuses', es: 'Todas las sedes', pt: 'Todos os campi', id: 'Semua Kampus' },
  my_campus: { en: 'My Campus', es: 'Mi sede', pt: 'Meu campus', id: 'Kampusku' },
  add_prayer: { en: 'Add Prayer', es: 'Agregar oraci\u00f3n', pt: 'Adicionar ora\u00e7\u00e3o', id: 'Tambah Doa' },
  share_prayer_request: { en: 'SHARE A PRAYER REQUEST', es: 'COMPARTE UNA PETICI\u00d3N DE ORACI\u00d3N', pt: 'COMPARTILHE UM PEDIDO DE ORA\u00c7\u00c3O', id: 'BAGIKAN PERMOHONAN DOA' },
  post_anonymously: { en: 'Post anonymously', es: 'Publicar an\u00f3nimamente', pt: 'Publicar anonimamente', id: 'Kirim secara anonim' },
  cancel_label: { en: 'Cancel', es: 'Cancelar', pt: 'Cancelar', id: 'Batal' },
  posting_label: { en: 'Posting\u2026', es: 'Publicando\u2026', pt: 'Publicando\u2026', id: 'Mengirim\u2026' },
  post_label: { en: 'Post', es: 'Publicar', pt: 'Publicar', id: 'Kirim' },
  prayer_count_one: { en: '1 prayer request across the global church', es: '1 petici\u00f3n de oraci\u00f3n en la iglesia global', pt: '1 pedido de ora\u00e7\u00e3o na igreja global', id: '1 permohonan doa di gereja global' },
  prayer_count_many: { en: '{n} prayer requests across the global church', es: '{n} peticiones de oraci\u00f3n en la iglesia global', pt: '{n} pedidos de ora\u00e7\u00e3o na igreja global', id: '{n} permohonan doa di gereja global' },
  loading_prayer_wall: { en: 'Loading prayer wall\u2026', es: 'Cargando muro de oraci\u00f3n\u2026', pt: 'Carregando mural de ora\u00e7\u00e3o\u2026', id: 'Memuat dinding doa\u2026' },
  prayers_load_error: { en: 'Could not load prayers. Check your connection.', es: 'No se pudieron cargar las oraciones. Verifica tu conexi\u00f3n.', pt: 'N\u00e3o foi poss\u00edvel carregar as ora\u00e7\u00f5es. Verifique sua conex\u00e3o.', id: 'Tidak dapat memuat doa. Periksa koneksimu.' },
  try_again: { en: 'Try Again', es: 'Intentar de nuevo', pt: 'Tentar novamente', id: 'Coba Lagi' },
  no_prayers_campus: { en: 'No prayer requests from your campus yet.', es: 'A\u00fan no hay peticiones de tu sede.', pt: 'Ainda n\u00e3o h\u00e1 pedidos do seu campus.', id: 'Belum ada permohonan doa dari kampusmu.' },
  no_prayers_yet: { en: 'No prayer requests yet.', es: 'A\u00fan no hay peticiones de oraci\u00f3n.', pt: 'Ainda n\u00e3o h\u00e1 pedidos de ora\u00e7\u00e3o.', id: 'Belum ada permohonan doa.' },
  be_first_share: { en: 'Be the first to share one.', es: 'S\u00e9 el primero en compartir una.', pt: 'Seja o primeiro a compartilhar um.', id: 'Jadilah yang pertama membagikannya.' },
  post_failed_check_code: { en: 'Failed to post. Check your pastor code.', es: 'No se pudo publicar. Verifica tu c\u00f3digo de pastor.', pt: 'N\u00e3o foi poss\u00edvel publicar. Verifique seu c\u00f3digo de pastor.', id: 'Gagal mengirim. Periksa kode pastormu.' },
  yesterday: { en: 'Yesterday', es: 'Ayer', pt: 'Ontem', id: 'Kemarin' },
  edit_note_header: { en: 'Edit Note', es: 'Editar nota', pt: 'Editar nota', id: 'Edit Catatan' },
  new_sermon_note: { en: 'New Sermon Note', es: 'Nueva nota del sermón', pt: 'Nova nota do sermão', id: 'Catatan Khotbah Baru' },
  note_title_placeholder: { en: 'Note title...', es: 'Título de la nota...', pt: 'Título da nota...', id: 'Judul catatan...' },
  sermon_title_placeholder: { en: 'Sermon title (optional)...', es: 'Título del sermón (opcional)...', pt: 'Título do sermão (opcional)...', id: 'Judul khotbah (opsional)...' },
  update_label: { en: 'Update', es: 'Actualizar', pt: 'Atualizar', id: 'Perbarui' },
  days_ago: { en: '{n} days ago', es: 'hace {n} d\u00edas', pt: 'h\u00e1 {n} dias', id: '{n} hari lalu' },
  recently: { en: 'Recently', es: 'Recientemente', pt: 'Recentemente', id: 'Baru-baru ini' },

  // \u2500\u2500 GREEK / HEBREW POPUP \u2500\u2500
  greek_label: { en: 'Greek', es: 'Griego', pt: 'Grego', id: 'Yunani' },
  definition_unavailable: { en: 'Definition not available', es: 'Definici\u00f3n no disponible', pt: 'Defini\u00e7\u00e3o n\u00e3o dispon\u00edvel', id: 'Definisi tidak tersedia' },
  show_less: { en: 'Show less \u2191', es: 'Mostrar menos \u2191', pt: 'Mostrar menos \u2191', id: 'Tampilkan lebih sedikit \u2191' },
  full_definition: { en: 'Full definition \u2193', es: 'Definici\u00f3n completa \u2193', pt: 'Defini\u00e7\u00e3o completa \u2193', id: 'Definisi lengkap \u2193' },
  study_this_word: { en: 'Study this word', es: 'Estudiar esta palabra', pt: 'Estudar esta palavra', id: 'Pelajari kata ini' },

  // \u2500\u2500 PLANS SCREEN (readers) \u2500\u2500
  reading_plans_header: { en: 'READING PLANS', es: 'PLANES DE LECTURA', pt: 'PLANOS DE LEITURA', id: 'RENCANA BACAAN' },
  contents_label: { en: 'Contents', es: 'Contenido', pt: 'Sum\u00e1rio', id: 'Daftar Isi' },
  remove_plan_confirm: { en: 'Remove this plan? Your progress will be lost.', es: '\u00bfEliminar este plan? Perder\u00e1s tu progreso.', pt: 'Remover este plano? Seu progresso ser\u00e1 perdido.', id: 'Hapus rencana ini? Progresmu akan hilang.' },

  // \u2500\u2500 ARIA-ONLY CONTROL LABELS \u2500\u2500
  previous_month: { en: 'Previous month', es: 'Mes anterior', pt: 'M\u00eas anterior', id: 'Bulan sebelumnya' },
  next_month: { en: 'Next month', es: 'Mes siguiente', pt: 'Pr\u00f3ximo m\u00eas', id: 'Bulan berikutnya' },
  send_message: { en: 'Send message', es: 'Enviar mensaje', pt: 'Enviar mensagem', id: 'Kirim pesan' },
  cookie_consent_label: { en: 'Cookie consent', es: 'Consentimiento de cookies', pt: 'Consentimento de cookies', id: 'Persetujuan cookie' },
  open_futures_church: { en: 'Open Futures Church', es: 'Abrir Futures Church', pt: 'Abrir Futures Church', id: 'Buka Futures Church' },
  close_search: { en: 'Close search', es: 'Cerrar b\u00fasqueda', pt: 'Fechar pesquisa', id: 'Tutup pencarian' },
  decrease_font: { en: 'Decrease font size', es: 'Reducir tama\u00f1o de fuente', pt: 'Diminuir tamanho da fonte', id: 'Perkecil ukuran font' },
  increase_font: { en: 'Increase font size', es: 'Aumentar tama\u00f1o de fuente', pt: 'Aumentar tamanho da fonte', id: 'Perbesar ukuran font' },
  dismiss_sync_notice: { en: 'Dismiss sync notice', es: 'Descartar aviso de sincronizaci\u00f3n', pt: 'Dispensar aviso de sincroniza\u00e7\u00e3o', id: 'Tutup pemberitahuan sinkronisasi' },
  switch_light_mode: { en: 'Switch to light mode', es: 'Cambiar a modo claro', pt: 'Mudar para modo claro', id: 'Beralih ke mode terang' },
  switch_dark_mode: { en: 'Switch to dark mode', es: 'Cambiar a modo oscuro', pt: 'Mudar para modo escuro', id: 'Beralih ke mode gelap' },
  stop_audio_label: { en: 'Stop audio playback', es: 'Detener reproducci\u00f3n de audio', pt: 'Parar reprodu\u00e7\u00e3o de \u00e1udio', id: 'Hentikan pemutaran audio' },
  sync_notice_one: { en: 'Synced across your devices \u2014 kept the newest version of 1 note.', es: 'Sincronizado entre tus dispositivos \u2014 se conserv\u00f3 la versi\u00f3n m\u00e1s reciente de 1 nota.', pt: 'Sincronizado entre seus dispositivos \u2014 mantida a vers\u00e3o mais recente de 1 nota.', id: 'Tersinkron di semua perangkatmu \u2014 versi terbaru dari 1 catatan disimpan.' },
  sync_notice_many: { en: 'Synced across your devices \u2014 kept the newest version of {n} notes.', es: 'Sincronizado entre tus dispositivos \u2014 se conserv\u00f3 la versi\u00f3n m\u00e1s reciente de {n} notas.', pt: 'Sincronizado entre seus dispositivos \u2014 mantida a vers\u00e3o mais recente de {n} notas.', id: 'Tersinkron di semua perangkatmu \u2014 versi terbaru dari {n} catatan disimpan.' },

  // \u2500\u2500 PWA / ADD TO HOME SCREEN \u2500\u2500
  pwa_install_title: { en: 'Add to Home Screen', es: 'A\u00f1adir a inicio', pt: 'Adicionar \u00e0 tela inicial', id: 'Tambahkan ke layar utama' },
  pwa_install_body: { en: 'Open Daily Word like an app \u2014 one tap, no browser chrome.', es: 'Abre Daily Word como una app \u2014 un toque, sin el navegador.', pt: 'Abra o Daily Word como um app \u2014 um toque, sem o navegador.', id: 'Buka Daily Word seperti aplikasi \u2014 satu ketukan, tanpa bilah browser.' },
  pwa_install_cta: { en: 'Add', es: 'A\u00f1adir', pt: 'Adicionar', id: 'Tambahkan' },
  pwa_install_dismiss: { en: 'Not now', es: 'Ahora no', pt: 'Agora n\u00e3o', id: 'Nanti saja' },
  pwa_ios_intro: { en: 'Safari doesn\u2019t show an install button. Two taps:', es: 'Safari no muestra un bot\u00f3n de instalaci\u00f3n. Dos toques:', pt: 'O Safari n\u00e3o mostra um bot\u00e3o de instala\u00e7\u00e3o. Dois toques:', id: 'Safari tidak menampilkan tombol pasang. Dua ketukan:' },
  pwa_ios_step1: { en: 'Tap the Share button in Safari', es: 'Toca el bot\u00f3n Compartir en Safari', pt: 'Toque em Compartilhar no Safari', id: 'Ketuk tombol Bagikan di Safari' },
  pwa_ios_step2: { en: 'Scroll and tap Add to Home Screen', es: 'Despl\u00e1zate y toca A\u00f1adir a pantalla de inicio', pt: 'Role e toque em Adicionar \u00e0 Tela de In\u00edcio', id: 'Gulir dan ketuk Tambah ke Layar Utama' },
  pwa_browser_intro: { en: 'Your browser will offer an install prompt, or use the browser menu.', es: 'Tu navegador ofrecer\u00e1 instalar, o usa el men\u00fa del navegador.', pt: 'Seu navegador oferecer\u00e1 instalar, ou use o menu do navegador.', id: 'Browser Anda akan menawarkan pemasangan, atau gunakan menu browser.' },
  pwa_browser_menu: { en: 'Look for Install app or Add to Home Screen in the browser menu.', es: 'Busca Instalar app o A\u00f1adir a inicio en el men\u00fa del navegador.', pt: 'Procure Instalar app ou Adicionar \u00e0 tela inicial no menu do navegador.', id: 'Cari Pasang aplikasi atau Tambah ke Layar Utama di menu browser.' },

  // \u2500\u2500 DAY 1 LANDING (Superdesign-locked) \u2500\u2500
  day1_eyebrow: { en: 'Day 1 of 40 \u00b7 {series}', es: 'D\u00eda 1 de 40 \u00b7 {series}', pt: 'Dia 1 de 40 \u00b7 {series}', id: 'Hari 1 dari 40 \u00b7 {series}' },
  begin_day1: { en: 'Begin Day 1', es: 'Comenzar D\u00eda 1', pt: 'Come\u00e7ar o Dia 1', id: 'Mulai Hari 1' },
  day1_of_40: { en: 'Day 1 of 40', es: 'D\u00eda 1 de 40', pt: 'Dia 1 de 40', id: 'Hari 1 dari 40' },
  path_chooser_title: { en: 'Where are you right now?', es: '\u00bfD\u00f3nde est\u00e1s ahora?', pt: 'Onde voc\u00ea est\u00e1 agora?', id: 'Di mana Anda sekarang?' },
  path_chooser_sub: { en: 'Pick one to see matching plans.', es: 'Elige uno para ver planes que coincidan.', pt: 'Escolha um para ver planos correspondentes.', id: 'Pilih satu untuk melihat rencana yang cocok.' },
  not_sure_begin_day1: { en: 'Not sure? Begin Day 1', es: '\u00bfNo est\u00e1s seguro? Comenzar D\u00eda 1', pt: 'N\u00e3o tem certeza? Come\u00e7ar o Dia 1', id: 'Belum yakin? Mulai Hari 1' },
  change_path: { en: 'Change path', es: 'Cambiar camino', pt: 'Mudar caminho', id: 'Ubah jalur' },
  start_this_plan: { en: 'Start This Plan', es: 'Comenzar este plan', pt: 'Come\u00e7ar este plano', id: 'Mulai Rencana Ini' },
  plan_days: { en: '{n} DAYS', es: '{n} D\u00cdAS', pt: '{n} DIAS', id: '{n} HARI' },
  plan_active: { en: 'Active', es: 'Activo', pt: 'Ativo', id: 'Aktif' },
  plans_start_hint: { en: 'Start This Plan to begin. Your chosen plan sets your daily reading.', es: 'Toca Comenzar este plan para empezar. El plan que elijas fija tu lectura diaria.', pt: 'Toque em Come\u00e7ar este plano para come\u00e7ar. O plano escolhido define sua leitura di\u00e1ria.', id: 'Ketuk Mulai Rencana Ini untuk memulai. Rencana yang Anda pilih mengatur bacaan harian Anda.' },
};

export function t(key: string, lang?: string): string {
  const l = lang || getLang();
  return UI[key]?.[l] || UI[key]?.['en'] || key;
}

export function useTranslation() {
  const [lang, setLang] = useState(getLang);
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);
  return (key: string) => UI[key]?.[lang] || UI[key]?.['en'] || key;
}

/**
 * Return a translated field from a data object (plan, devotion, etc.).
 * E.g. tField(plan, 'title', 'es') looks for plan.titleEs, falls back to plan.title.
 */
export function tField(obj: any, field: string, lang: string): string {
  if (lang === 'en') return obj[field] || '';
  const langField = field + lang.charAt(0).toUpperCase() + lang.slice(1);
  return obj[langField] || obj[field] || '';
}
