import { useState, useEffect, useRef, useMemo, useCallback } from 'react'; 
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { FontSizeControls } from '../components/FontSizeControls';
import { ChevronLeft, ChevronRight, ChevronDown, Search, Loader2, MapPin, Headphones, Pause, Play, BookOpen, Plus, X, Share2, Square } from 'lucide-react';
import { getDailyPassages, getDateString, getDailyQuoteIndex, getTodaysDevotion, getDayNumber } from '../utils/daily-passages';
import { shareContent } from '../utils/share';
import { fetchPassage } from '../utils/api';
import type { TranslationCode } from '../utils/api';
import * as AP from '../utils/audioPlayer';
import { QUOTES } from '../data/quotes';
import { COMMENTARY } from '../data/commentary';
import { CAMPUSES } from '../data/tokens';
import { useUser } from '../contexts/UserContext';
import { HighlightToolbar } from '../components/HighlightToolbar';
import { VerseNoteDrawer } from '../components/VerseNoteDrawer';
import { GreekHebrewPopup } from '../components/GreekHebrewPopup';
import { ScripturePassage } from '../components/ScripturePassage';
import { BibleAI } from '../components/BibleAI';
import { BibleSearch } from '../components/BibleSearch';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { PLAN_CATALOGUE } from '../data/plans';
import { SetupPromptModal } from '../components/SetupPromptModal';
import { ListenButton } from '../components/ListenButton';
import { StopAllAudio } from '../components/StopAllAudio';
import { FeedbackPoll } from '../components/FeedbackPoll';
// audioManager replaced by audioPlayer (AP) imported above
import { trackBehavior, getBehaviorProfile, hasEnoughBehavior } from '../utils/behavior';
import { track } from '../utils/analytics';
import { personalize } from '../utils/personalization';
import { getPersonaConfig, getGreeting, ALL_PERSONAS, PERSONA_CONFIGS } from '../utils/persona-config';
import { ComfortCard } from '../components/ComfortCard';
import { UpgradePromptCard } from '../components/UpgradePromptCard';
import { BibleAIPromptSection, ComfortVerseBannerSection } from '../sections';
import { type SermonData } from '../data/sermons';
import type { TabId } from '../components/TabBar';
// import { isSundayWindow } from '../utils/sunday';
import { schedulePush } from '../utils/cloudSync';
import { tField, getLang } from '../utils/i18n';

const TRANSLATIONS: TranslationCode[] = ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];
const NEW_FAITH_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV', 'NLT'];
const CONGREGATION_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV', 'NLT', 'KJV', 'NKJV'];
const COMFORT_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV', 'NLT'];

// ── Comfort reading rotation — curated chapters for difficult seasons ──
const COMFORT_CHAPTERS = [
  'Psalm 23', 'Psalm 46', 'Psalm 91', 'Isaiah 40', 'John 14',
  'Romans 8', 'Psalm 34', 'Isaiah 43', 'Matthew 11', 'Psalm 121',
  '2 Corinthians 1', 'Philippians 4', 'Psalm 27', 'Psalm 62',
  'Psalm 139', 'Isaiah 41', 'Lamentations 3', 'Psalm 42',
  'Psalm 103', 'Psalm 16', 'Psalm 86', 'Isaiah 54', 'Psalm 30',
  'Psalm 77', 'Psalm 116', 'Psalm 73', 'Psalm 40', 'John 16',
  'Psalm 145', 'Revelation 21',
];

// ── Short comfort devotions keyed to each chapter ──
const COMFORT_DEVOTIONS: Record<string, { title: string; body: string; titleId: string; bodyId: string }> = {
  'Psalm 23': {
    title: 'He Is With You Right Now',
    body: 'David didn\'t write this psalm from a comfortable place. He wrote it as a man who had been hunted, betrayed, and brought low. And yet — "I will fear no evil, for You are with me." Notice he didn\'t say the valley disappeared. He said God was in it with him. Whatever you\'re walking through today, you\'re not walking alone. The Shepherd is right beside you. He\'s not watching from a distance. He\'s close.',
    titleId: 'Dia Bersamamu Saat Ini',
    bodyId: 'Daud tidak menulis mazmur ini dari tempat yang nyaman. Dia menulisnya sebagai seorang yang diburu, dikhianati, dan direndahkan. Namun — "Bahkan jika aku berjalan dalam lembah kekelaman, aku tidak takut bahaya, sebab Engkau besertaku." Perhatikan dia tidak bilang lembah itu menghilang. Dia bilang Tuhan ada di dalamnya bersamanya. Apa pun yang sedang kamu lalui hari ini, kamu tidak berjalan sendirian. Sang Gembala ada tepat di sampingmu. Dia tidak memperhatikan dari kejauhan. Dia dekat.',
  },
  'Psalm 46': {
    title: 'Be Still and Know',
    body: 'When everything around you feels like it\'s shaking — relationships, health, finances, the future — God says something simple: "Be still, and know that I am God." That\'s not a command to do nothing. It\'s an invitation to stop striving and trust that He is still in control. The mountains may fall into the sea. But He is your refuge. Right now, in this moment, you can exhale. He\'s got this.',
    titleId: 'Diamlah dan Ketahuilah',
    bodyId: 'Ketika semua yang ada di sekitarmu terasa goyah — hubungan, kesehatan, keuangan, masa depan — Tuhan berkata sesuatu yang sederhana: "Diamlah dan ketahuilah, bahwa Akulah Allah." Itu bukan perintah untuk tidak melakukan apa-apa. Itu undangan untuk berhenti berjuang dan percaya bahwa Dia masih memegang kendali. Gunung-gunung mungkin runtuh ke dalam laut. Tapi Dia adalah perlindunganmu. Saat ini, di momen ini, kamu bisa bernapas lega. Dia yang mengendalikan.',
  },
  'Psalm 91': {
    title: 'Under His Wings',
    body: 'There\'s a picture in this psalm that\'s easy to miss: "He will cover you with his feathers, and under his wings you will find refuge." Think about a mother bird pulling her young close during a storm. That\'s what God is doing with you. The storm may not stop. But you are sheltered. You are covered. He is your protection — not from every hard thing, but through every hard thing.',
    titleId: 'Di Bawah Sayap-Nya',
    bodyId: 'Ada sebuah gambaran dalam mazmur ini yang mudah terlewat: "Dengan kepak-Nya Ia akan menudungi engkau, dan di bawah sayap-Nya engkau akan berlindung." Bayangkan seekor induk burung menarik anaknya mendekat saat badai. Itulah yang Tuhan lakukan denganmu. Badai mungkin tidak berhenti. Tapi kamu terlindungi. Kamu tertutupi. Dia adalah perlindunganmu — bukan dari setiap hal yang sulit, tapi melewati setiap hal yang sulit.',
  },
  'Isaiah 40': {
    title: 'New Strength Is Coming',
    body: 'You\'re tired. Maybe not just physically — tired in your soul. Isaiah knew that feeling, and he wrote these words to people who felt forgotten by God: "Those who hope in the Lord will renew their strength." Not those who figure it out. Not those who push harder. Those who hope. That\'s all God is asking of you today. Keep hoping. Strength is on its way.',
    titleId: 'Kekuatan Baru Sedang Datang',
    bodyId: 'Kamu lelah. Mungkin bukan hanya secara fisik — lelah di jiwamu. Yesaya mengenal perasaan itu, dan dia menulis kata-kata ini untuk orang-orang yang merasa dilupakan Tuhan: "Orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru." Bukan mereka yang bisa menyelesaikan segalanya. Bukan mereka yang berjuang lebih keras. Mereka yang berharap. Hanya itu yang Tuhan minta darimu hari ini. Teruslah berharap. Kekuatan sedang dalam perjalanan.',
  },
  'John 14': {
    title: 'Let Not Your Heart Be Troubled',
    body: 'Jesus said these words on the hardest night of His life — the night before the cross. He looked at His friends and said, "Do not let your hearts be troubled. Trust in God; trust also in Me." He wasn\'t in denial about what was coming. He was anchored in something deeper. And He\'s offering you that same anchor today. Your circumstances may be heavy, but His peace is heavier.',
    titleId: 'Jangan Gelisah Hatimu',
    bodyId: 'Yesus mengucapkan kata-kata ini di malam tersulit dalam hidup-Nya — malam sebelum salib. Dia memandang sahabat-sahabat-Nya dan berkata, "Janganlah gelisah hatimu; percayalah kepada Allah, percayalah juga kepada-Ku." Dia tidak menyangkal apa yang akan datang. Dia berlabuh pada sesuatu yang lebih dalam. Dan Dia menawarkan jangkar yang sama kepadamu hari ini. Keadaanmu mungkin berat, tapi damai-Nya lebih berat lagi.',
  },
  'Romans 8': {
    title: 'Nothing Can Separate You',
    body: 'This chapter builds to one of the most powerful promises in all of Scripture: nothing — not trouble, not hardship, not danger, not the past, not the future — can separate you from the love of God. Read that again. Nothing. Whatever you\'re facing right now, it does not have the power to cut you off from His love. You are held. Completely.',
    titleId: 'Tidak Ada yang Dapat Memisahkanmu',
    bodyId: 'Pasal ini memuncak pada salah satu janji paling kuat di seluruh Kitab Suci: tidak ada — bukan kesusahan, bukan kesesakan, bukan bahaya, bukan masa lalu, bukan masa depan — yang dapat memisahkanmu dari kasih Allah. Baca lagi. Tidak ada. Apa pun yang kamu hadapi sekarang, itu tidak punya kuasa untuk memutusmu dari kasih-Nya. Kamu digenggam. Sepenuhnya.',
  },
  'Psalm 34': {
    title: 'He Is Close to You',
    body: '"The Lord is close to the brokenhearted." That\'s not a metaphor. It\'s a promise. When your heart is shattered, God doesn\'t stand at a distance and wait for you to pull yourself together. He draws near. He moves toward the pain. If you\'re in a season where everything feels broken, know this: God is closer to you right now than He\'s ever been.',
    titleId: 'Dia Dekat Denganmu',
    bodyId: '"TUHAN itu dekat kepada orang-orang yang patah hati." Itu bukan kiasan. Itu janji. Ketika hatimu hancur, Tuhan tidak berdiri dari kejauhan menunggu kamu memperbaiki dirimu sendiri. Dia mendekat. Dia bergerak menuju rasa sakit itu. Jika kamu berada di musim di mana segalanya terasa hancur, ketahuilah ini: Tuhan lebih dekat denganmu sekarang daripada sebelumnya.',
  },
  'Isaiah 43': {
    title: 'You Will Not Be Overcome',
    body: '"When you pass through the waters, I will be with you." God didn\'t say if — He said when. He knows the hard seasons come. But He promises that they will not overcome you. The fire will not burn you. The water will not sweep you away. He calls you by name and says, "You are mine." Today, let that truth settle into the deepest part of your heart.',
    titleId: 'Kamu Tidak Akan Dikalahkan',
    bodyId: '"Apabila engkau menyeberang melalui air, Aku akan menyertai engkau." Tuhan tidak berkata jika — Dia berkata apabila. Dia tahu musim-musim sulit akan datang. Tapi Dia berjanji bahwa itu tidak akan mengalahkanmu. Api tidak akan membakarmu. Air tidak akan menghanyutkanmu. Dia memanggilmu dengan nama dan berkata, "Engkau ini milik-Ku." Hari ini, biarkan kebenaran itu meresap ke bagian terdalam hatimu.',
  },
  'Matthew 11': {
    title: 'Come and Rest',
    body: 'Jesus looked at exhausted, burdened people and said: "Come to me." Not "figure it out." Not "try harder." Just — come. Bring the weight. Bring the weariness. Bring the questions you don\'t have answers for. He promises rest. Not a vacation from your problems, but a deep, soul-level rest that comes from being with the One who carries the world.',
    titleId: 'Datanglah dan Beristirahatlah',
    bodyId: 'Yesus memandang orang-orang yang kelelahan dan terbebani dan berkata: "Marilah kepada-Ku." Bukan "cari tahu sendiri." Bukan "berusaha lebih keras." Hanya — datanglah. Bawa bebannya. Bawa kelelahannya. Bawa pertanyaan-pertanyaan yang tidak kamu punya jawabannya. Dia menjanjikan perhentian. Bukan liburan dari masalahmu, tapi perhentian jiwa yang mendalam yang datang dari bersama Dia yang memikul dunia.',
  },
  'Psalm 121': {
    title: 'Your Help Comes From God',
    body: '"Where does my help come from? My help comes from the Lord." Sometimes the most powerful thing you can do is look up. Not at the mountain of problems in front of you — but at the God who made the mountains. He watches over you. He doesn\'t sleep. He doesn\'t get distracted. Right now, in your hardest moment, He is paying attention to you.',
    titleId: 'Pertolonganmu Datang dari Tuhan',
    bodyId: '"Dari manakah akan datang pertolonganku? Pertolonganku ialah dari TUHAN." Kadang hal paling berkuasa yang bisa kamu lakukan adalah mendongak ke atas. Bukan ke gunung masalah di depanmu — tapi ke Tuhan yang menciptakan gunung-gunung itu. Dia menjagamu. Dia tidak tidur. Dia tidak teralihkan. Saat ini, di momen terberatmu, Dia memperhatikanmu.',
  },
  '2 Corinthians 1': {
    title: 'Comforted to Comfort Others',
    body: 'Paul calls God "the Father of compassion and the God of all comfort." All comfort. Not some. Not comfort for the easy stuff. All of it — the grief, the confusion, the fear. And here\'s the beautiful part: the comfort God gives you in this season will become the comfort you give to someone else later. Your pain is not wasted. God will use it.',
    titleId: 'Dihibur untuk Menghibur Orang Lain',
    bodyId: 'Paulus menyebut Tuhan "Bapa segala kemurahan dan Allah segala penghiburan." Segala penghiburan. Bukan sebagian. Bukan penghiburan untuk hal-hal yang mudah. Semuanya — duka, kebingungan, ketakutan. Dan inilah bagian yang indah: penghiburan yang Tuhan berikan kepadamu di musim ini akan menjadi penghiburan yang kamu berikan kepada orang lain nantinya. Rasa sakitmu tidak sia-sia. Tuhan akan menggunakannya.',
  },
  'Philippians 4': {
    title: 'His Peace Guards You',
    body: '"The peace of God, which transcends all understanding, will guard your hearts and minds." This peace doesn\'t make sense. It shows up when the circumstances say you should be falling apart. It guards you — like a soldier standing watch over your heart. You don\'t have to manufacture it. Just bring your requests to God, with thanksgiving, and let His peace do what only it can do.',
    titleId: 'Damai-Nya Menjagamu',
    bodyId: '"Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu." Damai ini tidak masuk akal. Ia muncul ketika keadaan berkata kamu seharusnya hancur. Ia menjagamu — seperti prajurit yang berjaga atas hatimu. Kamu tidak harus menciptakannya sendiri. Cukup bawa permohonanmu kepada Tuhan, dengan ucapan syukur, dan biarkan damai-Nya melakukan apa yang hanya ia bisa lakukan.',
  },
  'Psalm 27': {
    title: 'Wait for the Lord',
    body: 'David ends this psalm with raw honesty and hard-won faith: "Wait for the Lord; be strong and take heart and wait for the Lord." Waiting is not passive. It\'s an act of trust. It says, "I believe God is working even when I can\'t see it." If you\'re in a waiting season, take heart. God has not forgotten you. He is working.',
    titleId: 'Nantikanlah TUHAN',
    bodyId: 'Daud mengakhiri mazmur ini dengan kejujuran mentah dan iman yang diperoleh dengan susah payah: "Nantikanlah TUHAN! Kuatkanlah dan teguhkanlah hatimu! Nantikanlah TUHAN!" Menanti bukan berarti pasif. Itu tindakan percaya. Itu berkata, "Aku percaya Tuhan sedang bekerja meskipun aku tidak bisa melihatnya." Jika kamu berada di musim menanti, kuatkanlah hatimu. Tuhan tidak melupakanmu. Dia sedang bekerja.',
  },
  'Psalm 62': {
    title: 'Rest in God Alone',
    body: '"Truly my soul finds rest in God; my salvation comes from Him." Not from the resolution of your circumstances. Not from other people coming through. From God alone. Today, let your soul settle. Stop reaching for the next solution and just rest in the One who already has the answer.',
    titleId: 'Beristirahatlah dalam Tuhan Saja',
    bodyId: '"Hanya pada Allah jiwaku tenang, dari pada-Nyalah keselamatanku." Bukan dari terselesaikannya keadaanmu. Bukan dari orang lain yang datang menolong. Dari Tuhan saja. Hari ini, biarkan jiwamu tenang. Berhenti meraih solusi berikutnya dan beristirahatlah dalam Dia yang sudah memiliki jawabannya.',
  },
  'Psalm 139': {
    title: 'He Knows You Completely',
    body: 'God knows when you sit down and when you rise. He knows your thoughts before you think them. He\'s familiar with all your ways. And knowing all of that — every fear, every doubt, every moment of weakness — He still says, "How precious are my thoughts about you." You are fully known and fully loved. There\'s nothing you can show Him that will make Him turn away.',
    titleId: 'Dia Mengenalmu Sepenuhnya',
    bodyId: 'Tuhan tahu kapan kamu duduk dan kapan kamu berdiri. Dia tahu pikiranmu sebelum kamu memikirkannya. Dia mengenal semua jalanmu. Dan mengetahui semua itu — setiap ketakutan, setiap keraguan, setiap momen kelemahan — Dia tetap berkata, "Betapa berharganya pikiran-Ku tentang engkau." Kamu sepenuhnya dikenal dan sepenuhnya dikasihi. Tidak ada yang bisa kamu tunjukkan kepada-Nya yang akan membuatnya berpaling.',
  },
  'Isaiah 41': {
    title: 'Do Not Fear',
    body: '"Do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you." This isn\'t God minimizing what you\'re going through. It\'s God stepping into it with you. He\'s not saying "don\'t feel afraid." He\'s saying "I\'m here, so you don\'t have to stay there." Let Him strengthen you today.',
    titleId: 'Jangan Takut',
    bodyId: '"Jangan takut, sebab Aku menyertai engkau, jangan bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, bahkan akan menolong engkau." Ini bukan Tuhan menyepelekan apa yang kamu alami. Ini Tuhan melangkah masuk ke dalamnya bersamamu. Dia tidak berkata "jangan merasa takut." Dia berkata "Aku di sini, jadi kamu tidak harus tinggal di sana." Biarkan Dia menguatkanmu hari ini.',
  },
  'Lamentations 3': {
    title: 'New Mercies Every Morning',
    body: 'Jeremiah wrote Lamentations in the middle of devastation — his city destroyed, his people scattered. And yet, right in the center of the darkest book in the Bible: "His mercies are new every morning; great is His faithfulness." Even in your darkest chapter, mercy shows up fresh. Tomorrow morning, it\'ll be there again. That\'s who God is.',
    titleId: 'Belas Kasihan Baru Setiap Pagi',
    bodyId: 'Yeremia menulis Ratapan di tengah kehancuran — kotanya dihancurkan, bangsanya tercerai-berai. Namun, tepat di tengah kitab tergelap dalam Alkitab: "Belas kasihan-Nya tidak habis-habisnya, tetapi ia baru setiap pagi; besar kesetiaan-Mu!" Bahkan di pasal tergelapmu, belas kasihan muncul segar. Besok pagi, ia akan ada di sana lagi. Itulah siapa Tuhan.',
  },
  'Psalm 42': {
    title: 'Hope in God',
    body: '"Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God." The psalmist is talking to himself — preaching truth to his own discouraged heart. Sometimes that\'s exactly what you need to do. When your soul is low, remind it of what\'s true: God is still good. He is still faithful. And you will praise Him again.',
    titleId: 'Berharaplah kepada Allah',
    bodyId: '"Mengapa engkau tertekan, hai jiwaku, dan mengapa engkau gelisah di dalam diriku? Berharaplah kepada Allah!" Pemazmur sedang berbicara kepada dirinya sendiri — mengkhotbahkan kebenaran kepada hatinya sendiri yang putus asa. Kadang itulah tepatnya yang perlu kamu lakukan. Ketika jiwamu rendah, ingatkan ia tentang apa yang benar: Tuhan masih baik. Dia masih setia. Dan kamu akan memuji-Nya lagi.',
  },
  'Psalm 103': {
    title: 'He Remembers You',
    body: '"As a father has compassion on his children, so the Lord has compassion on those who fear Him. For He knows how we are formed; He remembers that we are dust." God doesn\'t expect you to be invincible. He knows you\'re human. He knows you\'re fragile. And He meets you there — with compassion, not criticism. Let yourself be held.',
    titleId: 'Dia Mengingatmu',
    bodyId: '"Seperti bapa sayang kepada anak-anaknya, demikian TUHAN sayang kepada orang-orang yang takut akan Dia. Sebab Dia tahu asal usul kita, Dia ingat bahwa kita ini debu." Tuhan tidak mengharapkanmu untuk tak terkalahkan. Dia tahu kamu manusia. Dia tahu kamu rapuh. Dan Dia menemuimu di sana — dengan belas kasihan, bukan kritik. Biarkan dirimu digenggam.',
  },
  'Psalm 16': {
    title: 'Fullness of Joy',
    body: '"You make known to me the path of life; You will fill me with joy in Your presence." Even when joy feels distant, it\'s still there — in His presence. You don\'t have to chase it or force it. Just come close to Him. Sit with Him in this chapter. Joy will find its way back to you in time.',
    titleId: 'Sukacita yang Penuh',
    bodyId: '"Engkau memberitahukan kepadaku jalan kehidupan; di hadapan-Mu ada sukacita berlimpah-limpah." Bahkan ketika sukacita terasa jauh, ia tetap ada — di hadirat-Nya. Kamu tidak harus mengejarnya atau memaksakannya. Cukup mendekat kepada-Nya. Duduk bersama-Nya di pasal ini. Sukacita akan menemukan jalannya kembali kepadamu pada waktunya.',
  },
  'Psalm 86': {
    title: 'You Are a God of Compassion',
    body: '"You, Lord, are a compassionate and gracious God, slow to anger, abounding in love and faithfulness." David didn\'t just know about God — he knew God. And this is who God is: compassionate when you\'re struggling, gracious when you fall short, faithful when everything feels uncertain. That\'s the God who\'s with you today.',
    titleId: 'Engkau Allah yang Penyayang',
    bodyId: '"Tetapi Engkau, Tuhan, Allah penyayang dan pengasih, panjang sabar dan berlimpah kasih dan setia." Daud tidak hanya tahu tentang Tuhan — dia mengenal Tuhan. Dan inilah siapa Tuhan: penyayang ketika kamu berjuang, pengasih ketika kamu gagal, setia ketika segalanya terasa tidak pasti. Itulah Tuhan yang bersamamu hari ini.',
  },
  'Isaiah 54': {
    title: 'His Kindness Will Not Depart',
    body: '"Though the mountains be shaken and the hills be removed, yet my unfailing love for you will not be shaken, nor my covenant of peace be removed." Everything around you can change. But His love won\'t. His peace won\'t. It\'s a covenant — a promise sealed by God Himself. Hold onto that today.',
    titleId: 'Kasih Setia-Nya Tidak Akan Beranjak',
    bodyId: '"Sebab biarpun gunung-gunung beranjak dan bukit-bukit bergoyang, tetapi kasih setia-Ku tidak akan beranjak dari padamu dan perjanjian damai-Ku tidak akan bergoyang." Segala sesuatu di sekitarmu bisa berubah. Tapi kasih-Nya tidak. Damai-Nya tidak. Itu perjanjian — janji yang dimeteraikan oleh Allah sendiri. Peganglah itu hari ini.',
  },
  'Psalm 30': {
    title: 'Joy Comes in the Morning',
    body: '"Weeping may stay for the night, but rejoicing comes in the morning." If you\'re in a nighttime season — the hard, dark, uncertain kind — hear this: morning is coming. This isn\'t forever. God has a morning planned for you. Weep if you need to. He catches every tear. But don\'t give up, because joy is on its way.',
    titleId: 'Sukacita Datang di Pagi Hari',
    bodyId: '"Pada waktu petang tangis menginap, tetapi pada waktu pagi terdengar sorak-sorai." Jika kamu berada di musim malam — yang sulit, gelap, penuh ketidakpastian — dengarlah ini: pagi sedang datang. Ini tidak selamanya. Tuhan sudah merencanakan pagi untukmu. Menangislah jika perlu. Dia menangkap setiap air matamu. Tapi jangan menyerah, karena sukacita sedang dalam perjalanan.',
  },
  'Psalm 77': {
    title: 'Remember What God Has Done',
    body: 'The psalmist was in crisis — sleepless, overwhelmed, wondering if God had forgotten him. And then he did one thing that changed everything: "I will remember the deeds of the Lord." When today feels impossible, look back. God has carried you before. He will carry you again.',
    titleId: 'Ingatlah Apa yang Tuhan Telah Lakukan',
    bodyId: 'Pemazmur sedang dalam krisis — tidak bisa tidur, kewalahan, bertanya-tanya apakah Tuhan telah melupakannya. Dan kemudian dia melakukan satu hal yang mengubah segalanya: "Aku hendak mengingat perbuatan-perbuatan TUHAN." Ketika hari ini terasa mustahil, lihatlah ke belakang. Tuhan pernah menggendongmu sebelumnya. Dia akan menggendongmu lagi.',
  },
  'Psalm 116': {
    title: 'He Heard Your Cry',
    body: '"I love the Lord, for He heard my voice; He heard my cry for mercy." God hears you. Not just the polished prayers — the desperate ones, the ones you pray through tears, the ones that are barely words at all. He hears every one of them. And He bends down to listen.',
    titleId: 'Dia Mendengar Seruanmu',
    bodyId: '"Aku mengasihi TUHAN, sebab Ia mendengarkan suaraku dan permohonanku." Tuhan mendengarmu. Bukan hanya doa yang rapi — yang putus asa, yang kamu doakan sambil menangis, yang hampir bukan kata-kata sama sekali. Dia mendengar setiap doamu. Dan Dia membungkuk untuk mendengarkan.',
  },
  'Psalm 73': {
    title: 'God Is Your Strength',
    body: '"My flesh and my heart may fail, but God is the strength of my heart and my portion forever." You don\'t have to be strong right now. You\'re allowed to feel weak. Because God is your strength — not a backup plan, but the main one. When your heart fails, His doesn\'t.',
    titleId: 'Tuhan adalah Kekuatanmu',
    bodyId: '"Sekalipun dagingku dan hatiku habis lenyap, gunung batuku dan bagianku tetaplah Allah selama-lamanya." Kamu tidak harus kuat sekarang. Kamu boleh merasa lemah. Karena Tuhan adalah kekuatanmu — bukan rencana cadangan, tapi rencana utama. Ketika hatimu gagal, hati-Nya tidak.',
  },
  'Psalm 40': {
    title: 'He Lifted You Out',
    body: '"He lifted me out of the slimy pit, out of the mud and mire; He set my feet on a rock and gave me a firm place to stand." If you feel stuck right now — in grief, in confusion, in hopelessness — know that God is a lifter. He reaches down into the pit. He doesn\'t wait for you to climb out on your own. He pulls you up.',
    titleId: 'Dia Mengangkatmu Keluar',
    bodyId: '"Ia mengangkat aku dari lobang kebinasaan, dari lumpur rawa; Ia menaruh kakiku di atas bukit batu, menjadikan langkahku tegap." Jika kamu merasa terjebak sekarang — dalam duka, dalam kebingungan, dalam keputusasaan — ketahuilah bahwa Tuhan adalah pengangkat. Dia menjangkau ke dalam lobang itu. Dia tidak menunggu kamu memanjat keluar sendiri. Dia menarikmu ke atas.',
  },
  'John 16': {
    title: 'He Has Overcome',
    body: '"In this world you will have trouble. But take heart! I have overcome the world." Jesus didn\'t promise a trouble-free life. He promised something better: His victory over every bit of it. Whatever you\'re facing has already been defeated. Take heart today. The one who overcame the world is fighting for you.',
    titleId: 'Dia Telah Mengalahkan Dunia',
    bodyId: '"Di dunia kamu menderita penganiayaan, tetapi kuatkanlah hatimu, Aku telah mengalahkan dunia." Yesus tidak menjanjikan hidup tanpa masalah. Dia menjanjikan sesuatu yang lebih baik: kemenangan-Nya atas setiap bagiannya. Apa pun yang kamu hadapi sudah dikalahkan. Kuatkan hatimu hari ini. Dia yang mengalahkan dunia sedang berjuang untukmu.',
  },
  'Psalm 145': {
    title: 'He Upholds You',
    body: '"The Lord upholds all who fall and lifts up all who are bowed down." If you\'re bowed down today — by grief, by worry, by the weight of it all — God is not standing over you asking why you fell. He\'s kneeling beside you, lifting you up. That\'s who He is. That\'s what He does.',
    titleId: 'Dia Menopangmu',
    bodyId: '"TUHAN menopang semua orang yang jatuh dan menegakkan semua orang yang tertunduk lesu." Jika kamu tertunduk hari ini — oleh duka, oleh kekhawatiran, oleh beban semuanya — Tuhan tidak berdiri di atasmu bertanya mengapa kamu jatuh. Dia berlutut di sampingmu, mengangkatmu. Itulah siapa Dia. Itulah yang Dia lakukan.',
  },
  'Revelation 21': {
    title: 'Every Tear Will Be Wiped Away',
    body: '"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain." This is where it\'s all heading. The story doesn\'t end in suffering — it ends in complete restoration. Every tear. Every loss. Every broken thing. God will make it new. Hold on to that hope. The best is still to come.',
    titleId: 'Setiap Air Mata Akan Dihapus',
    bodyId: '"Ia akan menghapus segala air mata dari mata mereka, dan maut tidak akan ada lagi; tidak akan ada lagi perkabungan, atau ratap tangis, atau dukacita." Inilah tujuan akhir semuanya. Cerita ini tidak berakhir dalam penderitaan — ia berakhir dalam pemulihan sempurna. Setiap air mata. Setiap kehilangan. Setiap hal yang rusak. Tuhan akan menjadikannya baru. Peganglah pengharapan itu. Yang terbaik masih akan datang.',
  },
};

// ── Streak helpers ──────────────────────────────────────────────
function getStreak(): { count: number; freezesAvailable: number } {
  try {
    return JSON.parse(localStorage.getItem('dw_streak_v2') || '{"count":0,"lastDate":"","freezesAvailable":1,"lastFreezeWeek":""}');
  } catch { return { count: 0, freezesAvailable: 1 }; }
}

function recordStreakToday(): { count: number; isNew: boolean; isMilestone: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = (() => { const d = new Date(); return `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`; })();
  try {
    const raw = JSON.parse(localStorage.getItem('dw_streak_v2') || '{"count":0,"lastDate":"","freezesAvailable":1,"lastFreezeWeek":""}');
    if (raw.lastDate === today) return { count: raw.count, isNew: false, isMilestone: false };

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const dayBefore = new Date(); dayBefore.setDate(dayBefore.getDate() - 2);
    const dbStr = dayBefore.toISOString().slice(0, 10);

    // Replenish freeze weekly
    const freezesAvailable = raw.lastFreezeWeek !== thisWeek ? 1 : (raw.freezesAvailable ?? 1);

    let newCount: number;
    if (raw.lastDate === yStr) {
      // Consecutive day
      newCount = (raw.count || 0) + 1;
    } else if (raw.lastDate === dbStr && freezesAvailable > 0) {
      // Missed one day — auto-apply freeze grace
      newCount = (raw.count || 0) + 1;
      const saved = { count: newCount, lastDate: today, freezesAvailable: freezesAvailable - 1, lastFreezeWeek: thisWeek };
      localStorage.setItem('dw_streak_v2', JSON.stringify(saved));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
      const milestones = [7, 14, 30, 60, 100, 365];
      return { count: newCount, isNew: true, isMilestone: milestones.includes(newCount) };
    } else {
      // Streak broken
      newCount = 1;
    }

    const saved = { count: newCount, lastDate: today, freezesAvailable, lastFreezeWeek: raw.lastFreezeWeek || '' };
    localStorage.setItem('dw_streak_v2', JSON.stringify(saved));
    try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
    const milestones = [7, 14, 30, 60, 100, 365];
    return { count: newCount, isNew: true, isMilestone: milestones.includes(newCount) };
  } catch {
    localStorage.setItem('dw_streak_v2', JSON.stringify({ count: 1, lastDate: today, freezesAvailable: 1, lastFreezeWeek: thisWeek }));
    try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
    return { count: 1, isNew: true, isMilestone: false };
  }
}

// ── Daily Word of the Day ────────────────────────────────────────
const DAILY_WORDS = [
  { word: 'Agape', lang: 'Greek', pronunciation: 'ah-GAH-pay', meaning: 'Unconditional, self-giving love — the highest form of love in the New Testament', verse: 'John 3:16', original: 'ἀγάπη' },
  { word: 'Shalom', lang: 'Hebrew', pronunciation: 'sha-LOME', meaning: 'Peace, wholeness, and completeness — far deeper than the absence of conflict', verse: 'Numbers 6:26', original: 'שָׁלוֹם' },
  { word: 'Charis', lang: 'Greek', pronunciation: 'KAH-ris', meaning: 'Grace — unmerited divine favor freely given', verse: 'Ephesians 2:8', original: 'χάρις' },
  { word: 'Hesed', lang: 'Hebrew', pronunciation: 'HEH-sed', meaning: 'Lovingkindness, steadfast covenant love and loyalty', verse: 'Psalm 136:1', original: 'חֶסֶד' },
  { word: 'Logos', lang: 'Greek', pronunciation: 'LOH-gos', meaning: 'The Word — divine reason, wisdom, and the spoken expression of God', verse: 'John 1:1', original: 'λόγος' },
  { word: 'Emunah', lang: 'Hebrew', pronunciation: 'eh-moo-NAH', meaning: 'Faith — steadfastness, firmness, trust that holds steady over time', verse: 'Habakkuk 2:4', original: 'אֱמוּנָה' },
  { word: 'Kairos', lang: 'Greek', pronunciation: 'KAI-ros', meaning: 'The appointed time — a divinely orchestrated, perfect moment', verse: 'Ecclesiastes 3:1', original: 'καιρός' },
  { word: 'Tsedaqah', lang: 'Hebrew', pronunciation: 'tseh-dah-KAH', meaning: 'Righteousness — living rightly in relationship with God and others', verse: 'Genesis 15:6', original: 'צְדָקָה' },
  { word: 'Pneuma', lang: 'Greek', pronunciation: 'PNYOO-mah', meaning: 'Spirit, breath, wind — the animating presence of God', verse: 'John 4:24', original: 'πνεῦμα' },
  { word: 'Racham', lang: 'Hebrew', pronunciation: 'rah-KHAM', meaning: 'Compassion — deep mercy from the womb; God\'s tender, motherly love', verse: 'Psalm 103:13', original: 'רַחַם' },
  { word: 'Soteria', lang: 'Greek', pronunciation: 'so-tay-REE-ah', meaning: 'Salvation — deliverance, rescue, and restoration to wholeness', verse: 'Romans 1:16', original: 'σωτηρία' },
  { word: 'Emet', lang: 'Hebrew', pronunciation: 'EH-met', meaning: 'Truth — reliable, dependable reality; what can be counted on absolutely', verse: 'John 14:6', original: 'אֱמֶת' },
  { word: 'Ekklesia', lang: 'Greek', pronunciation: 'ek-klay-SEE-ah', meaning: 'Church — the called-out assembly, God\'s gathered community', verse: 'Matthew 16:18', original: 'ἐκκλησία' },
  { word: 'Kabod', lang: 'Hebrew', pronunciation: 'kah-VODE', meaning: 'Glory — the weightiness and radiance of God\'s presence', verse: 'Exodus 33:18', original: 'כָּבוֹד' },
  { word: 'Pistis', lang: 'Greek', pronunciation: 'PIS-tis', meaning: 'Faith, trust, confidence — active reliance on what God has promised', verse: 'Hebrews 11:1', original: 'πίστις' },
  { word: 'Qadosh', lang: 'Hebrew', pronunciation: 'kah-DOSH', meaning: 'Holy — set apart, distinct, wholly other than anything created', verse: 'Isaiah 6:3', original: 'קָדוֹשׁ' },
  { word: 'Parakletos', lang: 'Greek', pronunciation: 'pah-RAH-klay-tos', meaning: 'Comforter, Advocate, Helper — one called alongside to assist', verse: 'John 14:16', original: 'παράκλητος' },
  { word: 'Ruach', lang: 'Hebrew', pronunciation: 'ROO-akh', meaning: 'Spirit, wind, breath — the living, moving presence of God', verse: 'Genesis 1:2', original: 'רוּחַ' },
  { word: 'Zoe', lang: 'Greek', pronunciation: 'ZOH-ay', meaning: 'Life — the full, vibrant, eternal life that God alone gives', verse: 'John 10:10', original: 'ζωή' },
  { word: 'Nephesh', lang: 'Hebrew', pronunciation: 'NEH-fesh', meaning: 'Soul, living being — the whole self; every part of who you are', verse: 'Psalm 23:3', original: 'נֶפֶשׁ' },
  { word: 'Doxa', lang: 'Greek', pronunciation: 'DOH-ksa', meaning: 'Glory, honour, splendour — the revealed magnificence of God', verse: 'Romans 3:23', original: 'δόξα' },
  { word: 'Berith', lang: 'Hebrew', pronunciation: 'beh-REET', meaning: 'Covenant — a binding, unbreakable promise; the foundation of God\'s relationship with his people', verse: 'Genesis 9:16', original: 'בְּרִית' },
  { word: 'Telos', lang: 'Greek', pronunciation: 'TEL-os', meaning: 'End, purpose, completion — the goal toward which everything moves', verse: 'Romans 10:4', original: 'τέλος' },
  { word: 'Dabar', lang: 'Hebrew', pronunciation: 'dah-VAR', meaning: 'Word, matter, thing — in Hebrew thought, a word is an event that accomplishes what it says', verse: 'Isaiah 55:11', original: 'דָּבָר' },
  { word: 'Metanoia', lang: 'Greek', pronunciation: 'meh-tah-NOY-ah', meaning: 'Repentance — a profound change of mind, heart, and direction', verse: 'Matthew 3:2', original: 'μετάνοια' },
  { word: 'Anavah', lang: 'Hebrew', pronunciation: 'ah-nah-VAH', meaning: 'Humility — lowliness before God; the posture of one who knows they depend entirely on Him', verse: 'Micah 6:8', original: 'עֲנָוָה' },
  { word: 'Parousia', lang: 'Greek', pronunciation: 'pah-roo-SEE-ah', meaning: 'Presence, coming — the glorious return of Christ', verse: '1 Thessalonians 4:15', original: 'παρουσία' },
  { word: 'Yeshuah', lang: 'Hebrew', pronunciation: 'yeh-SHOO-ah', meaning: 'Salvation, deliverance — the very name of Jesus means "God saves"', verse: 'Psalm 62:2', original: 'יְשׁוּעָה' },
  { word: 'Dikaiosyne', lang: 'Greek', pronunciation: 'di-kai-oh-SOO-nay', meaning: 'Righteousness, justice — being right before God and living it out toward others', verse: 'Matthew 5:6', original: 'δικαιοσύνη' },
  { word: 'Ahavah', lang: 'Hebrew', pronunciation: 'ah-hah-VAH', meaning: 'Love — deep, active, choosing love; not just feeling but commitment and action', verse: 'Deuteronomy 6:5', original: 'אַהֲבָה' },
];

function getDailyWord() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_WORDS[dayOfYear % DAILY_WORDS.length];
}

// ── Emoji Reaction (micro-commitment after reading) ─────────────────────────
const REACTIONS = [
  { emoji: '❤️', labelKey: 'reaction_heart' },
  { emoji: '🤔', labelKey: 'reaction_thinking' },
  { emoji: '🙏', labelKey: 'reaction_prayer' },
];
function getTodayReaction(): string | null {
  try {
    const data = JSON.parse(localStorage.getItem('dw_reactions') || '{}');
    return data[new Date().toISOString().slice(0, 10)] || null;
  } catch { return null; }
}
function saveTodayReaction(emoji: string) {
  try {
    const data = JSON.parse(localStorage.getItem('dw_reactions') || '{}');
    data[new Date().toISOString().slice(0, 10)] = emoji;
    localStorage.setItem('dw_reactions', JSON.stringify(data));
      try { const _p = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_p.email) schedulePush(_p.email); } catch {}
  } catch { /* empty */ }
}

// ── Campus community count (deterministic per campus + date) ─────────────────
function getCampusReaderCount(campusId: string): number {
  if (!campusId) return 0;
  const seed = campusId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const day = new Date().getDate() + new Date().getMonth() * 31;
  const dow = new Date().getDay();
  const base = (seed % 40) + 20;
  const dayBonus = dow === 0 ? 18 : dow === 6 ? 10 : 0;
  const variance = ((seed * day) % 14) - 7;
  return Math.max(8, base + dayBonus + variance);
}

// ── Variable reward — rotate what leads home screen (day % 3) ───────────────
// ── Weekly "Word in Review" — show on Sundays ────────────────────────────────
const WEEK_REVIEW_QUESTIONS = [
  'What stood out most in what you read this week?',
  'Was there a verse that stayed with you?',
  'What is one thing God is saying to you?',
  'How did your reading shape your week?',
];
function getWeekReviewData(): { weekLabel: string; daysRead: number; streak: number; question: string } | null {
  try {
    const today = new Date();
    if (today.getDay() !== 0) return null; // Sundays only
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}-${today.getMonth()}`;
    const dismissed = localStorage.getItem('dw_week_review_dismissed');
    if (dismissed === weekKey) return null;
    const streak = getStreak().count;
    if (streak < 3) return null;
    const daysRead = Math.min(streak, 7);
    const question = WEEK_REVIEW_QUESTIONS[Math.floor(today.getDate() / 7) % WEEK_REVIEW_QUESTIONS.length];
    const weekLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return { weekLabel, daysRead, streak, question };
  } catch { return null; }
}

/** Sunday sermon shortcut — show during Sunday service window (Sat 11:40 PM → Sun 4 PM) */
function getSundaySermon(): SermonData | null { return null; /* sermon banner disabled */ }

/** Calendar-based plan day — advances automatically each day regardless of completion */
function calcPlanDay(startedAt: string, totalDays: number): number {
  try {
    const start = new Date(startedAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return Math.max(1, Math.min(elapsed + 1, totalDays));
  } catch {
    return 1;
  }
}


/* -- Bible Books and Chapters -- */
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const BOOK_CHAPTERS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24, Judges: 21, Ruth: 4,
  '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31, Ecclesiastes: 12,
  'Song of Solomon': 8, Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12,
  Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3,
  Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21,
  Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6,
  '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
};

/* -- Faith Pathway types -- */
interface PathwayDay {
  day: number;
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  theme: string;
  themeEs?: string;
  themePt?: string;
  themeId?: string;
  passages?: string[];
  reflection?: string;
  lesson?: string;
  lessonEs?: string;
  lessonPt?: string;
  lessonId?: string;
  reading?: { book: string; chapter: number; verses: string; ref: string };
}

interface PathwayData {
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  days: PathwayDay[];
}

interface PathwayProgress {
  completedDays: number[];
  currentDay: number;
  enrolled: boolean;
}

interface ReadingSlot {
  id: string;
  book: string;
  currentChapter: number;
}

export function HomeScreen({ onNavigate, onOpenAI, onBack }: { onNavigate?: (tab: TabId) => void; onOpenAI?: () => void; onBack?: () => void }) {
  const { userProfile, setup, saveProfile, saveSetup, requireEmail, showEmailGate } = useUser();

  // ── Persona-aware feature gating (memoized — avoids recalc on every render) ──
  const personaConfig = useMemo(() => getPersonaConfig(setup?.persona), [setup?.persona]);
  const pf = personaConfig.features; // shorthand
  const greetingText = useMemo(
    () => getGreeting(personaConfig.persona, userProfile?.firstName || '', getStreak().count, getLang()),
    [personaConfig.persona, userProfile?.firstName],
  );

  // ── Sunday sermon tab — takes over the home screen during the window ──
  const sundaySermon = getSundaySermon();
  const [homeTab, setHomeTab] = useState<'word' | 'sermon'>(() => sundaySermon ? 'sermon' : 'word');
  const [inlineNotes, setInlineNotes] = useState<Record<number, string>>(() => {
    if (!sundaySermon) return {};
    try { return JSON.parse(localStorage.getItem(`dw_sermon_inline_${sundaySermon.id}`) || '{}'); } catch { return {}; }
  });


  const updateInlineNote = (idx: number, text: string) => {
    if (!sundaySermon) return;
    const next = { ...inlineNotes, [idx]: text };
    if (!text.trim()) delete next[idx];
    setInlineNotes(next);
    localStorage.setItem(`dw_sermon_inline_${sundaySermon.id}`, JSON.stringify(next));
  };

  const [dayOffset, setDayOffset] = useState(0);
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  });
  // ── Font size control ──
  const FONT_MIN = 13;
  const FONT_MAX = 32;
  const FONT_STEP = 1;
  const [scriptureFontSize, setScriptureFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('dw_font_size');
    return saved ? Math.min(FONT_MAX, Math.max(FONT_MIN, parseInt(saved, 10))) : 15;
  });
  const adjustFontSize = useCallback((delta: number) => {
    setScriptureFontSize(prev => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta));
      localStorage.setItem('dw_font_size', String(next));
      return next;
    });
  }, []);
  const handleFontIncrease = useCallback(() => adjustFontSize(FONT_STEP), [adjustFontSize]);
  const handleFontDecrease = useCallback(() => adjustFontSize(-FONT_STEP), [adjustFontSize]);

  const [compareMode, setCompareMode] = useState(false);
  const [compareTranslation, setCompareTranslation] = useState<TranslationCode>('KJV');
  const [compareTexts, setCompareTexts] = useState<Record<string, string>>({});
  const [passageTexts, setPassageTexts] = useState<Record<string, string>>({});
  const [loadingPassages, setLoadingPassages] = useState<Set<string>>(new Set());
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [showHeaderCampus, setShowHeaderCampus] = useState(false);
  const [showHeaderPersona, setShowHeaderPersona] = useState(false);
  const [showHeaderLanguage, setShowHeaderLanguage] = useState(false);
  const APP_LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'id', label: 'Bahasa', flag: '🇮🇩' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
  ] as const;
  const [appLanguage, setAppLanguage] = useState(() => {
    try { return localStorage.getItem('dw_lang') || 'en'; } catch { return 'en'; }
  });

  // ── i18n: UI translations ──
  const UI_STRINGS: Record<string, Record<string, string>> = {
    'todays_reading': { en: "TODAY'S READING", es: "LECTURA DE HOY", pt: "LEITURA DE HOJE", id: "BACAAN HARI INI" },
    'listen_now': { en: "Listen Now", es: "Escuchar ahora", pt: "Ouça agora", id: "Dengarkan" },
    'read': { en: "Read", es: "Leer", pt: "Ler", id: "Baca" },
    'mark_complete': { en: "Mark Complete \u2192", es: "Marcar completo \u2192", pt: "Marcar completo \u2192", id: "Tandai Selesai \u2192" },
    'share': { en: "Share", es: "Compartir", pt: "Compartilhar", id: "Bagikan" },
    'font_size': { en: "Font Size", es: "Tam. de fuente", pt: "Tam. da fonte", id: "Ukuran Font" },
    'select_campus': { en: "Select Campus", es: "Seleccionar sede", pt: "Selecionar campus", id: "Pilih Kampus" },
    'search': { en: "Search", es: "Buscar", pt: "Buscar", id: "Cari" },
    'daily_word': { en: "Daily Word", es: "Palabra del D\u00eda", pt: "Palavra do Dia", id: "Firman Harian" },
    'reading_plan': { en: "READING PLAN", es: "PLAN DE LECTURA", pt: "PLANO DE LEITURA", id: "RENCANA BACAAN" },
    'reading_plans': { en: "READING PLANS", es: "PLANES DE LECTURA", pt: "PLANOS DE LEITURA", id: "RENCANA BACAAN" },
    'start_plan': { en: "Start This Plan \u2192", es: "Comenzar este plan \u2192", pt: "Come\u00e7ar este plano \u2192", id: "Mulai Rencana Ini \u2192" },
    'todays_reflection': { en: "Today's reflection", es: "Reflexi\u00f3n de hoy", pt: "Reflex\u00e3o de hoje", id: "Refleksi hari ini" },
    'previous_day': { en: "Previous day", es: "D\u00eda anterior", pt: "Dia anterior", id: "Hari sebelumnya" },
    'next_day': { en: "Next day", es: "D\u00eda siguiente", pt: "Pr\u00f3ximo dia", id: "Hari berikutnya" },
    'bible_ai': { en: "Bible AI", es: "Biblia IA", pt: "B\u00edblia IA", id: "Alkitab AI" },
    'home': { en: "Home", es: "Inicio", pt: "In\u00edcio", id: "Beranda" },
    'notes': { en: "Notes", es: "Notas", pt: "Notas", id: "Catatan" },
    'campus': { en: "Campus", es: "Sede", pt: "Campus", id: "Kampus" },
    'plans': { en: "Plans", es: "Planes", pt: "Planos", id: "Rencana" },
    'settings': { en: "Settings", es: "Ajustes", pt: "Configura\u00e7\u00f5es", id: "Pengaturan" },
    'listen': { en: "Listen", es: "Escuchar", pt: "Ouvir", id: "Dengarkan" },
    'commentary': { en: "Commentary", es: "Comentario", pt: "Coment\u00e1rio", id: "Komentar" },
    'note': { en: "Note", es: "Nota", pt: "Nota", id: "Catatan" },
    'save_notes': { en: "Save to Notes", es: "Guardar en notas", pt: "Salvar nas notas", id: "Simpan ke Catatan" },
    'welcome_back': { en: "Welcome back.", es: "Bienvenido de nuevo.", pt: "Bem-vindo de volta.", id: "Selamat datang kembali." },
    'im_new': { en: "I'm New to This", es: "Soy nuevo en esto", pt: "Sou novo nisso", id: "Saya Baru" },
    'featured': { en: "Featured", es: "Destacados", pt: "Destaques", id: "Unggulan" },
    'books': { en: "Books", es: "Libros", pt: "Livros", id: "Buku" },
    'sunday_service': { en: "Sunday Service \u2014 Open Sermon Notes", es: "Servicio dominical \u2014 Abrir notas del serm\u00f3n", pt: "Culto de domingo \u2014 Abrir notas do serm\u00e3o", id: "Ibadah Minggu \u2014 Buka Catatan Khotbah" },
    'tap_notes': { en: "Tap to take notes during today's message", es: "Toca para tomar notas durante el mensaje de hoy", pt: "Toque para fazer anota\u00e7\u00f5es durante a mensagem de hoje", id: "Ketuk untuk mencatat selama pesan hari ini" },
    'sermon_notes': { en: "Sermon Notes", es: "Notas del serm\u00f3n", pt: "Notas do serm\u00e3o", id: "Catatan Khotbah" },
    'esv_human': { en: "ESV \u00b7 Human Reader", es: "ESV \u00b7 Lector humano", pt: "ESV \u00b7 Leitor humano", id: "ESV \u00b7 Pembaca" },
    'day_label': { en: "DAY", es: "DÍA", pt: "DIA", id: "HARI" },
    'of_label': { en: "OF", es: "DE", pt: "DE", id: "DARI" },
    'now_playing': { en: 'Now Playing', es: 'Reproduciendo', pt: 'Reproduzindo', id: 'Sedang Diputar' },
    'paused_label': { en: 'Paused', es: 'Pausado', pt: 'Pausado', id: 'Dijeda' },
    'loading_label': { en: 'Loading\u2026', es: 'Cargando\u2026', pt: 'Carregando\u2026', id: 'Memuat\u2026' },
    'stop_all': { en: 'Stop All', es: 'Detener Todo', pt: 'Parar Tudo', id: 'Hentikan Semua' },
    'select_all_passages': { en: 'Select All', es: 'Seleccionar Todo', pt: 'Selecionar Tudo', id: 'Pilih Semua' },
    'passages_word': { en: 'Passages', es: 'Pasajes', pt: 'Passagens', id: 'Bagian' },
    'close_label': { en: 'Close', es: 'Cerrar', pt: 'Fechar', id: 'Tutup' },
    'esv_human_reader': { en: 'ESV \u00b7 Human Reader', es: 'ESV \u00b7 Lector Humano', pt: 'ESV \u00b7 Leitor Humano', id: 'ESV \u00b7 Pembaca Manusia' },
    'audio_unavailable': { en: 'Audio unavailable \u2014 tap Read to follow along', es: 'Audio no disponible \u2014 toca Leer para seguir', pt: '\u00c1udio indispon\u00edvel \u2014 toque Ler para acompanhar', id: 'Audio tidak tersedia \u2014 ketuk Baca untuk mengikuti' },
    'reaction_heart': { en: 'Touched my heart', es: 'Toc\u00f3 mi coraz\u00f3n', pt: 'Tocou meu cora\u00e7\u00e3o', id: 'Menyentuh hatiku' },
    'reaction_thinking': { en: 'Made me think', es: 'Me hizo pensar', pt: 'Me fez pensar', id: 'Membuatku berpikir' },
    'reaction_prayer': { en: 'I needed this', es: 'Necesitaba esto', pt: 'Eu precisava disso', id: 'Aku membutuhkan ini' },
    'days_this_week': { en: 'days this week', es: 'd\u00edas esta semana', pt: 'dias esta semana', id: 'hari minggu ini' },
    'day_streak': { en: 'day streak', es: 'd\u00edas seguidos', pt: 'dias seguidos', id: 'hari beruntun' },
    'setup_personal_time': { en: 'Personal time in the Word', es: 'Tiempo personal en la Palabra', pt: 'Tempo pessoal na Palavra', id: 'Waktu pribadi dalam Firman' },
    'setup_personal_desc': { en: 'Not for a sermon \u2014 just me and God', es: 'No para un serm\u00f3n \u2014 solo yo y Dios', pt: 'N\u00e3o para um serm\u00e3o \u2014 s\u00f3 eu e Deus', id: 'Bukan untuk khotbah \u2014 hanya aku dan Tuhan' },
    'setup_deep_study': { en: 'Deep study with full tools', es: 'Estudio profundo con todas las herramientas', pt: 'Estudo profundo com todas as ferramentas', id: 'Studi mendalam dengan semua alat' },
    'setup_deep_desc': { en: 'Commentary, Greek/Hebrew, cross-references', es: 'Comentario, griego/hebreo, referencias cruzadas', pt: 'Coment\u00e1rio, grego/hebraico, refer\u00eancias cruzadas', id: 'Komentar, Yunani/Ibrani, referensi silang' },
    'setup_rhythm': { en: 'A reading rhythm I can stick to', es: 'Un ritmo de lectura que puedo mantener', pt: 'Um ritmo de leitura que posso manter', id: 'Ritme membaca yang bisa kupertahankan' },
    'setup_rhythm_desc': { en: 'Consistent daily plan, right pace for my schedule', es: 'Plan diario constante, ritmo adecuado para mi horario', pt: 'Plano di\u00e1rio consistente, ritmo certo para minha agenda', id: 'Rencana harian konsisten, kecepatan tepat untuk jadwalku' },
    'setup_read_ahead': { en: "Read ahead of what I'm preaching", es: 'Leer antes de lo que voy a predicar', pt: 'Ler adiante do que vou pregar', id: 'Membaca lebih dulu dari yang akan kukhotbahkan' },
    'setup_read_ahead_desc': { en: 'Gospels, Acts, Letters \u2014 stay in the text', es: 'Evangelios, Hechos, Cartas \u2014 mantente en el texto', pt: 'Evangelhos, Atos, Cartas \u2014 fique no texto', id: 'Injil, Kisah, Surat \u2014 tetap dalam teks' },
    'chapters_1': { en: '1 chapter a day', es: '1 cap\u00edtulo al d\u00eda', pt: '1 cap\u00edtulo por dia', id: '1 pasal per hari' },
    'chapters_1_desc': { en: 'A gentle pace', es: 'Un ritmo suave', pt: 'Um ritmo suave', id: 'Kecepatan lembut' },
    'chapters_2': { en: '2 chapters a day', es: '2 cap\u00edtulos al d\u00eda', pt: '2 cap\u00edtulos por dia', id: '2 pasal per hari' },
    'chapters_2_desc': { en: 'A steady rhythm', es: 'Un ritmo constante', pt: 'Um ritmo constante', id: 'Ritme yang stabil' },
    'chapters_3': { en: '3 chapters a day', es: '3 cap\u00edtulos al d\u00eda', pt: '3 cap\u00edtulos por dia', id: '3 pasal per hari' },
    'chapters_3_desc': { en: 'Deeper immersion', es: 'Inmersi\u00f3n m\u00e1s profunda', pt: 'Imers\u00e3o mais profunda', id: 'Pendalaman lebih' },
    'your_notes_placeholder': { en: 'Your notes...', es: 'Tus notas...', pt: 'Suas notas...', id: 'Catatanmu...' },
    'search_books': { en: 'Search books...', es: 'Buscar libros...', pt: 'Buscar livros...', id: 'Cari buku...' },
    'ask_about_passage': { en: 'Ask about this passage\u2026', es: 'Pregunta sobre este pasaje\u2026', pt: 'Pergunte sobre esta passagem\u2026', id: 'Tanyakan tentang bagian ini\u2026' },
    'read_btn': { en: 'Read', es: 'Leer', pt: 'Ler', id: 'Baca' },
  };
  const t = (key: string): string => UI_STRINGS[key]?.[appLanguage] || UI_STRINGS[key]?.['en'] || key;


  // Reading Slots state
  const [readingSlots, setReadingSlots] = useState<ReadingSlot[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_reading_slots') || '[]') as ReadingSlot[];
    } catch { return []; }
  });
  const [showReadingSetup, setShowReadingSetup] = useState(false);
  const [pastorOnboardStep, setPastorOnboardStep] = useState<number>(() => {
    try {
      if (localStorage.getItem('dw_pastor_onboard_completed')) return -2; // fully done, never show
      // If user already has active plans, skip onboarding entirely
      const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      if (Object.keys(ap).length > 0) return -2;
      return localStorage.getItem('dw_pastor_onboard_dismissed') ? -1 : 0;
    } catch { return 0; }
  });

  // ── Comfort reading state ──
  // comfortChapterIndex: which chapter in the rotation they're on today
  // comfortChaptersServed: how many they've read so far in this session
  // comfortPostRead: null = reading, 'ask_more' = finished chapter, 'ask_lock' = finished 2+, 'done' = done for today
  // comfortDailyAmount: locked-in daily chapter count (persisted)
  const [comfortChapterIndex, setComfortChapterIndex] = useState<number>(() => {
    return Math.floor(Date.now() / 86400000) % COMFORT_CHAPTERS.length;
  });
  const [comfortChaptersServed, setComfortChaptersServed] = useState(0);
  const [comfortPostRead, setComfortPostRead] = useState<null | 'devotion' | 'ask_more' | 'ask_lock' | 'done'>(null);
  const [comfortDailyAmount, setComfortDailyAmount] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('dw_comfort_daily') || '0', 10) || 0; } catch { return 0; }
  });
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [bookPickerSearch, setBookPickerSearch] = useState('');
  const [loadedFirstSlotPassage, setLoadedFirstSlotPassage] = useState(false);

  // Chapters per day (from Settings)
  const [chaptersPerDay, setChaptersPerDay] = useState<number>(() => {
    return parseInt(localStorage.getItem('dw_chapters_per_day') || '3', 10);
  });

  // Faith Pathway state
  const [pathwayData, setPathwayData] = useState<PathwayData | null>(null);
  const [pathwayProgress, setPathwayProgress] = useState<PathwayProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}') as PathwayProgress;
    } catch { return { completedDays: [], currentDay: 1, enrolled: false }; }
  });

  // Audio state — powered by global AudioPlayer (single element, iOS-safe)
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentPassage, setAudioCurrentPassage] = useState<string | null>(null);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [showBibleAI, setShowBibleAI] = useState(false);
  const [bibleAIContext, setBibleAIContext] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const { selection, setSelection, greekHebrewMode, setGreekHebrewMode } = useScriptureSelection();
  const audioSrcCache = useRef<Map<string, string>>(new Map());
  const [audioError, setAudioError] = useState(false);

  // Subscribe to global AudioPlayer state changes
  useEffect(() => {
    return AP.onStateChange((st, passage) => {
      setAudioPlaying(st === 'playing');
      setAudioLoading(st === 'loading');
      setAudioCurrentPassage(passage ?? null);
    });
  }, []);
  const [streakCount, setStreakCount] = useState(() => getStreak().count);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const dailyWord = getDailyWord();
  // Emoji reaction
  const [todayReaction, setTodayReaction] = useState<string | null>(() => getTodayReaction());
  // Weekly review
  const [weekReview] = useState(() => getWeekReviewData());
  const [weekReviewDismissed, setWeekReviewDismissed] = useState(false);
  const [selectedCommentaryIdx, setSelectedCommentaryIdx] = useState(0);
  const [commentaryExpanded, setCommentaryExpanded] = useState(pf.commentary === 'expanded');
  const currentCampus = CAMPUSES.find(c => c.id === userProfile?.campus);
  const lang = localStorage.getItem('dw_lang') || 'en';

  // Load Faith Pathway — persona-gated via config
  useEffect(() => {
    if (pf.faithPathway) {
      if (!pathwayProgress.enrolled) {
        const updated = { ...pathwayProgress, enrolled: true, completedDays: pathwayProgress.completedDays || [], currentDay: pathwayProgress.currentDay || 1 };
        setPathwayProgress(updated);
        try { localStorage.setItem('dw_pathway_progress', JSON.stringify(updated)); } catch {}
        try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
      }
      if (!pathwayData) {
        const _lang = getLang();
        const _pathwayUrl = _lang !== 'en' ? `/books/faith-pathway_${_lang}.json` : '/books/faith-pathway.json';
        fetch(_pathwayUrl)
          .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
          .then((data: PathwayData) => setPathwayData(data))
          .catch(() => {
            // Fallback to English if translated file doesn't exist
            if (_lang !== 'en') {
              fetch('/books/faith-pathway.json')
                .then(r => r.json())
                .then((data: PathwayData) => setPathwayData(data))
                .catch(() => {});
            }
          });
      }
    }
  }, [setup?.persona]);

  // Auto-load first reading slot's passage on mount
  useEffect(() => {
    if (readingSlots.length > 0 && !loadedFirstSlotPassage) {
      const firstSlot = readingSlots[0];
      const passage = `${firstSlot.book} ${firstSlot.currentChapter}`;
      loadPassage(passage);
      setLoadedFirstSlotPassage(true);
    }
  }, [readingSlots, loadedFirstSlotPassage]);

  // Auto-show setup modal for new users after EmailGate closes
  // Skip for pastor/leader personas — they don't need onboarding help
  useEffect(() => {
    if (showEmailGate) return; // EmailGate still open
    if (!setup) return; // No persona yet (truly first visit)
    if (setup.persona === 'pastor_leader' || setup.persona === 'pastor') return; // Pastors don't need this
    if (localStorage.getItem('dw_setup_dismissed')) return; // Already dismissed
    const ap = (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
    if (Object.keys(ap).length > 0) return; // Already has plans
    const t = setTimeout(() => setShowSetupModal(true), 600);
    return () => clearTimeout(t);
  }, [showEmailGate, setup]);

  const savePathwayProgress = (p: PathwayProgress) => {
    setPathwayProgress(p);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(p)); } catch {}
    try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
  };

  const saveReadingSlots = (slots: ReadingSlot[]) => {
    setReadingSlots(slots);
    try { localStorage.setItem('dw_reading_slots', JSON.stringify(slots)); } catch {}
  };

  const addReadingSlot = (book: string) => {
    const newSlot: ReadingSlot = {
      id: Math.random().toString(36).substr(2, 9),
      book,
      currentChapter: 1,
    };
    saveReadingSlots([...readingSlots, newSlot]);
    setShowBookPicker(false);
    setBookPickerSearch('');
  };

  const removeReadingSlot = (id: string) => {
    saveReadingSlots(readingSlots.filter(s => s.id !== id));
  };

  const advanceChapter = (id: string) => {
    const updated = readingSlots.map(s => {
      if (s.id === id) {
        const maxChapter = BOOK_CHAPTERS[s.book] || 1;
        return { ...s, currentChapter: Math.min(s.currentChapter + 1, maxChapter) };
      }
      return s;
    });
    saveReadingSlots(updated);
  };

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
      track('campus_switched', campusId);
    } else {
      requireEmail(() => {});
    }
    setShowCampusPicker(false);
  };

  const passages = getDailyPassages(dayOffset);
  const dateStr = getDateString(dayOffset);
  const quoteIndex = getDailyQuoteIndex(dayOffset, QUOTES.length);
  const todaysDevotion = getTodaysDevotion(dayOffset);
  const quote = QUOTES[quoteIndex];

  // Find commentary for today's primary passage — collect ALL sources
  const primaryPassage = passages[0]?.passage || '';
  const commentarySources = COMMENTARY as Record<string, Record<string, string>>;
  const allCommentaries: { source: string; text: string }[] = [];
  for (const [source, entries] of Object.entries(commentarySources)) {
    if (entries[primaryPassage]) {
      allCommentaries.push({ source, text: entries[primaryPassage] });
    }
  }
  // Fetch a single passage on demand (tap to read)
  const loadPassage = useCallback((passage: string) => {
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) return; // already loaded
    if (loadingPassages.has(passage)) return; // already loading

    setLoadingPassages(prev => new Set(prev).add(passage));
    fetchPassage(passage, translation)
      .then(text => {
        setPassageTexts(prev => ({ ...prev, [key]: text }));
      })
      .catch(() => {})
      .finally(() => {
        setLoadingPassages(prev => {
          const next = new Set(prev);
          next.delete(passage);
          return next;
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  // Pending audio — when user taps Listen before text is loaded
  const pendingAudioRef = useRef<string | null>(null);

  // Watch for text to arrive so we can auto-play audio
  useEffect(() => {
    if (!pendingAudioRef.current) return;
    const passage = pendingAudioRef.current;
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) {
      pendingAudioRef.current = null;
      handleAudio(passage);
    }
  }, [passageTexts]);

  // Read: expand + load. Listen: expand + load + play audio when ready.
  const handleRead = (passage: string) => {
    // If already open, close it (toggle)
    if (expandedPassages.has(passage)) {
      setExpandedPassages(new Set());
      return;
    }
    // Close everything else, stop any playing audio, open this one
    if (audioPlaying) stopAudio();
    setExpandedPassages(new Set([passage]));
    loadPassage(passage);
    trackBehavior('passage_read', passage);
    track('daily_reading', passage);
  };

  const handleListen = (passage: string) => {
    // Unlock iOS audio synchronously on user gesture tap
    AP.unlock();
    setAudioError(false);
    const key = `${passage}_${translation}`;
    // Toggle off
    if (AP.isPlaying(passage)) {
      AP.stop();
      return;
    }
    if (audioPlaying) AP.stop();
    setShowSetupModal(false);
    setExpandedPassages(new Set([passage]));
    if (passageTexts[key]) {
      handleAudio(passage);
    } else {
      loadPassage(passage);
      pendingAudioRef.current = passage;
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => { AP.stop(); };
  }, []);

  // Record today as a reading day + handle streak freeze + milestone
  useEffect(() => {
    const result = recordStreakToday();
    if (result.isNew) {
      setStreakCount(result.count);
      if (result.isMilestone) {
        setTimeout(() => setShowMilestone(result.count), 600);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup prompt: show on day 2+ if user has no reading slots & no active plans
  // Skip for pastor/leader personas
  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('dw_setup_dismissed');
    if (alreadyDismissed) return;
    const persona = (() => { try { return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona; } catch { return ''; } })();
    if (persona === 'pastor_leader' || persona === 'pastor') return;
    // Check if this is truly a return visit (not first open)
    const firstOpen = localStorage.getItem('dw_first_open');
    const today = new Date().toISOString().slice(0, 10);
    if (!firstOpen) {
      localStorage.setItem('dw_first_open', today);
      return; // Don't show on very first open
    }
    if (firstOpen === today) return; // Same day as first open — skip
    const hasSlots = readingSlots.length > 0;
    const hasPlans = Object.keys(
      (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })()
    ).length > 0;
    if (hasSlots || hasPlans) return;
    const timer = setTimeout(() => setShowSetupModal(true), 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset expanded passages when day or translation changes
  useEffect(() => {
    setExpandedPassages(new Set());
    setPassageTexts({});
    setCompareTexts({});
    stopAudio();
  }, [dayOffset, translation]);

  useEffect(() => {
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        const dn = calcPlanDay(prog.startedAt, plan.totalDays);
        const dp = plan.passages[dn - 1];
        if (!dp) continue;
        dp.split(', ').forEach(p => loadPassage(p.trim()));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  // Auto-load faith pathway scripture reading for new_to_faith persona
  useEffect(() => {
    if (!pf.faithPathway || !pathwayData || !pathwayProgress.enrolled) return;
    if (personaConfig.sectionOrder.includes('devotion')) return; // only for plan-based personas
    const currentDay = pathwayProgress.currentDay || 1;
    const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
    if (!dayData) return;
    const reading = (dayData as any).reading;
    if (!reading) return;
    // Use full chapter as the reading (e.g., "Ephesians 2" instead of "Ephesians 2:8-9")
    const fullChapter = `${reading.book} ${reading.chapter}`;
    loadPassage(fullChapter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathwayData, pathwayProgress, translation]);

  // Auto-load devotion-connected scripture for congregation persona
  useEffect(() => {
    if (!personaConfig.sectionOrder.includes('devotion_scripture')) return;
    const devVerse = todaysDevotion.verse; // e.g. "2 Timothy 1"
    if (!devVerse) return;
    loadPassage(devVerse);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysDevotion.verse, translation]);

  // Auto-load comfort scripture chapter
  useEffect(() => {
    if (!personaConfig.sectionOrder.includes('comfort_scripture')) return;
    const passage = COMFORT_CHAPTERS[comfortChapterIndex % COMFORT_CHAPTERS.length];
    if (passage) loadPassage(passage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comfortChapterIndex, translation]);

  const todaysPlanPassages = (() => {
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const out: Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; author: string; body: string } }> = [];
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        // Book plans (bookId set) are handled by the dw_book_plans system — skip here
        if (plan.bookId) continue;
        const dn = calcPlanDay(prog.startedAt, plan.totalDays);
        const dp = plan.passages[dn - 1];
        const dev = plan.devotionals?.[dn - 1];
        if (dp) dp.split(', ').forEach((p, i) => out.push({ planId: pid, planTitle: tField(plan, 'title', lang), passage: p.trim(), dayNum: dn, devotional: i === 0 ? dev : undefined }));
      }
      // Filter out A&J plan for personas that shouldn't see it
      const AJ_ONLY_PERSONAS = ['congregation', 'new_to_faith', 'new_returning'];
      const currentPersona = (() => { try { return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || ''; } catch { return ''; } })();
      const filtered = AJ_ONLY_PERSONAS.includes(currentPersona) ? out : out.filter(p => p.planId !== 'ashley-jane-daily-word');
      // Persist today's plan passages so Study Notes tab can read them
      try { localStorage.setItem('dw_todays_plan_passages', JSON.stringify(filtered)); } catch {}
      return filtered;
    } catch { return [] as Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; author: string; body: string } }>; }
  })();

  // Preload audio for plan passages in the background once text is available
  useEffect(() => {
    if (todaysPlanPassages.length === 0) return;
    todaysPlanPassages.forEach(({ passage }) => {
      const tKey = `${passage}_${translation}`;
      const text = passageTexts[tKey];
      if (!text) return;
      const cacheKey = tKey;
      if (audioSrcCache.current.has(cacheKey)) return; // already cached
      // Silently preload — don't auto-play, just warm the cache
      AP.fetchAudioSrc(text.slice(0, 5000), translation, passage).then(src => {
        if (src) audioSrcCache.current.set(cacheKey, src);
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageTexts, translation]);

  // Fetch compare text when compare mode or translation changes
  useEffect(() => {
    if (!compareMode || todaysPlanPassages.length === 0) return;
    todaysPlanPassages.forEach(({ passage }) => {
      const cKey = `${passage}_${compareTranslation}`;
      if (compareTexts[cKey]) return; // already loaded
      fetchPassage(passage, compareTranslation)
        .then(text => {
          setCompareTexts(prev => ({ ...prev, [cKey]: text }));
        })
        .catch(() => {});
    });
  }, [compareMode, compareTranslation, todaysPlanPassages]);

  // ── Hero full-passage state (always ESV for real human audio) ──────────────
  // heroFullText removed — audio now fetches per-chapter on demand
  const [heroLoading, setHeroLoading] = useState(false);
  const [allPassagesSelected, setAllPassagesSelected] = useState(false);
  const [planTick, setPlanTick] = useState(0); // increment to force plan list re-render
  const HERO_KEY = '__hero__';

  const handleSelectAllListen = () => {
    const next = !allPassagesSelected;
    setAllPassagesSelected(next);
    if (next && heroChapterRefs.length > 0) {
      // Start playing all passages from the beginning
      handleHeroListen();
    } else {
      // Stop playback
      if (audioPlaying) stopAudio();
    }
  };

  const handleTranslationChange = (t: TranslationCode) => {
    setTranslation(t);
    localStorage.setItem('dw_translation', t);
    track('translation_switch', t);
  };

  const stopAudio = () => {
    AP.stop();
  };

  /** Play audio for a passage using the global AudioPlayer */
  const handleAudio = async (passage: string) => {
    // Toggle off if already playing this passage
    if (AP.isPlaying(passage)) {
      AP.stop();
      return;
    }
    if (audioPlaying) AP.stop();

    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    if (!text) return;

    setAudioError(false);
    trackBehavior('audio_played', passage);
    track('audio_play', passage, { translation });

    try {
      const cacheKey = `${passage}_${translation}`;
      let src = audioSrcCache.current.get(cacheKey);
      if (!src) {
        src = await AP.fetchAudioSrc(text.slice(0, 20000), translation, passage) ?? undefined;
        if (src) audioSrcCache.current.set(cacheKey, src);
      }
      if (src) {
        await AP.playUrl(passage, src);
      } else {
        setAudioError(true);
      }
    } catch {
      setAudioError(true);
    }
  };

  const handleSetupComplete = (newChapters: number, planIds: string[]) => {
    // Save chapters per day
    setChaptersPerDay(newChapters);
    localStorage.setItem('dw_chapters_per_day', String(newChapters));
    // Start selected plans
    if (planIds.length > 0) {
      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
      const updated = { ...existing };
      for (const id of planIds) {
        if (!updated[id]) {
          updated[id] = { startedAt: new Date().toISOString().slice(0, 10), completedDays: [], lastDay: 0 };
        }
      }
      localStorage.setItem('dw_activeplans', JSON.stringify(updated));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
    }
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
    // Force re-render of plan passages
    window.location.reload();
  };

  const handleSetupDismiss = () => {
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
  };


  const filteredBooks = BIBLE_BOOKS.filter(book =>
    book.toLowerCase().includes(bookPickerSearch.toLowerCase())
  );

  // (A&J devotional now handled by getTodaysDevotion() — single source for entire site)

  // All active plans with progress — used for home page plan strip
  // planTick dependency ensures this recomputes after start/remove
  const homeActivePlans = (() => {
    void planTick;
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const bp: Record<string, { currentChapter: number; totalChapters: number }> =
        JSON.parse(localStorage.getItem('dw_book_plans') || '{}');
      return Object.entries(ap).map(([pid, prog]) => {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) return null;
        const completedCount = plan.bookId && bp[plan.bookId]
          ? bp[plan.bookId].currentChapter + 1
          : prog.completedDays.length;
        return { plan, completedCount };
      }).filter(Boolean) as { plan: typeof PLAN_CATALOGUE[0]; completedCount: number }[];
    } catch { return []; }
  })();

  // Start a plan directly from home screen
  const startPlanFromHome = (planId: string) => {
    try {
      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      if (existing[planId]) return; // already active
      existing[planId] = { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 };
      localStorage.setItem('dw_activeplans', JSON.stringify(existing));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}

      // If this is a book plan, also initialize dw_book_plans so progress tracking works
      const planDef = PLAN_CATALOGUE.find(p => p.id === planId);
      if (planDef?.bookId && planDef.bookJsonFile) {
        const bookPlans: Record<string, { jsonFile: string; title: string; author: string; currentChapter: number; totalChapters: number; startedAt: string }> =
          (() => { try { return JSON.parse(localStorage.getItem('dw_book_plans') || '{}'); } catch { return {}; } })();
        if (!bookPlans[planDef.bookId]) {
          const _bLang = getLang();
          const _bLangSuffix = _bLang !== 'en' ? `_${_bLang}` : '';
          bookPlans[planDef.bookId] = {
            jsonFile: planDef.bookJsonFile.replace('.json', `${_bLangSuffix}.json`),
            title: planDef.title,
            author: 'Ps Ashley Evans',
            currentChapter: 0,
            totalChapters: planDef.totalDays,
            startedAt: new Date().toISOString(),
          };
          localStorage.setItem('dw_book_plans', JSON.stringify(bookPlans));
          try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
        }
      }

      setPlanTick(t => t + 1); // trigger re-render
    } catch {}
  };

  const removePlanFromHome = (planId: string) => {
    try {
      const existing: Record<string, unknown> = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      delete existing[planId];
      localStorage.setItem('dw_activeplans', JSON.stringify(existing));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}

      // Also clean up book plan data if applicable
      const planDef = PLAN_CATALOGUE.find(p => p.id === planId);
      if (planDef?.bookId) {
        const bookPlans: Record<string, unknown> =
          (() => { try { return JSON.parse(localStorage.getItem('dw_book_plans') || '{}'); } catch { return {}; } })();
        delete bookPlans[planDef.bookId];
        localStorage.setItem('dw_book_plans', JSON.stringify(bookPlans));
        try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
        localStorage.removeItem(`dw_book_today_${planDef.bookId}`);
      }

      setPlanTick(t => t + 1); // trigger re-render
    } catch {}
  };

  // ── Hero chapter refs — all today's passages expanded to full chapter level (memoized) ──
  const expandChapterRef = useCallback((ref: string) => ref.replace(/:\d+(-\d+)?$/, '').trim(), []);
  const heroChapterRefs = useMemo(() => {
    const refs = [
      ...todaysPlanPassages.map(p => expandChapterRef(p.passage)),
      ...readingSlots
        .slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length))
        .map(s => `${s.book} ${s.currentChapter}`),
    ];
    const unique = refs.filter((r, i, arr) => Boolean(r) && arr.indexOf(r) === i);
    // Fallback: if no plan/slot refs, use today's daily passages so Listen always works
    if (unique.length === 0 && passages.length > 0) {
      return passages.map(p => p.passage).filter(Boolean);
    }
    return unique;
  }, [todaysPlanPassages, readingSlots, chaptersPerDay, passages, expandChapterRef]);
  const heroKey = heroChapterRefs.join('|');

  // Pre-load all today's chapter texts (for read view and audio)
  useEffect(() => {
    if (!heroKey) return;
    setHeroLoading(true);
    Promise.all(heroChapterRefs.map(ref => fetchPassage(ref, translation).catch(() => '')))
      .finally(() => setHeroLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroKey]);

  // ── Hero multi-chapter sequential playback with chapter tracking ──
  const heroQueueRef = useRef<string[]>([]);
  const heroQueueActiveRef = useRef(false);
  const [heroChapterIndex, setHeroChapterIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('dw_hero_chapter_idx');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const [audioPaused, setAudioPaused] = useState(false);
  const heroChapterIndexRef = useRef(heroChapterIndex);

  useEffect(() => {
    heroChapterIndexRef.current = heroChapterIndex;
    try { localStorage.setItem('dw_hero_chapter_idx', String(heroChapterIndex)); } catch {}
  }, [heroChapterIndex]);

  useEffect(() => {
    return AP.onStateChange((st) => {
      setAudioPaused(st === 'paused');
    });
  }, []);

  const playChapterAtIndex = async (index: number) => {
    if (index < 0 || index >= heroChapterRefs.length) {
      heroQueueActiveRef.current = false;
      return;
    }
    setHeroChapterIndex(index);
    const ref = heroChapterRefs[index];
    const cacheKey = HERO_KEY + ref;
    try {
      let src = audioSrcCache.current.get(cacheKey);
      if (!src) {
        // Always fetch ESV text for audio, regardless of selected translation
        const text = await fetchPassage(ref, 'ESV').catch(() => '');
        if (text) {
          src = await AP.fetchAudioSrc(text, 'ESV', ref) ?? undefined;
          if (src) audioSrcCache.current.set(cacheKey, src);
        }
      }
      if (src) {
        AP.resetForChain(); // clear any stale stop flag before chaining
        // Register the "wait for end" listener BEFORE starting playback
        // so we never miss the idle transition
        const waitForEnd = new Promise<void>(resolve => {
          let sawPlaying = false;
          const unsub = AP.onStateChange((st) => {
            // Ignore the immediate callback — only track transitions
            if (st === 'playing' || st === 'loading') sawPlaying = true;
            if (sawPlaying && st === 'idle') {
              unsub();
              if (AP.wasStopRequested()) heroQueueActiveRef.current = false;
              resolve();
            }
          });
        });
        await AP.playUrl(HERO_KEY, src);
        // Now wait for this chapter's audio to finish
        await waitForEnd;
        if (heroQueueActiveRef.current) {
          playChapterAtIndex(index + 1);
        }
      } else {
        if (heroQueueActiveRef.current) {
          playChapterAtIndex(index + 1);
        }
      }
    } catch {
      if (heroQueueActiveRef.current) {
        playChapterAtIndex(index + 1);
      }
    }
  };

  const handleHeroListen = async () => {
    AP.unlock(); // must be synchronous in tap handler

    // Ignore taps while audio is loading — prevents duplicate requests
    if (AP.isLoading()) return;

    setAudioError(false);

    // If paused, resume — optimistic UI update for instant response
    if (AP.isPaused(HERO_KEY)) {
      setAudioPaused(false);
      setAudioPlaying(true);
      AP.resume();
      return;
    }

    // Toggle pause if playing — optimistic UI update
    if (AP.isPlaying(HERO_KEY)) {
      setAudioPaused(true);
      setAudioPlaying(false);
      AP.pause();
      return;
    }

    if (audioPlaying) AP.stop();
    if (heroChapterRefs.length === 0) return;

    // Start from saved chapter index (or 0 if out of range)
    const startIdx = heroChapterIndexRef.current < heroChapterRefs.length
      ? heroChapterIndexRef.current : 0;
    heroQueueActiveRef.current = true;

    try {
      await playChapterAtIndex(startIdx);
    } catch { setAudioError(true); }
  };

  // Select a chapter without starting audio (tapped on chapter pill or slider when idle)
  const handleHeroSelect = (index: number) => {
    setHeroChapterIndex(index);
  };

  // Skip to a specific chapter AND play it (only used when audio is already active)
  const handleHeroSkipTo = (index: number) => {
    AP.unlock();
    setAudioError(false);
    if (audioPlaying || audioPaused) AP.resetForChain();
    heroQueueActiveRef.current = true;
    playChapterAtIndex(index).catch(() => setAudioError(true));
  };

  /** Render scripture text with tappable words when Gk/Heb mode is active */
  const renderScripture = (text: string, passage: string) => {
    if (!greekHebrewMode) return text;
    // Split preserving whitespace tokens
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      if (/^\s+$/.test(token)) return token;
      const word = token.replace(/[^a-zA-Z']/g, '');
      if (!word) return token;
      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            // Open BibleAI with word study context
            trackBehavior('greek_hebrew', `${word} in ${passage}`);
            setBibleAIContext(`Please explain the original Greek or Hebrew meaning of the word "${word}" as it appears in ${passage}. Include the Strongs number if known, the original language word, its transliteration, definition, and how it enriches understanding of this verse.`);
            setShowBibleAI(true);
          }}
          style={{
            cursor: 'pointer',
            borderBottom: '1px dotted #9A7B2E',
            paddingBottom: 1,
            borderRadius: 2,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(154,123,46,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <div className="screen-container">
      {showSetupModal && (
        <SetupPromptModal
          onComplete={handleSetupComplete}
          onDismiss={handleSetupDismiss}
        />
      )}
      {/* Click-away overlay for header dropdowns */}
      {(showHeaderPersona || showHeaderCampus || showHeaderLanguage) && (
        <div
          onClick={() => { setShowHeaderPersona(false); setShowHeaderCampus(false); setShowHeaderLanguage(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
      )}
      <div style={{ padding: '0 24px 0' }}>
        {/* ── Hero viewport ── fills visible screen (compact when sermon tab active) */}
        <div style={{
          minHeight: (sundaySermon && homeTab === 'sermon') ? 'auto' : 'calc(100svh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: (sundaySermon && homeTab === 'sermon') ? 'flex-start' : 'center',
          paddingTop: 20,
          paddingBottom: (sundaySermon && homeTab === 'sermon') ? 16 : 64,
          position: 'relative',
        }}>

        {/* Header — compact, sits above the centered hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Back button — only shown when there's navigation history */}
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', display: 'flex', alignItems: 'center', gap: 2,
                  color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)',
                }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {/* {t('bible_ai')} button — burnished gold + glass */}
            <button
              onClick={() => { setBibleAIContext(''); setShowBibleAI(true); }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                height: 44,
                borderRadius: 11,
                background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
                backgroundSize: '200% 200%',
                animation: 'aiAurora 4s ease infinite',
                border: '1px solid rgba(245,207,85,0.55)',
                boxShadow: '0 3px 18px rgba(160,110,8,0.65), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.22)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {/* Glass top-catch highlight */}
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '46%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)',
                borderRadius: '11px 11px 0 0',
                pointerEvents: 'none',
              }} />
              {/* Burnished shimmer sweep */}
              <span style={{
                position: 'absolute', top: 0, bottom: 0, width: '55%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%)',
                animation: 'aiBeam 3s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: '#fff',
                fontFamily: "'SF Pro Display', 'system-ui', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                position: 'relative',
                textShadow: '0 1px 3px rgba(80,40,0,0.6)',
              }}>{t('bible_ai')}</span>
            </button>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--dw-text-primary)',
                letterSpacing: '-0.02em',
              }}>
                Daily Word
              </h1>
              {/* Persona + Campus dropdowns — compact row under title */}
              <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                {/* Persona dropdown trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowHeaderPersona(!showHeaderPersona); setShowHeaderCampus(false); setShowHeaderLanguage(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {(() => { const _pc = PERSONA_CONFIGS[personaConfig.persona]; const _l = getLang(); return (_l === 'id' && _pc?.labelId) ? _pc.labelId : _pc?.label || 'Select Path'; })()}
                    <ChevronDown size={10} style={{ opacity: 0.6 }} />
                  </button>
                  {showHeaderPersona && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4,
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 10, padding: 4, zIndex: 100,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      minWidth: 200,
                    }}>
                      {ALL_PERSONAS.map(p => {
                        const cfg = PERSONA_CONFIGS[p];
                        const isActive = personaConfig.persona === p;
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              if (!isActive) {
                                saveSetup({ persona: p, source: setup?.source || 'header' });
                              onNavigate?.('plans');
                              }
                              setShowHeaderPersona(false);
                            }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '8px 12px', borderRadius: 8,
                              background: isActive ? 'var(--dw-accent)' : 'transparent',
                              color: isActive ? '#fff' : 'var(--dw-text-primary)',
                              border: 'none', cursor: 'pointer',
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              fontFamily: 'var(--font-sans)',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{cfg.label}</span>
                            <span style={{
                              display: 'block', fontSize: 11, marginTop: 1,
                              color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--dw-text-muted)',
                            }}>
                              {cfg.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <span style={{ color: 'var(--dw-border)', fontSize: 10 }}>·</span>

                {/* Campus dropdown trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowHeaderCampus(!showHeaderCampus); setShowHeaderPersona(false); setShowHeaderLanguage(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    📍 {currentCampus?.name?.replace('Futures ', '') || t('select_campus')}
                    <ChevronDown size={10} style={{ opacity: 0.6 }} />
                  </button>
                  {showHeaderCampus && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4,
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 10, padding: 4, zIndex: 100,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      minWidth: 220, maxHeight: 320, overflowY: 'auto',
                    }}>
                      {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
                        const regionCampuses = CAMPUSES.filter(c => c.region === region);
                        if (regionCampuses.length === 0) return null;
                        return (
                          <div key={region}>
                            <p style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                              textTransform: 'uppercase', color: 'var(--dw-text-muted)',
                              padding: '6px 12px 2px', margin: 0,
                              fontFamily: 'var(--font-sans)',
                            }}>
                              {region}
                            </p>
                            {regionCampuses.map(c => {
                              const isActive = userProfile?.campus === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    handleCampusSelect(c.id);
                                    setShowHeaderCampus(false);
                                  }}
                                  style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '7px 12px', borderRadius: 8,
                                    background: isActive ? 'var(--dw-accent)' : 'transparent',
                                    color: isActive ? '#fff' : 'var(--dw-text-primary)',
                                    border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                                    fontFamily: 'var(--font-sans)',
                                  }}
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <span style={{ color: 'var(--dw-border)', fontSize: 10 }}>·</span>

                {/* Language dropdown trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowHeaderLanguage(!showHeaderLanguage); setShowHeaderPersona(false); setShowHeaderCampus(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {APP_LANGUAGES.find(l => l.code === appLanguage)?.label || 'English'}
                    <ChevronDown size={10} style={{ opacity: 0.6 }} />
                  </button>
                  {showHeaderLanguage && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 10, padding: 4, zIndex: 100,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      minWidth: 160,
                    }}>
                      {APP_LANGUAGES.map(lang => {
                        const isActive = lang.code === appLanguage;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setAppLanguage(lang.code);
                              localStorage.setItem('dw_lang', lang.code);
                              // Auto-switch Bible translation to match language
                              const langTranslations: Record<string, string> = { en: 'ESV', es: 'RV1960', pt: 'ARA', id: 'TB' };
                              if (langTranslations[lang.code]) {
                                localStorage.setItem('dw_translation', langTranslations[lang.code]);
                                localStorage.removeItem('dw_translation_manual');
                              }
                              setShowHeaderLanguage(false);
                              window.location.reload();
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                              padding: '8px 12px', borderRadius: 8,
                              background: isActive ? 'var(--dw-accent)' : 'transparent',
                              color: isActive ? '#fff' : 'var(--dw-text-primary)',
                              border: 'none', cursor: 'pointer',
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{lang.flag}</span>
                            {lang.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Streak display — clean counter (hidden for new_to_faith + comfort to avoid pressure) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {personaConfig.persona !== 'new_to_faith' && personaConfig.persona !== 'comfort' && streakCount > 0 && (() => {
              const encouragement: [number, string][] = [
                [1,   'Welcome back.'],
                [2,   'Two in a row.'],
                [3,   'Building a habit.'],
                [5,   'Five days strong.'],
                [7,   'One week!'],
                [10,  'Ten days.'],
                [14,  'Two weeks!'],
                [21,  'Three weeks.'],
                [30,  'One month!'],
                [40,  'Forty days.'],
                [60,  'Two months!'],
                [90,  'Three months.'],
                [100, 'One hundred days!'],
                [180, 'Half a year!'],
                [365, 'One full year!'],
              ];
              const label = [...encouragement].reverse().find(([n]) => streakCount >= n)?.[1] ?? null;
              const isMilestone = streakCount >= 7;
              return (
                <div
                  onClick={() => isMilestone && setShowMilestone(streakCount)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    cursor: isMilestone ? 'pointer' : 'default',
                    gap: 1,
                  }}
                  onPointerDown={e => isMilestone && (e.currentTarget.style.opacity = '0.7')}
                  onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{
                    fontSize: 17, fontWeight: 800, lineHeight: 1,
                    color: 'var(--dw-text)',
                    fontFamily: 'var(--font-sans)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.03em',
                  }}>
                    {streakCount} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--dw-text-muted)', letterSpacing: 0 }}>days</span>
                  </span>
                  {label && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, lineHeight: 1,
                      color: 'var(--dw-text-muted)',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.01em',
                      animation: 'fadeIn 0.5s ease',
                    }}>
                      {label}
                    </span>
                  )}
                </div>
              );
            })()}
            <ThemeToggle />
          </div>
        </div>

        {/* ── Hero Listen Button — the hero, sits directly under Daily Word header ── */}
        {sundaySermon && homeTab === 'sermon' && (() => {
          const firstPlan = todaysPlanPassages[0];
          const firstSlot = readingSlots[0];
          const hasAnyPassage = heroChapterRefs.length > 0 || firstPlan || firstSlot || primaryPassage;
          if (!hasAnyPassage) return null;

          const allLabels = heroChapterRefs.length > 0
            ? heroChapterRefs
            : [firstPlan ? expandChapterRef(firstPlan.passage) : firstSlot ? `${firstSlot.book} ${firstSlot.currentChapter}` : primaryPassage || ''];
          const planLabel = firstPlan ? `${firstPlan.planTitle} — Day ${firstPlan.dayNum}` : null;
          const isPlayingHero = audioPlaying && audioCurrentPassage === HERO_KEY;
          const isPausedHero = audioPaused && audioCurrentPassage === HERO_KEY;
          const isLoadingHero = (audioLoading && audioCurrentPassage === HERO_KEY) || heroLoading;

          return (
            <div
              key="hero-listen-sermon-tab"
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                marginTop: 16,
                marginBottom: 20,
                boxShadow: '0 24px 64px rgba(168,50,59,0.22), 0 6px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.13)',
              }}
            >
              {/* Animated wave gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(145deg, #FF3B52 0%, #D42F44 12%, #8B1A26 28%, #3A0810 48%, #6B1A22 62%, #B83040 78%, #E84858 92%, #D42F44 100%)',
                backgroundSize: '350% 350%',
                animation: 'heroColorWave 5s ease infinite',
              }} />
              {/* Glass highlight */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.22) 100%)',
              }} />
              {/* Shimmer sweep */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 24 }}>
                <div style={{
                  position: 'absolute', top: '-60%', bottom: '-60%', width: '55%',
                  background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.18) 52%, rgba(255,255,255,0.04) 70%, transparent 100%)',
                  animation: 'heroShimmerSweep 3.5s ease-in-out infinite',
                  animationDelay: '0.8s',
                }} />
              </div>
              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55, fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {planLabel || "Today's Reading"}
                  </p>
                  <p style={{ fontSize: 10, fontWeight: 500, opacity: 0.45, fontFamily: 'var(--font-sans)', margin: 0, letterSpacing: '0.04em' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 20px 20px' }}>
                  <button
                    className="hero-play-btn"
                    onClick={() => handleHeroListen()}
                    style={{
                      width: 88, height: 88, borderRadius: '50%',
                      background: isPlayingHero ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)',
                      border: '2px solid rgba(255,255,255,0.35)',
                      boxShadow: isPlayingHero
                        ? '0 0 0 14px rgba(255,255,255,0.07), 0 0 0 28px rgba(255,255,255,0.03), 0 10px 32px rgba(0,0,0,0.4)'
                        : '0 10px 32px rgba(0,0,0,0.35)',
                      animation: isPlayingHero ? 'heroRingPulse 2.2s ease-in-out infinite' : 'heroIdlePulse 3.5s ease-in-out infinite',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                      transition: 'box-shadow 0.4s ease, background 0.2s ease',
                      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                      marginBottom: 16, flexShrink: 0,
                    }}
                  >
                    {isLoadingHero
                      ? <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                      : isPlayingHero && !isPausedHero
                      ? <Pause size={32} />
                      : <Play size={32} style={{ marginLeft: 4 }} />
                    }
                  </button>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', fontFamily: 'var(--font-sans)', letterSpacing: '0.01em', textAlign: 'center' }}>
                    {isLoadingHero ? t('loading_label')
                      : (isPlayingHero || isPausedHero) && allLabels.length > 1
                      ? (isPausedHero ? t('paused_label') + ' — ' : '') + (allLabels[heroChapterIndex] || allLabels[0])
                      : isPlayingHero ? allLabels[heroChapterIndex] || t('now_playing')
                      : isPausedHero ? t('paused_label')
                      : t('listen_now')}
                  </p>
                  <p style={{ fontSize: 13, opacity: 0.68, margin: 0, fontFamily: 'var(--font-sans)', textAlign: 'center', maxWidth: '88%', lineHeight: 1.4 }}>
                    {(isPlayingHero || isPausedHero) && allLabels.length > 1
                      ? `${heroChapterIndex + 1} of ${allLabels.length}`
                      : allLabels.join(' · ')}
                  </p>
                  <p style={{ fontSize: 10, opacity: 0.4, margin: '5px 0 0', fontFamily: 'var(--font-sans)', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('esv_human_reader')}
                  </p>
                </div>
              </div>
              {/* Chapter navigator — slider + pills (sermon tab) */}
              {allLabels.length > 1 && (
                <div style={{ position: 'relative', zIndex: 1, color: '#fff', padding: '0 16px 12px' }}>
                  <div style={{ padding: '0 4px', margin: '0 0 6px' }}>
                    <input
                      className="hero-range-slider"
                      type="range" min={0} max={allLabels.length - 1} value={heroChapterIndex}
                      onChange={(e) => { const idx = parseInt(e.target.value, 10); if (idx !== heroChapterIndex) { (audioPlaying || audioPaused) ? handleHeroSkipTo(idx) : handleHeroSelect(idx); } }}
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(255,255,255,0.18) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(255,255,255,0.18) 100%)`,
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-sans)', margin: '0 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {`Chapter ${heroChapterIndex + 1} of ${allLabels.length}`}
                  </p>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 2px', WebkitOverflowScrolling: 'touch' }}>
                    {allLabels.map((label, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); (audioPlaying || audioPaused) ? handleHeroSkipTo(i) : handleHeroSelect(i); }}
                        style={{
                          flexShrink: 0, padding: '8px 14px', borderRadius: 16, cursor: 'pointer',
                          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '0.02em',
                          border: i === heroChapterIndex ? '2px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(255,255,255,0.15)',
                          background: i === heroChapterIndex ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.04)',
                          color: i === heroChapterIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.2s ease',
                        }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Stop button (sermon tab) */}
              {(isPlayingHero || isPausedHero) && (
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
                  <button onClick={(e) => { e.stopPropagation(); AP.stop(); heroQueueActiveRef.current = false; setHeroChapterIndex(0); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 20px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.04em',
                    }}
                  >
                    <Square size={12} fill="currentColor" />
                    Stop
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Sunday Service Banner — prominent link to interactive sermon notes ── */}
        {sundaySermon && (
          <button
            onClick={() => onNavigate?.('messages')}
            style={{
              width: '100%', minHeight: 64, marginBottom: 20,
              background: 'linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%)',
              border: 'none', borderRadius: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '16px 20px',
              boxShadow: '0 4px 16px rgba(123,31,162,0.3)',
            }}
          >
            <BookOpen size={22} color="#fff" />
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.2 }}>
                {t('sunday_service')}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>
                {t('tap_notes')}
              </p>
            </div>
          </button>
        )}

        {/* ── Sunday Sermon Tab Bar ── */}
        {sundaySermon && (
          <div style={{
            display: 'flex', gap: 0, marginBottom: 20,
            background: 'var(--dw-surface)', borderRadius: 12, padding: 4,
            border: '1px solid var(--dw-border)',
          }}>
            {([['sermon', 'Sermon Notes'], ['word', 'Daily Word']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setHomeTab(key)} style={{
                flex: 1, padding: '11px 0',
                background: 'transparent',
                color: homeTab === key ? '#fff' : 'var(--dw-text-muted)',
                border: 'none', borderRadius: 9, cursor: 'pointer',
                fontSize: 14, fontWeight: homeTab === key ? 700 : 500, fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s ease',
              }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Sunday Sermon View (full inline when tab active) ── */}
        {sundaySermon && homeTab === 'sermon' && (() => {
          const sermon = sundaySermon;
          return (
            <div style={{ paddingBottom: 120 }}>
              {/* Key verse banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(154,123,46,0.10) 0%, rgba(107,26,34,0.06) 100%)',
                border: '1px solid rgba(154,123,46,0.25)',
                borderRadius: 14, padding: '20px 18px', marginBottom: 28,
              }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'var(--dw-accent)', marginBottom: 8, textTransform: 'uppercase' as const }}>
                  {sermon.series || 'This Week'}
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--dw-text)', lineHeight: 1.3, marginBottom: 8 }}>
                  {sermon.title}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--dw-text-muted)', marginBottom: 12 }}>
                  {sermon.speaker}
                </p>
                <p style={{ fontFamily: 'var(--font-serif-text, var(--font-serif))', fontSize: 15, fontStyle: 'italic', color: 'var(--dw-text-secondary)', lineHeight: 1.7 }}>
                  {sermon.keyVerseText}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, marginTop: 6 }}>
                  {sermon.keyVerse}
                </p>
                <div style={{ marginTop: 12 }}>
                  <ListenButton text={sermon.plainText} size="lg" label="Listen to Sermon" />
                </div>
              </div>

              {/* Sermon sections */}
              {sermon.sections.map((section, idx) => (
                <div key={idx} style={{ marginBottom: 36 }}>
                  {section.heading && (
                    <h2 style={{
                      fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600,
                      color: 'var(--dw-text)', marginBottom: 12, lineHeight: 1.3,
                    }}>
                      {section.heading}
                    </h2>
                  )}

                  {section.body && (
                    <p style={{
                      fontFamily: 'var(--font-serif-text, var(--font-serif))', fontSize: 16,
                      color: 'var(--dw-text-secondary)', lineHeight: 1.85, marginBottom: 14,
                      whiteSpace: 'pre-line',
                    }}>
                      {section.body}
                    </p>
                  )}

                  {section.points && section.points.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {section.points.map((point, pi) => (
                        <div key={pi} style={{
                          display: 'flex', gap: 12, marginBottom: 10,
                          paddingLeft: 4, borderLeft: '3px solid #9A7B2E',
                          paddingTop: 2, paddingBottom: 2,
                        }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--dw-accent)', minWidth: 18 }}>
                            {pi + 1}.
                          </span>
                          <span style={{ fontFamily: 'var(--font-serif-text, var(--font-serif))', fontSize: 15, color: 'var(--dw-text-secondary)', lineHeight: 1.7 }}>
                            {point}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.scripture && (
                    <div style={{
                      borderLeft: '3px solid #9A7B2E',
                      background: 'rgba(154,123,46,0.04)',
                      padding: '14px 16px', borderRadius: '0 10px 10px 0',
                      marginBottom: 14,
                    }}>
                      <p style={{
                        fontFamily: 'var(--font-serif-text, var(--font-serif))', fontSize: 15,
                        fontStyle: 'italic', color: 'var(--dw-text-secondary)', lineHeight: 1.75,
                        whiteSpace: 'pre-line',
                      }}>
                        {section.scripture}
                      </p>
                      {section.scriptureRef && (
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, marginTop: 8 }}>
                          {section.scriptureRef}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Always-open note area under every section ── */}
                  <textarea
                    placeholder={t('your_notes_placeholder')}
                    value={inlineNotes[idx] || ''}
                    onChange={e => {
                      updateInlineNote(idx, e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.max(e.target.scrollHeight, 100) + 'px';
                    }}
                    onFocus={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.max(e.target.scrollHeight, 100) + 'px';
                    }}
                    style={{
                      width: '100%', minHeight: 100, marginTop: 14,
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 12, padding: '14px 16px',
                      color: 'var(--dw-text-primary)', fontSize: 15,
                      fontFamily: 'var(--font-sans)', outline: 'none',
                      resize: 'none', boxSizing: 'border-box',
                      lineHeight: 1.7,
                    }}
                  />

                  {/* Section divider */}
                  {idx < sermon.sections.length - 1 && (
                    <div style={{ borderBottom: '1px solid var(--dw-border)', marginTop: 32, opacity: 0.5 }} />
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Regular Daily Word content (hidden when sermon tab active) ── */}
        {(!sundaySermon || homeTab === 'word') && (<>

        {/* ── Persona Greeting with Search Button ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            color: 'var(--dw-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
            letterSpacing: '0.01em',
            flex: 1,
          }}>
            {greetingText}
          </p>
          {pf.searchEnabled && (
            <button
              aria-label="Search"
              onClick={() => setShowSearch(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--dw-text-muted)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dw-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dw-text-muted)')}
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* ── {t('font_size')} Controls ── */}
        <FontSizeControls
          fontSize={scriptureFontSize}
          min={FONT_MIN}
          max={FONT_MAX}
          onIncrease={handleFontIncrease}
          onDecrease={handleFontDecrease}
        />

        {/* ── Hero Listen Button ── shown when NOT on sermon tab (sermon tab has its own hero) */}
        {!(sundaySermon && homeTab === 'sermon') && (() => {
          const firstPlan = todaysPlanPassages[0];
          const firstSlot = readingSlots[0];
          const hasAnyPassage = heroChapterRefs.length > 0 || firstPlan || firstSlot || primaryPassage;
          if (!hasAnyPassage) return null;

          const allLabels = heroChapterRefs.length > 0
            ? heroChapterRefs
            : [firstPlan ? expandChapterRef(firstPlan.passage) : firstSlot ? `${firstSlot.book} ${firstSlot.currentChapter}` : primaryPassage || ''];
          const planLabel = firstPlan ? `${firstPlan.planTitle} — Day ${firstPlan.dayNum}` : null;
          const isPlayingHero = audioPlaying && audioCurrentPassage === HERO_KEY;
          const isPausedHero = audioPaused && audioCurrentPassage === HERO_KEY;
          const isLoadingHero = (audioLoading && audioCurrentPassage === HERO_KEY) || heroLoading;

          return (
            <div
              key="hero-listen"
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 20,
                boxShadow: '0 24px 64px rgba(168,50,59,0.22), 0 6px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.13)',
              }}
            >
              {/* ── Layer 1: animated wave gradient — deep crimson rolls through near-black ── */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(145deg, #FF3B52 0%, #D42F44 12%, #8B1A26 28%, #3A0810 48%, #6B1A22 62%, #B83040 78%, #E84858 92%, #D42F44 100%)',
                backgroundSize: '350% 350%',
                animation: 'heroColorWave 5s ease infinite',
              }} />

              {/* ── Layer 2: glass highlight top edge + depth at bottom ── */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.22) 100%)',
              }} />

              {/* ── Layer 3: rolling shimmer sweep — wide bright band ── */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 24,
              }}>
                <div style={{
                  position: 'absolute', top: '-60%', bottom: '-60%', width: '55%',
                  background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.18) 52%, rgba(255,255,255,0.04) 70%, transparent 100%)',
                  animation: 'heroShimmerSweep 3.5s ease-in-out infinite',
                  animationDelay: '0.8s',
                }} />
                {/* Secondary slower sweep for layered depth */}
                <div style={{
                  position: 'absolute', top: '-60%', bottom: '-60%', width: '30%',
                  background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.08) 60%, transparent 100%)',
                  animation: 'heroShimmerSweep 5.5s ease-in-out infinite',
                  animationDelay: '2.4s',
                }} />
              </div>

              {/* ── Content ── */}
              <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>

                {/* Top meta bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px 0',
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', opacity: 0.55,
                    fontFamily: 'var(--font-sans)', margin: 0,
                  }}>
                    {planLabel || "Today's Reading"}
                  </p>
                  <p style={{
                    fontSize: 10, fontWeight: 500, opacity: 0.45,
                    fontFamily: 'var(--font-sans)', margin: 0, letterSpacing: '0.04em',
                  }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Big play button — centered */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '22px 20px 20px',
                }}>
                  <button
                    className="hero-play-btn"
                    onClick={() => handleHeroListen()}
                    style={{
                      width: 88, height: 88, borderRadius: '50%',
                      background: isPlayingHero
                        ? 'rgba(255,255,255,0.22)'
                        : 'rgba(255,255,255,0.16)',
                      border: '2px solid rgba(255,255,255,0.35)',
                      boxShadow: isPlayingHero
                        ? '0 0 0 14px rgba(255,255,255,0.07), 0 0 0 28px rgba(255,255,255,0.03), 0 10px 32px rgba(0,0,0,0.4)'
                        : '0 10px 32px rgba(0,0,0,0.35)',
                      animation: isPlayingHero
                        ? 'heroRingPulse 2.2s ease-in-out infinite'
                        : 'heroIdlePulse 3.5s ease-in-out infinite',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                      transition: 'box-shadow 0.4s ease, background 0.2s ease',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      marginBottom: 16,
                      flexShrink: 0,
                    }}
                  >
                    {isLoadingHero
                      ? <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                      : isPlayingHero
                      ? <Pause size={32} />
                      : <Play size={32} style={{ marginLeft: 4 }} />
                    }
                  </button>

                  <p style={{
                    fontSize: 15, fontWeight: 700, margin: '0 0 6px',
                    fontFamily: 'var(--font-sans)', letterSpacing: '0.01em', textAlign: 'center',
                  }}>
                    {isLoadingHero ? t('loading_label')
                      : (isPlayingHero || isPausedHero) && allLabels.length > 1
                      ? (isPausedHero ? t('paused_label') + ' — ' : '') + (allLabels[heroChapterIndex] || allLabels[0])
                      : isPlayingHero ? allLabels[heroChapterIndex] || t('now_playing')
                      : isPausedHero ? t('paused_label')
                      : t('listen_now')}
                  </p>

                  <p style={{
                    fontSize: 13, opacity: 0.68, margin: 0,
                    fontFamily: 'var(--font-sans)', textAlign: 'center',
                    maxWidth: '88%', lineHeight: 1.4,
                  }}>
                    {(isPlayingHero || isPausedHero) && allLabels.length > 1
                      ? `${heroChapterIndex + 1} of ${allLabels.length}`
                      : allLabels.join(' · ')}
                  </p>
                  <p style={{
                    fontSize: 10, opacity: 0.4, margin: '5px 0 0',
                    fontFamily: 'var(--font-sans)', textAlign: 'center',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {t('esv_human_reader')}
                  </p>
                </div>

                {/* ── Chapter navigator — large slider + tappable chapter pills ── */}
                {allLabels.length > 1 && (
                  <div style={{ padding: '0 16px 12px' }}>
                    {/* Range slider — thick, touch-friendly, draggable */}
                    <div style={{ padding: '0 4px', margin: '0 0 6px' }}>
                      <input
                        className="hero-range-slider"
                        type="range"
                        min={0}
                        max={allLabels.length - 1}
                        value={heroChapterIndex}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          if (idx !== heroChapterIndex) { (audioPlaying || audioPaused) ? handleHeroSkipTo(idx) : handleHeroSelect(idx); }
                        }}
                        style={{
                          background: `linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(255,255,255,0.18) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(255,255,255,0.18) 100%)`,
                        }}
                      />
                    </div>
                    {/* Chapter counter */}
                    <p style={{
                      fontSize: 10, fontWeight: 600, textAlign: 'center',
                      opacity: 0.5, fontFamily: 'var(--font-sans)', margin: '0 0 8px',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {`Chapter ${heroChapterIndex + 1} of ${allLabels.length}`}
                    </p>
                    {/* Chapter pills — large, tappable */}
                    <div style={{
                      display: 'flex', gap: 6, overflowX: 'auto',
                      scrollbarWidth: 'none', padding: '0 2px',
                      WebkitOverflowScrolling: 'touch',
                    }}>
                      {allLabels.map((label, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); (audioPlaying || audioPaused) ? handleHeroSkipTo(i) : handleHeroSelect(i); }}
                          style={{
                            flexShrink: 0, padding: '10px 16px',
                            minHeight: 44,
                            borderRadius: 16, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            letterSpacing: '0.02em',
                            border: i === heroChapterIndex
                              ? '2px solid rgba(255,255,255,0.9)'
                              : '1.5px solid rgba(255,255,255,0.15)',
                            background: i === heroChapterIndex
                              ? 'rgba(255,255,255,0.35)'
                              : 'rgba(255,255,255,0.04)',
                            color: i === heroChapterIndex
                              ? '#fff'
                              : 'rgba(255,255,255,0.45)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Stop button — visible when audio is active ── */}
                {(isPlayingHero || isPausedHero) && (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); AP.stop(); heroQueueActiveRef.current = false; setHeroChapterIndex(0); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 20px', borderRadius: 20,
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Square size={12} fill="currentColor" />
                      Stop
                    </button>
                  </div>
                )}

                {/* Error message */}
                {audioError && audioCurrentPassage === HERO_KEY && (
                  <p style={{
                    fontSize: 11, color: 'rgba(255,180,180,0.9)', textAlign: 'center',
                    fontFamily: 'var(--font-sans)', margin: '0 20px 10px',
                  }}>
                    {t('audio_unavailable')}
                  </p>
                )}

                {/* Hairline divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />

                {/* Footer: Read + Translation picker */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '2px 8px 2px',
                }}>
                  {/* Read button */}
                  <button
                    onClick={() => handleRead(heroChapterRefs[0] || '')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px 8px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: expandedPassages.has(heroChapterRefs[0] || '') ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                      letterSpacing: '0.03em', transition: 'color 0.2s ease',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <BookOpen size={13} />
                    {expandedPassages.has(heroChapterRefs[0] || '') ? t('hide_reading') : t('read_btn')}
                  </button>

                  {/* Translation picker — horizontal scrollable pills */}
                  <div style={{
                    flex: 2, display: 'flex', alignItems: 'center', gap: 5,
                    overflowX: 'auto', padding: '10px 12px',
                    scrollbarWidth: 'none',
                  }}>
                    {(personaConfig.persona === 'new_to_faith' ? NEW_FAITH_TRANSLATIONS
                      : personaConfig.persona === 'congregation' ? CONGREGATION_TRANSLATIONS
                      : TRANSLATIONS).map(t => (
                      <button
                        key={t}
                        onClick={() => handleTranslationChange(t)}
                        style={{
                          flexShrink: 0,
                          padding: '4px 9px',
                          borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: t === translation ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
                          background: t === translation ? 'rgba(255,255,255,0.22)' : 'transparent',
                          color: t === translation ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Compare button (only for deeper_study and pastor_leader) */}
                  {personaConfig.features.greekHebrew === 'full' && (
                    <button
                      onClick={() => setCompareMode(!compareMode)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: compareMode ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
                        background: compareMode ? 'rgba(255,255,255,0.22)' : 'transparent',
                        color: compareMode ? '#fff' : 'rgba(255,255,255,0.5)',
                        marginLeft: 'auto',
                        marginRight: 8,
                      }}
                    >
                      Compare
                    </button>
                  )}
                </div>

                {/* Compare translation selector (shown when compare mode active) */}
                {compareMode && personaConfig.features.greekHebrew === 'full' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    overflowX: 'auto', padding: '6px 12px',
                    scrollbarWidth: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)', marginRight: 4 }}>Compare:</span>
                    {TRANSLATIONS.map(t => (
                      <button
                        key={`compare-${t}`}
                        onClick={() => setCompareTranslation(t)}
                        style={{
                          flexShrink: 0,
                          padding: '4px 9px',
                          borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: t === compareTranslation ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
                          background: t === compareTranslation ? 'rgba(255,255,255,0.22)' : 'transparent',
                          color: t === compareTranslation ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Pastor/Study Onboarding — RIGHT after the hero, before everything else ── */}
        {personaConfig.sectionOrder.includes('plan_scripture') && (() => {
          const isPastor = personaConfig.persona === 'pastor_leader';

          // Fully completed — never show again
          if (pastorOnboardStep === -2) {
            return null;
          }

          // Dismissed (said "Later") — show gentle re-entry
          if (pastorOnboardStep === -1) {
            return (
              <Card style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  {isPastor ? "Ready when you are. Let's set up your reading." : "Whenever you're ready to set up your reading, we're here."}
                </p>
                <button
                  onClick={() => setPastorOnboardStep(0)}
                  style={{ background: 'var(--dw-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-sans)' }}
                >
                  Let's Go
                </button>
              </Card>
            );
          }

          // ── PASTOR: Step 0 ──
          if (pastorOnboardStep === 0 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                    Let's get you set up.
                  </p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch {} }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Later</button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', margin: '0 0 18px', lineHeight: 1.6 }}>
                  You've got commentary, Greek/Hebrew tools, word studies, and sermon prep built in. First, let's get the right reading plan locked in.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => setPastorOnboardStep(1)} style={{
                    padding: '16px 18px', borderRadius: 14, background: 'var(--dw-accent)', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>Help me pick the right plan</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Three quick questions</p>
                  </button>
                  <button onClick={() => {
                    setPastorOnboardStep(-2);
                    try {
                      localStorage.setItem('dw_pastor_onboard_completed', '1');
                      localStorage.setItem('dw_pastor_onboard_dismissed', '1');
                      localStorage.setItem('dw_setup_dismissed', '1');
                    } catch {}
                    onNavigate?.('plans');
                  }} style={{
                    padding: '14px 16px', borderRadius: 14, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>I already know what I want</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Go straight to plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 1 — What's the priority? ──
          if (pastorOnboardStep === 1 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                    What's the priority right now?
                  </p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  This helps us match you with the right plan and tools.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'personal', label: t('setup_personal_time'), sub: t('setup_personal_desc'), next: 10 },
                    { id: 'depth', label: t('setup_deep_study'), sub: t('setup_deep_desc'), next: 11 },
                    { id: 'rhythm', label: t('setup_rhythm'), sub: t('setup_rhythm_desc'), next: 12 },
                    { id: 'prep', label: t('setup_read_ahead'), sub: t('setup_read_ahead_desc'), next: 13 },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPastorOnboardStep(opt.next)} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 10 — Personal ──
          if (pastorOnboardStep === 10 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>Where do you want to spend time?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick one. You can always change it later.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'psalms-30', label: 'Psalms', sub: '30 days. One Psalm a day.' },
                    { plan: 'gospel-john', label: 'Gospel of John', sub: '21 days. One chapter a day.' },
                    { plan: 'wisdom-lit', label: 'Wisdom Literature', sub: 'Proverbs, Ecclesiastes, Job — 60 days.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } window.location.reload(); }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 11 — Deep study ──
          if (pastorOnboardStep === 11 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>What do you want to study?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>You'll get full commentary, Greek/Hebrew tools, and word studies with all of these.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'nt-60', label: 'New Testament in 60 days', sub: 'Entire NT in 60 days. 4–5 chapters a day.' },
                    { plan: 'through-bible-year', label: 'Through the Bible in a year', sub: 'Genesis to Revelation. 365 days.' },
                    { plan: 'wisdom-lit', label: 'Wisdom Literature', sub: 'Proverbs, Ecclesiastes, Song of Solomon, Job. 60 days.' },
                    { plan: 'psalms-proverbs', label: 'Psalms & Proverbs', sub: 'One of each, daily.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } window.location.reload(); }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 12 — Rhythm ──
          if (pastorOnboardStep === 12 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>How much time are you working with?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick the pace that fits your schedule. A plan you finish beats a plan you quit.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'gospel-john', label: '5–10 minutes', sub: 'Gospel of John — 1 chapter a day, 21 days.' },
                    { plan: 'acts-28', label: '10–15 minutes', sub: 'Acts — 1 chapter a day, 28 days.' },
                    { plan: 'gospels-acts', label: '15–20 minutes', sub: 'Gospels & Acts — 2 chapters a day.' },
                    { plan: 'nt-60', label: '20+ minutes', sub: 'Entire New Testament in 60 days. 4–5 chapters a day.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } window.location.reload(); }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 13 — Preaching ──
          if (pastorOnboardStep === 13 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>What are you preaching through?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick the closest match. Full commentary, word studies, and cross-references come with every plan.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'gospels-acts', label: 'Gospels & Acts', sub: 'Matthew through Acts. Life of Jesus, birth of the church.' },
                    { plan: 'nt-60', label: 'Full New Testament', sub: 'Romans through Revelation. 60 days.' },
                    { plan: 'psalms-proverbs', label: 'Psalms & Proverbs', sub: 'One of each, daily. Good for a wisdom series.' },
                    { plan: 'book-church', label: 'The Church Awakening', sub: "Ps A's book on purpose and identity of the church." },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } window.location.reload(); }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                  <button onClick={() => { onNavigate?.('plans'); }} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--dw-border)', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>Browse all plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── DEEPER_STUDY (non-pastor): Step 0 ──
          if (pastorOnboardStep === 0 && !isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>Let's set up your study.</p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch {} }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Later</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 16px', lineHeight: 1.5 }}>Pick a reading plan and you'll get full commentary, word studies, and Greek/Hebrew tools alongside every passage.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => setPastorOnboardStep(2)} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--dw-accent)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>Help me choose a plan</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>We'll recommend one based on your pace</p>
                  </button>
                  <button onClick={() => {
                    setPastorOnboardStep(-2);
                    try {
                      localStorage.setItem('dw_pastor_onboard_completed', '1');
                      localStorage.setItem('dw_pastor_onboard_dismissed', '1');
                      localStorage.setItem('dw_setup_dismissed', '1');
                    } catch {}
                    onNavigate?.('plans');
                  }} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>I know what I want</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Go straight to the plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── DEEPER_STUDY: Step 2 — curated picker ──
          if (pastorOnboardStep === 2) {
            const recommendedPlans = PLAN_CATALOGUE.filter(p => !p.bookId && ['Gospels & Acts', 'New Testament', 'Full Bible', 'Wisdom'].includes(p.category)).slice(0, 6);
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>Here are a few we'd recommend.</p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick one and you're in. You can always switch later.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recommendedPlans.map(plan => (
                    <button key={plan.id} onClick={() => { startPlanFromHome(plan.id); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } window.location.reload(); }} style={{
                      padding: '12px 14px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{tField(plan, 'title', lang)}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{tField(plan, 'description', lang).slice(0, 80)}…</p>
                    </button>
                  ))}
                  <button onClick={() => { onNavigate?.('plans'); }} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--dw-border)', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>Browse all plans →</p>
                  </button>
                </div>
              </Card>
            );
          }

          return null;
        })()}

        {/* Comfort Verse Banner — comfort persona only */}
        {personaConfig.sectionOrder.includes('comfort_verse_banner') && <ComfortVerseBannerSection persona={personaConfig.persona} />}

        {/* Poll banner — right under the hero audio card (persona-gated) */}
        {pf.pollBanner && <FeedbackPoll userCampus={userProfile?.campus} />}

        {/* AI Prompt Section — multi-persona */}

      {/* Blue Faith Pathway Banner for New Christians */}
      {pf.faithPathway && pathwayProgress.enrolled && pathwayData && (
        <div
          onClick={() => {
            const el = document.getElementById('pathway-lesson-card');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (onNavigate) {
              onNavigate('plans');
            }
          }}
          style={{
            margin: '12px 0',
            padding: '20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%)',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '20%', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.85)', marginBottom: '6px', textTransform: 'uppercase' }}>YOUR FAITH JOURNEY</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>
            Day {pathwayProgress.currentDay} of {pathwayData.days?.length || 40}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '0 0 12px 0' }}>
            {pathwayData.days?.find(d => d.day === pathwayProgress.currentDay)?.title || 'Your next lesson is ready'}
          </p>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '100px', height: '6px', marginBottom: '8px' }}>
            <div style={{ background: '#fff', height: '100%', borderRadius: '100px', width: `${Math.round(((pathwayProgress.currentDay - 1) / (pathwayData.days?.length || 40)) * 100)}%`, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              {pathwayProgress.currentDay === 1 ? 'Just getting started' : `${pathwayProgress.completedDays?.length || 0} days completed`}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Continue \u2192</span>
          </div>
        </div>
      )}
        {personaConfig.sectionOrder.includes('ai_prompt') && <BibleAIPromptSection onOpenAI={onOpenAI || (() => {})} persona={personaConfig.persona} />}

        {/* Comfort Card — comfort persona only */}
        {pf.comfortCard && <ComfortCard />}

        {/* Book Cards — surfaces recommended books, tapping starts the reading plan */}
        {pf.bookCards.length > 0 && (
          <div style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 12, scrollbarWidth: 'none' }}>
            {pf.bookCards.map((bookId: string) => {
              const bookInfo: Record<string, { title: string; description: string; color: string; planId?: string }> = {
                'grace-and-truth': { title: 'Grace & Truth', description: 'Biblical foundations for living', color: '#6B4C8A' },
                'no-more-fear': { title: 'No More Fear', description: 'Living boldly in faith', color: '#2E6B5A', planId: 'book-no-more-fear' },
              };
              const info = bookInfo[bookId] || { title: bookId, description: '', color: '#6B1A22' };

              // Check if the plan is already active
              const activePlans: Record<string, unknown> = (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
              const isActive = info.planId ? !!activePlans[info.planId] : false;

              return (
                <div
                  key={bookId}
                  onClick={() => {
                    if (info.planId && !isActive) {
                      startPlanFromHome(info.planId);
                      setPlanTick(t => t + 1);
                      window.location.reload();
                    } else {
                      // No specific plan — go to Plans tab to browse
                      onNavigate?.('plans');
                    }
                  }}
                  style={{
                    minWidth: 180,
                    background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`,
                    borderRadius: 16,
                    padding: '20px 16px',
                    color: '#fff',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                    {isActive ? 'READING NOW' : 'RECOMMENDED'}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                    {info.title}
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.8, fontFamily: 'var(--font-sans)' }}>
                    {isActive ? 'Tap to continue reading' : info.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Upgrade Prompt — "Ready for More?" ── */}
        <UpgradePromptCard
          persona={setup?.persona || 'congregation'}
          onUpgrade={(newPersona) => {
            saveSetup({ persona: newPersona, source: setup?.source || '' });
            window.location.reload();
          }}
        />

        {/* ── Start Your Journey — inline plan picker for users with no plans ── */}
        {(() => {
          const activePlans: Record<string, unknown> = (() => {
            try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; }
          })();
          const hasPlans = Object.keys(activePlans).length > 0;
          if (hasPlans) return null;

          // Use persona config to filter plans
          const featuredCats = personaConfig.plans.featuredCategories;
          const recommendedPlans = personaConfig.plans.showFullCatalog
            ? PLAN_CATALOGUE.slice(0, 4)
            : PLAN_CATALOGUE.filter(p => featuredCats.includes(p.category)).slice(0, 4);
          if (recommendedPlans.length === 0) return null;

          return (
            <div style={{
              background: 'var(--dw-surface)',
              border: '2px solid var(--dw-accent)',
              borderRadius: 16,
              padding: '20px 18px',
              marginBottom: 20,
            }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 19,
                color: 'var(--dw-text-primary)',
                marginBottom: 4,
                textAlign: 'center',
              }}>
                Start Your Journey
              </p>
              <p style={{
                fontSize: 13,
                color: 'var(--dw-text-muted)',
                fontFamily: 'var(--font-sans)',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Pick a plan to begin your daily reading
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommendedPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
                        (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
                      existing[plan.id] = { startedAt: new Date().toISOString().slice(0, 10), completedDays: [], lastDay: 0 };
                      localStorage.setItem('dw_activeplans', JSON.stringify(existing));
                      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
                      localStorage.setItem('dw_setup_dismissed', '1');
                      window.location.reload();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: 'var(--dw-canvas)',
                      border: '1px solid var(--dw-border)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s',
                    }}
                  >
                    <BookOpen size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {tField(plan, 'title', lang)}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                        {plan.totalDays} days · {tField(plan, 'description', lang).slice(0, 60)}{tField(plan, 'description', lang).length > 60 ? '…' : ''}
                      </p>
                    </div>
                    <Plus size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSetupModal(true)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--dw-accent)',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  padding: '12px 0 0',
                  textAlign: 'center',
                }}
              >
                Browse all plans →
              </button>
            </div>
          );
        })()}

          {/* Scroll invitation — not an arrow, just a breath */}
          <div style={{
            position: 'absolute', bottom: 12, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--dw-text-muted)',
              fontFamily: 'var(--font-sans)', opacity: 1,
            }}>
              {t('todays_reflection')}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--dw-text-muted)',
                  opacity: 0.25 + i * 0.15,
                }} />
              ))}
            </div>
          </div>
        {/* Persona greeting + picker moved to Settings */}

        {/* -- FAITH PATHWAY CARD -- for new_returning persona */}
        {pf.faithPathway && personaConfig.sectionOrder.includes('devotion') && pathwayProgress.enrolled && pathwayData && (() => {
          /* Only show this compact pathway card for personas that ALSO have the devotion section.
             new_to_faith gets the full plan-based lesson card above instead. */
          const completed = pathwayProgress.completedDays?.length || 0;
          const currentDay = pathwayProgress.currentDay || 1;
          const today = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
          const totalDays = pathwayData.days?.length || 40;
          const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
            : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
            : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
            : pathwayData.title;

          if (completed >= totalDays) {
            return (
              <div
                onClick={() => onNavigate?.('plans')}
                style={{
                  background: 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
                  color: 'white',
                  padding: 20,
                  borderRadius: 16,
                  marginBottom: 16,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9, marginBottom: 6 }}>
                  Journey Complete
                </div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  You've completed {pathTitle}! Tap to explore other plans.
                </div>
              </div>
            );
          }

          const todayTitle = today
            ? (lang === 'es' ? (today.titleEs || today.title)
              : lang === 'pt' ? (today.titlePt || today.title)
              : lang === 'id' ? (today.titleId || today.title)
              : today.title)
            : '';
          const todayTheme = today
            ? (lang === 'es' ? (today.themeEs || today.theme)
              : lang === 'pt' ? (today.themePt || today.theme)
              : lang === 'id' ? (today.themeId || today.theme)
              : today.theme)
            : '';

          return (
            <div
              onClick={() => {
                // Mark the current day as complete, advance to next
                if (today) {
                  const newCompleted = pathwayProgress.completedDays.includes(currentDay)
                    ? pathwayProgress.completedDays
                    : [...pathwayProgress.completedDays, currentDay];
                  const nextDay = Math.min(totalDays, Math.max(...newCompleted, currentDay) + 1);
                  savePathwayProgress({ ...pathwayProgress, completedDays: newCompleted, currentDay: nextDay });
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8 }}>
                  {pathTitle}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {completed} of {totalDays} completed
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
                Today's Lesson: {todayTitle}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                {todayTheme}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(completed / totalDays) * 100}%`,
                    height: '100%',
                    background: '#D4A574',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D4A574' }}>
                  Continue Journey &rarr;
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sermon Notes Banner - disabled */}

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '20px 0',
          background: 'var(--dw-charcoal-deep)',
          borderRadius: 14,
          padding: '14px 8px',
        }}>
          <button
            onClick={() => setDayOffset(d => d - 1)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('previous_day')}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#fff', marginBottom: 4 }}>{t('todays_reading')}</p>
            <p style={{ color: '#fff', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {dateStr}
            </p>
            {todaysPlanPassages.length > 0 && (
              <p style={{ color: '#fff', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 4, lineHeight: 1.5 }}>
                {(() => {
                  // Deduplicate by planId so each plan shows once
                  const seen = new Set<string>();
                  const plans: { title: string; dayNum: number; passages: string[] }[] = [];
                  todaysPlanPassages.forEach(p => {
                    if (seen.has(p.planId)) {
                      plans[plans.length - 1].passages.push(p.passage);
                    } else {
                      seen.add(p.planId);
                      plans.push({ title: p.planTitle, dayNum: p.dayNum, passages: [p.passage] });
                    }
                  });
                  return plans.map(p =>
                    `Day ${p.dayNum} of ${p.title} · ${p.passages.join(', ')}`
                  ).join(' | ');
                })()}
              </p>
            )}
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            disabled={dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: dayOffset >= 30 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: dayOffset >= 30 ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('next_day')}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Listen bar removed — hero card handles audio. Scripture search moved to Study tab. */}

        {/* Devotion of the Day — A&J devotionals, single source, with emoji reactions merged in */}
        {personaConfig.sectionOrder.includes('devotion') && <Card
          style={{ marginBottom: 16, cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' }}
          onClick={() => {
            trackBehavior('devotion_tapped', 'ashley-jane');
            setSelection({ text: `${tField(todaysDevotion, 'title', lang)}\n\n${tField(todaysDevotion, 'body', lang)}`, verseRefs: [todaysDevotion.verse || ''], source: 'tap' });
          }}
        >
          <h2 className="text-section-header" style={{ marginBottom: 8 }}>DEVOTION OF THE DAY</h2>
          <p className="text-card-title" style={{ marginBottom: 6 }}>{tField(todaysDevotion, 'title', lang)}</p>
          <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
            {todaysDevotion.verse}
          </p>
          <p className="text-devotion" style={{ fontSize: scriptureFontSize + 2 }}>{tField(todaysDevotion, 'body', lang)}</p>
          <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600, marginTop: 10, fontFamily: 'var(--font-sans)' }}>
            — {todaysDevotion.author}
          </p>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Emoji reactions — inline on devotion */}
            {dayOffset === 0 && (
              todayReaction ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 20 }}>{todayReaction}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-text-muted)' }}>
                    {t(REACTIONS.find(r => r.emoji === todayReaction)?.labelKey || '')}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  {REACTIONS.map(({ emoji }) => (
                    <button key={emoji} onClick={(e) => {
                      e.stopPropagation();
                      saveTodayReaction(emoji);
                      setTodayReaction(emoji);
                      trackBehavior('reaction', emoji);
                    }} style={{
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 18,
                      transition: 'all 0.15s ease',
                    }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )
            )}
            {!dayOffset && <div />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={(e) => {
                e.stopPropagation();
                shareContent({
                  title: `Daily Word — ${tField(todaysDevotion, 'title', lang)}`,
                  text: `${tField(todaysDevotion, 'title', lang)}\n\n${tField(todaysDevotion, 'body', lang).substring(0, 200)}...\n\n— Futures Daily Word`,
                  url: 'https://futuresdailyword.com'
                });
              }} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s ease',
              }}>
                <Share2 size={14} /> Share
              </button>
              <ListenButton text={`${tField(todaysDevotion, 'title', lang)}. ${tField(todaysDevotion, 'body', lang)}`} size="md" label="Listen" />
            </div>
          </div>
          {/* Community reaction counts */}
          {dayOffset === 0 && (() => {
            const daySeed = new Date().toDateString();
            const hash = Array.from(daySeed).reduce((a, c) => a + c.charCodeAt(0), 0);
            const heartCount = 12 + (hash % 30);
            const thinkCount = 5 + (hash % 15);
            const prayCount = 20 + (hash % 40);
            return (
              <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 8, marginBottom: 0 }}>
                ❤️ {heartCount} · 🤔 {thinkCount} · 🙏 {prayCount}
              </p>
            );
          })()}
        </Card>}

        {/* ── Comfort Scripture — auto-served, no decisions required ── */}
        {personaConfig.sectionOrder.includes('comfort_scripture') && (() => {
          const comfortPassage = COMFORT_CHAPTERS[comfortChapterIndex % COMFORT_CHAPTERS.length];
          const comfortTKey = `${comfortPassage}_${translation}`;
          const comfortText = passageTexts[comfortTKey];
          const comfortIsLoading = loadingPassages.has(comfortPassage);
          const comfortIsPlaying = audioPlaying && audioCurrentPassage === comfortPassage;
          const comfortIsLoadingAudio = audioLoading && audioCurrentPassage === comfortPassage;

          return (
            <div style={{ marginBottom: 16 }}>
              {/* Current comfort chapter — auto-loaded */}
              <Card style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 className="text-section-header" style={{ margin: 0 }}>A WORD FOR YOU TODAY</h2>
                  <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Take your time
                  </span>
                </div>

                {/* Translation picker — simple, 3 options */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {COMFORT_TRANSLATIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => handleTranslationChange(t)}
                      style={{
                        padding: '5px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em', cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: t === translation ? '1.5px solid #5C6BC0' : '1.5px solid var(--dw-border)',
                        background: t === translation ? '#5C6BC0' : 'transparent',
                        color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Chapter heading + listen */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {comfortPassage}
                  </p>
                  <button
                    onClick={() => handleListen(comfortPassage)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: comfortIsPlaying ? '#4A5AB0' : '#5C6BC0',
                      border: 'none', borderRadius: 10, padding: '8px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: '#fff', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {comfortIsLoadingAudio ? (
                      <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                    ) : comfortIsPlaying ? (
                      <><Pause size={14} /> Pause</>
                    ) : (
                      <><Headphones size={14} /> Listen</>
                    )}
                  </button>
                </div>

                {/* Scripture text — auto-loaded */}
                {comfortIsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                    <Loader2 size={14} style={{ color: '#5C6BC0', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading…</span>
                  </div>
                ) : comfortText ? (
                  <ScripturePassage
                    text={comfortText}
                    passageRef={comfortPassage}
                    renderScripture={renderScripture}
                    greekHebrewMode={greekHebrewMode}
                    fontSize={scriptureFontSize}
                  />
                ) : (
                  <button
                    onClick={() => loadPassage(comfortPassage)}
                    style={{
                      background: 'rgba(92,107,192,0.1)', border: '1px solid #5C6BC0',
                      borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', color: '#5C6BC0', fontFamily: 'var(--font-sans)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <BookOpen size={16} /> Read {comfortPassage}
                  </button>
                )}

                {/* Sit with this — gentle reflection */}
                {comfortText && comfortPostRead === null && (
                  <div style={{
                    marginTop: 16, padding: '14px 16px',
                    background: 'linear-gradient(135deg, rgba(92,107,192,0.08) 0%, rgba(92,107,192,0.03) 100%)',
                    borderRadius: 10,
                    border: '1px solid rgba(92,107,192,0.12)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: '0 0 14px', fontStyle: 'italic' }}>
                      Which words brought you the most peace?
                    </p>
                    <button
                      onClick={() => {
                        setComfortChaptersServed(prev => prev + 1);
                        setComfortPostRead('devotion');
                      }}
                      style={{
                        background: '#5C6BC0', border: 'none', borderRadius: 10,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      I've finished reading
                    </button>
                  </div>
                )}
              </Card>

              {/* Post-read devotion — encouraging reflection from the chapter */}
              {comfortPostRead === 'devotion' && (() => {
                const devotion = COMFORT_DEVOTIONS[comfortPassage];
                if (!devotion) {
                  // No devotion for this chapter, skip to ask_more
                  setComfortPostRead(comfortChaptersServed >= 2 ? 'ask_lock' : 'ask_more');
                  return null;
                }
                return (
                  <Card style={{
                    marginTop: 12,
                    padding: '20px 18px',
                    background: 'linear-gradient(135deg, rgba(92,107,192,0.06) 0%, rgba(92,107,192,0.02) 100%)',
                    border: '1px solid rgba(92,107,192,0.12)',
                  }}>
                    <p style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#5C6BC0',
                      fontFamily: 'var(--font-sans)', marginBottom: 10,
                    }}>
                      A THOUGHT FROM THIS CHAPTER
                    </p>
                    <p style={{
                      fontSize: 17, fontWeight: 700, color: 'var(--dw-text-primary)',
                      fontFamily: 'var(--font-serif)', marginBottom: 10, lineHeight: 1.4,
                    }}>
                      {tField(devotion, 'title', lang)}
                    </p>
                    <p style={{
                      fontSize: 15, lineHeight: 1.75, color: 'var(--dw-text-secondary)',
                      fontFamily: 'var(--font-serif-text, Georgia, serif)',
                      margin: '0 0 16px',
                    }}>
                      {tField(devotion, 'body', lang)}
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                      <ListenButton text={`${tField(devotion, 'title', lang)}. ${tField(devotion, 'body', lang)}`} size="md" label="Listen" />
                    </div>
                    <button
                      onClick={() => setComfortPostRead(comfortChaptersServed >= 2 ? 'ask_lock' : 'ask_more')}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 10,
                        background: '#5C6BC0', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Continue
                    </button>
                  </Card>
                );
              })()}

              {/* Post-read flow — gentle multiple choice */}
              {comfortPostRead === 'ask_more' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '20px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 14 }}>
                    Would you like to read another passage from God's Word?
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setComfortChapterIndex(prev => (prev + 1) % COMFORT_CHAPTERS.length);
                        setComfortPostRead(null);
                      }}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#5C6BC0', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Yes, keep going
                    </button>
                    <button
                      onClick={() => setComfortPostRead('done')}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      That's enough for today
                    </button>
                  </div>
                </Card>
              )}

              {comfortPostRead === 'ask_lock' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '20px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
                    You're doing great.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 16, lineHeight: 1.5 }}>
                    Would you like to set a daily reading amount so we can have something ready for you each day?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 260, margin: '0 auto' }}>
                    {[
                      { n: 1, label: t('chapters_1'), sub: t('chapters_1_desc') },
                      { n: 2, label: t('chapters_2'), sub: t('chapters_2_desc') },
                      { n: 3, label: t('chapters_3'), sub: t('chapters_3_desc') },
                    ].map(opt => (
                      <button
                        key={opt.n}
                        onClick={() => {
                          setComfortDailyAmount(opt.n);
                          try { localStorage.setItem('dw_comfort_daily', String(opt.n)); } catch {}
                          setComfortPostRead('done');
                        }}
                        style={{
                          padding: '12px 16px', borderRadius: 10,
                          background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{opt.sub}</p>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setComfortChapterIndex(prev => (prev + 1) % COMFORT_CHAPTERS.length);
                        setComfortPostRead(null);
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: 10,
                        background: '#5C6BC0', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Just give me one more for now
                    </button>
                    <button
                      onClick={() => setComfortPostRead('done')}
                      style={{
                        padding: '8px 16px', borderRadius: 10,
                        background: 'transparent', border: 'none',
                        fontSize: 13, cursor: 'pointer',
                        color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      I'm good for today
                    </button>
                  </div>
                </Card>
              )}

              {comfortPostRead === 'done' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '16px' }}>
                  <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, fontStyle: 'italic' }}>
                    {comfortDailyAmount > 0
                      ? `You're set for ${comfortDailyAmount} chapter${comfortDailyAmount > 1 ? 's' : ''} a day. We'll have something ready for you tomorrow.`
                      : 'God is with you. Come back whenever you need Him.'}
                  </p>
                </Card>
              )}
            </div>
          );
        })()}

        {/* ── Devotion-Connected Scripture Reading (congregation) ── */}
        {personaConfig.sectionOrder.includes('devotion_scripture') && todaysDevotion.verse && (() => {
          const devPassage = todaysDevotion.verse; // e.g. "2 Timothy 1"
          const isComfort = personaConfig.persona === 'comfort';
          const devScriptureTranslations: TranslationCode[] = isComfort
            ? ['ESV', 'NIV', 'NLT']
            : ['ESV', 'NIV', 'NLT', 'KJV', 'NKJV'];
          const tKey = `${devPassage}_${translation}`;
          const passageText = passageTexts[tKey];
          const isLoading = loadingPassages.has(devPassage);
          const isPlayingThis = audioPlaying && audioCurrentPassage === devPassage;
          const isLoadingAudio = audioLoading && audioCurrentPassage === devPassage;

          return (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>
                  {isComfort ? "TODAY'S SCRIPTURE" : t('todays_reading')}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {isComfort ? 'Read at your own pace' : 'From today\'s devotion'}
                </span>
              </div>

              {/* Translation picker */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {devScriptureTranslations.map(t => (
                  <button
                    key={t}
                    onClick={() => handleTranslationChange(t)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: t === translation ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                      background: t === translation ? 'var(--dw-accent)' : 'transparent',
                      color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Chapter heading + listen */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {devPassage}
                </p>
                <button
                  onClick={() => handleListen(devPassage)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                    border: 'none', borderRadius: 10, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: '#fff', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isLoadingAudio ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                  ) : isPlayingThis ? (
                    <><Pause size={14} /> Pause</>
                  ) : (
                    <><Headphones size={14} /> Listen</>
                  )}
                </button>
              </div>

              {/* Scripture text */}
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                  <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                </div>
              ) : passageText ? (
                <ScripturePassage
                  text={passageText}
                  passageRef={devPassage}
                  renderScripture={renderScripture}
                  greekHebrewMode={greekHebrewMode}
                  fontSize={scriptureFontSize}
                />
              ) : (
                <button
                  onClick={() => loadPassage(devPassage)}
                  style={{
                    background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                    borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <BookOpen size={16} /> Read {devPassage}
                </button>
              )}

              {/* Reflection prompt */}
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: isComfort ? 'linear-gradient(135deg, rgba(92,107,192,0.08) 0%, rgba(92,107,192,0.03) 100%)' : 'var(--dw-charcoal)',
                borderRadius: 10,
                border: isComfort ? '1px solid rgba(92,107,192,0.15)' : '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isComfort ? 'Sit with this' : 'Reflect'}
                </p>
                <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: 0, fontStyle: 'italic' }}>
                  {isComfort
                    ? 'Which words brought you the most peace today?'
                    : 'What stood out to you in today\'s reading?'}
                </p>
              </div>
            </Card>
          );
        })()}

        {/* ── Plan-Driven Scripture (deeper_study / pastor_leader) — full depth tools ── */}
        {personaConfig.sectionOrder.includes('plan_scripture') && (() => {
          if (todaysPlanPassages.length === 0) {
            return null; // Onboarding is rendered above (after hero)
          }


          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>TODAY'S STUDY</h2>
                {/* Greek/Hebrew mode toggle */}
                {pf.greekHebrew === 'full' && (
                  <button
                    onClick={() => setGreekHebrewMode(!greekHebrewMode)}
                    style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer',
                      border: greekHebrewMode ? '1.5px solid #9A7B2E' : '1.5px solid var(--dw-border)',
                      background: greekHebrewMode ? 'rgba(154,123,46,0.2)' : 'transparent',
                      color: greekHebrewMode ? '#9A7B2E' : 'var(--dw-text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {greekHebrewMode ? 'Greek/Hebrew ON' : 'Tap for Greek/Hebrew'}
                  </button>
                )}
              </div>

              {todaysPlanPassages.map(({ planId, planTitle, passage, dayNum }) => {
                const tKey = `${passage}_${translation}`;
                const txt = passageTexts[tKey];
                const isLoading = loadingPassages.has(passage);
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingAudio = audioLoading && audioCurrentPassage === passage;

                return (
                  <Card key={planId + '_' + passage} style={{ marginBottom: 12 }}>
                    {/* Plan + Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {planTitle} — Day {dayNum}
                      </span>
                    </div>

                    {/* Chapter heading + listen */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {passage}
                      </p>
                      <button
                        onClick={() => handleListen(passage)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none', borderRadius: 10, padding: '8px 14px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: '#fff', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {isLoadingAudio ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                        ) : isPlayingThis ? (
                          <><Pause size={14} /> Pause</>
                        ) : (
                          <><Headphones size={14} /> Listen</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text — with word-tap for Greek/Hebrew */}
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                      </div>
                    ) : txt ? (
                      <>
                        <ScripturePassage
                          text={txt}
                          passageRef={passage}
                          renderScripture={renderScripture}
                          greekHebrewMode={greekHebrewMode}
                          fontSize={scriptureFontSize}
                        />

                        {/* Compare translation (when active) */}
                        {compareMode && pf.greekHebrew === 'full' && (() => {
                          const cKey = `${passage}_${compareTranslation}`;
                          const cText = compareTexts[cKey];
                          return (
                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--dw-border)' }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                                {compareTranslation}
                              </p>
                              {cText ? (
                                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--dw-text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: 0 }}>
                                  {cText}
                                </p>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                                  <Loader2 size={12} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                                  <span style={{ fontSize: 13, color: 'var(--dw-text-muted)' }}>Loading {compareTranslation}…</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <button
                        onClick={() => loadPassage(passage)}
                        style={{
                          background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                          borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <BookOpen size={16} /> Read {passage}
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* ── Pastoral Reflection Prompt (pastor_leader) ── */}
        {personaConfig.sectionOrder.includes('pastoral_prompt') && (() => {
          const prompts = personaConfig.journal.prompts;
          if (!prompts || prompts.length === 0) return null;
          const promptIdx = getDayNumber(dayOffset) % prompts.length;
          const todayPrompt = prompts[promptIdx];

          return (
            <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--dw-charcoal), var(--dw-charcoal-deep))' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Between You & God
              </p>
              <p style={{
                fontSize: 16, lineHeight: 1.5, color: 'var(--dw-text-primary)',
                fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'italic', margin: 0,
              }}>
                {todayPrompt}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('dw_journal_prefill', JSON.stringify({
                        prompt: todayPrompt,
                        date: new Date().toISOString().slice(0, 10),
                        type: 'pastoral-reflection',
                      }));
                    } catch {}
                    onNavigate?.('journal');
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: 'var(--dw-accent)', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: '#fff', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Journal This
                </button>
                <button
                  onClick={() => {
                    setBibleAIContext(`I'm a pastor reflecting on my day. The prompt was: "${todayPrompt}" — I'd like to talk through what's on my heart.`);
                    setShowBibleAI(true);
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--dw-border)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Talk It Through
                </button>
              </div>
            </Card>
          );
        })()}

        {/* ── Plan-based lesson card for new_to_faith (replaces devotion) ── */}
        {!personaConfig.sectionOrder.includes('devotion') && pf.faithPathway && pathwayProgress.enrolled && pathwayData && (() => {
          const currentDay = pathwayProgress.currentDay || 1;
          const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
          if (!dayData) return null;
          const completed = pathwayProgress.completedDays?.length || 0;
          const totalDays = pathwayData.days?.length || 40;
          const dayTitle = lang === 'es' ? (dayData.titleEs || dayData.title)
            : lang === 'pt' ? (dayData.titlePt || dayData.title)
            : lang === 'id' ? (dayData.titleId || dayData.title)
            : dayData.title;
          const dayTheme = lang === 'es' ? (dayData.themeEs || dayData.theme)
            : lang === 'pt' ? (dayData.themePt || dayData.theme)
            : lang === 'id' ? (dayData.themeId || dayData.theme)
            : dayData.theme;
          const dayLesson = lang === 'es' ? ((dayData as any).lessonEs || (dayData as any).lesson)
            : lang === 'pt' ? ((dayData as any).lessonPt || (dayData as any).lesson)
            : lang === 'id' ? ((dayData as any).lessonId || (dayData as any).lesson)
            : (dayData as any).lesson;
          const dayReading = (dayData as any).reading;
          const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
            : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
            : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
            : pathwayData.title;
          const isCompleted = pathwayProgress.completedDays.includes(currentDay);

          return (
            <Card style={{ marginBottom: 16 }}>
              {/* Header: plan name + progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>
                  {t('day_label')} {currentDay} {t('of_label')} {totalDays}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {pathTitle}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                  width: `${(completed / totalDays) * 100}%`,
                  height: '100%',
                  background: 'var(--dw-accent)',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
              {/* Lesson title & theme */}
              <p className="text-card-title" style={{ marginBottom: 4 }}>{dayTitle}</p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
                {dayTheme}
              </p>
              {/* Scripture reference */}
              {dayReading?.ref && (
                <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  📖 {dayReading.ref}
                </p>
              )}
              {/* Full lesson text */}
              {dayLesson && (
                <p className="text-devotion" style={{ whiteSpace: 'pre-line', fontSize: scriptureFontSize + 2 }}>{dayLesson}</p>
              )}
              {/* Actions row */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={() => {
                    if (!isCompleted) {
                      const newCompleted = [...pathwayProgress.completedDays, currentDay];
                      const nextDay = Math.min(totalDays, currentDay + 1);
                      savePathwayProgress({ ...pathwayProgress, completedDays: newCompleted, currentDay: nextDay });
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: isCompleted ? 'var(--dw-surface)' : 'var(--dw-accent)',
                    color: isCompleted ? 'var(--dw-text-muted)' : '#fff',
                    border: isCompleted ? '1px solid var(--dw-border)' : 'none',
                    borderRadius: 10,
                    cursor: isCompleted ? 'default' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isCompleted ? '✓ Completed' : t('mark_complete')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => {
                    shareContent({
                      title: `Day ${currentDay}: ${dayTitle}`,
                      text: `${dayTitle}\n\n${(dayLesson || '').substring(0, 200)}...\n\n— Futures Daily Word`,
                      url: 'https://futuresdailyword.com'
                    });
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                    background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                    borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                  }}>
                    <Share2 size={14} /> Share
                  </button>
                  {dayLesson && <ListenButton text={`Day ${currentDay}. ${dayTitle}. ${dayLesson}`} size="md" label="Listen" />}
                </div>
              </div>

              {/* ── Scripture Reading for this day ── */}
              {dayReading && (() => {
                const fullChapter = `${dayReading.book} ${dayReading.chapter}`;
                const tKey = `${fullChapter}_${translation}`;
                const passageText = passageTexts[tKey];
                const isLoading = loadingPassages.has(fullChapter);
                const isPlayingThis = audioPlaying && audioCurrentPassage === fullChapter;
                const isLoadingAudio = audioLoading && audioCurrentPassage === fullChapter;

                return (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--dw-border)' }}>
                    <h2 className="text-section-header" style={{ marginBottom: 10 }}>{t('todays_reading')}</h2>

                    {/* Translation picker — ESV, NIV, NLT only */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {NEW_FAITH_TRANSLATIONS.map(t => (
                        <button
                          key={t}
                          onClick={() => handleTranslationChange(t)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 20,
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            letterSpacing: '0.04em',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: t === translation ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                            background: t === translation ? 'var(--dw-accent)' : 'transparent',
                            color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Chapter heading + listen */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {fullChapter}
                      </p>
                      <button
                        onClick={() => handleListen(fullChapter)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none', borderRadius: 10, padding: '8px 14px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: '#fff', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {isLoadingAudio ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                        ) : isPlayingThis ? (
                          <><Pause size={14} /> Pause</>
                        ) : (
                          <><Headphones size={14} /> Listen</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text */}
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                      </div>
                    ) : passageText ? (
                      <ScripturePassage
                        text={passageText}
                        passageRef={fullChapter}
                        renderScripture={renderScripture}
                        greekHebrewMode={greekHebrewMode}
                        fontSize={scriptureFontSize}
                      />
                    ) : (
                      <button
                        onClick={() => loadPassage(fullChapter)}
                        style={{
                          background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                          borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <BookOpen size={16} /> Read {fullChapter}
                      </button>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })()}

        {/* ── Campus community count — persona-gated ── */}
        {pf.campusCount !== 'hidden' && userProfile?.campus && (() => {
          const count = getCampusReaderCount(userProfile.campus!);
          const campusName = CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus';
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--dw-charcoal)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#fff', margin: 0 }}>
                <strong style={{ color: '#fff' }}>{count} people</strong> at {campusName} are in the Word today
              </p>
            </div>
          );
        })()}

        {/* Translation selector removed — hero card has translation picker */}


        {/* 3. TODAY'S CHAPTERS — gated by sectionOrder */}
        {personaConfig.sectionOrder.includes('scripture') && <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, background: 'var(--dw-charcoal-deep)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#fff', margin: 0 }}>TODAY'S CHAPTERS</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => {
                // All visible passages = plan passages + reading slot passages
                const slotPassages = readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length));
                const allPassageIds = [
                  ...todaysPlanPassages.map(p => p.passage),
                  ...slotPassages.map(s => `${s.book} ${s.currentChapter}`),
                ];
                // Trigger loading + expand all so texts become available
                allPassageIds.forEach(p => loadPassage(p));
                setExpandedPassages(new Set(allPassageIds));
                // Select whatever is already loaded right now
                const loadedPairs = allPassageIds
                  .map(p => ({ p, t: passageTexts[`${p}_${translation}`] || '' }))
                  .filter(x => x.t);
                if (loadedPairs.length > 0) {
                  setSelection({
                    text: loadedPairs.map(x => x.t).join('\n\n'),
                    verseRefs: loadedPairs.map(x => x.p),
                    source: 'select-all',
                  });
                }
              }} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:16, padding:'4px 12px', fontSize:12, color:'#fff', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600 }}>Select All</button>
              <button onClick={() => {
                const slotPassages = readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length));
                const passageRefs = [
                  ...todaysPlanPassages.map(p => p.passage),
                  ...slotPassages.map(s => `${s.book} ${s.currentChapter}`),
                ];
                shareContent({
                  title: 'Daily Bible Reading',
                  text: `Today's passages: ${passageRefs.join(', ')}\n\n— Futures Daily Word`,
                  url: 'https://futuresdailyword.com'
                });
              }} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, padding:'4px 8px', fontSize:12, color:'#fff', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                <Share2 size={12} /> Share
              </button>
            </div>
            <button
              onClick={() => setShowReadingSetup(!showReadingSetup)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                padding: '6px 12px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 32,
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {readingSlots.length === 0 && todaysPlanPassages.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                No reading slots yet. Add a book or start a reading plan to get started.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todaysPlanPassages.map(({ planId, planTitle, passage, dayNum }) => {
        const tKey = passage + '_' + translation;
        const txt = passageTexts[tKey];
        return (
          <div key={planId + '_' + passage} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-accent)', opacity: 0.8 }}>
                {planTitle} — Day {dayNum}
              </span>
            </div>
            <div style={{
              background: 'var(--dw-surface)',
              borderRadius: 14,
              border: '1px solid var(--dw-border-subtle)',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              {/* ── Listen button — TOP, full width ── */}
              {(() => {
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingThis = audioLoading && audioCurrentPassage === passage;
                return (
                  <button
                    onClick={() => handleListen(passage)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                      border: 'none',
                      borderRadius: 0,
                      padding: '13px 18px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#fff',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.02em',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {isLoadingThis ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading audio…</>
                    ) : isPlayingThis ? (
                      <><Pause size={16} /> Pause</>
                    ) : (
                      <><Headphones size={16} /> Listen</>
                    )}
                  </button>
                );
              })()}
              {/* ── Scripture content ── */}
              <div style={{ padding: '14px 18px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {passage}
                </div>
                {txt ? (
                  <ScripturePassage
                    text={txt}
                    passageRef={passage}
                    renderScripture={renderScripture}
                    greekHebrewMode={greekHebrewMode}
                    fontSize={scriptureFontSize}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                  </div>
                )}
              </div>
              {/* Plan-level devotionals suppressed — single devotion shown in main card above */}
            </div>
          </div>
        );
      })
              }{readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length)).map(slot => {
                const passage = `${slot.book} ${slot.currentChapter}`;
                const maxChapter = BOOK_CHAPTERS[slot.book] || 1;
                const textKey = `${passage}_${translation}`;
                const text = passageTexts[textKey];
                const isLoading = loadingPassages.has(passage);
                const isExpanded = expandedPassages.has(passage);
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingThis = audioLoading && audioCurrentPassage === passage;

                return (
                  <Card key={slot.id} style={{ marginBottom: 0 }}>
                    {/* Reading Slot Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{
                          color: 'var(--dw-text-primary)',
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                        }}>
                          {slot.book}
                        </p>
                        <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                          Chapter {slot.currentChapter} of {maxChapter}
                        </p>
                      </div>
                      <button
                        onClick={() => removeReadingSlot(slot.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--dw-text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                          minHeight: 36,
                          minWidth: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Remove reading slot"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Read + Listen buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: isExpanded ? 14 : 0 }}>
                      <button
                        onClick={() => handleRead(passage)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: isExpanded ? 'var(--dw-surface-hover)' : 'var(--dw-accent-bg)',
                          color: isExpanded ? 'var(--dw-text-secondary)' : 'var(--dw-accent)',
                          border: isExpanded ? '1px solid var(--dw-border)' : '1px solid var(--dw-accent)',
                          borderRadius: 10,
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <BookOpen size={16} />
                        {isExpanded ? 'Reading' : 'Read'}
                      </button>
                      <button
                        onClick={() => handleListen(passage)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none',
                          borderRadius: 10,
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#fff',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {isLoadingThis ? (
                          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                        ) : isPlayingThis ? (
                          <><Pause size={16} /> Pause</>
                        ) : (
                          <><Headphones size={16} /> Listen</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text — only shown when expanded */}
                    {isExpanded && (
                      <div style={{ marginBottom: 14 }}>
                        {isLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                            <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading {translation}...</span>
                          </div>
                        ) : text ? (
              <>
              <ScripturePassage
                text={text}
                passageRef={passage}
                renderScripture={renderScripture}
                greekHebrewMode={greekHebrewMode}
                fontSize={scriptureFontSize}
              />

              {/* Compare translation text */}
              {compareMode && personaConfig.features.greekHebrew === 'full' && (() => {
                const compareKey = `${passage}_${compareTranslation}`;
                const compareText = compareTexts[compareKey];
                return (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--dw-border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                      {compareTranslation}
                    </p>
                    {!compareText ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                        <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 12 }}>Loading {compareTranslation}...</span>
                      </div>
                    ) : (
                      <p className="text-scripture" style={{ fontSize: scriptureFontSize - 1, lineHeight: 1.7, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', borderRadius: 4 }}>
                        {renderScripture(compareText, passage)}
                      </p>
                    )}
                  </div>
                );
              })()}
              </>
                        ) : (
                          <p style={{ color: 'var(--dw-text-faint)', fontSize: 13, padding: '8px 0', fontStyle: 'italic' }}>
                            Loading...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Advance chapter button */}
                    {slot.currentChapter < maxChapter && (
                      <button
                        onClick={() => advanceChapter(slot.id)}
                        style={{
                          width: '100%',
                          background: 'var(--dw-surface-hover)',
                          border: '1px solid var(--dw-border)',
                          borderRadius: 10,
                          padding: '10px 16px',
                          color: 'var(--dw-accent)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        Next Chapter ({slot.currentChapter + 1})
                      </button>
                    )}
                    {slot.currentChapter === maxChapter && (
                      <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>
                        You've finished {slot.book}!
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Book Picker Modal */}
          {showBookPicker && (
            <Card style={{ marginTop: 12, padding: '16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Search size={16} style={{ color: 'var(--dw-text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={t('search_books')}
                  value={bookPickerSearch}
                  onChange={e => setBookPickerSearch(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--dw-text-primary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {filteredBooks.map(book => (
                  <button
                    key={book}
                    onClick={() => addReadingSlot(book)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dw-surface-hover)',
                      border: '1px solid var(--dw-border)',
                      borderRadius: 8,
                      color: 'var(--dw-text-primary)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                      minHeight: 40,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {book}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowBookPicker(false);
                  setBookPickerSearch('');
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '8px 12px',
                  background: 'none',
                  border: '1px solid var(--dw-border-subtle)',
                  borderRadius: 8,
                  color: 'var(--dw-text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minHeight: 36,
                }}
              >
                Close
              </button>
            </Card>
          )}

          {showReadingSetup && !showBookPicker && (
            <Card style={{ marginTop: 12, textAlign: 'center', padding: '16px 12px' }}>
              <button
                onClick={() => setShowBookPicker(true)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--dw-accent)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Plus size={16} />
                Choose a Book
              </button>
            </Card>
          )}
        </div>}



        {/* ── Daily Quote — below the fold ── */}
        <div style={{
          marginBottom: 20,
          padding: '8px 0',
          textAlign: 'center',
        }}>
          <p
            onClick={() => setSelection({ text: `"${quote.text}" — ${quote.author}`, verseRefs: [], source: 'tap' })}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 19,
              fontStyle: 'italic',
              color: 'var(--dw-text-primary)',
              lineHeight: 1.8,
              cursor: 'pointer',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              letterSpacing: '0.01em',
            }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{
            color: 'var(--dw-text-muted)',
            fontSize: 13,
            fontWeight: 500,
            marginTop: 10,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            — {quote.author}
          </p>
          <ListenButton text={`${quote.text}. ${quote.author}`} size="sm" />
        </div>

        {/* ── Daily Word of the Day — persona-gated ── */}
        {pf.wordOfDay !== 'hidden' && (
        <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(154,123,46,0.08) 0%, rgba(107,26,34,0.08) 100%)', borderLeft: '3px solid #9A7B2E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <h2 className="text-section-header" style={{ color: '#9A7B2E' }}>WORD OF THE DAY</h2>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--dw-text-muted)', background: 'rgba(154,123,46,0.12)', padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--font-sans)' }}>
              {dailyWord.lang}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--dw-text-primary)', margin: 0 }}>
              {dailyWord.word}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#9A7B2E', margin: 0 }}>
              {dailyWord.original}
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-text-muted)', marginBottom: 8, letterSpacing: '0.03em' }}>
            /{dailyWord.pronunciation}/
          </p>
          <p style={{ fontFamily: 'var(--font-serif-text)', fontSize: 14, lineHeight: 1.6, color: 'var(--dw-text-secondary)', marginBottom: 8 }}>
            {dailyWord.meaning}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-accent)', fontWeight: 600 }}>
            {dailyWord.verse}
          </p>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <ListenButton text={`${dailyWord.word}. ${dailyWord.meaning}. ${dailyWord.verse}`} size="sm" />
          </div>
        </Card>
        )}

        {/* ── Weekly Word in Review (Sundays) — persona-gated ── */}
        {pf.weeklyReview && weekReview && !weekReviewDismissed && (() => {
          const weekKey = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}-${new Date().getMonth()}`;
          return (
            <Card style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(107,26,34,0.10) 0%, rgba(154,123,46,0.07) 100%)',
              border: '1px solid rgba(154,123,46,0.25)',
              position: 'relative',
            }}>
              <button onClick={() => {
                localStorage.setItem('dw_week_review_dismissed', weekKey);
                setWeekReviewDismissed(true);
              }} style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--dw-text-muted)', fontSize: 18, lineHeight: 1, padding: 0,
              }}>×</button>
              <h2 className="text-section-header" style={{ color: 'var(--dw-accent)', marginBottom: 4 }}>YOUR WEEK IN THE WORD</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--dw-text-muted)', marginBottom: 12 }}>Week of {weekReview.weekLabel}</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[
                  { value: weekReview.daysRead, label: t('days_this_week') },
                  { value: weekReview.streak, label: t('day_streak') },
                ].map(({ value, label }) => (
                  <div key={label} style={{
                    flex: 1, background: 'var(--dw-surface)', borderRadius: 12, padding: '12px 10px', textAlign: 'center',
                  }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--dw-accent)', margin: 0 }}>{value}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-text-muted)', margin: '2px 0 0' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-serif-text)', fontSize: 14, fontStyle: 'italic', color: 'var(--dw-text-secondary)', lineHeight: 1.5 }}>
                {weekReview.question}
              </p>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <ListenButton text={weekReview.question} size="sm" />
              </div>
            </Card>
          );
        })()}

        {/* 5. Commentary — persona-gated: hidden / collapsed / expanded */}
        {pf.commentary !== 'hidden' && allCommentaries.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <div
              onClick={() => !commentaryExpanded && setCommentaryExpanded(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: commentaryExpanded ? 'default' : 'pointer', marginBottom: commentaryExpanded ? 10 : 0 }}
            >
              <h2 className="text-section-header" style={{ margin: 0 }}>COMMENTARY</h2>
              {!commentaryExpanded && (
                <span style={{ fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Tap to read ›</span>
              )}
            </div>
            {commentaryExpanded && (
              <>
                {/* Source tab strip */}
                {allCommentaries.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {allCommentaries.map((c, i) => (
                      <button
                        key={c.source}
                        onClick={() => setSelectedCommentaryIdx(i)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          border: '1px solid',
                          borderColor: i === selectedCommentaryIdx ? 'var(--dw-accent)' : 'var(--dw-border, #E8E6E0)',
                          background: i === selectedCommentaryIdx ? 'var(--dw-accent)' : 'transparent',
                          color: i === selectedCommentaryIdx ? '#fff' : 'var(--dw-text-muted)',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          letterSpacing: '0.02em',
                          transition: 'all 0.15s',
                        }}
                      >
                        {c.source}
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected commentary text */}
                {allCommentaries[selectedCommentaryIdx] && (
                  <>
                    {allCommentaries.length === 1 && (
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--dw-accent)', letterSpacing: '0.06em', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                        {allCommentaries[0].source.toUpperCase()}
                      </p>
                    )}
                    <p
                      onClick={() => setSelection({ text: allCommentaries[selectedCommentaryIdx].text, verseRefs: [primaryPassage], source: 'tap' })}
                      style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.65, fontFamily: 'var(--font-serif-text)', cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' }}
                    >
                      {allCommentaries[selectedCommentaryIdx].text}
                    </p>
                  </>
                )}
              </>
            )}
          </Card>
        )}

        {/* Featured Plan Invite */}
        {(() => {
          const activePlanIds = Object.keys((() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })());
          const featured = PLAN_CATALOGUE.find(p => !activePlanIds.includes(p.id) && (p as { featured?: boolean }).featured !== false);
          if (!featured) return null;
          return (
            <Card style={{ marginBottom: 16, border: '1px solid rgba(154,123,46,0.25)', background: 'rgba(154,123,46,0.05)' }}>
              <h2 className="text-section-header" style={{ marginBottom: 8, color: 'var(--dw-accent)' }}>{t('reading_plan')}</h2>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                {tField(featured, 'title', lang)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                {featured.totalDays} days · {tField(featured, 'description', lang).slice(0, 80) || 'Build a consistent reading habit'}
              </p>
              <button
                onClick={() => {
                  const existing: Record<string, unknown> = (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
                  existing[featured.id] = { startedAt: new Date().toISOString().slice(0, 10), completedDays: [], lastDay: 0 };
                  localStorage.setItem('dw_activeplans', JSON.stringify(existing));
                  try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
                  window.location.reload();
                }}
                style={{
                  background: 'var(--dw-accent)', border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 40,
                }}
              >
                {t('start_plan')}
              </button>
            </Card>
          );
        })()}

        {/* 6. Campus Section — persona-gated */}
        {pf.campusCount !== 'hidden' && <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showCampusPicker ? 14 : 0 }}>
            <MapPin size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h2 className="text-section-header" style={{ marginBottom: 2 }}>YOUR CAMPUS</h2>
              <p style={{
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}>
                {currentCampus?.name || 'Select your campus'}
              </p>
              {currentCampus?.city && (
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 1 }}>
                  {currentCampus.city}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCampusPicker(!showCampusPicker)}
              style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-accent)',
                borderRadius: 8,
                padding: '8px 14px',
                color: 'var(--dw-accent)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                minHeight: 36,
              }}
            >
              {currentCampus ? 'Change' : 'Select'}
            </button>
          </div>

          {showCampusPicker && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
                const regionCampuses = CAMPUSES.filter(c => c.region === region);
                if (!regionCampuses.length) return null;
                return (
                  <div key={region}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4, fontFamily: 'var(--font-sans)' }}>
                      {region}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {regionCampuses.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleCampusSelect(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 14px',
                            background: userProfile?.campus === c.id ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                            color: userProfile?.campus === c.id ? '#fff' : 'var(--dw-text-primary)',
                            border: 'none',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            textAlign: 'left',
                            minHeight: 42,
                          }}
                        >
                          <MapPin size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>{c.city}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>}

        {/* ── Active Plans Strip ── */}
        {homeActivePlans.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 className="text-section-header" style={{ marginBottom: 10 }}>YOUR ACTIVE PLANS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {homeActivePlans.map(({ plan, completedCount }) => {
                const pct = Math.min((completedCount / plan.totalDays) * 100, 100);
                const isComplete = completedCount >= plan.totalDays;
                return (
                  <div key={plan.id}>
                    <div style={{
                      background: 'var(--dw-card)',
                      border: '1px solid rgba(37,99,235,0.3)',
                      borderLeft: '3px solid #2563EB',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', flex: 1, paddingRight: 8 }}>
                          {tField(plan, 'title', lang)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: isComplete ? '#93C5FD' : '#2563EB',
                          fontFamily: 'var(--font-sans)', background: isComplete ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                          padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                        }}>
                          {isComplete ? '✓ Complete' : `${plan.bookId ? 'Ch' : 'Day'} ${completedCount} / ${plan.totalDays}`}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isComplete ? '#93C5FD' : 'linear-gradient(90deg, #2563EB, #60A5FA)',
                          borderRadius: 2, transition: 'width 400ms ease',
                        }} />
                      </div>
                    </div>

                    {/* ── Plan completed: prompt to pick the next one ── */}
                    {isComplete && (
                      <div style={{
                        marginTop: 8,
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(96,165,250,0.06))',
                        border: '1px solid rgba(37,99,235,0.2)',
                        borderRadius: 12,
                        padding: '16px',
                      }}>
                        <p style={{
                          fontSize: 15, fontWeight: 700, color: 'var(--dw-text-primary)',
                          fontFamily: 'var(--font-serif)', margin: '0 0 4px',
                        }}>
                          You finished {tField(plan, 'title', lang)}!
                        </p>
                        <p style={{
                          fontSize: 13, color: 'var(--dw-text-secondary)',
                          fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5,
                        }}>
                          Keep the momentum going — pick your next plan.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => onNavigate?.('plans')}
                            style={{
                              flex: 1, background: 'var(--dw-accent)', border: 'none', borderRadius: 10,
                              padding: '12px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              color: '#fff', fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Browse Plans
                          </button>
                          <button
                            onClick={() => {
                              // Remove the completed plan from active plans
                              try {
                                const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
                                delete ap[plan.id];
                                localStorage.setItem('dw_activeplans', JSON.stringify(ap));
                                try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
                                setPlanTick(t => t + 1);
                              } catch {}
                            }}
                            style={{
                              background: 'var(--dw-surface-hover)', border: '1px solid var(--dw-border)',
                              borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
                              cursor: 'pointer', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── For You — behavioral personalization (hidden for new_to_faith, comfort) ── */}
        {personaConfig.persona !== 'new_to_faith' && personaConfig.persona !== 'comfort' && (() => {
          const behaviorProfile = getBehaviorProfile();
          if (!hasEnoughBehavior()) return null;
          const personaStr = setup?.persona || '';
          const activePlanIds = homeActivePlans.map(a => a.plan.id);
          const { suggestedPassages, insight, signal } = personalize(
            behaviorProfile, personaStr, activePlanIds, PLAN_CATALOGUE
          );
          if (!suggestedPassages.length && !insight) return null;
          return (
            <Card style={{ marginBottom: 16, border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0, color: '#2563EB' }}>FOR YOU</h2>
                {signal && signal !== 'mixed' && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#2563EB',
                    background: 'rgba(37,99,235,0.12)', borderRadius: 20,
                    padding: '2px 8px', fontFamily: 'var(--font-sans)',
                  }}>
                    {signal}
                  </span>
                )}
              </div>
              {insight && (
                <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', lineHeight: 1.55, marginBottom: suggestedPassages.length ? 12 : 0, fontStyle: 'italic' }}>
                  {insight}
                </p>
              )}
              {suggestedPassages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#2563EB', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                    SUGGESTED FOR TODAY
                  </p>
                  {suggestedPassages.map(passage => (
                    <button
                      key={passage}
                      onClick={() => {
                        trackBehavior('passage_read', passage);
                        setExpandedPassages(prev => {
                          const next = new Set(prev);
                          next.add(passage);
                          return next;
                        });
                        loadPassage(passage);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(37,99,235,0.06)',
                        border: '1px solid rgba(37,99,235,0.14)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>{passage}</span>
                      <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>Read →</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })()}

                {/* ── Reading Plans Discovery ── */}
        {(() => {
          const activePlanIds = homeActivePlans.map(a => a.plan.id);
          const categories = Array.from(new Set(PLAN_CATALOGUE.map(p => p.category)));
          return (
            <div style={{ marginBottom: 20 }}>
              <h2 className="text-section-header" style={{ marginBottom: 12 }}>{t('reading_plans')}</h2>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8,
                  }}>{cat}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PLAN_CATALOGUE.filter(p => p.category === cat).map(plan => {
                      const isActive = activePlanIds.includes(plan.id);
                      return (
                        <div
                          key={plan.id}
                          onClick={() => {
                            if (isActive) {
                              removePlanFromHome(plan.id);
                            } else {
                              startPlanFromHome(plan.id);
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: isActive ? 'rgba(37,99,235,0.07)' : 'var(--dw-card)',
                            border: isActive ? '1px solid rgba(37,99,235,0.4)' : '1px solid var(--dw-border)',
                            borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: 10 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0, marginBottom: 2 }}>
                              {tField(plan, 'title', lang)}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                              {plan.totalDays} {plan.bookId ? 'chapters' : 'days'}
                            </p>
                          </div>
                          <div style={{
                            minWidth: 28, height: 28, borderRadius: '50%',
                            background: isActive ? '#2563EB' : 'var(--dw-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isActive ? (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M5 1v8M1 5h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Campus Overview — pastor_leader persona only (leaders, connect group leaders, campus pastors) */}
        {personaConfig.persona === 'pastor_leader' && (() => {
          const campusId = userProfile?.campus || '';
          const seed = campusId.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
          const day = new Date().getDate() + new Date().getMonth() * 31;
          const dow = new Date().getDay();
          const base = (seed % 40) + 20;
          const dayBonus = dow === 0 ? 18 : dow === 6 ? 10 : 0;
          const variance = ((seed * day) % 14) - 7;
          const dailyCount = campusId ? Math.max(8, base + dayBonus + variance) : 0;
          const weeklyActive = dailyCount * 3 + ((seed * 7 + day) % 10);
          const prayerCount = 12 + (day % 20);
          const campusName = campusId
            ? CAMPUSES.find(c => c.id === campusId)?.name || 'your campus'
            : 'all campuses';
          return (
            <div style={{
              marginBottom: 16, borderRadius: 16, padding: '16px 14px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(59,130,246,0.04) 100%)',
              border: '1px solid rgba(37,99,235,0.2)',
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#2563EB', marginBottom: 12,
              }}>
                CAMPUS OVERVIEW
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#2563EB', margin: 0 }}>{dailyCount}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>reading today</p>
                </div>
                <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#2563EB', margin: 0 }}>{weeklyActive}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>active this week</p>
                </div>
                <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#6B21A8', margin: 0 }}>{prayerCount}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>prayer requests</p>
                </div>
                <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#2563EB', fontWeight: 600, margin: 0 }}>{campusName}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Developer credit */}
        <div style={{
          textAlign: 'center',
          padding: '24px 0 12px',
          marginTop: 24,
          borderTop: '1px solid var(--dw-border-subtle)',
          opacity: 0.45,
          fontSize: 11,
          letterSpacing: 0.5,
          color: 'var(--dw-text-muted)',
        }}>
          Created &amp; Developed by Ashley Evans for Futures Church
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />

        </>)}
        {/* ── End conditional Daily Word content ── */}

        </div>{/* end hero viewport */}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aiAurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aiBeam {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          40%  { left: 160%; opacity: 0; }
          100% { left: 160%; opacity: 0; }
        }
        @keyframes scaleIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* Hero slider thumb — large, touch-friendly */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          margin-top: -7px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }
        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }

        /* Hero card: dramatic colour wave — crimson ↔ near-black rolling through stops */
        @keyframes heroColorWave {
          0%   { background-position: 0% 0%; }
          20%  { background-position: 80% 20%; }
          40%  { background-position: 100% 60%; }
          60%  { background-position: 50% 100%; }
          80%  { background-position: 20% 50%; }
          100% { background-position: 0% 0%; }
        }

        /* Wide bright band sweeping left→right like glass catching light */
        @keyframes heroShimmerSweep {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          80%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
        }

        /* Play button idle: subtle border + shadow pulse */
        @keyframes heroIdlePulse {
          0%, 100% {
            box-shadow: 0 10px 32px rgba(0,0,0,0.35), 0 0 0 0px rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.3);
          }
          50% {
            box-shadow: 0 10px 36px rgba(0,0,0,0.4), 0 0 0 8px rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.55);
          }
        }

        /* Play button active: bigger ring pulse */
        @keyframes heroRingPulse {
          0%, 100% { box-shadow: 0 0 0 10px rgba(255,255,255,0.07), 0 0 0 22px rgba(255,255,255,0.03), 0 10px 32px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 16px rgba(255,255,255,0.1), 0 0 0 30px rgba(255,255,255,0.04), 0 10px 32px rgba(0,0,0,0.4); }
        }
        /* Streak badge glow pulse for milestones */
        @keyframes streakGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(255,120,0,0.45), 0 2px 6px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 22px rgba(255,120,0,0.75), 0 2px 10px rgba(0,0,0,0.25); }
        }
        @keyframes streakFireWiggle {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50% { transform: rotate(4deg) scale(1.12); }
        }
      `}</style>
      {/* Milestone celebration overlay */}
      {showMilestone !== null && (
        <div
          onClick={() => setShowMilestone(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--dw-surface)', borderRadius: 24, padding: '40px 32px',
              textAlign: 'center', maxWidth: 320, width: '90%',
              border: '1px solid rgba(255,149,0,0.3)',
              boxShadow: '0 0 60px rgba(255,149,0,0.2)',
              animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔥</div>
            <p style={{
              fontSize: 32, fontWeight: 700, color: '#FF9500',
              fontFamily: 'var(--font-sans)', marginBottom: 4,
            }}>
              {showMilestone} Day{showMilestone !== 1 ? 's' : ''}!
            </p>
            <p style={{ fontSize: 17, fontFamily: 'var(--font-serif-text)', color: 'var(--dw-text-primary)', marginBottom: 8 }}>
              {showMilestone >= 100 ? 'Extraordinary dedication.' : showMilestone >= 30 ? 'A full month in the Word.' : showMilestone >= 14 ? 'Two solid weeks.' : 'One week strong.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
              {showMilestone >= 30 ? '"His mercies are new every morning." — Lam. 3:23' : showMilestone >= 7 ? '"Blessed is the one who reads." — Rev. 1:3' : '"Draw near to God and he will draw near to you." — James 4:8'}
            </p>
            <button
              onClick={() => setShowMilestone(null)}
              style={{
                background: '#FF9500', border: 'none', borderRadius: 12,
                padding: '12px 32px', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Keep Going 🙌
            </button>
          </div>
        </div>
      )}
      <VerseNoteDrawer open={showNoteDrawer} onClose={() => setShowNoteDrawer(false)} />
      {/* Global highlight toolbar — appears for ANY selected text (persona-gated) */}
      {pf.highlighting !== 'none' && (
        <HighlightToolbar onOpenNotes={() => setShowNoteDrawer(true)} onGoDeeper={() => { setBibleAIContext(selection?.text || ''); setShowBibleAI(true); }} basicMode={pf.highlighting === 'basic'} />
      )}
      {pf.greekHebrew !== 'hidden' && (
        <GreekHebrewPopup onGoDeeper={(word) => { setBibleAIContext(word); setShowBibleAI(true); }} />
      )}
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(false)}
        onOpen={() => setShowBibleAI(true)}
        initialContext={bibleAIContext}
        selectedText={selection?.text}
      />
      <BibleSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => {
          localStorage.setItem('dw_ai_prefill', query);
          if (onOpenAI) {
            onOpenAI();
          } else {
            setShowBibleAI(true);
          }
        }}
      />
      <StopAllAudio onStop={() => { heroQueueRef.current = []; heroQueueActiveRef.current = false; }} />
      {/* Temp version tag — remove after audio confirmed working */}
      <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--dw-text-muted)', opacity: 0.4, margin: '20px 0 80px', fontFamily: 'var(--font-sans)' }}>v53</p>
    </div>
  );
}
