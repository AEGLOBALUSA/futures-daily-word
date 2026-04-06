// ─────────────────────────────────────────────────────────────────────────────
// Ashley & Jane Daily Word — 40-Day Plan
// Drawn from "No More Fear", "The Church", and "From Scarcity to Supernatural"
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyDevotional {
  title: string;
  titleId: string;
  author: 'Ashley' | 'Jane' | 'Ashley & Jane';
  body: string;
  bodyId: string;
}

export const ASHLEY_JANE_DEVOTIONALS: DailyDevotional[] = [
  // ── SECTION 1: THE TRUTH ABOUT FEAR (Days 1–10) ────────────────────────────
  {
    title: "Fear Is Real — But It Doesn't Get the Final Word",
    titleId: "Ketakutan Itu Nyata — Tapi Bukan Penentu Akhirnya",
    author: "Ashley",
    body: `My earliest memory of real fear was in Papua New Guinea. I was a missionary kid surrounded by sounds at night I couldn't understand — drums, chanting, voices in the dark. I lay in bed convinced something was coming for me. Nobody told me what to do with that feeling. I just knew it was there, and it was big.

Here's what I've learned: fear is normal. Every person who has ever done anything significant has felt it. Moses felt it. David felt it. Paul felt it. Jesus' disciples felt it right before they turned the world upside down. So the goal isn't to never feel fear. The goal is to not let fear make your decisions for you.

Second Timothy 1:7 is clear: God has not given us a spirit of timidity. That word timidity in the Greek literally means cowardice — a cowering, shrinking back. God didn't wire you to shrink. He wired you to advance.

Fear is the voice that says stay small. But you were not built for small. Today, wherever fear is shouting in your life — hear this louder: the God who called you is bigger than anything trying to hold you back. You don't have to eliminate the feeling. You just have to refuse to let it drive.`,
    bodyId: `Ingatan pertama saya tentang ketakutan yang sesungguhnya adalah di Papua Nugini. Saya masih kecil, anak seorang misionaris, dikelilingi suara-suara di malam hari yang tidak saya mengerti — gendang, nyanyian, suara-suara dalam kegelapan. Saya berbaring di tempat tidur, yakin sesuatu sedang mengincar saya. Tidak ada yang mengajari saya apa yang harus dilakukan dengan perasaan itu. Saya hanya tahu perasaan itu ada, dan sangat besar.

Inilah yang saya pelajari: ketakutan itu wajar. Setiap orang yang pernah melakukan sesuatu yang berarti pasti pernah merasakannya. Musa merasakannya. Daud merasakannya. Paulus merasakannya. Murid-murid Yesus merasakannya tepat sebelum mereka mengubah dunia. Jadi tujuannya bukan untuk tidak pernah merasa takut. Tujuannya adalah tidak membiarkan ketakutan mengambil keputusan untuk Anda.

2 Timotius 1:7 sangat jelas: Allah tidak memberikan kita roh ketakutan. Kata ketakutan dalam bahasa Yunani secara harfiah berarti kepengecutan — menciut, mengkeret. Tuhan tidak merancang Anda untuk mengkeret. Dia merancang Anda untuk maju.

Ketakutan adalah suara yang berkata tetaplah kecil. Tapi Anda tidak diciptakan untuk hidup yang kecil. Hari ini, di mana pun ketakutan berteriak dalam hidup Anda — dengarkanlah ini lebih keras: Tuhan yang memanggil Anda lebih besar dari apa pun yang berusaha menahan Anda. Anda tidak perlu menghilangkan perasaan itu. Anda hanya perlu menolak membiarkannya yang menyetir.`,
  },
  {
    title: "When Fear Has You in Its Grip",
    titleId: "Ketika Ketakutan Mencengkeram Anda",
    author: "Jane",
    body: `Fear has a way of following you even after the danger is gone. It colours everything. The creak of a floorboard at night. A shadow in the hallway. A diagnosis you're still waiting on. Fear moves in without an invitation and treats your mind like it owns the place.

Isaiah 41:10 says: Fear not, for I am with you; be not dismayed, for I am your God. I will strengthen you; I will help you; I will uphold you with my righteous right hand.

Notice what God doesn't say. He doesn't say "calm down." He doesn't say "it's not that bad." He gives you five promises instead: I am with you. I am your God. I will strengthen. I will help. I will uphold.

Five promises. For one moment of fear.

Fear's most effective lie is that you're alone in whatever you're facing. But you're not. The God of all creation has turned His full attention toward you. He's not distracted. He's not too busy. He's not surprised by what you're going through. He saw it before you did — and He already prepared a response. Let that anchor you today. You are not facing this alone.`,
    bodyId: `Ketakutan punya cara untuk mengikuti Anda bahkan setelah bahayanya berlalu. Ia mewarnai segalanya. Suara derit lantai di malam hari. Bayangan di lorong. Diagnosis yang masih Anda tunggu. Ketakutan masuk tanpa undangan dan memperlakukan pikiran Anda seolah ia pemiliknya.

Yesaya 41:10 berkata: Janganlah takut, sebab Aku menyertai engkau; janganlah cemas, sebab Aku ini Allahmu. Aku akan memperkuat engkau; Aku akan menolong engkau; Aku akan memegang engkau dengan tangan kanan-Ku yang benar.

Perhatikan apa yang tidak Tuhan katakan. Dia tidak berkata "tenanglah." Dia tidak berkata "tidak seburuk itu kok." Dia memberikan lima janji: Aku menyertai engkau. Aku ini Allahmu. Aku akan memperkuat. Aku akan menolong. Aku akan memegang.

Lima janji. Untuk satu momen ketakutan.

Kebohongan paling ampuh dari ketakutan adalah bahwa Anda sendirian dalam menghadapi apa pun yang sedang Anda hadapi. Tapi Anda tidak sendirian. Tuhan pencipta seluruh alam semesta telah mengarahkan perhatian-Nya sepenuhnya kepada Anda. Dia tidak terganggu. Dia tidak terlalu sibuk. Dia tidak terkejut dengan apa yang sedang Anda alami. Dia melihatnya sebelum Anda — dan Dia sudah menyiapkan jawabannya. Biarlah itu menjadi jangkar Anda hari ini. Anda tidak menghadapi ini sendirian.`,
  },
  {
    title: "Fear's Greatest Trick",
    titleId: "Jurus Terhebat Ketakutan",
    author: "Ashley",
    body: `There's a story in Genesis most people get wrong. The Tower of Babel isn't a story about ambition gone too far. It's a story about fear driving people to build the wrong thing. The people said, "Come, let us build ourselves a city — lest we be scattered." Lest we. The whole project was fear-motivated. They weren't building toward something. They were building away from something.

That's what fear does. It hijacks your creative energy and redirects it toward self-protection instead of purpose. It whispers: if you don't control this, you'll lose everything. So you build walls instead of futures. You manage instead of dream. You maintain instead of multiply.

God's plan for your life is not a defensive strategy. Jeremiah 29:11 says He has plans to prosper you and not to harm you — plans to give you a hope and a future. That word future points forward, not inward.

Today, ask yourself: am I building toward something, or away from something? Fear will always try to redirect your God-given vision into a survival project. But you were not created to just survive. You were created for a plan so big it takes God to pull it off. Stop letting fear set the agenda. Let God's plan lead.`,
    bodyId: `Ada sebuah kisah di Kejadian yang sering disalahpahami. Menara Babel bukan kisah tentang ambisi yang kelewatan. Ini kisah tentang ketakutan yang mendorong orang membangun hal yang salah. Orang-orang itu berkata, "Marilah kita membangun sebuah kota — supaya kita jangan terserak." Supaya jangan. Seluruh proyek itu dimotivasi oleh ketakutan. Mereka tidak membangun menuju sesuatu. Mereka membangun menjauhi sesuatu.

Itulah yang dilakukan ketakutan. Ia membajak energi kreatif Anda dan mengalihkannya menuju perlindungan diri, bukan tujuan. Ia berbisik: kalau kamu tidak mengendalikan ini, kamu akan kehilangan segalanya. Maka Anda membangun tembok, bukan masa depan. Anda mengelola, bukan bermimpi. Anda mempertahankan, bukan melipatgandakan.

Rencana Tuhan untuk hidup Anda bukan strategi bertahan. Yeremia 29:11 berkata Dia punya rencana untuk menyejahterakan Anda dan bukan untuk mencelakakan Anda — rencana untuk memberi Anda harapan dan masa depan. Kata masa depan menunjuk ke depan, bukan ke dalam.

Hari ini, tanyakan pada diri sendiri: apakah saya sedang membangun menuju sesuatu, atau menjauhi sesuatu? Ketakutan akan selalu berusaha mengalihkan visi yang Tuhan berikan menjadi proyek bertahan hidup. Tapi Anda tidak diciptakan sekadar untuk bertahan. Anda diciptakan untuk sebuah rencana yang begitu besar sehingga hanya Tuhan yang sanggup mewujudkannya. Berhentilah membiarkan ketakutan menentukan arah. Biarlah rencana Tuhan yang memimpin.`,
  },
  {
    title: "The Complaining That Fear Produces",
    titleId: "Keluhan yang Dihasilkan Ketakutan",
    author: "Jane",
    body: `One of the most overlooked side effects of fear is how quickly it turns into complaining. When you're living under the pressure of fear — fear of not having enough, fear of the future, fear of what people think — it doesn't just stay quiet inside you. It comes out as criticism, discontent, and a restlessness that nothing seems to satisfy.

The Israelites in the wilderness were afraid. And their fear expressed itself as a constant, exhausting litany of complaints. The food's not right. The water's not right. Moses isn't right. We were better off in Egypt. Fear rewrote their memory so that slavery looked like security.

Philippians 4:6 says: Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. The key word that breaks the cycle is thanksgiving. You can't be genuinely grateful and genuinely fearful at the same time.

Gratitude is the weapon fear didn't see coming. When you choose to name what God has already done — even in the middle of what hasn't happened yet — you shift the atmosphere of your own heart. The peace that follows, Paul says, surpasses understanding. It doesn't make logical sense. It just shows up. And it guards you.`,
    bodyId: `Salah satu efek samping ketakutan yang paling sering diabaikan adalah betapa cepatnya ia berubah menjadi keluhan. Ketika Anda hidup di bawah tekanan ketakutan — takut tidak cukup, takut akan masa depan, takut akan penilaian orang — ia tidak hanya diam di dalam diri Anda. Ia keluar sebagai kritik, ketidakpuasan, dan kegelisahan yang sepertinya tidak ada yang bisa memuaskan.

Bangsa Israel di padang gurun sedang ketakutan. Dan ketakutan mereka diekspresikan sebagai rangkaian keluhan yang tiada henti dan melelahkan. Makanannya tidak enak. Airnya tidak enak. Musa salah. Kita lebih baik di Mesir. Ketakutan menulis ulang ingatan mereka sehingga perbudakan tampak seperti keamanan.

Filipi 4:6 berkata: Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Kata kunci yang memutus lingkaran setan itu adalah ucapan syukur. Anda tidak bisa sungguh-sungguh bersyukur dan sungguh-sungguh takut pada saat yang bersamaan.

Rasa syukur adalah senjata yang tidak diantisipasi oleh ketakutan. Ketika Anda memilih menyebutkan apa yang sudah Tuhan lakukan — bahkan di tengah hal-hal yang belum terjadi — Anda mengubah atmosfer hati Anda sendiri. Damai sejahtera yang mengikutinya, kata Paulus, melampaui segala akal. Ia tidak masuk akal secara logis. Ia datang begitu saja. Dan ia menjaga Anda.`,
  },
  {
    title: "The Cage That Was Never Locked",
    titleId: "Sangkar yang Tidak Pernah Terkunci",
    author: "Ashley",
    body: `I read once about Sun Bears in Indonesia — animals so conditioned to a small cage that even when the door was finally opened, they couldn't bring themselves to walk out. They'd been in captivity so long that the small space had become their world. Freedom was available, but they couldn't step into it.

I thought about that for a long time. Because fear does the same thing to people. It doesn't always need to lock the door. After a while, it just needs you to believe the door is locked. You stop trying. You stop believing. You adjust to the small life and call it realistic.

Psalm 34:4 says: I sought the Lord, and He answered me; He delivered me from all my fears. All. Not some. Not the manageable ones. All.

The door is open. It has been since the cross. Jesus didn't come to renegotiate the terms of your captivity — He came to end it. But you have to take a step. Fear gets smaller every time you move toward what you're afraid of. It swells every time you stay back.

Today, take one step toward what fear has been keeping you from. Just one. That's enough to start. The cage was never locked — it was just a habit.`,
    bodyId: `Saya pernah membaca tentang Beruang Madu di Indonesia — hewan yang begitu terkondisi dengan sangkar kecil sehingga bahkan ketika pintunya akhirnya dibuka, mereka tidak bisa memaksa diri untuk melangkah keluar. Mereka sudah terlalu lama di penangkaran sehingga ruang sempit itu telah menjadi dunia mereka. Kebebasan tersedia, tapi mereka tidak bisa memasukinya.

Saya memikirkan itu cukup lama. Karena ketakutan melakukan hal yang sama pada manusia. Ia tidak selalu perlu mengunci pintu. Setelah beberapa lama, ia hanya perlu Anda percaya bahwa pintunya terkunci. Anda berhenti mencoba. Anda berhenti percaya. Anda menyesuaikan diri dengan hidup yang kecil dan menyebutnya realistis.

Mazmur 34:5 berkata: Aku telah mencari Tuhan, lalu Ia menjawab aku; Ia melepaskan aku dari segala yang kutakuti. Segala. Bukan sebagian. Bukan yang bisa dikelola saja. Segala.

Pintunya terbuka. Sudah terbuka sejak kayu salib. Yesus tidak datang untuk menegosiasikan ulang ketentuan penawanan Anda — Dia datang untuk mengakhirinya. Tapi Anda harus melangkah. Ketakutan mengecil setiap kali Anda bergerak menuju apa yang Anda takuti. Ia membesar setiap kali Anda mundur.

Hari ini, ambillah satu langkah menuju apa yang selama ini ditahan oleh ketakutan dari Anda. Satu saja. Itu sudah cukup untuk memulai. Sangkar itu tidak pernah terkunci — itu hanyalah kebiasaan.`,
  },
  {
    title: "Stop Watching the Wrong People",
    titleId: "Berhentilah Memerhatikan Orang yang Salah",
    author: "Jane",
    body: `Comparison is fear's sneaky cousin. It shows up dressed as motivation, but it leaves you feeling smaller every time. You scroll through someone else's highlight reel and suddenly your whole life looks like a rough draft. Fear of falling behind, fear of not measuring up, fear that God is doing for others what He won't do for you.

Hebrews 12:1-2 has a specific instruction for this: let us throw off everything that hinders and the sin that so easily entangles. And then — here's the key — let us run with perseverance the race marked out for us, fixing our eyes on Jesus.

Your race. Not their race. Your lane. Not their lane.

When you're looking sideways, you slow down. When you're looking backwards, you stumble. The only direction that produces momentum is forward, and that means keeping your eyes on Jesus — not on who's ahead of you, not on who's catching up, not on what someone else seems to be getting.

Your life is not a competition. It's a calling. And your calling doesn't require someone else to fail for you to succeed. Fix your eyes on Jesus today. He's the author and perfecter of your faith — and your story isn't finished yet.`,
    bodyId: `Perbandingan adalah sepupu licik dari ketakutan. Ia datang berpenampilan seperti motivasi, tapi meninggalkan Anda merasa lebih kecil setiap kali. Anda melihat-lihat sorotan terbaik hidup orang lain dan tiba-tiba seluruh hidup Anda terasa seperti draf kasar. Takut tertinggal, takut tidak cukup baik, takut bahwa Tuhan melakukan untuk orang lain apa yang tidak akan Dia lakukan untuk Anda.

Ibrani 12:1-2 punya instruksi spesifik untuk ini: marilah kita menanggalkan semua beban dan dosa yang begitu melilit kita. Dan kemudian — inilah kuncinya — marilah kita berlomba dengan tekun dalam perlombaan yang diwajibkan bagi kita, sambil memusatkan pandangan kita kepada Yesus.

Perlombaan Anda. Bukan perlombaan mereka. Lintasan Anda. Bukan lintasan mereka.

Ketika Anda melirik ke samping, Anda melambat. Ketika Anda melihat ke belakang, Anda tersandung. Satu-satunya arah yang menghasilkan momentum adalah ke depan, dan itu berarti memusatkan pandangan pada Yesus — bukan pada siapa yang di depan Anda, bukan pada siapa yang mengejar, bukan pada apa yang tampaknya didapatkan orang lain.

Hidup Anda bukan sebuah kompetisi. Ini adalah panggilan. Dan panggilan Anda tidak mengharuskan orang lain gagal agar Anda berhasil. Pusatkan pandangan Anda pada Yesus hari ini. Dia adalah penulis dan penyempurna iman Anda — dan kisah Anda belum selesai.`,
  },
  {
    title: "New Seasons Require New Courage",
    titleId: "Musim Baru Membutuhkan Keberanian Baru",
    author: "Ashley",
    body: `Parenting two boys who are both over six feet tall has taught me that every new stage requires a completely different kind of courage. What worked last year doesn't work this year. What built confidence in them at ten doesn't reach them at seventeen. Every new season asks something new of you — and fear hates that.

Fear loves familiarity. It will keep you doing what worked five years ago just to avoid the discomfort of something new. The problem is, God doesn't call you to stay where you are. He calls you forward — always forward.

Joshua 1:9 was spoken to a man standing at the edge of the most terrifying transition of his life. Moses was gone. The Jordan was ahead. The enemy was already in the land. And God's word wasn't a pep talk — it was a command: be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.

Wherever you go. Not just the familiar places. Not just the safe places. The new places. The unknown places. The places that feel too big for you.

Courage isn't the absence of fear in a new season. It's taking the first step anyway — because you know who goes with you.`,
    bodyId: `Membesarkan dua anak laki-laki yang tingginya sudah lebih dari 180 cm mengajarkan saya bahwa setiap tahap baru membutuhkan jenis keberanian yang sama sekali berbeda. Apa yang berhasil tahun lalu tidak berhasil tahun ini. Apa yang membangun kepercayaan diri mereka di usia sepuluh tahun tidak menjangkau mereka di usia tujuh belas. Setiap musim baru menuntut sesuatu yang baru dari Anda — dan ketakutan membenci itu.

Ketakutan mencintai hal yang familiar. Ia akan membuat Anda terus melakukan apa yang berhasil lima tahun lalu hanya untuk menghindari ketidaknyamanan dari sesuatu yang baru. Masalahnya, Tuhan tidak memanggil Anda untuk tinggal di tempat Anda berada. Dia memanggil Anda maju — selalu maju.

Yosua 1:9 diucapkan kepada seorang pria yang berdiri di tepi transisi paling menakutkan dalam hidupnya. Musa sudah pergi. Sungai Yordan ada di depan. Musuh sudah ada di tanah itu. Dan firman Tuhan bukan sekadar semangat — itu adalah perintah: kuatkan dan teguhkanlah hatimu. Jangan takut dan jangan gentar, sebab Tuhan Allahmu menyertai engkau ke mana pun engkau pergi.

Ke mana pun engkau pergi. Bukan hanya tempat-tempat yang familiar. Bukan hanya tempat-tempat yang aman. Tempat-tempat baru. Tempat-tempat yang belum dikenal. Tempat-tempat yang terasa terlalu besar untuk Anda.

Keberanian bukan ketiadaan rasa takut di musim baru. Keberanian adalah mengambil langkah pertama meskipun takut — karena Anda tahu siapa yang berjalan bersama Anda.`,
  },
  {
    title: "Progress, Not Perfection",
    titleId: "Kemajuan, Bukan Kesempurnaan",
    author: "Jane",
    body: `Perfectionism is fear dressed up in productive clothing. It looks like high standards. It sounds like "I just want to do it right." But underneath, it's really saying: if I can't do this perfectly, I won't do it at all. And that sentence has killed more dreams than failure ever could.

Fear of getting it wrong keeps people from starting. Fear of not being ready keeps people waiting for a moment of full confidence that never actually arrives. Meanwhile, the thing God put in you quietly fades, not because you were rejected, but because you held it back yourself.

Proverbs 4:18 says the path of the righteous is like the morning sun, shining ever brighter till the full light of day. Notice the trajectory — it starts dim. It grows brighter. The full light of day isn't the starting point. It's the destination you move toward.

You are allowed to begin before you're brilliant. You are allowed to try before you're ready. The first version of anything great is usually rough. The first sermon. The first business. The first conversation. The first step into the new thing God is calling you toward.

Stop waiting for perfect. Perfect is the enemy of powerful. Begin with what you have. God will add what you lack along the way.`,
    bodyId: `Perfeksionisme adalah ketakutan yang berpakaian produktif. Tampilannya seperti standar tinggi. Kedengarannya seperti "Saya hanya ingin melakukannya dengan benar." Tapi di baliknya, sebenarnya ia berkata: kalau saya tidak bisa melakukan ini dengan sempurna, saya tidak akan melakukannya sama sekali. Dan kalimat itu telah membunuh lebih banyak mimpi daripada kegagalan itu sendiri.

Takut salah membuat orang tidak memulai. Takut belum siap membuat orang menunggu momen percaya diri penuh yang sebenarnya tidak pernah datang. Sementara itu, hal yang Tuhan tanamkan dalam diri Anda diam-diam memudar, bukan karena Anda ditolak, tapi karena Anda sendiri yang menahannya.

Amsal 4:18 berkata jalan orang benar itu seperti cahaya fajar, yang semakin terang sampai rembang tengah hari. Perhatikan lintasannya — ia dimulai redup. Ia bertambah terang. Cahaya penuh siang hari bukan titik awal. Itu adalah tujuan yang Anda tuju.

Anda diperbolehkan memulai sebelum Anda brilian. Anda diperbolehkan mencoba sebelum Anda siap. Versi pertama dari sesuatu yang hebat biasanya kasar. Khotbah pertama. Bisnis pertama. Percakapan pertama. Langkah pertama menuju hal baru yang Tuhan panggil untuk Anda.

Berhentilah menunggu sempurna. Sempurna adalah musuh dari yang penuh kuasa. Mulailah dengan apa yang Anda miliki. Tuhan akan menambahkan apa yang Anda kurang sepanjang jalan.`,
  },
  {
    title: "Don't Protect the Familiar",
    titleId: "Jangan Lindungi yang Familiar",
    author: "Ashley",
    body: `Abraham is one of the most important people in the Bible, and his story begins with one of the hardest commands God ever gave: leave everything you know. Leave your country. Leave your family. Leave your father's household. Go to a land I will show you.

Notice God didn't say where. He just said go. That's the part that fear can't handle. Fear needs a full itinerary before it will move. Fear wants the destination, the timeline, the contingency plan, and a written guarantee. God says: I'll show you as you walk.

The reason fear confuses protecting values with preserving the familiar is because they feel the same from the inside. Both produce caution. Both pump the brakes. But one is wisdom and the other is just comfort addiction.

Isaiah 43:18-19 is God speaking directly to this pattern: forget the former things; do not dwell on the past. See, I am doing a new thing! Now it springs up; do you not perceive it?

The new thing is already happening. But you'll miss it if you're too busy protecting the old thing.

Let God rearrange things. The familiar was a season, not a permanent residence. The best chapter of your story hasn't been written yet — but it requires turning the page.`,
    bodyId: `Abraham adalah salah satu tokoh terpenting dalam Alkitab, dan kisahnya dimulai dengan salah satu perintah tersulit yang pernah Tuhan berikan: tinggalkan semua yang kamu kenal. Tinggalkan negerimu. Tinggalkan keluargamu. Tinggalkan rumah ayahmu. Pergilah ke tanah yang akan Kutunjukkan kepadamu.

Perhatikan, Tuhan tidak menyebutkan ke mana. Dia hanya berkata pergilah. Bagian itulah yang tidak bisa diterima oleh ketakutan. Ketakutan membutuhkan rencana perjalanan lengkap sebelum mau bergerak. Ketakutan menginginkan tujuan, jadwal, rencana cadangan, dan jaminan tertulis. Tuhan berkata: Aku akan tunjukkan sambil kamu berjalan.

Alasan ketakutan sering mencampuradukkan antara menjaga nilai-nilai dengan mempertahankan yang familiar adalah karena keduanya terasa sama dari dalam. Keduanya menghasilkan kehati-hatian. Keduanya menginjak rem. Tapi yang satu adalah hikmat dan yang lain hanyalah kecanduan kenyamanan.

Yesaya 43:18-19 adalah Tuhan yang berbicara langsung tentang pola ini: jangan ingat hal-hal yang dahulu; jangan pikirkan peristiwa-peristiwa yang sudah lama. Lihat, Aku hendak membuat sesuatu yang baru! Sekarang hal itu sudah tumbuh; tidakkah kamu mengalaminya?

Hal baru itu sudah terjadi. Tapi Anda akan melewatkannya jika terlalu sibuk melindungi yang lama.

Biarlah Tuhan menata ulang segala sesuatu. Yang familiar adalah sebuah musim, bukan tempat tinggal permanen. Bab terbaik dari kisah Anda belum ditulis — tapi itu membutuhkan keberanian untuk membalik halaman.`,
  },
  {
    title: "God Has So Much More For You",
    titleId: "Tuhan Punya Jauh Lebih Banyak untuk Anda",
    author: "Jane",
    body: `Fear always points to what you could lose. Faith points to what God has prepared. That difference — the direction you're looking — determines everything about how you experience life.

When the ten spies went into the Promised Land, they came back with the same report as Caleb and Joshua: the land is everything God said it would be. But then they added the sentence that changed everything: the people are giants, we seemed like grasshoppers in our own eyes, and so we seemed to them. They had already decided the outcome before the battle.

Their fear didn't just shrink their courage. It shrank their identity.

Ephesians 3:20 says God is able to do immeasurably more than all we ask or imagine, according to His power that is at work within us. Immeasurably more. That phrase destroys the logic of settling.

If you can imagine it, God is working beyond it. If you can quantify it, God is planning something past the edges of it. Your biggest vision of your life is still an underestimate of what He has in mind.

Fear will always offer you a reasonable, scaled-back version of your future. Don't take the deal. God's plans for you are not scaled back. They are over and above. Choose faith — choose the bigger story today.`,
    bodyId: `Ketakutan selalu menunjuk pada apa yang bisa Anda kehilangan. Iman menunjuk pada apa yang telah Tuhan sediakan. Perbedaan itu — arah pandangan Anda — menentukan segalanya tentang bagaimana Anda menjalani hidup.

Ketika sepuluh pengintai pergi ke Tanah Perjanjian, mereka kembali dengan laporan yang sama seperti Kaleb dan Yosua: tanah itu persis seperti yang Tuhan katakan. Tapi kemudian mereka menambahkan kalimat yang mengubah segalanya: orang-orangnya raksasa, kami tampak seperti belalang di mata kami sendiri, dan begitulah kami tampak di mata mereka. Mereka sudah memutuskan hasilnya sebelum pertempuran dimulai.

Ketakutan mereka bukan hanya menyusutkan keberanian mereka. Ia menyusutkan identitas mereka.

Efesus 3:20 berkata Tuhan sanggup melakukan jauh lebih banyak dari segala yang kita doakan atau pikirkan, menurut kuasa-Nya yang bekerja di dalam kita. Jauh lebih banyak. Frasa itu menghancurkan logika untuk berpuas diri.

Jika Anda bisa membayangkannya, Tuhan sedang bekerja melampaui itu. Jika Anda bisa mengukurnya, Tuhan sedang merencanakan sesuatu melewati batasnya. Visi terbesar Anda tentang hidup Anda masih merupakan perkiraan yang terlalu rendah dari apa yang Dia rancangkan.

Ketakutan akan selalu menawarkan versi masa depan Anda yang masuk akal dan diperkecil. Jangan terima tawaran itu. Rencana Tuhan untuk Anda tidak diperkecil. Rencana itu melebihi dan melampaui. Pilihlah iman — pilihlah kisah yang lebih besar hari ini.`,
  },

  // ── SECTION 2: THE TRUTH ABOUT AUTHORITY (Days 11–20) ─────────────────────
  {
    title: "Authority Is Your Birthright",
    titleId: "Otoritas Adalah Hak Waris Anda",
    author: "Ashley",
    body: `Authority is one of those words that makes people uncomfortable, especially in a culture that wants freedom from authority while simultaneously demanding the benefits of it. But here's what I've learned — the people who are most uncomfortable with authority are usually the people who've never had it exercised properly over them or through them.

Jesus didn't just save you from something. He gave you authority over something. Luke 10:19 is one of the most direct statements He ever made: I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy; nothing will harm you.

All the power of the enemy. Not some of it. Not the manageable parts. All of it.

This authority isn't earned. You didn't pray your way into it or perform your way to it. It was given to you through Christ — the same Christ who defeated death, disarmed principalities and powers, and made a public spectacle of them at the cross.

Fear loses its grip when you understand what you carry. You are not a victim of your circumstances. You are not at the mercy of the spiritual climate around you. You are a carrier of authority — and today, you get to walk in it.`,
    bodyId: `Otoritas adalah salah satu kata yang membuat banyak orang tidak nyaman, terutama dalam budaya yang menginginkan kebebasan dari otoritas sambil menuntut manfaatnya. Tapi inilah yang saya pelajari — orang yang paling tidak nyaman dengan otoritas biasanya adalah orang yang tidak pernah mengalami otoritas yang dijalankan dengan benar atas mereka atau melalui mereka.

Yesus tidak hanya menyelamatkan Anda dari sesuatu. Dia memberi Anda otoritas atas sesuatu. Lukas 10:19 adalah salah satu pernyataan paling langsung yang pernah Dia ucapkan: Aku telah memberikan kuasa kepada kamu untuk menginjak ular dan kalajengking, dan untuk mengatasi segala kekuatan musuh; tidak ada yang akan membahayakan kamu.

Segala kekuatan musuh. Bukan sebagian. Bukan yang bisa dikelola. Segala.

Otoritas ini tidak diperoleh. Anda tidak mendoakan jalan Anda ke sana atau mengusahakan jalan Anda ke sana. Itu diberikan kepada Anda melalui Kristus — Kristus yang sama yang mengalahkan maut, melucuti pemerintah-pemerintah dan penguasa-penguasa, dan mempertontonkan mereka di kayu salib.

Ketakutan kehilangan cengkeramannya ketika Anda memahami apa yang Anda pikul. Anda bukan korban keadaan Anda. Anda tidak berada di bawah belas kasihan iklim rohani di sekitar Anda. Anda adalah pembawa otoritas — dan hari ini, Anda bisa berjalan di dalamnya.`,
  },
  {
    title: "The Game You Didn't Know You Were Playing In",
    titleId: "Permainan yang Tidak Anda Sadari Sedang Anda Ikuti",
    author: "Jane",
    body: `Every sporting event has three groups of people: players, fans, and officials. The players are in the game. The fans are watching from the stands. The officials enforce the rules. Most Christians are living like fans — watching spiritual events unfold, commentating, reacting — when God called them to be on the field.

Ephesians 6:12 makes the stakes undeniably clear: our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world and against the spiritual forces of evil in the heavenly realms.

This is not a metaphor. There is a real spiritual battle happening around your relationships, your family, your calling, your city. And the question God is asking isn't whether you're aware of it — it's whether you'll show up equipped.

Put on the full armour of God, Paul says — not a piece of it, the full armour — so that when the day of evil comes, you can stand your ground.

You were not born again to watch from the stands. You were born again to be on the field. Your prayers move things. Your worship shifts atmospheres. Your obedience opens doors no enemy can shut. Stop sitting in the stands. You're a player. Get in the game.`,
    bodyId: `Setiap pertandingan olahraga memiliki tiga kelompok orang: pemain, penonton, dan wasit. Pemain ada di lapangan. Penonton menonton dari tribun. Wasit menegakkan aturan. Kebanyakan orang Kristen hidup seperti penonton — menyaksikan peristiwa rohani terjadi, berkomentar, bereaksi — padahal Tuhan memanggil mereka untuk turun ke lapangan.

Efesus 6:12 memperjelas taruhannya: karena perjuangan kita bukanlah melawan darah dan daging, tetapi melawan pemerintah-pemerintah, melawan penguasa-penguasa, melawan penghulu-penghulu dunia yang gelap ini, melawan roh-roh jahat di udara.

Ini bukan metafora. Ada pertempuran rohani nyata yang terjadi di sekitar hubungan Anda, keluarga Anda, panggilan Anda, kota Anda. Dan pertanyaan Tuhan bukan apakah Anda menyadarinya — tapi apakah Anda mau hadir dengan perlengkapan yang memadai.

Kenakanlah seluruh perlengkapan senjata Allah, kata Paulus — bukan sebagian, seluruh perlengkapan — supaya apabila datang hari yang jahat, kamu dapat bertahan.

Anda tidak dilahirkan kembali untuk menonton dari tribun. Anda dilahirkan kembali untuk ada di lapangan. Doa-doa Anda menggerakkan sesuatu. Penyembahan Anda mengubah atmosfer. Ketaatan Anda membuka pintu-pintu yang tidak bisa ditutup oleh musuh. Berhentilah duduk di tribun. Anda pemain. Masuklah ke permainan.`,
  },
  {
    title: "What the Enemy Is Actually Afraid Of",
    titleId: "Apa yang Sebenarnya Ditakuti Musuh",
    author: "Ashley",
    body: `A burglar once broke into our home. When Jane arrived home and walked in, she had no idea anyone was there. But the moment the intruder heard her presence, he ran. He didn't stop to fight. He didn't hold his ground. He fled — because the authority of the home's rightful owner was suddenly in the room.

That's a picture of what happens when you understand your authority in Christ.

First John 4:4 says: greater is He who is in you than he who is in the world. The enemy's greatest strategy against you isn't power — because he knows he's outpowered. His strategy is deception. He wants you to believe you're smaller than you are. More vulnerable than you are. More alone than you are. Because if he can shrink your self-understanding, he doesn't need to overpower you. You'll retreat on your own.

The moment you walk into a situation carrying the consciousness of who lives inside you, the atmosphere changes. Darkness doesn't negotiate with light. It yields to it.

You carry greater power than what opposes you. Today, stop trying to fight on the enemy's terms and start walking in the authority that's already been given to you. The burglar runs when the owner shows up.`,
    bodyId: `Seorang pencuri pernah masuk ke rumah kami. Ketika Jane tiba di rumah dan masuk, dia tidak tahu ada orang di sana. Tapi begitu si penyusup mendengar kehadirannya, dia lari. Dia tidak berhenti untuk melawan. Dia tidak bertahan. Dia kabur — karena otoritas pemilik sah rumah itu tiba-tiba hadir di ruangan.

Itulah gambaran dari apa yang terjadi ketika Anda memahami otoritas Anda di dalam Kristus.

1 Yohanes 4:4 berkata: lebih besar Dia yang ada di dalam kamu daripada dia yang ada di dalam dunia. Strategi terbesar musuh terhadap Anda bukan kekuatan — karena dia tahu dia kalah kuasa. Strateginya adalah penipuan. Dia ingin Anda percaya bahwa Anda lebih kecil dari yang sebenarnya. Lebih rentan dari yang sebenarnya. Lebih sendirian dari yang sebenarnya. Karena jika dia bisa menyusutkan pemahaman Anda tentang diri sendiri, dia tidak perlu mengalahkan Anda. Anda akan mundur sendiri.

Saat Anda masuk ke sebuah situasi dengan membawa kesadaran tentang siapa yang tinggal di dalam Anda, atmosfernya berubah. Kegelapan tidak bernegosiasi dengan terang. Ia menyerah padanya.

Anda membawa kuasa yang lebih besar dari apa yang melawan Anda. Hari ini, berhentilah mencoba berperang dengan cara musuh dan mulailah berjalan dalam otoritas yang sudah diberikan kepada Anda. Pencuri itu lari ketika si pemilik muncul.`,
  },
  {
    title: "Authority That Was Given, Not Earned",
    titleId: "Otoritas yang Diberikan, Bukan Diraih",
    author: "Jane",
    body: `The first time Ashley met the Prime Minister of Australia, it was in a private meeting in his Canberra offices. The access wasn't because of anything Ashley had built or achieved — it was because of the role he carried. Position opens doors that effort alone never could.

That's the nature of authority. You don't earn it. You inherit it.

Colossians 2:9-10 says: in Christ all the fullness of the Deity lives in bodily form, and in Christ you have been brought to fullness. He is the head over every power and authority. You have been brought to fullness in the One who is head over every power and authority. That sentence should stop you in your tracks.

You are not trying to reach God's level. You are not working your way up a spiritual ladder. You are already positioned in Christ, who sits above every name that can be named — in this age and in the age to come.

Your authority in prayer, in spiritual warfare, in declaring truth over your family and circumstances — it comes from that position. Not your performance. Not your consistency. Not your spiritual resume. Christ.

Today, pray from that position. Speak from that position. You carry the authority of the One who holds everything together.`,
    bodyId: `Pertama kali Ashley bertemu Perdana Menteri Australia, itu dalam pertemuan pribadi di kantornya di Canberra. Aksesnya bukan karena sesuatu yang Ashley bangun atau capai — tapi karena peran yang dia emban. Posisi membuka pintu yang tidak bisa dibuka oleh usaha saja.

Itulah sifat otoritas. Anda tidak mendapatkannya. Anda mewarisinya.

Kolose 2:9-10 berkata: sebab dalam Dialah berdiam secara jasmaniah seluruh kepenuhan keallahan, dan kamu telah dipenuhi di dalam Dia, yang adalah kepala semua pemerintah dan penguasa. Anda telah dipenuhi di dalam Dia yang adalah kepala semua pemerintah dan penguasa. Kalimat itu seharusnya menghentikan langkah Anda.

Anda bukan sedang berusaha mencapai level Tuhan. Anda bukan sedang mendaki tangga rohani. Anda sudah diposisikan di dalam Kristus, yang duduk di atas setiap nama yang dapat disebutkan — di zaman ini dan di zaman yang akan datang.

Otoritas Anda dalam doa, dalam peperangan rohani, dalam mendeklarasikan kebenaran atas keluarga dan keadaan Anda — semuanya datang dari posisi itu. Bukan dari kinerja Anda. Bukan dari konsistensi Anda. Bukan dari resume rohani Anda. Kristus.

Hari ini, berdoalah dari posisi itu. Berbicaralah dari posisi itu. Anda memikul otoritas dari Dia yang menopang segala sesuatu.`,
  },
  {
    title: "Set Apart for Something Bigger",
    titleId: "Dikuduskan untuk Sesuatu yang Lebih Besar",
    author: "Ashley",
    body: `When you realise you've been set apart, the small fears start to look ridiculous. Not because they aren't real — they are. But because they don't fit your assignment.

First Peter 2:9 is one of the most identity-shaping verses in the New Testament: you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of Him who called you out of darkness into His wonderful light.

Chosen. Royal. Holy. Special possession. That's who you are before you've done a single thing today.

Fear loves to define you by your weaknesses, your failures, your past. It says: you're not qualified enough, not healed enough, not ready enough. But Peter wasn't writing to people who had it together. He was writing to scattered, persecuted people who had every reason to feel small and insignificant. And he called them chosen. Royal. Holy.

God doesn't set apart people who are already fully formed. He sets apart people He intends to form. The calling comes before the qualification. The appointment comes before the readiness.

You were not set apart for a small life. You were set apart to carry His presence into every room, every relationship, every challenge today places in front of you. Walk like you know it.`,
    bodyId: `Ketika Anda menyadari bahwa Anda telah dikuduskan, ketakutan-ketakutan kecil mulai terlihat menggelikan. Bukan karena ketakutan itu tidak nyata — memang nyata. Tapi karena mereka tidak sesuai dengan penugasan Anda.

1 Petrus 2:9 adalah salah satu ayat yang paling membentuk identitas di Perjanjian Baru: kamulah bangsa yang terpilih, imamat yang rajani, bangsa yang kudus, umat kepunyaan Allah sendiri, supaya kamu memberitakan perbuatan-perbuatan yang besar dari Dia yang telah memanggil kamu keluar dari kegelapan kepada terang-Nya yang ajaib.

Terpilih. Rajani. Kudus. Kepunyaan khusus. Itulah siapa Anda sebelum Anda melakukan apa pun hari ini.

Ketakutan suka mendefinisikan Anda berdasarkan kelemahan, kegagalan, dan masa lalu Anda. Ia berkata: kamu tidak cukup berkualifikasi, belum cukup pulih, belum cukup siap. Tapi Petrus tidak menulis kepada orang-orang yang sudah mapan. Dia menulis kepada orang-orang yang tercerai-berai dan dianiaya, yang punya segala alasan untuk merasa kecil dan tidak berarti. Dan dia menyebut mereka terpilih. Rajani. Kudus.

Tuhan tidak menguduskan orang yang sudah terbentuk sempurna. Dia menguduskan orang yang hendak Dia bentuk. Panggilan datang sebelum kualifikasi. Penunjukan datang sebelum kesiapan.

Anda tidak dikuduskan untuk hidup yang kecil. Anda dikuduskan untuk membawa hadirat-Nya ke setiap ruangan, setiap hubungan, setiap tantangan yang diletakkan hari ini di hadapan Anda. Berjalanlah seolah Anda mengetahuinya.`,
  },
  {
    title: "Rooms That Open When You Carry His Name",
    titleId: "Ruangan yang Terbuka Ketika Anda Membawa Nama-Nya",
    author: "Jane",
    body: `There are doors that don't open for everyone. Not because God plays favourites, but because not everyone understands what they carry. Authority isn't just about power — it's about access. And when you walk with the consciousness of whose you are, God opens rooms to you that others walk past without seeing.

Ephesians 2:18 says: through Him we both have access to the Father by one Spirit. Access. Direct access. Not through a mediator, not through a waiting room, not through earning the right to be heard. Through the Spirit, by the name of Jesus, you have standing before the Father Himself.

Think about what that means for your prayer life. You are not knocking on a door hoping someone answers. You are walking into a room where you are known, expected, and welcomed. The God of the universe has made Himself available to you — fully, completely, without qualification.

But access is only valuable if you use it. The door is open, but you still have to walk through.

Today, whatever you're facing — bring it. Don't edit it. Don't clean it up for presentation. Just come. Boldly, Hebrews says. Approach the throne of grace with confidence. Rooms are opening. Walk through them.`,
    bodyId: `Ada pintu-pintu yang tidak terbuka untuk semua orang. Bukan karena Tuhan pilih kasih, tapi karena tidak semua orang memahami apa yang mereka pikul. Otoritas bukan hanya soal kuasa — ini soal akses. Dan ketika Anda berjalan dengan kesadaran tentang milik siapa Anda, Tuhan membukakan ruangan-ruangan untuk Anda yang orang lain lewati tanpa melihatnya.

Efesus 2:18 berkata: karena melalui Dia kita berdua memiliki akses kepada Bapa oleh satu Roh. Akses. Akses langsung. Bukan melalui perantara, bukan melalui ruang tunggu, bukan melalui usaha membuktikan diri layak didengar. Melalui Roh, dengan nama Yesus, Anda memiliki kedudukan di hadapan Bapa sendiri.

Pikirkan apa artinya itu bagi kehidupan doa Anda. Anda bukan mengetuk pintu berharap seseorang menjawab. Anda masuk ke ruangan di mana Anda dikenal, ditunggu, dan disambut. Tuhan semesta alam telah membuat diri-Nya tersedia bagi Anda — sepenuhnya, selengkapnya, tanpa syarat.

Tapi akses hanya bernilai jika Anda menggunakannya. Pintunya terbuka, tapi Anda tetap harus berjalan melewatinya.

Hari ini, apa pun yang Anda hadapi — bawalah. Jangan mengeditnya. Jangan membersihkannya untuk presentasi. Datang saja. Dengan berani, kata Ibrani. Marilah kita dengan penuh keberanian menghampiri takhta kasih karunia. Ruangan-ruangan sedang terbuka. Berjalanlah melewatinya.`,
  },
  {
    title: "Greater Than Every Force That Opposes You",
    titleId: "Lebih Besar dari Setiap Kekuatan yang Melawan Anda",
    author: "Ashley",
    body: `Politics is a vicious game. When you're in public ministry, the attacks don't always come from obvious places. They come through whisper campaigns, through misrepresentation, through people you trusted. I've had seasons where opposition felt like it was coming from every direction at once. Those are the seasons that test what you actually believe about God's protection.

Romans 8:31 asks the question that changes your response to every form of opposition: if God is for us, who can be against us? Not who will be against us. Plenty of people and forces will be against you. The question is: what can they actually accomplish?

The answer is — nothing that God doesn't permit. And nothing God permits is outside His ability to redeem.

The forces that oppose you are real. Spiritual opposition is real. Difficult people are real. Systemic resistance is real. But none of them hold final authority over your life. The One who holds final authority is the One who calls you His own.

This doesn't mean the opposition stops. It means you stop fighting from a position of fear and start standing from a position of certainty. God is for you. That doesn't change based on the size of what's against you. The battle isn't yours to win. It's yours to stand in.`,
    bodyId: `Politik adalah permainan yang kejam. Ketika Anda berada dalam pelayanan publik, serangan tidak selalu datang dari tempat yang jelas. Mereka datang melalui kampanye bisik-bisik, melalui penyimpangan fakta, melalui orang-orang yang Anda percaya. Saya pernah mengalami musim di mana perlawanan terasa datang dari segala arah sekaligus. Itulah musim-musim yang menguji apa yang sebenarnya Anda percaya tentang perlindungan Tuhan.

Roma 8:31 mengajukan pertanyaan yang mengubah respons Anda terhadap setiap bentuk perlawanan: jika Allah di pihak kita, siapakah yang melawan kita? Bukan siapa yang akan melawan kita. Banyak orang dan kekuatan yang akan melawan Anda. Pertanyaannya adalah: apa yang sebenarnya bisa mereka capai?

Jawabannya adalah — tidak ada yang tidak Tuhan izinkan. Dan tidak ada yang Tuhan izinkan yang berada di luar kemampuan-Nya untuk memulihkan.

Kekuatan yang melawan Anda itu nyata. Perlawanan rohani itu nyata. Orang-orang sulit itu nyata. Resistensi sistemis itu nyata. Tapi tidak satu pun dari mereka yang memegang otoritas final atas hidup Anda. Yang memegang otoritas final adalah Dia yang menyebut Anda milik-Nya.

Ini tidak berarti perlawanan berhenti. Ini berarti Anda berhenti berperang dari posisi takut dan mulai berdiri dari posisi kepastian. Tuhan berpihak pada Anda. Itu tidak berubah berdasarkan besarnya apa yang melawan Anda. Pertempuran ini bukan milik Anda untuk dimenangkan. Ini milik Anda untuk diteguhkan.`,
  },
  {
    title: "The Confidence That Comes With Identity",
    titleId: "Kepercayaan Diri yang Datang dari Identitas",
    author: "Jane",
    body: `Most people lack confidence not because they lack ability, but because they lack settled identity. You walk into a room uncertain because you're still trying to figure out who you are and whether you belong there. And that uncertainty — that quiet question underneath everything — is exactly what fear feeds on.

James 1:5 says if any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you. The promise isn't just wisdom. It's generosity without fault-finding. God won't give you wisdom while reminding you of your failures. He won't answer your prayer while making a list of reasons you didn't deserve a response.

He gives. Generously. To all. Without qualification.

When you ask God for clarity, for discernment, for confidence — He answers that prayer without reviewing your track record. He responds to you as a beloved child, not a probationer.

Real confidence isn't believing you have all the answers. It's knowing you have access to the One who does. It's walking into a room not because you know everything, but because you know the One who knows everything — and He's walking with you.

Today, stop trying to manufacture confidence. Ask for wisdom. Settle your identity. Walk accordingly.`,
    bodyId: `Kebanyakan orang kurang percaya diri bukan karena kurang kemampuan, tapi karena kurang identitas yang mantap. Anda masuk ke sebuah ruangan dengan ragu karena masih berusaha mencari tahu siapa Anda dan apakah Anda pantas berada di sana. Dan ketidakpastian itu — pertanyaan diam di balik segalanya — adalah persis apa yang dimanfaatkan ketakutan.

Yakobus 1:5 berkata jikalau di antara kamu ada yang kekurangan hikmat, hendaklah ia memintakannya kepada Allah, yang memberikan kepada semua orang dengan murah hati dan dengan tidak membangkit-bangkit, maka hikmat itu akan diberikan kepadanya. Janjinya bukan hanya hikmat. Tapi kemurahan tanpa celaan. Tuhan tidak akan memberi Anda hikmat sambil mengingatkan kegagalan Anda. Dia tidak akan menjawab doa Anda sambil membuat daftar alasan mengapa Anda tidak pantas mendapat jawaban.

Dia memberi. Dengan murah hati. Kepada semua. Tanpa syarat.

Ketika Anda meminta kejelasan, ketajaman, kepercayaan diri dari Tuhan — Dia menjawab doa itu tanpa meninjau rekam jejak Anda. Dia merespons Anda sebagai anak yang dikasihi, bukan sebagai orang dalam masa percobaan.

Kepercayaan diri sejati bukan percaya bahwa Anda punya semua jawaban. Ini adalah mengetahui bahwa Anda punya akses kepada Dia yang punya semua jawaban. Ini adalah masuk ke sebuah ruangan bukan karena Anda tahu segalanya, tapi karena Anda mengenal Dia yang tahu segalanya — dan Dia berjalan bersama Anda.

Hari ini, berhentilah mencoba memproduksi kepercayaan diri. Mintalah hikmat. Mantapkan identitas Anda. Berjalanlah sesuai dengan itu.`,
  },
  {
    title: "Your Sphere Is Not an Accident",
    titleId: "Lingkup Pengaruh Anda Bukan Kebetulan",
    author: "Ashley",
    body: `There's a story in Numbers where the children of Israel try to negotiate with Nahash, the Ammonite king. He agrees to a treaty, but there's a condition: he'll gouge out the right eye of every man — just to humiliate them. To reduce them. To make sure that even if they kept their lives, they'd carry the mark of defeat forever.

Fear does the same thing. It doesn't always try to destroy you outright. Sometimes it just wants to blind you. Take away just enough vision that you can't see your full sphere of influence. Can't see what God intended for you. Can't see the reach of your authority.

Matthew 5:13-14 says you are the salt of the earth and the light of the world. Not you might be. Not you could be with more work. You are. Present tense. Right now. Exactly where you are.

Your neighbourhood is not random. Your workplace is not an accident. Your family, your friendships, your city — all of it is your sphere. And salt doesn't have to announce itself to be effective. It just has to be present. Light doesn't have to fight darkness. It just has to show up.

You are exactly where God needs you to be. The question is whether you'll be the salt and light He placed you there to be.`,
    bodyId: `Ada kisah di Bilangan di mana bangsa Israel mencoba bernegosiasi dengan Nahas, raja bangsa Amon. Dia setuju dengan perjanjian itu, tapi ada syaratnya: dia akan mencungkil mata kanan setiap pria — hanya untuk mempermalukan mereka. Untuk merendahkan mereka. Untuk memastikan bahwa meskipun mereka mempertahankan nyawa, mereka akan selamanya memikul tanda kekalahan.

Ketakutan melakukan hal yang sama. Ia tidak selalu mencoba menghancurkan Anda secara langsung. Kadang ia hanya ingin membutakan Anda. Mengambil cukup banyak penglihatan sehingga Anda tidak bisa melihat lingkup pengaruh Anda yang sesungguhnya. Tidak bisa melihat apa yang Tuhan maksudkan untuk Anda. Tidak bisa melihat jangkauan otoritas Anda.

Matius 5:13-14 berkata kamulah garam dunia dan terang dunia. Bukan kamu mungkin. Bukan kamu bisa dengan usaha lebih. Kamulah. Kala kini. Sekarang juga. Tepat di mana Anda berada.

Lingkungan tempat tinggal Anda bukan kebetulan. Tempat kerja Anda bukan kebetulan. Keluarga Anda, persahabatan Anda, kota Anda — semuanya adalah lingkup pengaruh Anda. Dan garam tidak perlu mengumumkan dirinya untuk menjadi efektif. Ia hanya perlu hadir. Terang tidak perlu melawan kegelapan. Ia hanya perlu muncul.

Anda tepat di tempat di mana Tuhan membutuhkan Anda. Pertanyaannya adalah apakah Anda akan menjadi garam dan terang yang Dia tempatkan di sana.`,
  },
  {
    title: "Give Me This Mountain",
    titleId: "Berikanlah Gunung Ini Kepadaku",
    author: "Jane",
    body: `Caleb was eighty-five years old. He had spent forty years wandering in a wilderness that wasn't even his fault. He had waited. He had been faithful when the people around him weren't. He had watched an entire generation die before entering the promise. And when Joshua finally gave him the choice of land, you might expect Caleb to choose something easy. Something comfortable. Something quiet.

Instead, Joshua 14:12 records one of the most courageous sentences in all of scripture: Now give me this hill country that the Lord promised me that day. The Anakites are there and their cities are large and fortified, but, the Lord helping me, I will drive them out just as He said.

The Anakites. The giants. The fortified cities. Caleb looked at the hardest parcel of land and said give me this mountain.

Fear would have said: take the easy piece. You've earned it. You've suffered enough. But Caleb's authority had not shrunk in forty years — if anything, it had grown. He still possessed the full inheritance God had promised. And so do you.

Whatever mountain has been in front of you — whatever fortified thing that feels too large and too old to move — it is not beyond your authority. Ask for the mountain. God is still the God who gives it.`,
    bodyId: `Kaleb berusia delapan puluh lima tahun. Dia telah menghabiskan empat puluh tahun mengembara di padang gurun yang bahkan bukan salahnya. Dia menunggu. Dia setia ketika orang-orang di sekitarnya tidak setia. Dia menyaksikan satu generasi mati sebelum memasuki tanah perjanjian. Dan ketika Yosua akhirnya memberinya pilihan tanah, Anda mungkin mengira Kaleb akan memilih sesuatu yang mudah. Sesuatu yang nyaman. Sesuatu yang tenang.

Sebaliknya, Yosua 14:12 mencatat salah satu kalimat paling berani di seluruh Kitab Suci: berikanlah kepadaku pegunungan yang dijanjikan Tuhan kepadaku pada hari itu. Orang Enak ada di sana, dan kota-kotanya besar serta berkubu, tetapi, Tuhan menyertai aku, maka aku akan menghalau mereka seperti yang Tuhan janjikan.

Orang Enak. Para raksasa. Kota-kota berkubu. Kaleb memandang bidang tanah yang paling sulit dan berkata berikanlah gunung ini kepadaku.

Ketakutan akan berkata: ambil yang mudah saja. Kamu sudah layak. Kamu sudah cukup menderita. Tapi otoritas Kaleb tidak menyusut dalam empat puluh tahun — justru bertumbuh. Dia masih memiliki seluruh warisan yang Tuhan janjikan. Dan begitu juga Anda.

Gunung apa pun yang ada di depan Anda — hal berkubu apa pun yang terasa terlalu besar dan terlalu lama untuk digerakkan — itu tidak melampaui otoritas Anda. Mintalah gunung itu. Tuhan masih Tuhan yang memberikannya.`,
  },

  // ── SECTION 3: THE LOVE AND PURPOSE OF GOD (Days 21–30) ───────────────────
  {
    title: "God Already Wrote Your Story",
    titleId: "Tuhan Sudah Menulis Kisah Anda",
    author: "Ashley",
    body: `When Samuel went looking for the next king of Israel, he went to Jesse's house. Jesse paraded seven sons in front of him — tall, strong, impressive. And God said no to every one of them. So Samuel asked: are these all the sons you have? And Jesse, almost as an afterthought, mentioned the youngest one. He's out with the sheep.

David wasn't even in the room. His own father didn't think to call him. The greatest king in Israel's history was considered such an unlikely candidate that he wasn't worth a seat at the table.

Psalm 139:13-16 says God knit you together in your mother's womb. He saw your unformed body. He wrote every one of your days before one of them came to be. Before you had a track record. Before you had credentials. Before anyone was watching.

You are not where you are by accident. You are not the overlooked middle child of history. You are a David — someone God specifically selected, specifically gifted, specifically positioned for this moment in time.

Your assignment doesn't come from who noticed you. It comes from who made you. And the One who made you is not surprised by your situation, your limitations, or your history. He wrote the whole story. He'll be faithful to finish it.`,
    bodyId: `Ketika Samuel pergi mencari raja Israel berikutnya, dia pergi ke rumah Isai. Isai memperkenalkan tujuh putranya — tinggi, kuat, mengesankan. Dan Tuhan berkata tidak untuk setiap satu dari mereka. Maka Samuel bertanya: inikah semua anakmu? Dan Isai, hampir sebagai renungan, menyebut yang bungsu. Dia sedang menggembalakan domba.

Daud bahkan tidak ada di ruangan itu. Ayahnya sendiri tidak memikirkan untuk memanggilnya. Raja terbesar dalam sejarah Israel dianggap begitu tidak mungkin sehingga tidak layak mendapat kursi di meja.

Mazmur 139:13-16 berkata Tuhan menenun Anda di dalam rahim ibu Anda. Dia melihat tubuh Anda yang belum berbentuk. Dia menuliskan setiap hari Anda sebelum satu pun terjadi. Sebelum Anda punya rekam jejak. Sebelum Anda punya kredensial. Sebelum ada yang memperhatikan.

Anda tidak berada di tempat ini secara kebetulan. Anda bukan anak yang terlupakan dari sejarah. Anda adalah seorang Daud — seseorang yang Tuhan secara khusus pilih, secara khusus karuniai, secara khusus posisikan untuk momen ini di dalam sejarah.

Penugasan Anda tidak datang dari siapa yang memperhatikan Anda. Ia datang dari siapa yang menciptakan Anda. Dan Dia yang menciptakan Anda tidak terkejut oleh situasi, keterbatasan, atau sejarah Anda. Dia menulis seluruh kisahnya. Dia akan setia menyelesaikannya.`,
  },
  {
    title: "Made to Multiply, Not Just Maintain",
    titleId: "Diciptakan untuk Melipatgandakan, Bukan Sekadar Mempertahankan",
    author: "Jane",
    body: `There's a heartbreaking pattern in the life of Saul. He started strong — humble, chosen, anointed. But then, one decision at a time, he began to manage instead of lead, to protect his position instead of fulfill his purpose. By the end, his entire energy was consumed by maintaining what he had, and he couldn't see that he was losing the very thing he was trying to protect.

Fear had taken a king and turned him into a manager.

God never created you to maintain. Genesis 1:28 was the first command ever given to humanity: be fruitful and increase in number; fill the earth and subdue it. Multiply. Increase. Fill. The original design was always expansion.

John 15:8 says this is my Father's glory, that you bear much fruit, showing yourselves to be my disciples.

Much fruit. Not managed fruit. Not carefully maintained fruit. Much.

Fruitfulness isn't something you manufacture through effort. It's something that flows from your connection to the vine. Stay connected. Stay abiding. Stop white-knuckling your way through life trying to protect what you have.

God's economy is not conservation — it's multiplication. Whatever He's given you was meant to grow. Stop managing it. Start multiplying it.`,
    bodyId: `Ada pola yang menyayat hati dalam kehidupan Saul. Dia memulai dengan kuat — rendah hati, terpilih, diurapi. Tapi kemudian, satu keputusan demi satu keputusan, dia mulai mengelola alih-alih memimpin, melindungi posisinya alih-alih memenuhi tujuannya. Di akhir, seluruh energinya terhabiskan untuk mempertahankan apa yang dia miliki, dan dia tidak bisa melihat bahwa dia sedang kehilangan hal yang justru berusaha dia lindungi.

Ketakutan telah mengubah seorang raja menjadi seorang manajer.

Tuhan tidak pernah menciptakan Anda untuk mempertahankan. Kejadian 1:28 adalah perintah pertama yang pernah diberikan kepada manusia: beranak cuculah dan bertambah banyak; penuhilah bumi dan taklukkanlah itu. Lipatgandakan. Bertambah. Penuhilah. Desain aslinya selalu adalah ekspansi.

Yohanes 15:8 berkata inilah kemuliaan Bapa-Ku, yaitu supaya kamu berbuah banyak dan dengan demikian kamu menunjukkan bahwa kamu adalah murid-murid-Ku.

Berbuah banyak. Bukan buah yang dikelola. Bukan buah yang dijaga hati-hati. Banyak.

Keberbuahan bukan sesuatu yang Anda produksi melalui usaha. Ia mengalir dari koneksi Anda dengan pokok anggur. Tetaplah terhubung. Tetaplah tinggal. Berhentilah mencengkeram hidup Anda dengan keras, berusaha melindungi apa yang Anda miliki.

Ekonomi Tuhan bukan konservasi — melainkan multiplikasi. Apa pun yang telah Dia berikan kepada Anda dimaksudkan untuk bertumbuh. Berhenti mengelolanya. Mulailah melipatgandakannya.`,
  },
  {
    title: "God Works Beyond What You Can See",
    titleId: "Tuhan Bekerja Melampaui yang Bisa Anda Lihat",
    author: "Ashley",
    body: `David wasn't present when Samuel came to anoint the next king. He was sent away by his own father because Jesse didn't believe David was worth considering. And while the ceremony was happening inside, the future king of Israel was outside — tending animals, doing his job, completely unaware that everything was about to change.

Here's what that tells me: some of the most important things God is doing in your life are happening when you're not in the room.

Romans 8:28 says and we know that in all things God works for the good of those who love Him, who have been called according to His purpose. In all things. Not just the Sunday morning things. Not just the seasons that look spiritual. All things — including the mundane, the overlooked, the painful, and the confusing.

God doesn't wait for you to have it figured out before He starts working. He's working in the waiting. He's working in the wilderness. He's working in the seasons you've been sent outside.

Whatever feels like an oversight in your life right now — a door that closed, an opportunity that passed, a season that makes no sense — God is working in it. For good. According to a purpose that's bigger than your current vantage point. Trust the One who sees the whole story.`,
    bodyId: `Daud tidak hadir ketika Samuel datang untuk mengurapi raja berikutnya. Dia dikirim pergi oleh ayahnya sendiri karena Isai tidak percaya Daud layak dipertimbangkan. Dan sementara upacara berlangsung di dalam, calon raja terbesar Israel ada di luar — menjaga ternak, melakukan tugasnya, sama sekali tidak sadar bahwa segalanya akan segera berubah.

Inilah yang disampaikan kepada saya: beberapa hal terpenting yang Tuhan lakukan dalam hidup Anda terjadi ketika Anda tidak ada di ruangan itu.

Roma 8:28 berkata dan kita tahu bahwa dalam segala sesuatu Allah turut bekerja untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia, yang terpanggil sesuai dengan rencana-Nya. Dalam segala sesuatu. Bukan hanya hal-hal ibadah Minggu pagi. Bukan hanya musim-musim yang terlihat rohani. Segala sesuatu — termasuk yang biasa, yang terlupakan, yang menyakitkan, dan yang membingungkan.

Tuhan tidak menunggu Anda memahami segalanya sebelum Dia mulai bekerja. Dia bekerja di dalam penantian. Dia bekerja di padang gurun. Dia bekerja di musim-musim ketika Anda merasa dikesampingkan.

Apa pun yang terasa seperti kelalaian dalam hidup Anda saat ini — pintu yang tertutup, kesempatan yang berlalu, musim yang tidak masuk akal — Tuhan sedang bekerja di dalamnya. Untuk kebaikan. Sesuai dengan tujuan yang lebih besar dari sudut pandang Anda saat ini. Percayalah pada Dia yang melihat seluruh kisahnya.`,
  },
  {
    title: "The God of the Morning-After",
    titleId: "Tuhan yang Hadir di Pagi Sesudahnya",
    author: "Jane",
    body: `Samuel found a king and anointed him. He went home with oil still on his hands and the promise of a new chapter for Israel. And Saul — who had been riding high on God's anointing — heard about it and fell into a rage. The anointing on someone else's life became his undoing. What was meant to be good news looked, through the lens of his fear, like a threat.

Comparison and jealousy are fear wearing different clothes. And they will cost you more than you ever expect.

But here's the mercy that cuts through all of it: Lamentations 3:22-23. Because of the Lord's great love we are not consumed, for His compassions never fail. They are new every morning; great is Your faithfulness.

New every morning. Your worst yesterday doesn't follow you into today. Your biggest failure, your worst reaction, your lowest moment — none of it gets carried over into the new day's account. God's compassions reset. Completely. Without record of debt.

You don't have to earn your way back into grace. You just have to receive what's already been extended. Every single morning is a new beginning — not because your circumstances changed overnight, but because His mercy showed up before you did.

Whatever yesterday looked like — today is new. Receive it.`,
    bodyId: `Samuel menemukan seorang raja dan mengurapinya. Dia pulang dengan minyak masih di tangannya dan janji akan babak baru bagi Israel. Dan Saul — yang selama ini menikmati urapan Tuhan — mendengar tentang hal itu dan jatuh ke dalam kemarahan. Urapan pada kehidupan orang lain menjadi kehancurannya. Apa yang seharusnya kabar baik terlihat, melalui lensa ketakutannya, seperti ancaman.

Perbandingan dan iri hati adalah ketakutan yang mengenakan pakaian berbeda. Dan keduanya akan merugikan Anda lebih dari yang Anda bayangkan.

Tapi inilah belas kasihan yang menembus semua itu: Ratapan 3:22-23. Karena kasih setia Tuhan, kita tidak habis binasa; sebab belas kasihan-Nya tidak pernah berakhir. Setiap pagi kasih-Nya selalu baru; besar kesetiaan-Mu!

Setiap pagi selalu baru. Hari terburuk Anda kemarin tidak mengikuti Anda ke hari ini. Kegagalan terbesar Anda, reaksi terburuk Anda, momen terendah Anda — tidak satu pun yang terbawa ke rekening hari baru. Belas kasihan Tuhan dimulai dari nol. Sepenuhnya. Tanpa catatan utang.

Anda tidak perlu bersusah payah kembali ke dalam kasih karunia. Anda hanya perlu menerima apa yang sudah diberikan. Setiap pagi adalah awal yang baru — bukan karena keadaan Anda berubah semalam, tapi karena belas kasihan-Nya sudah hadir sebelum Anda bangun.

Apa pun rupa hari kemarin — hari ini adalah baru. Terimalah.`,
  },
  {
    title: "Where His Presence Meets Your Fear",
    titleId: "Di Mana Hadirat-Nya Bertemu Ketakutan Anda",
    author: "Ashley",
    body: `David — the same David who killed Goliath, who wrote the Psalms, who was called a man after God's own heart — spent years running. Running from Saul. Running from betrayal. Running from his own past. And in Psalm 16, in the middle of all that running, he writes something that sounds almost impossible: you will fill me with joy in your presence.

Presence and fear cannot occupy the same space at the same level. When presence increases, fear decreases. Not because your circumstances changed, but because the awareness of who is with you changes everything about how you experience them.

Psalm 16:11 says: You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand. The path becomes clear in His presence. The joy becomes full in His presence. The fear that felt massive becomes manageable in His presence.

Most people deal with fear by analysing it, avoiding it, or trying to manage it. God's strategy is simpler: draw near. Because in His presence, the fear that seemed overwhelming stops making sense.

Spend time in His presence today — not to feel better, but to see clearly. What looks enormous at a distance looks different when you're standing next to the One who holds it all.`,
    bodyId: `Daud — Daud yang sama yang membunuh Goliat, yang menulis Mazmur, yang disebut sebagai orang yang berkenan di hati Tuhan — menghabiskan bertahun-tahun berlari. Berlari dari Saul. Berlari dari pengkhianatan. Berlari dari masa lalunya sendiri. Dan dalam Mazmur 16, di tengah semua pelarian itu, dia menulis sesuatu yang terdengar hampir mustahil: Engkau akan memenuhi aku dengan sukacita di hadapan-Mu.

Hadirat dan ketakutan tidak bisa menempati ruang yang sama pada level yang sama. Ketika hadirat bertambah, ketakutan berkurang. Bukan karena keadaan Anda berubah, tapi karena kesadaran tentang siapa yang menyertai Anda mengubah segalanya tentang bagaimana Anda mengalaminya.

Mazmur 16:11 berkata: Engkau memberitahukan kepadaku jalan kehidupan; Engkau akan memenuhi aku dengan sukacita di hadapan-Mu, dengan kesenangan di tangan kanan-Mu untuk selama-lamanya. Jalan menjadi jelas dalam hadirat-Nya. Sukacita menjadi penuh dalam hadirat-Nya. Ketakutan yang terasa besar menjadi bisa dikelola dalam hadirat-Nya.

Kebanyakan orang menangani ketakutan dengan menganalisisnya, menghindarinya, atau mencoba mengelolanya. Strategi Tuhan lebih sederhana: mendekat. Karena dalam hadirat-Nya, ketakutan yang tampak menguasai berhenti masuk akal.

Habiskan waktu dalam hadirat-Nya hari ini — bukan untuk merasa lebih baik, tapi untuk melihat dengan jelas. Apa yang terlihat sangat besar dari kejauhan terlihat berbeda ketika Anda berdiri di samping Dia yang memegang semuanya.`,
  },
  {
    title: "God Never Designed You for Survival Mode",
    titleId: "Tuhan Tidak Pernah Merancang Anda untuk Mode Bertahan",
    author: "Jane",
    body: `Most of the Christians I know are living in survival mode. Just enough. Getting by. Holding on. Making it through the week. And when things get hard, they lower their expectations and call it faith. But I want to say clearly: settling is not the same as surrendering. Surviving is not the same as trusting.

John 10:10 is one of the most clarifying verses in the New Testament: the thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full. The word Jesus uses — perissos in Greek — means superabundant. Excessive. Over and above. More than enough.

That's not a description of survival. That's a description of overflow.

The thief's goal is exactly what you see all around you: diminished lives, stolen dreams, destroyed potential. He is systematic. He is patient. He is committed to keeping you just small enough that you stop expecting more.

But Jesus came with a counter offer. Not a barely-enough life. Not a manage-your-way-through life. A full life. A spilling-over life. A life so marked by His presence that people notice the difference.

You don't have to accept the thief's terms. You were made for the life Jesus promised. Stop settling for the counterfeit.`,
    bodyId: `Kebanyakan orang Kristen yang saya kenal hidup dalam mode bertahan. Sekadar cukup. Bertahan. Melewati minggu ini. Dan ketika segalanya menjadi sulit, mereka menurunkan harapan dan menyebutnya iman. Tapi saya ingin mengatakan dengan jelas: berpuas diri bukan sama dengan berserah. Bertahan bukan sama dengan percaya.

Yohanes 10:10 adalah salah satu ayat yang paling menjelaskan di Perjanjian Baru: pencuri datang hanya untuk mencuri dan membunuh dan membinasakan; Aku datang supaya mereka mempunyai hidup, dan mempunyainya dalam segala kelimpahan. Kata yang Yesus gunakan — perissos dalam bahasa Yunani — berarti berlimpah-limpah. Berlebih. Melebihi dan melampaui. Lebih dari cukup.

Itu bukan deskripsi bertahan hidup. Itu deskripsi melimpah.

Tujuan pencuri persis seperti yang Anda lihat di sekitar Anda: kehidupan yang diminimalkan, mimpi yang dicuri, potensi yang dihancurkan. Dia sistematis. Dia sabar. Dia berkomitmen untuk menjaga Anda tetap cukup kecil sehingga Anda berhenti mengharapkan lebih.

Tapi Yesus datang dengan tawaran tandingan. Bukan hidup yang pas-pasan. Bukan hidup yang mengelola jalan keluar. Hidup yang penuh. Hidup yang melimpah. Hidup yang begitu ditandai oleh hadirat-Nya sehingga orang-orang melihat perbedaannya.

Anda tidak harus menerima syarat sang pencuri. Anda diciptakan untuk hidup yang Yesus janjikan. Berhentilah menerima yang palsu.`,
  },
  {
    title: "Step Forward — He's Already There",
    titleId: "Melangkahlah — Dia Sudah Ada di Sana",
    author: "Ashley",
    body: `David walked toward Goliath. Not after the fear went away. Not after he had a strategic military plan. Not after the army had his back. He just walked toward the giant while everyone else stood still.

That image has stayed with me for years. Because what David knew — what made him different from everyone else on that field — was not his skill with a stone. It was his certainty about whose presence was with him. He had met God in the quiet places, in the fields with the sheep, and he knew: the same God who delivered the lion, the same God who delivered the bear, was standing with him now.

Deuteronomy 31:6 says be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; He will never leave you nor forsake you.

He goes with you. Present tense. Into the new conversation, the new season, the confrontation you've been avoiding, the step you've been putting off. He's already in the room before you get there.

Stop waiting for the fear to disappear before you move. Take the step. David didn't run after the giant because he was fearless. He ran because he was certain about who was running with him.`,
    bodyId: `Daud berjalan menuju Goliat. Bukan setelah ketakutannya hilang. Bukan setelah dia punya rencana militer strategis. Bukan setelah tentara mendukungnya. Dia hanya berjalan menuju sang raksasa sementara semua orang berdiri diam.

Gambaran itu tinggal dalam benak saya selama bertahun-tahun. Karena yang Daud ketahui — yang membuatnya berbeda dari semua orang di medan itu — bukan keahliannya dengan batu. Tapi kepastiannya tentang hadirat siapa yang menyertainya. Dia sudah bertemu Tuhan di tempat-tempat sunyi, di padang bersama domba-domba, dan dia tahu: Tuhan yang sama yang melepaskannya dari singa, Tuhan yang sama yang melepaskannya dari beruang, sedang berdiri bersamanya sekarang.

Ulangan 31:6 berkata kuatkan dan teguhkan hatimu. Janganlah takut dan janganlah gentar menghadapi mereka, sebab Tuhan Allahmu, Dialah yang berjalan menyertai engkau; Ia tidak akan membiarkan engkau dan tidak akan meninggalkan engkau.

Dia berjalan menyertai engkau. Kala kini. Ke dalam percakapan baru, musim baru, konfrontasi yang selama ini Anda hindari, langkah yang selama ini Anda tunda. Dia sudah ada di ruangan itu sebelum Anda tiba.

Berhentilah menunggu rasa takut menghilang sebelum Anda bergerak. Ambil langkahnya. Daud tidak berlari ke arah raksasa itu karena dia tidak takut. Dia berlari karena dia yakin tentang siapa yang berlari bersamanya.`,
  },
  {
    title: "One Life Can Change Everything",
    titleId: "Satu Kehidupan Bisa Mengubah Segalanya",
    author: "Jane",
    body: `When David picked up five smooth stones, the entire Philistine and Israelite armies stopped. Two entire armies, frozen, watching one teenage boy walk toward a professional warrior who had been mocking them for forty days.

One person. Carrying authority. Walking in certainty. And the entire atmosphere of that valley shifted.

Ephesians 2:10 says we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do. Prepared in advance. Your good works aren't improvised. They aren't accidents. They are pre-planned assignments with your name on them, placed in your path at exactly the right moment.

You may look at the giants in your world — in your family, your workplace, your community — and feel like one person couldn't possibly make a difference. But that's not what history says. History says one person who carries God's authority and walks in certainty can stop an army.

You are not a bystander in this moment. You are a prepared, purposeful work of God's own craftsmanship. The good works He prepared for you exist right now, in the exact field where He's placed you.

Step forward. Not because you're extraordinary. Because He is — and He made you for this.`,
    bodyId: `Ketika Daud mengambil lima batu licin, seluruh tentara Filistin dan Israel berhenti. Dua pasukan besar, membeku, menyaksikan seorang remaja berjalan menuju prajurit profesional yang telah mengejek mereka selama empat puluh hari.

Satu orang. Membawa otoritas. Berjalan dalam kepastian. Dan seluruh atmosfer lembah itu berubah.

Efesus 2:10 berkata karena kita ini buatan Allah, diciptakan dalam Kristus Yesus untuk melakukan pekerjaan baik, yang dipersiapkan Allah sebelumnya untuk kita lakukan. Dipersiapkan sebelumnya. Pekerjaan baik Anda bukan improvisasi. Bukan kebetulan. Itu adalah penugasan yang sudah direncanakan dengan nama Anda tertera, ditempatkan di jalur Anda pada saat yang tepat.

Anda mungkin melihat para raksasa di dunia Anda — dalam keluarga, tempat kerja, komunitas Anda — dan merasa satu orang tidak mungkin bisa membuat perbedaan. Tapi bukan itu yang dikatakan sejarah. Sejarah berkata satu orang yang membawa otoritas Tuhan dan berjalan dalam kepastian bisa menghentikan sebuah pasukan.

Anda bukan penonton di momen ini. Anda adalah karya Tuhan yang disiapkan dan bertujuan, hasil kerajinan-Nya sendiri. Pekerjaan baik yang Dia persiapkan untuk Anda ada sekarang, di ladang yang tepat di mana Dia menempatkan Anda.

Melangkahlah maju. Bukan karena Anda luar biasa. Karena Dia luar biasa — dan Dia menciptakan Anda untuk ini.`,
  },
  {
    title: "He Always Finishes What He Starts",
    titleId: "Dia Selalu Menyelesaikan Apa yang Dia Mulai",
    author: "Ashley",
    body: `The journey from shepherd to king was not a straight line for David. There were caves. There were betrayals. There was a moment where he was so exhausted and broken that he literally sat in ashes and wept. There were years where the promise looked dead — where everything God had said seemed impossibly far from where David actually was.

And yet the story always moved forward. Slowly, painfully, often incomprehensibly — but forward.

Philippians 1:6 says: He who began a good work in you will carry it on to completion until the day of Christ Jesus. The word carry on means to bring to full maturity. God doesn't start things without the intention of finishing them. He doesn't lose interest. He doesn't run out of energy. He doesn't give up on a project partway through.

You are that project. Your life — the messy, complicated, not-yet-finished version of it — is something God began and is actively completing.

The caves are part of the process. The delay is not abandonment. The silence is not absence. He is working on your story with the same commitment He had on the day He first called you. His faithfulness doesn't fluctuate with your performance.

You are not a half-finished work. You are an in-progress masterpiece. And the Artist never puts down the brush.`,
    bodyId: `Perjalanan dari gembala menjadi raja bukanlah garis lurus bagi Daud. Ada gua-gua. Ada pengkhianatan. Ada saat di mana dia begitu lelah dan hancur sehingga dia benar-benar duduk di abu dan menangis. Ada tahun-tahun di mana janji itu tampak mati — di mana semua yang Tuhan katakan tampak mustahil dari tempat Daud berada sebenarnya.

Namun kisahnya selalu bergerak maju. Perlahan, menyakitkan, sering tidak bisa dipahami — tapi maju.

Filipi 1:6 berkata: Ia yang memulai pekerjaan yang baik di antara kamu, akan meneruskannya sampai pada hari Kristus Yesus. Kata meneruskan berarti membawa kepada kedewasaan penuh. Tuhan tidak memulai sesuatu tanpa niat menyelesaikannya. Dia tidak kehilangan minat. Dia tidak kehabisan energi. Dia tidak menyerah di tengah proyek.

Anda adalah proyek itu. Hidup Anda — versi yang berantakan, rumit, belum selesai — adalah sesuatu yang Tuhan mulai dan sedang aktif menyelesaikan.

Gua-gua itu bagian dari proses. Penundaan bukan pengabaian. Kesunyian bukan ketidakhadiran. Dia sedang mengerjakan kisah Anda dengan komitmen yang sama seperti di hari pertama Dia memanggil Anda. Kesetiaan-Nya tidak berfluktuasi dengan kinerja Anda.

Anda bukan karya yang setengah jadi. Anda adalah mahakarya yang sedang dalam proses. Dan sang Seniman tidak pernah meletakkan kuasnya.`,
  },
  {
    title: "Nothing Can Cut You Off From His Love",
    titleId: "Tidak Ada yang Bisa Memisahkan Anda dari Kasih-Nya",
    author: "Jane",
    body: `Romans 8 is one of the most extraordinary chapters in the entire Bible. It ends with a list that reads like Paul is daring the universe to find an exception — and then triumphantly proving there isn't one. I am convinced, he writes, that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.

Read that list again slowly. Death. Life. Angels. Demons. Present. Future. Powers. Height. Depth. Anything else in all creation.

He's covered every category. He's closed every loophole. He's removed every possible escape route from His love. There is no version of your life — no failure deep enough, no distance far enough, no season dark enough — that can detach you from it.

This is not the love of someone who loves you when you're performing well. This is not the love of someone who's running a complicated cost-benefit analysis on your worth. This is a love that pursued you before you were worthy of it and will hold onto you until you're fully transformed by it.

You are loved — completely, permanently, relentlessly. Let that be the ground you stand on today.`,
    bodyId: `Roma 8 adalah salah satu pasal paling luar biasa di seluruh Alkitab. Ia diakhiri dengan daftar yang terasa seperti Paulus menantang alam semesta untuk menemukan pengecualian — dan kemudian dengan penuh kemenangan membuktikan tidak ada. Aku yakin, tulisnya, bahwa baik maut, maupun hidup, baik malaikat-malaikat, maupun pemerintah-pemerintah, baik yang ada sekarang, maupun yang akan datang, maupun kuasa-kuasa, baik yang di atas, maupun yang di bawah, maupun sesuatu makhluk lain, tidak akan dapat memisahkan kita dari kasih Allah, yang ada dalam Kristus Yesus, Tuhan kita.

Bacalah daftar itu perlahan lagi. Maut. Hidup. Malaikat. Iblis. Masa kini. Masa depan. Kuasa-kuasa. Ketinggian. Kedalaman. Sesuatu makhluk lain.

Dia sudah mencakup setiap kategori. Dia sudah menutup setiap celah. Dia sudah menghilangkan setiap kemungkinan jalan keluar dari kasih-Nya. Tidak ada versi kehidupan Anda — tidak ada kegagalan yang cukup dalam, tidak ada jarak yang cukup jauh, tidak ada musim yang cukup gelap — yang dapat memisahkan Anda darinya.

Ini bukan kasih seseorang yang mengasihi Anda ketika Anda berprestasi baik. Ini bukan kasih seseorang yang menjalankan analisis untung-rugi yang rumit atas nilai Anda. Ini adalah kasih yang mengejar Anda sebelum Anda layak menerimanya dan akan memegang Anda sampai Anda sepenuhnya diubahkan olehnya.

Anda dikasihi — sepenuhnya, selamanya, tanpa henti. Biarlah itu menjadi tanah tempat Anda berpijak hari ini.`,
  },

  // ── SECTION 4: GRACE, THE CHURCH & BREAKTHROUGH (Days 31–40) ──────────────
  {
    title: "Grace Is Not a Participation Trophy",
    titleId: "Kasih Karunia Bukan Hadiah Hiburan",
    author: "Ashley",
    body: `For too long, the church has presented grace as a consolation prize. You tried hard, you meant well, you fell short — here's some grace to soften the edges. But that's not what grace is. Grace isn't the cleanup crew. Grace is the whole revolution.

Romans 5:17 says those who receive God's abundant provision of grace and of the gift of righteousness reign in life through the one man, Jesus Christ. Reign in life. Not scrape through life. Not survive life. Reign.

The grace and favour revolution isn't a theological adjustment. It's a complete inversion of how you think about your relationship with God. You were never meant to grind your way to His blessing. You were never meant to earn your way into His favour. Grace is the atmosphere of the Kingdom — the unforced, unconditional, inexhaustible supply of God's goodness toward you.

The religious mind looks at that and gets nervous. It wants to add conditions, to put in safeguards, to make sure nobody takes advantage. But God's grace doesn't need your protection. It needs your surrender.

Stop treating grace like something you draw on when you fail. Start living in it as the baseline of your entire existence. You are not a sinner saved by grace. You are a saint who lives in it, moves from it, and gives it away freely.`,
    bodyId: `Terlalu lama gereja menyajikan kasih karunia sebagai hadiah hiburan. Kamu sudah berusaha keras, kamu berniat baik, kamu gagal — ini kasih karunia untuk melembutkan sisi-sisi yang tajam. Tapi bukan itu kasih karunia. Kasih karunia bukan tim pembersih. Kasih karunia adalah seluruh revolusi.

Roma 5:17 berkata mereka yang menerima limpahan kasih karunia Allah dan karunia kebenaran, memerintah dalam hidup oleh satu orang, yaitu Yesus Kristus. Memerintah dalam hidup. Bukan sekadar bertahan melewati hidup. Bukan sekadar menjalani hidup. Memerintah.

Revolusi kasih karunia dan kemurahan bukan sekadar penyesuaian teologis. Ini adalah pembalikan total cara Anda berpikir tentang hubungan Anda dengan Tuhan. Anda tidak pernah dimaksudkan untuk berjuang keras menuju berkat-Nya. Anda tidak pernah dimaksudkan untuk mengusahakan jalan menuju kemurahan-Nya. Kasih karunia adalah atmosfer Kerajaan — persediaan kebaikan Tuhan yang tidak dipaksa, tanpa syarat, dan tidak pernah habis terhadap Anda.

Pikiran religius melihat itu dan menjadi gugup. Ia ingin menambahkan syarat, memasang pengaman, memastikan tidak ada yang memanfaatkan. Tapi kasih karunia Tuhan tidak membutuhkan perlindungan Anda. Yang dibutuhkan adalah penyerahan Anda.

Berhentilah memperlakukan kasih karunia seperti sesuatu yang Anda gunakan ketika gagal. Mulailah hidup di dalamnya sebagai dasar seluruh keberadaan Anda. Anda bukan orang berdosa yang diselamatkan oleh kasih karunia. Anda adalah orang kudus yang hidup di dalamnya, bergerak dari dalamnya, dan memberikannya secara cuma-cuma.`,
  },
  {
    title: "Back to the Original Design",
    titleId: "Kembali ke Desain Asli",
    author: "Jane",
    body: `Before the fall, there was Eden. And Eden wasn't just a beautiful garden — it was a system. A way of life. A blueprint for how humanity was designed to operate. No stress. No scarcity. No grinding for survival. Just supply. Abundance. Partnership with God. Adam worked, yes — but work in Eden wasn't toil. It was worship. It was creativity and cultivation, not striving and surviving.

The fall didn't just break a rule. It broke the system. It replaced supply with scarcity, partnership with performance, rest with restlessness.

And then Jesus came. And most people think He came to offer a different system — a heavenly substitute for the Edenic original. But that's not what He said. John 10:10: I have come that they may have life, and have it to the full.

He didn't come to give you a spiritual version of Eden. He came to restore the original. The supply. The abundance. The work-from-rest-not-for-rest design. The constant partnership with God that doesn't require you to strive.

You were not meant to hustle for God's favour. You were meant to be carried by it. Not working FOR provision — working FROM provision. That's the original design. And through Jesus, it's yours again.`,
    bodyId: `Sebelum kejatuhan, ada Eden. Dan Eden bukan sekadar taman yang indah — ia adalah sebuah sistem. Sebuah cara hidup. Sebuah cetak biru bagaimana manusia dirancang untuk beroperasi. Tanpa stres. Tanpa kekurangan. Tanpa berjuang untuk bertahan. Hanya persediaan. Kelimpahan. Kemitraan dengan Tuhan. Adam bekerja, ya — tapi pekerjaan di Eden bukan jerih payah. Itu adalah ibadah. Kreativitas dan pengolahan, bukan perjuangan dan bertahan.

Kejatuhan tidak hanya melanggar aturan. Ia merusak sistem. Ia menggantikan persediaan dengan kekurangan, kemitraan dengan kinerja, istirahat dengan kegelisahan.

Dan kemudian Yesus datang. Dan kebanyakan orang berpikir Dia datang untuk menawarkan sistem yang berbeda — pengganti surgawi untuk yang asli di Eden. Tapi bukan itu yang Dia katakan. Yohanes 10:10: Aku datang supaya mereka mempunyai hidup, dan mempunyainya dalam segala kelimpahan.

Dia tidak datang untuk memberi Anda versi rohani dari Eden. Dia datang untuk memulihkan yang asli. Persediaan. Kelimpahan. Desain bekerja-dari-istirahat bukan bekerja-untuk-istirahat. Kemitraan terus-menerus dengan Tuhan yang tidak mengharuskan Anda berjuang.

Anda tidak dimaksudkan untuk bersusah payah demi kemurahan Tuhan. Anda dimaksudkan untuk dipikul olehnya. Bukan bekerja UNTUK penyediaan — bekerja DARI penyediaan. Itulah desain aslinya. Dan melalui Yesus, itu milik Anda kembali.`,
  },
  {
    title: "It Really Is Finished",
    titleId: "Sungguh Sudah Selesai",
    author: "Ashley",
    body: `When Jesus hung on the cross and said "It is finished," the most educated religious minds in Jerusalem heard those words and thought He was done. Defeated. Over. What they couldn't see was that "finished" wasn't a statement of failure. It was a declaration of completion. The Greek word — tetelestai — was the same word stamped on debt records in that era. Paid in full. Every charge. Every debt. Every requirement. Done.

The debt is paid. The sacrifice is sufficient. Nothing left to do. Nothing left to add. Nothing left to prove. Finished.

But here's the pattern most Christians fall into: they read "It is finished" — they nod their heads, they believe it in theory — and then they spend the rest of their life trying to add to it. More prayer. More performance. More effort. As if Jesus got them 90% of the way there and now it's their job to close the gap.

There is no gap. He closed it completely.

Second Corinthians 5:21 says God made Him who had no sin to be sin for us, so that in Him we might become the righteousness of God. Not that we might work toward righteousness. Not that we might get close. That we might become it — fully, completely, in Him.

Live from what's finished. Stop trying to finish what's already done.`,
    bodyId: `Ketika Yesus tergantung di kayu salib dan berkata "Sudah selesai," pikiran-pikiran religius yang paling terdidik di Yerusalem mendengar kata-kata itu dan mengira Dia sudah selesai. Kalah. Tamat. Yang tidak bisa mereka lihat adalah bahwa "sudah selesai" bukan pernyataan kekalahan. Itu adalah deklarasi penyelesaian. Kata Yunaninya — tetelestai — adalah kata yang sama yang dicap pada catatan utang di era itu. Lunas. Setiap tuntutan. Setiap utang. Setiap persyaratan. Selesai.

Utangnya sudah dibayar. Korbannya sudah cukup. Tidak ada yang perlu dilakukan lagi. Tidak ada yang perlu ditambahkan. Tidak ada yang perlu dibuktikan. Selesai.

Tapi inilah pola yang diikuti kebanyakan orang Kristen: mereka membaca "Sudah selesai" — mereka mengangguk, mereka mempercayainya secara teori — lalu menghabiskan sisa hidup mereka mencoba menambahkan sesuatu padanya. Lebih banyak doa. Lebih banyak kinerja. Lebih banyak usaha. Seolah Yesus membawa mereka 90% ke sana dan sekarang tugas mereka untuk menutup selisihnya.

Tidak ada selisih. Dia menutupnya sepenuhnya.

2 Korintus 5:21 berkata Tuhan telah menjadikan Dia yang tidak mengenal dosa menjadi dosa karena kita, supaya dalam Dia kita dibenarkan oleh Allah. Bukan supaya kita bisa berusaha menuju kebenaran. Bukan supaya kita bisa mendekati. Supaya kita menjadi kebenaran itu — sepenuhnya, selengkapnya, di dalam Dia.

Hiduplah dari apa yang sudah selesai. Berhentilah mencoba menyelesaikan apa yang sudah rampung.`,
  },
  {
    title: "Grace First — Then Faith Responds",
    titleId: "Kasih Karunia Dulu — Lalu Iman Merespons",
    author: "Jane",
    body: `There are entire movements built on the idea that faith is the engine. Just believe. Have more faith. Confess it. Declare it. Speak it into existence. And faith does move mountains — this is true. But somewhere along the way we got the order dangerously wrong. We made faith the source and left grace as the dependent variable.

Ephesians 2:8-9 is brutally clear: for it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God — not by works, so that no one can boast.

Grace first. Faith responds to grace. Not the other way around.

When you make faith the source, you put the pressure on yourself. You end up measuring your outcome by the quantity of your belief, the fervency of your prayer, the consistency of your confession. And when things don't work out, the conclusion is always the same: you didn't have enough faith.

But when grace is the source, everything changes. You're not trying to generate enough faith to make God move. You're responding — with trust, with gratitude, with open hands — to a God who has already moved toward you.

Your faith is not the lever that activates God. Grace is the ground. Faith is how you walk on it. Start from grace today.`,
    bodyId: `Ada seluruh gerakan yang dibangun di atas gagasan bahwa iman adalah mesinnya. Percaya saja. Miliki lebih banyak iman. Akui. Deklarasikan. Ucapkan sampai terwujud. Dan memang iman memindahkan gunung — ini benar. Tapi di suatu titik kita salah urutan secara berbahaya. Kita menjadikan iman sebagai sumber dan meninggalkan kasih karunia sebagai variabel yang bergantung.

Efesus 2:8-9 sangat jelas: sebab karena kasih karunia kamu diselamatkan oleh iman — itu bukan hasil usahamu, tetapi pemberian Allah — bukan hasil pekerjaanmu, jangan ada orang yang memegahkan diri.

Kasih karunia dulu. Iman merespons kasih karunia. Bukan sebaliknya.

Ketika Anda menjadikan iman sebagai sumber, Anda menaruh tekanan pada diri sendiri. Anda akhirnya mengukur hasil berdasarkan kuantitas keyakinan Anda, semangat doa Anda, konsistensi pengakuan Anda. Dan ketika hasilnya tidak sesuai harapan, kesimpulannya selalu sama: Anda tidak punya cukup iman.

Tapi ketika kasih karunia adalah sumbernya, segalanya berubah. Anda bukan berusaha menghasilkan cukup iman untuk membuat Tuhan bergerak. Anda merespons — dengan kepercayaan, dengan rasa syukur, dengan tangan terbuka — kepada Tuhan yang sudah lebih dulu bergerak menuju Anda.

Iman Anda bukan tuas yang mengaktifkan Tuhan. Kasih karunia adalah landasannya. Iman adalah cara Anda berjalan di atasnya. Mulailah dari kasih karunia hari ini.`,
  },
  {
    title: "You Were Designed for Overflow",
    titleId: "Anda Dirancang untuk Melimpah",
    author: "Ashley",
    body: `Picture a cup under a running faucet. At first it fills slowly. The water rises. Then it reaches the rim. And then — it overflows. And once it overflows, everything around the cup gets wet. The surface. The table. Everything nearby. The overflow is the point where the cup stops being merely full and starts being a source.

John 7:37-38: whoever believes in Me, as Scripture has said, rivers of living water will flow from within them.

Rivers. Plural. From within. Not a trickle. Not a managed flow. Rivers.

Most Christians are trying to be full. They're focusing all their spiritual effort on getting enough in themselves to feel okay — enough peace, enough faith, enough strength for the day. And there's nothing wrong with being filled. But God's design doesn't stop at full. He designed you to overflow. Because the people around you need what's spilling out of you.

Your family doesn't just need a functional version of you. They need an overflowing version of you. Your workplace doesn't just need someone surviving the week. It needs someone carrying rivers.

Stop aiming for just enough. Connect to the source. Let it fill past your capacity. Let it spill. That's the life you were designed for. Stop surviving. Start overflowing.`,
    bodyId: `Bayangkan sebuah cangkir di bawah keran yang mengalir. Awalnya terisi perlahan. Air naik. Lalu mencapai bibir. Dan kemudian — melimpah. Dan begitu melimpah, semua yang ada di sekitar cangkir menjadi basah. Permukaan. Meja. Semua yang ada di dekatnya. Limpahan adalah titik di mana cangkir berhenti sekadar penuh dan mulai menjadi sumber.

Yohanes 7:37-38: barangsiapa percaya kepada-Ku, seperti yang dikatakan oleh Kitab Suci, sungai-sungai air hidup akan mengalir dari dalam hatinya.

Sungai-sungai. Jamak. Dari dalam. Bukan tetesan. Bukan aliran yang dikelola. Sungai-sungai.

Kebanyakan orang Kristen berusaha menjadi penuh. Mereka memfokuskan seluruh usaha rohani untuk mendapatkan cukup dalam diri mereka agar merasa baik-baik saja — cukup damai, cukup iman, cukup kekuatan untuk hari ini. Dan tidak ada yang salah dengan dipenuhi. Tapi desain Tuhan tidak berhenti di penuh. Dia merancang Anda untuk melimpah. Karena orang-orang di sekitar Anda membutuhkan apa yang tumpah dari Anda.

Keluarga Anda tidak hanya membutuhkan versi fungsional dari Anda. Mereka membutuhkan versi yang melimpah dari Anda. Tempat kerja Anda tidak hanya membutuhkan seseorang yang bertahan melewati minggu ini. Ia membutuhkan seseorang yang membawa sungai-sungai.

Berhentilah mengincar yang sekadar cukup. Terhubunglah ke sumbernya. Biarkan ia mengisi melewati kapasitas Anda. Biarkan ia tumpah. Itulah hidup yang Anda dirancang untuknya. Berhenti bertahan. Mulailah melimpah.`,
  },
  {
    title: "You Cannot Love Jesus and Reject His Church",
    titleId: "Anda Tidak Bisa Mengasihi Yesus dan Menolak Gereja-Nya",
    author: "Jane",
    body: `People say it all the time: I love Jesus, I just don't need the church. And I understand the sentiment — I do. Churches have hurt people. Institutions have failed people. Leaders have disappointed people. There are real wounds in those statements.

But here's what those statements also get wrong: you cannot fully love Jesus while rejecting the thing He loves most.

Ephesians 5:25-27 says Christ loved the church and gave Himself up for her. Everything. He gave everything for the church. His entire mission, His death, His resurrection — all of it pointed toward the creation and purification of His church.

The church is not an optional add-on to the Christian life. The church is the body of Christ. And you don't get to love the head while rejecting the body. Matthew 16:18: I will build my church, and the gates of hell will not overcome it.

He's still building it. He's not moved on to a better delivery system. He's not waiting for a more polished institution. He's building His church — with broken, imperfect, redeemed people — and He has staked His reputation on its victory.

You belong in it. Not a perfect version of it — the real one, in a real community, with real people. That's where you'll find the fullness you've been looking for outside it.`,
    bodyId: `Orang selalu mengatakannya: Saya mengasihi Yesus, saya hanya tidak butuh gereja. Dan saya memahami sentimen itu — betul. Gereja telah melukai orang. Institusi telah mengecewakan orang. Pemimpin telah mengecewakan orang. Ada luka nyata di balik pernyataan-pernyataan itu.

Tapi inilah yang juga salah dari pernyataan-pernyataan itu: Anda tidak bisa sepenuhnya mengasihi Yesus sambil menolak hal yang paling Dia kasihi.

Efesus 5:25-27 berkata Kristus telah mengasihi gereja dan telah menyerahkan diri-Nya baginya. Segalanya. Dia memberikan segalanya untuk gereja. Seluruh misi-Nya, kematian-Nya, kebangkitan-Nya — semuanya menunjuk pada penciptaan dan penyucian gereja-Nya.

Gereja bukan tambahan opsional untuk kehidupan Kristen. Gereja adalah tubuh Kristus. Dan Anda tidak bisa mengasihi kepala sambil menolak tubuhnya. Matius 16:18: Aku akan membangun jemaat-Ku, dan alam maut tidak akan menguasainya.

Dia masih membangunnya. Dia tidak beralih ke sistem pengiriman yang lebih baik. Dia tidak menunggu institusi yang lebih rapi. Dia membangun gereja-Nya — dengan orang-orang yang rusak, tidak sempurna, dan ditebus — dan Dia mempertaruhkan reputasi-Nya pada kemenangannya.

Anda milik gereja. Bukan versi sempurnanya — yang nyata, dalam komunitas nyata, dengan orang-orang nyata. Di situlah Anda akan menemukan kepenuhan yang selama ini Anda cari di luarnya.`,
  },
  {
    title: "You Are the Body — Not the Audience",
    titleId: "Anda Adalah Tubuh — Bukan Penonton",
    author: "Ashley",
    body: `I used to say it to stir debate: you can be a Christian without church like being 100 feet underwater without breathing — for about four minutes. People were furious. But I wasn't being provocative for its own sake. I was telling the truth. And the truth is this: you can survive as a disconnected Christian for a season. But eventually, your faith suffocates.

First Corinthians 12:27 says now you are the body of Christ, and each one of you is a part of it. Not a member of an organisation. Part of a body.

A hand cut off from the arm doesn't become a free hand. It becomes a dead hand. Disconnection doesn't produce freedom — it produces atrophy. The life of the body flows through connection, through relationship, through being attached to the whole.

And here's the other side of it: the body needs you in it. You are not optional. First Corinthians 12:22 says the parts of the body that seem to be weaker are indispensable. Indispensable. Without you, something is missing that cannot be replaced by anyone else.

Your gift, your voice, your presence in the community of faith — it matters to the whole. You were not born again to be an audience member. You are the body. Show up, engage, contribute. The church is incomplete without you in it.`,
    bodyId: `Saya dulu mengatakannya untuk memicu perdebatan: Anda bisa menjadi orang Kristen tanpa gereja seperti berada 30 meter di bawah air tanpa bernapas — sekitar empat menit. Orang-orang marah. Tapi saya tidak sedang provokatif tanpa alasan. Saya menyampaikan kebenaran. Dan kebenarannya adalah: Anda bisa bertahan sebagai orang Kristen yang terputus untuk sementara. Tapi akhirnya, iman Anda akan sesak napas.

1 Korintus 12:27 berkata kamu semua adalah tubuh Kristus, dan kamu masing-masing adalah anggotanya. Bukan anggota sebuah organisasi. Bagian dari sebuah tubuh.

Tangan yang dipotong dari lengan tidak menjadi tangan yang bebas. Ia menjadi tangan yang mati. Keterputusan tidak menghasilkan kebebasan — ia menghasilkan kemunduran. Kehidupan tubuh mengalir melalui koneksi, melalui hubungan, melalui keterhubungan dengan keseluruhan.

Dan inilah sisi lainnya: tubuh membutuhkan Anda di dalamnya. Anda bukan opsional. 1 Korintus 12:22 berkata anggota-anggota tubuh yang nampaknya paling lemah, justru paling dibutuhkan. Paling dibutuhkan. Tanpa Anda, ada sesuatu yang hilang yang tidak bisa digantikan oleh orang lain.

Karunia Anda, suara Anda, kehadiran Anda dalam komunitas iman — itu penting bagi keseluruhan. Anda tidak dilahirkan kembali untuk menjadi anggota penonton. Anda adalah tubuhnya. Hadirlah, terlibatlah, berkontribusilah. Gereja tidak lengkap tanpa Anda di dalamnya.`,
  },
  {
    title: "The Love Story That Beats Everything",
    titleId: "Kisah Cinta yang Mengalahkan Segalanya",
    author: "Jane",
    body: `I've heard a lot of great love stories. Ashley and I have one of our own — the kind that still surprises me with its faithfulness, the moments of grace between two imperfect people who chose each other anyway. But not even our story — not a single love story in human history — comes close to the greatest one ever told: Jesus and His church.

This is the love story the whole Bible is building toward. God doesn't create a church the way a CEO creates a company. He creates her the way a bridegroom prepares for a bride. With intention. With tenderness. With the willingness to give everything.

Ephesians 5:25-27: He gave Himself up for her to make her holy, cleansing her by the washing with water through the word, and to present her to Himself as a radiant church, without stain or wrinkle or any other blemish, but holy and blameless.

Radiant. Without blemish. That's how He sees her. That's how He's preparing her. Every imperfect person, every messy congregation, every fumbling, faithful community of believers is being made radiant.

When you look at the church and see the mess, you're seeing the in-progress version. He sees the finished one. He sees what His love is making her into. And He thinks she's worth everything.`,
    bodyId: `Saya sudah mendengar banyak kisah cinta yang indah. Ashley dan saya punya kisah kami sendiri — kisah yang masih mengejutkan saya dengan kesetiaannya, momen-momen kasih karunia antara dua orang yang tidak sempurna yang tetap memilih satu sama lain. Tapi bahkan kisah kami — bahkan satu pun kisah cinta dalam sejarah manusia — tidak mendekati yang terbesar yang pernah diceritakan: Yesus dan gereja-Nya.

Inilah kisah cinta yang dibangun oleh seluruh Alkitab. Tuhan tidak menciptakan gereja seperti seorang CEO menciptakan perusahaan. Dia menciptakannya seperti seorang mempelai pria mempersiapkan mempelai wanitanya. Dengan intensi. Dengan kelembutan. Dengan kesediaan memberikan segalanya.

Efesus 5:25-27: Dia menyerahkan diri-Nya baginya untuk menguduskannya, sesudah Ia menyucikannya dengan pemandian air dan firman, supaya dengan demikian Ia menempatkan gereja di hadapan diri-Nya dengan cemerlang, tanpa noda atau kerut atau yang serupa itu, tetapi supaya gereja kudus dan tidak bercela.

Cemerlang. Tanpa cacat. Begitulah Dia melihatnya. Begitulah Dia mempersiapkannya. Setiap orang yang tidak sempurna, setiap jemaat yang berantakan, setiap komunitas orang percaya yang tergagap tapi setia sedang dijadikan cemerlang.

Ketika Anda melihat gereja dan melihat kekacauan, Anda melihat versi yang sedang dalam proses. Dia melihat yang sudah selesai. Dia melihat apa yang kasih-Nya sedang jadikan dari gereja. Dan Dia menganggapnya layak untuk segalanya.`,
  },
  {
    title: "Push Through Until Something Breaks",
    titleId: "Teruslah Menerobos Sampai Sesuatu Pecah",
    author: "Ashley",
    body: `Every breakthrough requires passing through the exact moment when you feel most like giving up. That's not a coincidence — it's a design feature of how breakthroughs work. The resistance is always highest just before the wall breaks. And the people who experience the other side are almost always the people who refused to stop five minutes before it happened.

Galatians 6:9 says: let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up. The harvest is coming. At the proper time. The only condition is: do not give up.

The enemy knows this better than most believers do. He knows where the walls are thin. He knows when you're close. And his most effective strategy is not to attack you when you're strong — it's to whisper "give up" right when the breakthrough is about to happen.

That whisper is not wisdom. It's fear dressed up as practicality.

Mark 5 records a woman who pushed through a crowd to touch the hem of Jesus' garment. She had every reason to stop — twelve years of suffering, spent everything, grown worse. But she pressed through. And the moment she touched Him, immediately the bleeding stopped.

The press is part of the process. Don't stop pressing. Something is about to break.`,
    bodyId: `Setiap terobosan mengharuskan Anda melewati momen di mana Anda paling ingin menyerah. Itu bukan kebetulan — itu adalah fitur desain dari cara terobosan bekerja. Resistensi selalu paling tinggi tepat sebelum dinding pecah. Dan orang-orang yang mengalami sisi seberang hampir selalu adalah orang-orang yang menolak berhenti lima menit sebelumnya.

Galatia 6:9 berkata: janganlah jemu-jemu berbuat baik, karena apabila sudah datang waktunya, kita akan menuai, jika kita tidak menyerah. Panen akan datang. Pada waktunya. Satu-satunya syarat adalah: jangan menyerah.

Musuh tahu ini lebih baik dari kebanyakan orang percaya. Dia tahu di mana dindingnya tipis. Dia tahu kapan Anda sudah dekat. Dan strateginya yang paling efektif bukan menyerang Anda saat Anda kuat — tapi berbisik "menyerahlah" tepat saat terobosan akan terjadi.

Bisikan itu bukan hikmat. Itu ketakutan yang berpakaian kepraktisan.

Markus 5 mencatat seorang perempuan yang menerobos kerumunan untuk menyentuh jubah Yesus. Dia punya segala alasan untuk berhenti — dua belas tahun menderita, sudah menghabiskan segalanya, semakin parah. Tapi dia terus menerobos. Dan saat dia menyentuh-Nya, seketika pendarahan berhenti.

Dorongan itu adalah bagian dari proses. Jangan berhenti mendorong. Sesuatu akan segera pecah.`,
  },
  {
    title: "No More Fear — This Is How the Story Ends",
    titleId: "Tidak Ada Lagi Ketakutan — Beginilah Kisahnya Berakhir",
    author: "Jane",
    body: `We've spent forty days looking fear in the face. We've named it, understood it, stood over it, and refused to let it lead. And now, on the final day, I want you to understand something: the goal was never to have a life without fear. The goal was to have a life where fear no longer has authority.

First John 4:18: there is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love.

Fear operates on the assumption that something is coming for you. That you deserve punishment. That the worst outcome is the most likely one. But perfect love — the complete, settled, nothing-to-prove love of God — drives that assumption out. Not by arguing with it. By filling you up so completely that there's no room for fear to operate.

This is where the journey ends — not with techniques for managing fear, but with being so loved that fear loses its address.

You've come too far to go back to the small life. Too many things have shifted in your understanding. Too much ground has been taken. So let this be your declaration: the fear that once had a place at the table is no longer welcome. You know who you are. You know whose you are. And that is more than enough. No more fear.`,
    bodyId: `Kita sudah menghabiskan empat puluh hari menatap ketakutan. Kita sudah menamakannya, memahaminya, berdiri di atasnya, dan menolak membiarkannya memimpin. Dan sekarang, di hari terakhir, saya ingin Anda memahami sesuatu: tujuannya tidak pernah untuk memiliki hidup tanpa ketakutan. Tujuannya adalah memiliki hidup di mana ketakutan tidak lagi memiliki otoritas.

1 Yohanes 4:18: tidak ada ketakutan di dalam kasih. Tetapi kasih yang sempurna mengusir ketakutan, sebab ketakutan mengandung hukuman. Orang yang takut belum sempurna di dalam kasih.

Ketakutan beroperasi dengan asumsi bahwa sesuatu sedang datang mengejar Anda. Bahwa Anda pantas dihukum. Bahwa hasil terburuk adalah yang paling mungkin. Tapi kasih yang sempurna — kasih Tuhan yang lengkap, mantap, tidak perlu membuktikan apa-apa — mengusir asumsi itu. Bukan dengan membantahnya. Dengan memenuhi Anda begitu penuh sehingga tidak ada ruang bagi ketakutan untuk beroperasi.

Di sinilah perjalanan berakhir — bukan dengan teknik untuk mengelola ketakutan, tapi dengan dikasihi begitu dalam sehingga ketakutan kehilangan alamatnya.

Anda sudah terlalu jauh untuk kembali ke hidup yang kecil. Terlalu banyak yang sudah bergeser dalam pemahaman Anda. Terlalu banyak wilayah yang sudah direbut. Maka biarlah ini menjadi deklarasi Anda: ketakutan yang dulu punya tempat di meja tidak lagi disambut. Anda tahu siapa Anda. Anda tahu milik siapa Anda. Dan itu lebih dari cukup. Tidak ada lagi ketakutan.`,
  },
];

export const ASHLEY_JANE_PLAN_PASSAGES: string[] = [
  '2 Timothy 1',     // Day 1: Stir the gift — boldness over fear
  'Isaiah 41',       // Day 2: Fear not, I am with you
  'Jeremiah 29',     // Day 3: Plans to prosper you
  'Philippians 4',   // Day 4: Rejoice, the Lord is near
  'Psalm 34',        // Day 5: The Lord delivers from all fears
  'Hebrews 12',      // Day 6: Run the race with endurance
  'Joshua 1',        // Day 7: Be strong and courageous
  'Proverbs 4',      // Day 8: Guard your heart
  'Isaiah 43',       // Day 9: I have called you by name
  'Ephesians 3',     // Day 10: Rooted in love
  'Luke 10',         // Day 11: One thing is needed
  'Ephesians 6',     // Day 12: Put on the full armor
  '1 John 4',        // Day 13: Perfect love casts out fear
  'Colossians 2',    // Day 14: Rooted and built up in Him
  '1 Peter 2',       // Day 15: Living stones
  'Ephesians 2',     // Day 16: Saved by grace through faith
  'Romans 8',        // Day 17: Nothing can separate us
  'James 1',         // Day 18: Count it all joy
  'Matthew 5',       // Day 19: Blessed are the meek
  'Joshua 14',       // Day 20: Give me this mountain
  'Psalm 139',       // Day 21: Fearfully and wonderfully made
  'John 15',         // Day 22: Abide in Me
  'Psalm 91',        // Day 23: Under His wings (was Romans 8 dup)
  'Lamentations 3',  // Day 24: His mercies are new
  'Psalm 16',        // Day 25: Fullness of joy
  'John 10',         // Day 26: The Good Shepherd
  'Deuteronomy 31',  // Day 27: He will never forsake you
  'Colossians 3',    // Day 28: Set your minds above (was Ephesians 2 dup)
  'Philippians 1',   // Day 29: He who began a good work
  'Isaiah 40',       // Day 30: They who wait on the Lord (was Romans 8 dup)
  'Romans 5',        // Day 31: Suffering produces perseverance
  'Psalm 27',        // Day 32: The Lord is my light (was John 10 dup)
  'John 19',         // Day 33: It is finished
  'Philippians 2',   // Day 34: Work out your salvation (was Ephesians 2 dup)
  'John 7',          // Day 35: Rivers of living water
  'Matthew 16',      // Day 36: You are the Christ
  '1 Corinthians 12', // Day 37: One body, many parts
  'Ephesians 5',     // Day 38: Walk in love
  'Galatians 6',     // Day 39: Sow to the Spirit
  '2 Corinthians 5', // Day 40: New creation (was 1 John 4 dup)
];

// ─── Days 41–100 ─────────────────────────────────────────────────────────────

const EXTRA_DEVOTIONALS: DailyDevotional[] = [
  // ── SECTION 5: GRACE & THE OVERFLOW LIFE (Days 41–50) — Scarcity book ─────
  {
    title: "Righteousness Is Your Identity, Not Your Report Card",
    titleId: "Kebenaran Adalah Identitas Anda, Bukan Rapor Anda",
    author: "Ashley",
    body: `Religion taught you to measure your standing with God by how well you behaved last week. If you read your Bible, prayed enough, and kept your temper — you felt close to Him. If you didn't — you felt like a disappointed employee on a performance review. That's not the Gospel. That's not even close.

Romans 4:5 says God justifies the ungodly — not the nearly-good-enough, not the mostly-trying, but the ungodly — through faith. Not through effort. Through trust.

Righteousness in the New Testament isn't a score. It's a status. It's who you are, not what you did. The moment you received Christ, God didn't give you a fresh start to earn your way. He gave you a brand-new identity. You became the righteousness of God in Christ.

That changes everything about how you approach today. You don't pray hoping God will listen. You pray knowing He already loves you. You don't serve to earn points. You serve because you're already wealthy in His grace. You don't confess sin to get back into favour. You confess because you live in favour and sin disrupts your experience of it.

Stop measuring. Start receiving. You are the righteousness of God — not because of anything you've done, but because of everything He did.`,
    bodyId: `Agama mengajarkan Anda untuk mengukur kedudukan Anda dengan Tuhan berdasarkan seberapa baik perilaku Anda minggu lalu. Jika Anda membaca Alkitab, cukup berdoa, dan menjaga temperamen — Anda merasa dekat dengan-Nya. Jika tidak — Anda merasa seperti karyawan yang mengecewakan di evaluasi kinerja. Itu bukan Injil. Itu bahkan tidak mendekati.

Roma 4:5 berkata Tuhan membenarkan orang yang tidak beribadah — bukan yang hampir-cukup-baik, bukan yang kebanyakan-berusaha, tapi orang yang tidak beribadah — melalui iman. Bukan melalui usaha. Melalui kepercayaan.

Kebenaran dalam Perjanjian Baru bukan sebuah skor. Itu adalah status. Itu siapa Anda, bukan apa yang Anda lakukan. Saat Anda menerima Kristus, Tuhan tidak memberi Anda awal baru untuk mendapatkan jalan Anda. Dia memberi Anda identitas yang sama sekali baru. Anda menjadi kebenaran Allah di dalam Kristus.

Itu mengubah segalanya tentang bagaimana Anda mendekati hari ini. Anda tidak berdoa berharap Tuhan akan mendengarkan. Anda berdoa mengetahui Dia sudah mengasihi Anda. Anda tidak melayani untuk mengumpulkan poin. Anda melayani karena Anda sudah kaya dalam kasih karunia-Nya. Anda tidak mengaku dosa untuk kembali ke dalam kemurahan. Anda mengaku karena Anda hidup dalam kemurahan dan dosa mengganggu pengalaman Anda akan kemurahan itu.

Berhentilah mengukur. Mulailah menerima. Anda adalah kebenaran Allah — bukan karena apa pun yang telah Anda lakukan, tapi karena segala yang telah Dia lakukan.`,
  },
  {
    title: "One Sacrifice. Permanent Result.",
    titleId: "Satu Korban. Hasil Permanen.",
    author: "Jane",
    body: `The book of Hebrews is written to people who kept going back to the old system. They understood Jesus died — they just couldn't quite stop trying to add things to it. More sacrifice. More ritual. More religious effort to secure what had already been secured.

Hebrews 10:14 is the corrective they needed — and the corrective most Christians still need today: for by one sacrifice He has made perfect forever those who are being made holy.

Made perfect. Forever. Those words are not compatible with performance anxiety. You cannot be made perfect forever and also be one bad week away from losing God's approval. One is the finished work. The other is religion.

The process of sanctification — being made holy — happens inside the security of permanent perfection. You're not being sanctified to eventually earn perfection. You already have perfection through Christ, and from that foundation, transformation unfolds.

This is the difference between working toward acceptance and working from acceptance. One is exhausting and produces fear. The other is liberating and produces love. You can't love someone well when you're afraid of being rejected by them.

You are made perfect forever. Let that settle somewhere deep today. And from that settled place, let transformation happen freely.`,
    bodyId: `Surat Ibrani ditulis kepada orang-orang yang terus kembali ke sistem yang lama. Mereka memahami Yesus mati — mereka hanya tidak bisa berhenti mencoba menambahkan sesuatu padanya. Lebih banyak korban. Lebih banyak ritual. Lebih banyak usaha religius untuk mengamankan apa yang sudah diamankan.

Ibrani 10:14 adalah koreksi yang mereka butuhkan — dan koreksi yang masih dibutuhkan kebanyakan orang Kristen hari ini: sebab oleh satu korban saja Ia telah menyempurnakan untuk selama-lamanya mereka yang Ia kuduskan.

Disempurnakan. Untuk selama-lamanya. Kata-kata itu tidak cocok dengan kecemasan kinerja. Anda tidak bisa disempurnakan untuk selama-lamanya dan sekaligus satu minggu buruk dari kehilangan perkenan Tuhan. Yang satu adalah karya yang sudah selesai. Yang lain adalah agama.

Proses pengudusan — dijadikan kudus — terjadi di dalam keamanan kesempurnaan permanen. Anda bukan dikuduskan untuk akhirnya mendapatkan kesempurnaan. Anda sudah memiliki kesempurnaan melalui Kristus, dan dari fondasi itu, transformasi terungkap.

Inilah perbedaan antara bekerja menuju penerimaan dan bekerja dari penerimaan. Yang satu melelahkan dan menghasilkan ketakutan. Yang lain membebaskan dan menghasilkan kasih. Anda tidak bisa mengasihi seseorang dengan baik ketika Anda takut ditolak oleh mereka.

Anda disempurnakan untuk selama-lamanya. Biarlah itu mengendap di tempat yang dalam hari ini. Dan dari tempat yang mantap itu, biarlah transformasi terjadi dengan bebas.`,
  },
  {
    title: "No Condemnation — Zero",
    titleId: "Tidak Ada Penghukuman — Nol",
    author: "Ashley",
    body: `There is therefore now no condemnation for those who are in Christ Jesus. Romans 8:1. No condemnation. Not a little condemnation. Not condemnation-lite for the really bad stuff. None. Zero. The word in Greek is katakrima — it's a legal verdict. There is no legal verdict of guilt against you.

Most Christians live under a quiet, persistent hum of condemnation that they've learned to call conviction. But there's a critical difference between the two. Condemnation says: you are bad, you will never change, God is disappointed in you. Conviction says: this behaviour isn't consistent with who you are — come back to truth.

One comes from the enemy. One comes from the Spirit.

The enemy loves to dress his condemnation in religious language. He'll use scripture references, point to your past, and remind you of every time you've failed. He'll make you feel like the condemnation is actually a sign of spiritual sensitivity. It's not. It's a lie wearing a collar.

The Holy Spirit never piles on. He points forward. He says: this isn't you. You're better than this. Come back to grace.

Shake off the condemnation today. Not because your failures don't matter — but because they've already been dealt with. There is therefore now no condemnation.`,
    bodyId: `Demikianlah sekarang tidak ada penghukuman bagi mereka yang ada di dalam Kristus Yesus. Roma 8:1. Tidak ada penghukuman. Bukan sedikit penghukuman. Bukan penghukuman-ringan untuk hal-hal yang benar-benar buruk. Tidak ada. Nol. Kata dalam bahasa Yunani adalah katakrima — itu adalah vonis hukum. Tidak ada vonis bersalah terhadap Anda.

Kebanyakan orang Kristen hidup di bawah dengungan halus penghukuman yang terus-menerus, yang mereka pelajari untuk menyebutnya sebagai peneguran. Tapi ada perbedaan kritis antara keduanya. Penghukuman berkata: kamu buruk, kamu tidak akan pernah berubah, Tuhan kecewa padamu. Peneguran berkata: perilaku ini tidak konsisten dengan siapa dirimu — kembalilah kepada kebenaran.

Yang satu datang dari musuh. Yang satu datang dari Roh Kudus.

Musuh suka mendandani penghukumannya dalam bahasa religius. Dia akan menggunakan referensi Kitab Suci, menunjuk masa lalu Anda, dan mengingatkan Anda tentang setiap kali Anda gagal. Dia akan membuat Anda merasa bahwa penghukuman itu sebenarnya tanda sensitivitas rohani. Bukan. Itu kebohongan yang memakai kerah pendeta.

Roh Kudus tidak pernah menumpuk tekanan. Dia menunjuk ke depan. Dia berkata: ini bukan kamu. Kamu lebih baik dari ini. Kembalilah kepada kasih karunia.

Lepaskanlah penghukuman itu hari ini. Bukan karena kegagalan Anda tidak penting — tapi karena semuanya sudah ditangani. Demikianlah sekarang tidak ada penghukuman.`,
  },
  {
    title: "Grace Is the Supply — Not the Safety Net",
    titleId: "Kasih Karunia Adalah Persediaan — Bukan Jaring Pengaman",
    author: "Jane",
    body: `We talk about grace like a fire extinguisher. Something you reach for when things have gone wrong. You sin, you pull the cord, grace puts out the fire, and you go back to trying to live right on your own until the next disaster.

But that's not what 2 Corinthians 9:8 describes: and God is able to bless you abundantly, so that in all things at all times, having all that you need, you will abound in every good work. All things. All times. All that you need. Abound.

Grace isn't the emergency response. Grace is the atmosphere. It's not something you draw from in crisis — it's the supply line you're always living from. It's not the net under the tightrope. It's the ground you walk on.

Most Christians operate with a deficit mindset — believing that spiritual strength is something they generate through discipline and that grace patches the gaps. But the New Covenant flips this entirely. Grace is the foundation, and discipline, obedience, and godly living all flow out of it.

When you know you're perpetually supplied, you live differently. You give generously. You serve freely. You take risks for God without fear of running out. The supply is not limited by your performance. It's linked to His abundance. And He never runs out.`,
    bodyId: `Kita membicarakan kasih karunia seperti alat pemadam kebakaran. Sesuatu yang Anda raih ketika segalanya salah. Anda berdosa, Anda menarik tali, kasih karunia memadamkan api, dan Anda kembali berusaha hidup benar sendiri sampai bencana berikutnya.

Tapi bukan itu yang digambarkan 2 Korintus 9:8: Dan Allah sanggup melimpahkan segala kasih karunia kepada kamu, supaya kamu senantiasa berkecukupan di dalam segala sesuatu dan malah berkelebihan di dalam pelbagai kebajikan. Segala sesuatu. Senantiasa. Segala hal. Berkelebihan.

Kasih karunia bukan respons darurat. Kasih karunia adalah atmosfer. Bukan sesuatu yang Anda ambil dalam krisis — tapi jalur persediaan yang selalu Anda hidupi. Bukan jaring di bawah tali. Tapi tanah tempat Anda berjalan.

Kebanyakan orang Kristen beroperasi dengan pola pikir defisit — percaya bahwa kekuatan rohani adalah sesuatu yang mereka hasilkan melalui disiplin dan kasih karunia menambal celahnya. Tapi Perjanjian Baru membalik ini sepenuhnya. Kasih karunia adalah fondasi, dan disiplin, ketaatan, dan kehidupan yang saleh semuanya mengalir darinya.

Ketika Anda tahu bahwa Anda terus-menerus diperlengkapi, Anda hidup berbeda. Anda memberi dengan murah hati. Anda melayani dengan bebas. Anda mengambil risiko untuk Tuhan tanpa takut kehabisan. Persediaan tidak dibatasi oleh kinerja Anda. Ia terhubung dengan kelimpahan-Nya. Dan Dia tidak pernah kehabisan.`,
  },
  {
    title: "You Are Not Under Law",
    titleId: "Anda Tidak di Bawah Hukum",
    author: "Ashley",
    body: `Here's a question I ask when I'm speaking: how many of you feel guilty right now about something in your relationship with God? Almost every hand goes up. Every time. In a room full of born-again, blood-bought believers who have been justified before God — almost everyone is walking under a low-grade cloud of religious guilt.

That's the law at work. Not the cross.

Romans 6:14 says sin shall no longer be your master, because you are not under the law, but under grace. The law doesn't just fail to stop sin — it actually activates it. Paul explains this in Romans 7. The law says don't, and the flesh hears that and wants to. The law increases awareness of sin and creates a consciousness of failure.

Grace does something completely different. Grace transforms desire. Grace gives you a new nature — one that genuinely wants to please God. Not because it has to. Because it wants to.

This is why the Gospel isn't law with better consequences. It's a complete change of system. You went from slaves to sons. From performance to inheritance. From guilt to grace.

Live under grace today. Not as a license to do whatever you want — but as the power to become who you already are. The law couldn't do that. Grace does it every time.`,
    bodyId: `Ini pertanyaan yang saya ajukan saat berkhotbah: berapa banyak dari Anda yang merasa bersalah sekarang tentang sesuatu dalam hubungan Anda dengan Tuhan? Hampir setiap tangan terangkat. Setiap kali. Di ruangan penuh orang percaya yang sudah dilahirkan kembali dan ditebus oleh darah — hampir semuanya berjalan di bawah awan rasa bersalah religius yang halus.

Itulah hukum yang sedang bekerja. Bukan salib.

Roma 6:14 berkata dosa tidak akan berkuasa lagi atas kamu, karena kamu tidak berada di bawah hukum Taurat, tetapi di bawah kasih karunia. Hukum tidak hanya gagal menghentikan dosa — ia justru mengaktifkannya. Paulus menjelaskan ini di Roma 7. Hukum berkata jangan, dan daging mendengar itu dan malah ingin. Hukum meningkatkan kesadaran akan dosa dan menciptakan kesadaran akan kegagalan.

Kasih karunia melakukan sesuatu yang sama sekali berbeda. Kasih karunia mengubah keinginan. Kasih karunia memberi Anda natur baru — yang sungguh-sungguh ingin menyenangkan Tuhan. Bukan karena harus. Karena mau.

Inilah mengapa Injil bukan hukum dengan konsekuensi yang lebih baik. Ini adalah perubahan sistem yang total. Anda berubah dari budak menjadi anak. Dari kinerja menjadi warisan. Dari rasa bersalah menjadi kasih karunia.

Hiduplah di bawah kasih karunia hari ini. Bukan sebagai izin untuk melakukan apa saja sesuka hati — tapi sebagai kuasa untuk menjadi siapa Anda sesungguhnya. Hukum tidak bisa melakukannya. Kasih karunia melakukannya setiap saat.`,
  },
  {
    title: "Unforced Rhythms of Grace",
    titleId: "Irama Kasih Karunia yang Tidak Dipaksakan",
    author: "Jane",
    body: `The Message translation of Matthew 11:28-30 is one of the most beautiful passages in all of scripture: "Are you tired? Worn out? Burned out on religion? Come to me. Get away with me and you'll recover your life. I'll show you how to take a real rest. Walk with me and work with me — watch how I do it. Learn the unforced rhythms of grace."

Unforced rhythms. That phrase stops me every time.

Most of us are living in forced rhythms. Push harder. Do more. Wake up earlier. Try again. Rest is something you collapse into at the end of the week because your body demands it — not something you move into as a lifestyle because Jesus invited you.

But Jesus isn't describing spiritual exhaustion as the normal Christian life. He's describing it as the religion-life. The life you live when the yoke you're carrying isn't His. His yoke is easy. His burden is light. Not because life is easy — but because He carries the heavy end.

The invitation isn't to try harder. It's to come. To get away with Him. To recover your life. Real rest isn't the absence of activity. It's the presence of Jesus in the activity. Learn the unforced rhythms. They start with coming to Him, not adding more to your list.`,
    bodyId: `Terjemahan The Message dari Matius 11:28-30 adalah salah satu bagian paling indah di seluruh Kitab Suci: "Apakah kamu lelah? Kehabisan tenaga? Jenuh dengan agama? Datanglah kepada-Ku. Menyingkirlah bersama-Ku dan kamu akan memulihkan hidupmu. Aku akan menunjukkan caranya beristirahat yang sesungguhnya. Berjalanlah bersama-Ku dan bekerjalah bersama-Ku — lihat bagaimana Aku melakukannya. Pelajarilah irama kasih karunia yang tidak dipaksakan."

Irama yang tidak dipaksakan. Frasa itu menghentikan saya setiap kali.

Kebanyakan dari kita hidup dalam irama yang dipaksakan. Dorong lebih keras. Lakukan lebih banyak. Bangun lebih pagi. Coba lagi. Istirahat adalah sesuatu yang Anda ambruk ke dalamnya di akhir minggu karena tubuh Anda menuntutnya — bukan sesuatu yang Anda masuki sebagai gaya hidup karena Yesus mengundang Anda.

Tapi Yesus tidak menggambarkan kelelahan rohani sebagai kehidupan Kristen yang normal. Dia menggambarkannya sebagai kehidupan-agama. Kehidupan yang Anda jalani ketika kuk yang Anda pikul bukan milik-Nya. Kuk-Nya ringan. Beban-Nya enteng. Bukan karena hidup itu mudah — tapi karena Dia memikul bagian yang berat.

Undangannya bukan untuk berusaha lebih keras. Tapi untuk datang. Untuk menyingkir bersama-Nya. Untuk memulihkan hidup Anda. Istirahat sejati bukan ketiadaan aktivitas. Istirahat adalah kehadiran Yesus dalam aktivitas itu. Pelajarilah irama yang tidak dipaksakan. Mereka dimulai dengan datang kepada-Nya, bukan menambahkan lagi ke daftar Anda.`,
  },
  {
    title: "Worship Is Your Most Powerful Weapon",
    titleId: "Penyembahan Adalah Senjata Paling Dahsyat Anda",
    author: "Ashley",
    body: `Second Chronicles 20 is one of my favourite battle stories in the entire Bible. Jehoshaphat faces an army so large that military strategy is completely irrelevant. His response is remarkable: he calls the nation to fast and pray. Then God gives him an unusual battle plan — send the singers first.

The worship team goes to the front. Before the soldiers. Before the weapons. The singers lead, and as they begin to praise, the enemy armies turn on each other and destroy themselves. By the time Judah arrives, there is nothing left to fight. Three days they collect the plunder.

Second Chronicles 20:22 says: as they began to sing and praise, the Lord set ambushes against the men of Ammon and Moab. As they began. Not after the battle. As they began.

Worship isn't something you do when you feel like it. It's something you do instead of fear. It's the declaration that God is bigger than what you're facing before the outcome is visible. It's the choice to praise before the breakthrough arrives.

What are you facing today that worship should lead into? Before you strategize, before you analyse, before you spiral into anxiety — try singing first. The shift isn't always in your circumstances. Sometimes it's in the atmosphere around them.`,
    bodyId: `2 Tawarikh 20 adalah salah satu kisah pertempuran favorit saya di seluruh Alkitab. Yosafat menghadapi pasukan yang begitu besar sehingga strategi militer sama sekali tidak relevan. Responsnya luar biasa: dia memanggil seluruh bangsa untuk berpuasa dan berdoa. Lalu Tuhan memberinya rencana pertempuran yang tidak biasa — kirim para penyanyi lebih dulu.

Tim penyembah pergi ke barisan depan. Sebelum para prajurit. Sebelum senjata. Para penyanyi memimpin, dan ketika mereka mulai memuji, pasukan musuh saling menyerang dan menghancurkan diri mereka sendiri. Ketika Yehuda tiba, tidak ada lagi yang perlu dilawan. Tiga hari mereka mengumpulkan jarahan.

2 Tawarikh 20:22 berkata: ketika mereka mulai bernyanyi dan memuji, Tuhan mengadakan penghadangan terhadap bani Amon dan Moab. Ketika mereka mulai. Bukan setelah pertempuran. Ketika mereka mulai.

Penyembahan bukan sesuatu yang Anda lakukan ketika Anda merasa berkenan. Itu sesuatu yang Anda lakukan sebagai pengganti ketakutan. Itu adalah deklarasi bahwa Tuhan lebih besar dari apa yang Anda hadapi sebelum hasilnya terlihat. Itu pilihan untuk memuji sebelum terobosan tiba.

Apa yang Anda hadapi hari ini yang seharusnya dipimpin oleh penyembahan? Sebelum Anda menyusun strategi, sebelum Anda menganalisis, sebelum Anda berputar-putar dalam kecemasan — cobalah bernyanyi lebih dulu. Pergeserannya tidak selalu dalam keadaan Anda. Kadang ia ada dalam atmosfer di sekelilingnya.`,
  },
  {
    title: "Be Still and Know",
    titleId: "Diamlah dan Ketahuilah",
    author: "Jane",
    body: `Psalm 46:10 is one of the most misused verses in the Bible. We quote it as a spiritual instruction to calm down. "Be still and know that I am God." Breathe. Relax. Take it easy.

But in context, this verse is spoken into the middle of a national catastrophe. Mountains falling into the sea. Nations in uproar. Kingdoms falling. The earth itself giving way. And into all of that — be still.

The word for still in Hebrew is raphah. It means to let go, to release your grip, to let your hands fall. It's not a passive quietness. It's an active surrender of control.

And the reason? Know that I am God. Not hope He is. Know. The certainty of who God is should produce a calm that circumstances can't override.

This is the overflow life in practice. When the world is in chaos — and the world frequently is — you have an anchor that holds not because life got easier, but because the One who holds life is unshakeable.

Be still today. Not because nothing is wrong. Because Someone who is greater than what is wrong is fully in control. Let your hands release whatever you're white-knuckling. He has it. He always has had it. And He is God, regardless of what the news says.`,
    bodyId: `Mazmur 46:11 adalah salah satu ayat yang paling sering disalahgunakan di Alkitab. Kita mengutipnya sebagai instruksi rohani untuk menenangkan diri. "Diamlah dan ketahuilah, bahwa Akulah Allah." Tarik napas. Santai. Tenang.

Tapi dalam konteksnya, ayat ini diucapkan di tengah-tengah bencana nasional. Gunung-gunung runtuh ke laut. Bangsa-bangsa gempar. Kerajaan-kerajaan goyah. Bumi sendiri bergoyang. Dan ke dalam semua itu — diamlah.

Kata untuk diam dalam bahasa Ibrani adalah raphah. Artinya melepaskan, mengendurkan cengkeraman, membiarkan tangan Anda jatuh. Ini bukan keheningan yang pasif. Ini adalah penyerahan kendali yang aktif.

Dan alasannya? Ketahuilah bahwa Akulah Allah. Bukan berharap Dia Allah. Ketahuilah. Kepastian tentang siapa Tuhan seharusnya menghasilkan ketenangan yang tidak bisa dikalahkan oleh keadaan.

Inilah hidup yang melimpah dalam praktik. Ketika dunia dalam kekacauan — dan dunia sering dalam kekacauan — Anda punya jangkar yang bertahan bukan karena hidup menjadi lebih mudah, tapi karena Dia yang memegang hidup tidak tergoyahkan.

Diamlah hari ini. Bukan karena tidak ada yang salah. Karena Seseorang yang lebih besar dari apa yang salah sepenuhnya mengendalikan. Lepaskan apa pun yang Anda cengkeram erat-erat. Dia yang memegang. Dia selalu memegangnya. Dan Dia adalah Allah, apa pun kata berita.`,
  },
  {
    title: "What You Believe Shapes Everything",
    titleId: "Apa yang Anda Percaya Membentuk Segalanya",
    author: "Ashley",
    body: `Proverbs 23:7 says as a person thinks in their heart, so they are. Not as they perform. Not as they appear to others. As they think in their heart. The interior shapes the exterior — always.

This is why the Scarcity mindset is so dangerous. It's not just a financial posture. It's a belief system. When you believe that God's supply is limited, that favour runs out, that grace is conditional — you start living in a way that reinforces those beliefs. You hoard. You strive. You can't celebrate someone else's blessing because it feels like it reduces yours.

And the overflow life isn't primarily about circumstances changing. It's about beliefs changing. Because changed beliefs produce changed expectations. Changed expectations produce different decisions. Different decisions produce different outcomes.

The renewing of the mind that Romans 12:2 talks about is not a motivational exercise. It's surgery. It's the systematic replacement of scarcity-based believing with Kingdom-based believing. It requires time in the Word, not just time reading the Word — actually letting it reshape the thoughts you think all day long.

What you believe about God's character, about your identity, about provision and favour — these are the things that set the ceiling on your life. And the beautiful thing is: in Christ, the ceiling has been removed. Start believing accordingly.`,
    bodyId: `Amsal 23:7 berkata seperti orang berpikir dalam hatinya, demikianlah ia. Bukan seperti ia tampil. Bukan seperti ia terlihat oleh orang lain. Seperti ia berpikir dalam hatinya. Yang di dalam membentuk yang di luar — selalu.

Inilah mengapa pola pikir Kekurangan begitu berbahaya. Ini bukan sekadar postur finansial. Ini adalah sistem keyakinan. Ketika Anda percaya bahwa persediaan Tuhan terbatas, bahwa kemurahan habis, bahwa kasih karunia bersyarat — Anda mulai hidup dengan cara yang memperkuat keyakinan-keyakinan itu. Anda menimbun. Anda berjuang. Anda tidak bisa merayakan berkat orang lain karena terasa seperti mengurangi berkat Anda.

Dan hidup yang melimpah pada dasarnya bukan tentang perubahan keadaan. Ini tentang perubahan keyakinan. Karena keyakinan yang berubah menghasilkan harapan yang berubah. Harapan yang berubah menghasilkan keputusan yang berbeda. Keputusan yang berbeda menghasilkan hasil yang berbeda.

Pembaruan pikiran yang dibicarakan Roma 12:2 bukan latihan motivasi. Itu operasi. Itu penggantian sistematis keyakinan berbasis kekurangan dengan keyakinan berbasis Kerajaan. Itu membutuhkan waktu di dalam Firman, bukan hanya waktu membaca Firman — benar-benar membiarkannya membentuk ulang pikiran yang Anda pikirkan sepanjang hari.

Apa yang Anda percaya tentang karakter Tuhan, tentang identitas Anda, tentang penyediaan dan kemurahan — inilah hal-hal yang menetapkan batas atas hidup Anda. Dan hal yang indah adalah: di dalam Kristus, batas atasnya sudah dihilangkan. Mulailah percaya sesuai dengan itu.`,
  },
  {
    title: "Keep Your Eyes on Jesus",
    titleId: "Pusatkan Pandangan Anda pada Yesus",
    author: "Jane",
    body: `There are two kinds of people in Hebrews 12. People who look at the cloud of witnesses around them and take courage. And people who look at the obstacles in their path and get discouraged. The instruction is: fix your eyes on Jesus — the author and perfecter of faith.

Not on the witnesses. Not on the obstacles. On Jesus.

Hebrews 12:2 then does something unusual — it explains what Jesus did by fixing His own eyes. For the joy set before Him, He endured the cross, scorning its shame. He kept His eyes on the joy ahead, and that vision sustained Him through the worst the enemy could throw at Him.

Joy set before. Future joy that sustained present pain.

This is the posture of faith. It doesn't pretend the present isn't difficult. It anchors itself to a future that's certain — a future defined by resurrection, not by suffering. And from that anchor, it endures.

Whatever you're enduring today — fix your eyes. Not on the diagnosis, not on the relationship, not on the financial pressure. Fix them on Jesus. Not because that makes the hard thing disappear. Because He is the author of your story, and authors who endured the cross for the joy ahead don't write stories without resurrection in them.`,
    bodyId: `Ada dua jenis orang di Ibrani 12. Orang yang melihat awan saksi di sekeliling mereka dan mengambil keberanian. Dan orang yang melihat rintangan di jalan mereka dan menjadi putus asa. Instruksinya adalah: pusatkan pandanganmu kepada Yesus — penulis dan penyempurna iman.

Bukan pada saksi-saksi. Bukan pada rintangan. Pada Yesus.

Ibrani 12:2 kemudian melakukan sesuatu yang tidak biasa — menjelaskan apa yang Yesus lakukan dengan memusatkan pandangan-Nya sendiri. Demi sukacita yang disediakan bagi-Nya, Ia menanggung salib, mengabaikan kehinaannya. Dia memusatkan pandangan-Nya pada sukacita di depan, dan visi itu menopang-Nya melewati yang terburuk yang bisa dilemparkan musuh kepada-Nya.

Sukacita yang disediakan. Sukacita masa depan yang menopang penderitaan masa kini.

Inilah postur iman. Ia tidak berpura-pura masa kini tidak sulit. Ia menancapkan diri pada masa depan yang pasti — masa depan yang ditentukan oleh kebangkitan, bukan oleh penderitaan. Dan dari jangkar itu, ia bertahan.

Apa pun yang Anda tanggung hari ini — pusatkan pandangan Anda. Bukan pada diagnosis, bukan pada hubungan, bukan pada tekanan finansial. Pusatkan pada Yesus. Bukan karena itu membuat hal yang sulit menghilang. Karena Dia adalah penulis kisah Anda, dan penulis yang menanggung salib demi sukacita di depan tidak menulis kisah tanpa kebangkitan di dalamnya.`,
  },

  // ── SECTION 6: THE CHURCH & COMMUNITY (Days 51–60) ─────────────────────────
  {
    title: "You Cannot Have Jesus Without His Church",
    titleId: "Anda Tidak Bisa Memiliki Yesus Tanpa Gereja-Nya",
    author: "Ashley",
    body: `First Corinthians 12:12 says: just as a body, though one, has many parts, but all its many parts form one body, so it is with Christ. Paul doesn't say "so it is with the church." He says so it is with Christ. The church IS the body of Christ. Not a useful organisation He endorsed, not a helpful community He recommends — His actual body.

So when you say "I love Jesus but not the church" — you are saying you love Jesus but not the physical expression of Jesus in the world. You love the head but you've cut off the body. That's not theology. That's amputation.

I know what you're thinking — you've been hurt by the church. I've been there. Leaders have disappointed me. Communities have been messy. Churches have got things badly wrong. But hurting people leave the church to heal from the church, and they never quite recover — because the thing they're healing from is also the thing they need for healing.

The church isn't the building. It's not the institution. It's the people — broken, redeemed, in-process people — who are being formed together into something the world can't explain and the enemy can't stop. You're part of that. You were never meant to do this alone.`,
    bodyId: `1 Korintus 12:12 berkata: sama seperti tubuh itu satu dan mempunyai banyak anggota, tetapi semua anggotanya sekalipun banyak, merupakan satu tubuh, demikian pula Kristus. Paulus tidak berkata "demikian pula gereja." Dia berkata demikian pula Kristus. Gereja ADALAH tubuh Kristus. Bukan organisasi berguna yang Dia dukung, bukan komunitas bermanfaat yang Dia rekomendasikan — tubuh-Nya yang sesungguhnya.

Jadi ketika Anda berkata "Saya mengasihi Yesus tapi tidak gereja" — Anda berkata Anda mengasihi Yesus tapi bukan ekspresi fisik Yesus di dunia. Anda mengasihi kepala tapi memotong tubuhnya. Itu bukan teologi. Itu amputasi.

Saya tahu apa yang Anda pikirkan — Anda pernah dilukai oleh gereja. Saya pernah mengalaminya. Pemimpin telah mengecewakan saya. Komunitas berantakan. Gereja-gereja sudah salah besar. Tapi orang yang terluka meninggalkan gereja untuk pulih dari gereja, dan mereka tidak pernah benar-benar pulih — karena hal yang mereka pulihkan darinya juga hal yang mereka butuhkan untuk pemulihan.

Gereja bukan gedungnya. Bukan institusinya. Tapi orangnya — orang-orang yang rusak, ditebus, masih dalam proses — yang sedang dibentuk bersama menjadi sesuatu yang tidak bisa dijelaskan dunia dan tidak bisa dihentikan musuh. Anda bagian dari itu. Anda tidak pernah dimaksudkan untuk melakukan ini sendirian.`,
  },
  {
    title: "The Body That Fills Everything",
    titleId: "Tubuh yang Memenuhi Segala Sesuatu",
    author: "Jane",
    body: `Ephesians 1:22-23 describes the church in a way that should completely reshape how you think about Sunday morning: God placed all things under His feet and appointed Him to be head over everything for the church, which is His body, the fullness of Him who fills everything in every way.

His fullness. The fullness of Him who fills everything in every way. That's the church.

Not a cultural institution. Not a social club with good values. The literal fullness of Christ in the earth.

This means that when the church shows up in a community — really shows up, carrying His presence, doing His works, loving His people — it's not just one more charitable organisation. It's the fullness of Christ filling that space. When the church is absent, something of His fullness is absent with it.

This is why the church matters. Not because it's perfect. Not because it always gets it right. But because Jesus chose it as the vehicle for His presence in the world. He could have chosen anything. He chose His people, together, gathered in His name.

When you walk into a church gathering this week, you're not just going to a service. You're entering the fullness of Christ in the earth. Let that reframe how you show up.`,
    bodyId: `Efesus 1:22-23 menggambarkan gereja dengan cara yang seharusnya benar-benar mengubah cara Anda berpikir tentang ibadah Minggu: Allah telah menempatkan segala sesuatu di bawah kaki-Nya dan menjadikan Dia kepala atas segala sesuatu bagi gereja, yang adalah tubuh-Nya, kepenuhan Dia yang memenuhi segala sesuatu.

Kepenuhan-Nya. Kepenuhan Dia yang memenuhi segala sesuatu. Itulah gereja.

Bukan institusi budaya. Bukan klub sosial dengan nilai-nilai baik. Kepenuhan Kristus secara harfiah di bumi.

Ini berarti ketika gereja hadir di sebuah komunitas — benar-benar hadir, membawa hadirat-Nya, melakukan pekerjaan-Nya, mengasihi umat-Nya — bukan sekadar satu organisasi amal lagi. Itu adalah kepenuhan Kristus mengisi ruang itu. Ketika gereja absen, sesuatu dari kepenuhan-Nya absen bersamanya.

Inilah mengapa gereja itu penting. Bukan karena sempurna. Bukan karena selalu benar. Tapi karena Yesus memilihnya sebagai wahana kehadiran-Nya di dunia. Dia bisa memilih apa saja. Dia memilih umat-Nya, bersama-sama, berkumpul dalam nama-Nya.

Ketika Anda masuk ke dalam ibadah gereja minggu ini, Anda bukan sekadar pergi ke sebuah acara. Anda memasuki kepenuhan Kristus di bumi. Biarlah itu membingkai ulang cara Anda hadir.`,
  },
  {
    title: "The Groom Is Getting Ready",
    titleId: "Sang Mempelai Pria Sedang Bersiap",
    author: "Ashley",
    body: `There's a wedding coming. The greatest event in all of human history — the moment the Groom who has been preparing since before time returns for His bride. And the bride He's returning for is not a perfect institution. She's a redeemed people. Washed, prepared, made radiant — not by her own effort, but by His love.

Revelation 19:7-8 describes it: let us rejoice and be glad and give Him glory! For the wedding of the Lamb has come, and His bride has made herself ready. Fine linen, bright and clean, was given her to wear — fine linen stands for the righteous acts of God's holy people.

Notice: given her to wear. Not earned. Given.

The righteousness of the bride is a gift. Her readiness is not her achievement — it's His grace working through her obedience, her sacrifice, her love.

This is the trajectory of history. Every messy Sunday service, every fumbling church community, every small act of love and faithfulness — it's all part of making the bride ready. You are part of that story. Your faithfulness to the local church, your love for the people in it, your willingness to stay when it's hard — all of it matters to the preparation.

The Groom is coming. The wedding is real. Show up for your part in it.`,
    bodyId: `Ada pernikahan yang akan datang. Peristiwa terbesar dalam seluruh sejarah manusia — saat Mempelai Pria yang telah mempersiapkan sejak sebelum waktu kembali untuk mempelai-Nya. Dan mempelai yang Dia kembali untuknya bukan institusi yang sempurna. Dia adalah umat yang ditebus. Dicuci, disiapkan, dijadikan cemerlang — bukan oleh usahanya sendiri, tapi oleh kasih-Nya.

Wahyu 19:7-8 menggambarkannya: marilah kita bersukacita dan bersorak-sorai, dan memuliakan Dia! Karena perkawinan Anak Domba telah tiba, dan pengantin-Nya telah siap sedia. Dan kepadanya dikaruniakan supaya memakai kain lenan halus, berkilau dan putih bersih — kain lenan halus itu adalah perbuatan-perbuatan yang benar dari orang-orang kudus.

Perhatikan: dikaruniakan. Bukan diperoleh. Dikaruniakan.

Kebenaran sang mempelai wanita adalah karunia. Kesiapannya bukan pencapaiannya — tapi kasih karunia-Nya yang bekerja melalui ketaatannya, pengorbanannya, kasihnya.

Inilah lintasan sejarah. Setiap ibadah Minggu yang berantakan, setiap komunitas gereja yang tidak sempurna, setiap tindakan kecil kasih dan kesetiaan — semuanya bagian dari mempersiapkan mempelai wanita. Anda bagian dari kisah itu. Kesetiaan Anda pada gereja lokal, kasih Anda pada orang-orang di dalamnya, kesediaan Anda untuk tetap tinggal saat sulit — semuanya penting bagi persiapan itu.

Sang Mempelai Pria akan datang. Pernikahannya nyata. Hadirlah untuk bagian Anda di dalamnya.`,
  },
  {
    title: "What Happens When the Head Leaves the Body",
    titleId: "Apa yang Terjadi Ketika Kepala Meninggalkan Tubuh",
    author: "Jane",
    body: `We live in an age of Christian celebrities and digital discipleship. You can get better preaching through a podcast than at most local churches. You can have the best worship teams, the most gifted teachers, the most polished content — all delivered to you through a screen, without community, without commitment, without the inconvenience of actual relationship.

And yet something keeps going wrong. People are more connected to content than ever and more isolated than ever. They know more doctrine and have less community. They've subscribed to fifty channels and belong to nothing.

Colossians 1:18 says Christ is the head of the body, the church. The head and the body are one. Separate the head from the body and neither works. You cannot receive from the head without being connected to the body. You cannot receive what Jesus wants to give you through your screen alone. Some of it only comes through people — through the specific, imperfect, sometimes-frustrating people in a local church who share life with you.

Isolation is not spiritual independence. It's a disconnected limb. And disconnected limbs don't stay alive.

Find your body. Find your people. Be present, be committed, be inconvenienced. That's where the life of Christ flows.`,
    bodyId: `Kita hidup di era selebriti Kristen dan pemuridan digital. Anda bisa mendapatkan khotbah yang lebih baik melalui podcast daripada di kebanyakan gereja lokal. Anda bisa memiliki tim penyembah terbaik, pengajar paling berbakat, konten paling rapi — semuanya dikirimkan kepada Anda melalui layar, tanpa komunitas, tanpa komitmen, tanpa ketidaknyamanan hubungan yang nyata.

Namun ada sesuatu yang terus salah. Orang-orang lebih terhubung dengan konten dari sebelumnya dan lebih terisolasi dari sebelumnya. Mereka tahu lebih banyak doktrin tapi punya lebih sedikit komunitas. Mereka berlangganan lima puluh kanal dan tidak menjadi bagian dari apa pun.

Kolose 1:18 berkata Kristus adalah kepala tubuh, yaitu gereja. Kepala dan tubuh adalah satu. Pisahkan kepala dari tubuh dan keduanya tidak berfungsi. Anda tidak bisa menerima dari kepala tanpa terhubung ke tubuh. Anda tidak bisa menerima semua yang ingin Yesus berikan hanya melalui layar Anda. Sebagian darinya hanya datang melalui orang — melalui orang-orang spesifik, tidak sempurna, kadang menyebalkan di gereja lokal yang berbagi hidup dengan Anda.

Isolasi bukan kemandirian rohani. Itu anggota tubuh yang terputus. Dan anggota tubuh yang terputus tidak bertahan hidup.

Temukan tubuh Anda. Temukan orang-orang Anda. Hadirlah, berkomitmenlah, rela direpotkan. Di situlah kehidupan Kristus mengalir.`,
  },
  {
    title: "The Secret God Kept for Centuries",
    titleId: "Rahasia yang Tuhan Simpan Selama Berabad-abad",
    author: "Ashley",
    body: `Picture the throne room of hell. A war council. Satan and his generals gathered, strategising, trying to anticipate God's next move. For thousands of years they thought they knew the plan. They knew where to attack. They knew where to sow division. They had the whole thing mapped out.

And then something happened that they didn't see coming. The cross. But not just the cross — what came out of the cross. The church.

Ephesians 3:9-10 says God kept His plan hidden for ages and generations: through the church the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. The church was the secret. The thing the enemy never anticipated.

Not angels. Not armies. Not supernatural displays of power. The church — ordinary people, blood-bought and Spirit-filled, living in community — would be the display of God's wisdom to the powers of darkness.

The enemy has been trying to destroy the church since the moment he realised what it was. Every persecution, every division, every scandal, every season of decline — all of it aimed at taking down the one thing he didn't see coming.

But Jesus said the gates of hell will not prevail against it. The secret weapon is still operational. And you are part of it.`,
    bodyId: `Bayangkan ruang takhta neraka. Dewan perang. Iblis dan para jenderalnya berkumpul, menyusun strategi, mencoba mengantisipasi langkah Tuhan selanjutnya. Selama ribuan tahun mereka mengira sudah tahu rencananya. Mereka tahu di mana menyerang. Mereka tahu di mana menabur perpecahan. Mereka sudah memetakan semuanya.

Dan kemudian sesuatu terjadi yang tidak mereka antisipasi. Salib. Tapi bukan hanya salib — apa yang keluar dari salib. Gereja.

Efesus 3:9-10 berkata Tuhan menyembunyikan rencana-Nya selama berabad-abad dan generasi: supaya melalui gereja hikmat Allah yang bermacam-macam ragam dinyatakan kepada pemerintah-pemerintah dan penguasa-penguasa di surga. Gereja adalah rahasianya. Hal yang tidak pernah diantisipasi musuh.

Bukan malaikat. Bukan tentara. Bukan pertunjukan kuasa supernatural. Gereja — orang biasa, ditebus oleh darah dan dipenuhi Roh, hidup dalam komunitas — akan menjadi tampilan hikmat Tuhan bagi kuasa kegelapan.

Musuh telah berusaha menghancurkan gereja sejak saat dia menyadari apa itu. Setiap penganiayaan, setiap perpecahan, setiap skandal, setiap musim kemunduran — semuanya ditujukan untuk menjatuhkan satu hal yang tidak dia antisipasi.

Tapi Yesus berkata gerbang alam maut tidak akan menguasainya. Senjata rahasia masih beroperasi. Dan Anda adalah bagian darinya.`,
  },
  {
    title: "This Is What Church Actually Looks Like",
    titleId: "Inilah Wujud Gereja yang Sesungguhnya",
    author: "Jane",
    body: `Acts 2:42-47 is the blueprint that churches spend their entire existence trying to get back to. They devoted themselves to the apostles' teaching and to fellowship, to the breaking of bread and to prayer. Every day they continued to meet together. They sold property and possessions to give to anyone who had need. They ate together with glad and sincere hearts. And the Lord added to their number daily those who were being saved.

Daily. Together. Gladly. Sincerely. Generously. Miraculously.

That's the original church. And before you say "that was just the early church, that's not possible now" — ask yourself: is it not possible, or have we just stopped expecting it?

The same Spirit who gathered those 120 in an upper room is available today. The same generosity. The same power. The same daily growth. The conditions weren't primarily cultural — they were spiritual. A community surrendered to the Spirit, devoted to each other, expectant of God's activity.

What would your church look like if every person in it showed up with Acts 2 expectations? What would change in your community if the church down the road started living this way?

It doesn't require a perfect institution. It requires surrendered people. Could that start with you?`,
    bodyId: `Kisah Para Rasul 2:42-47 adalah cetak biru yang gereja-gereja habiskan seluruh keberadaan mereka untuk kembali kepadanya. Mereka bertekun dalam pengajaran rasul-rasul dan dalam persekutuan, dalam memecah-mecahkan roti dan dalam doa. Setiap hari mereka terus berkumpul bersama. Mereka menjual harta milik dan membagikannya kepada siapa saja yang berkekurangan. Mereka makan bersama dengan hati yang gembira dan tulus. Dan setiap hari Tuhan menambahkan jumlah mereka dengan orang yang diselamatkan.

Setiap hari. Bersama. Dengan gembira. Dengan tulus. Dengan murah hati. Secara ajaib.

Itulah gereja yang asli. Dan sebelum Anda berkata "itu hanya gereja mula-mula, itu tidak mungkin sekarang" — tanyakan pada diri sendiri: apakah itu tidak mungkin, atau kita hanya berhenti mengharapkannya?

Roh yang sama yang mengumpulkan 120 orang itu di sebuah ruangan loteng tersedia hari ini. Kemurahan hati yang sama. Kuasa yang sama. Pertumbuhan harian yang sama. Syaratnya bukan terutama kultural — tapi rohani. Sebuah komunitas yang berserah kepada Roh, berdedikasi satu sama lain, mengharapkan aktivitas Tuhan.

Seperti apa gereja Anda jika setiap orang di dalamnya hadir dengan harapan Kisah Para Rasul 2? Apa yang akan berubah di komunitas Anda jika gereja di ujung jalan mulai hidup seperti ini?

Ini tidak membutuhkan institusi yang sempurna. Ini membutuhkan orang-orang yang berserah. Bisakah itu dimulai dari Anda?`,
  },
  {
    title: "The Gates of Hell Will Not Prevail",
    titleId: "Gerbang Alam Maut Tidak Akan Menang",
    author: "Ashley",
    body: `I've been in ministry for more than thirty years. I've watched churches decline, split, and close. I've seen movements that looked invincible stumble. I've sat in meetings where people seriously questioned whether the church had a future. And in every one of those moments, I come back to the same anchor: Matthew 16:18.

Jesus said: I will build my church, and the gates of hell will not overcome it.

Three things I notice. He said I will build it — not you will maintain it. The building is His project. Your role is faithfulness, not preservation. He said His church — not any particular denomination or institution, but the people He has redeemed and called together. And He said the gates of hell will not prevail — gates are defensive, not offensive. The church is on the advance. Hell is defending.

The church is not an institution in decline waiting to be replaced by something better. It is the most unstoppable movement in the history of the world — surviving every empire, every persecution, every cultural shift since the first century. And Jesus is still building it.

Be encouraged today. The church will outlast every prediction of its demise. It always has. It always will. Jesus guaranteed it.`,
    bodyId: `Saya sudah dalam pelayanan lebih dari tiga puluh tahun. Saya sudah menyaksikan gereja-gereja menurun, pecah, dan tutup. Saya sudah melihat gerakan yang tampak tak terkalahkan tersandung. Saya sudah duduk dalam rapat di mana orang-orang serius mempertanyakan apakah gereja punya masa depan. Dan di setiap momen itu, saya kembali ke jangkar yang sama: Matius 16:18.

Yesus berkata: Aku akan membangun jemaat-Ku, dan alam maut tidak akan menguasainya.

Tiga hal yang saya perhatikan. Dia berkata Aku akan membangunnya — bukan kamu yang akan mempertahankannya. Pembangunan adalah proyek-Nya. Peran Anda adalah kesetiaan, bukan pelestarian. Dia berkata jemaat-Ku — bukan denominasi atau institusi tertentu, tapi umat yang Dia tebus dan panggil bersama. Dan Dia berkata alam maut tidak akan menguasai — gerbang itu defensif, bukan ofensif. Gereja yang sedang maju. Neraka yang bertahan.

Gereja bukan institusi yang sedang menurun menunggu digantikan oleh sesuatu yang lebih baik. Ia adalah gerakan yang paling tidak terhentikan dalam sejarah dunia — bertahan melewati setiap kerajaan, setiap penganiayaan, setiap pergeseran budaya sejak abad pertama. Dan Yesus masih membangunnya.

Kuatkanlah hati Anda hari ini. Gereja akan lebih awet dari setiap prediksi tentang keruntuhannya. Selalu begitu. Selalu akan begitu. Yesus menjaminnya.`,
  },
  {
    title: "Love Is How They Will Know",
    titleId: "Kasih Adalah Cara Mereka Akan Mengenal",
    author: "Jane",
    body: `The early church didn't grow because it had the best speakers. It didn't grow because of its marketing. It grew because of something the surrounding culture couldn't explain: they loved each other.

John 13:34-35: a new command I give you: love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another.

Not by your theology. Not by your worship style. Not by your buildings or your programs. By your love.

This is both the simplest and the hardest command in the New Testament. Love one another. Not love the easy people. Not love people who love you back. Love one another — across difference, across hurt, across disappointment, across the things that divide.

The church is meant to be the most diverse, most unified community on earth. People who would never choose each other, choosing each other because of Jesus. That's the supernatural thing the world is watching for.

Your love for the person in your church who gets on your nerves — who has different politics, different worship preferences, different personality — that love is the proof of the Gospel. Not your statement of faith. Your actual love for actual people.

It starts today. In your church. With the person who's hardest to love.`,
    bodyId: `Gereja mula-mula tidak bertumbuh karena memiliki pembicara terbaik. Bukan karena pemasarannya. Ia bertumbuh karena sesuatu yang tidak bisa dijelaskan oleh budaya sekitarnya: mereka saling mengasihi.

Yohanes 13:34-35: perintah baru Kuberikan kepadamu, yaitu supaya kamu saling mengasihi. Sama seperti Aku telah mengasihi kamu, demikian pula kamu harus saling mengasihi. Dengan demikian semua orang akan tahu bahwa kamu adalah murid-murid-Ku, yaitu jikalau kamu saling mengasihi.

Bukan oleh teologi Anda. Bukan oleh gaya penyembahan Anda. Bukan oleh gedung atau program Anda. Oleh kasih Anda.

Ini sekaligus perintah paling sederhana dan paling sulit di Perjanjian Baru. Saling mengasihi. Bukan mengasihi orang yang mudah. Bukan mengasihi orang yang membalas kasih Anda. Saling mengasihi — menembus perbedaan, menembus luka, menembus kekecewaan, menembus hal-hal yang memecah belah.

Gereja seharusnya menjadi komunitas yang paling beragam dan paling bersatu di bumi. Orang-orang yang tidak akan pernah memilih satu sama lain, memilih satu sama lain karena Yesus. Itulah hal supernatural yang sedang diamati dunia.

Kasih Anda kepada orang di gereja yang membuat Anda kesal — yang punya politik berbeda, preferensi ibadah berbeda, kepribadian berbeda — kasih itu adalah bukti Injil. Bukan pernyataan iman Anda. Kasih Anda yang nyata kepada orang-orang yang nyata.

Itu dimulai hari ini. Di gereja Anda. Dengan orang yang paling sulit untuk dikasihi.`,
  },
  {
    title: "Grace Needs a Delivery System",
    titleId: "Kasih Karunia Membutuhkan Sistem Pengiriman",
    author: "Ashley",
    body: `Here's the picture that keeps coming back to me: you're in a plane losing cabin pressure. Oxygen is needed. The oxygen exists — tanks full, pumping through the system. But at your seat, the mask is missing. The oxygen is real. The need is real. But without the delivery system, the person in that seat suffocates anyway.

That's the tragedy of a disconnected life. Grace exists. God's love, forgiveness, healing, hope, peace, joy — it's all available, all real, all powerful. But without a delivery system, it never reaches the person who needs it most.

Romans 10:14 asks the question: how can they hear without someone preaching to them? How can they call on the one they have not believed in? And how can they believe in the one of whom they have not heard?

The answer to every how is: the church. People. You. Not an algorithm. Not a building. You, in relationship with another human being, carrying the presence of Christ into their story.

The church isn't the chaplain of society. It's the delivery mechanism for the most powerful force in the universe. And you are part of it. Your conversations, your friendship, your presence in someone's hard season — you are the mask bringing oxygen to someone who can't breathe.

Show up. The grace needs delivering.`,
    bodyId: `Inilah gambaran yang terus kembali ke pikiran saya: Anda berada di pesawat yang kehilangan tekanan kabin. Oksigen dibutuhkan. Oksigen memang ada — tangki penuh, mengalir melalui sistem. Tapi di kursi Anda, maskernya hilang. Oksigennya nyata. Kebutuhannya nyata. Tapi tanpa sistem pengiriman, orang di kursi itu tetap sesak napas.

Itulah tragedi hidup yang terputus. Kasih karunia itu ada. Kasih Tuhan, pengampunan, penyembuhan, harapan, damai sejahtera, sukacita — semuanya tersedia, semuanya nyata, semuanya berkuasa. Tapi tanpa sistem pengiriman, ia tidak pernah sampai kepada orang yang paling membutuhkannya.

Roma 10:14 mengajukan pertanyaan: bagaimana mereka mendengar kalau tidak ada orang yang memberitakannya? Bagaimana mereka memanggil Dia yang tidak mereka percayai? Dan bagaimana mereka percaya kepada Dia yang belum pernah mereka dengar?

Jawaban dari setiap bagaimana itu adalah: gereja. Orang-orang. Anda. Bukan algoritma. Bukan gedung. Anda, dalam hubungan dengan manusia lain, membawa hadirat Kristus ke dalam kisah mereka.

Gereja bukan pendeta masyarakat. Ia adalah mekanisme pengiriman untuk kekuatan paling dahsyat di alam semesta. Dan Anda bagian darinya. Percakapan Anda, persahabatan Anda, kehadiran Anda di musim sulit seseorang — Anda adalah masker yang membawa oksigen kepada seseorang yang tidak bisa bernapas.

Hadirlah. Kasih karunia perlu dikirimkan.`,
  },
  {
    title: "You Are the Plan",
    titleId: "Andalah Rencananya",
    author: "Jane",
    body: `Acts 1:8 is the last thing Jesus said before He ascended. His final words before He left. The last instruction from the last briefing: you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.

You will be my witnesses. Not: you can be if you want. Not: ideally some of you will be. You will.

The disciples stood there looking at Him, and then He was gone. And all they had was each other, the promise of the Spirit, and this final commission. No backup plan. No institution. No podcast. Just a group of people — most of them uneducated, all of them scared — and a promise that power was coming.

That same commission still stands. You are still the plan. Not plan B. Not the contingency while something better gets organised. You.

Your neighbourhood is your Jerusalem. Your workplace is part of Judea. The hard relationship, the broken friendship, the person you've been praying for — those are your Samaria. And the ends of the earth get reached when faithful people start with what's in front of them.

You have been given the Spirit. You carry the message. Start where you are.`,
    bodyId: `Kisah Para Rasul 1:8 adalah hal terakhir yang Yesus katakan sebelum Dia naik. Kata-kata terakhir-Nya sebelum pergi. Instruksi terakhir dari pengarahan terakhir: kamu akan menerima kuasa apabila Roh Kudus turun ke atasmu; dan kamu akan menjadi saksi-Ku di Yerusalem, dan di seluruh Yudea dan Samaria, dan sampai ke ujung bumi.

Kamu akan menjadi saksi-Ku. Bukan: kamu bisa jadi kalau mau. Bukan: idealnya sebagian dari kamu akan jadi. Kamu akan.

Para murid berdiri di sana menatap-Nya, dan kemudian Dia pergi. Dan yang mereka miliki hanyalah satu sama lain, janji tentang Roh, dan penugasan terakhir ini. Tidak ada rencana cadangan. Tidak ada institusi. Tidak ada podcast. Hanya sekelompok orang — kebanyakan tidak berpendidikan, semuanya ketakutan — dan sebuah janji bahwa kuasa akan datang.

Penugasan yang sama masih berlaku. Anda masih rencananya. Bukan rencana B. Bukan cadangan sementara sesuatu yang lebih baik diorganisir. Anda.

Lingkungan tempat tinggal Anda adalah Yerusalem Anda. Tempat kerja Anda bagian dari Yudea. Hubungan yang sulit, persahabatan yang rusak, orang yang selama ini Anda doakan — itu Samaria Anda. Dan ujung bumi tercapai ketika orang-orang setia mulai dengan apa yang ada di depan mereka.

Anda telah diberikan Roh. Anda membawa pesan itu. Mulailah dari tempat Anda berada.`,
  },

  // ── SECTION 7: CONFLICT, BOLDNESS & BREAKTHROUGH (Days 61–70) ────────────
  {
    title: "The Two Commands That Contain Everything",
    titleId: "Dua Perintah yang Mencakup Segalanya",
    author: "Ashley",
    body: `Jesus was asked which commandment was the greatest. He could have chosen any one of 613 laws. He answered: love God with everything you have. Heart, soul, mind, strength. And then He added a second: love your neighbour as yourself. And then He said this — all the Law and the Prophets hang on these two commands.

All of it. Every law, every instruction, every principle of how to live — it hangs on love.

This means every conflict you're in is ultimately a love problem. Every broken relationship, every workplace tension, every family rupture — somewhere in it is a failure of love. Either love for God — which produces humility, forgiveness, and self-sacrifice — or love for neighbour — which means choosing the other person's flourishing ahead of your own preferences.

Matthew 22:37-39. It sounds simple. It is not easy. It requires the death of the ego. It requires choosing someone who has hurt you. It requires forgiving someone who doesn't deserve it. It requires staying in a hard relationship when leaving would be easier.

But here's the thing about the commands: Jesus didn't give them as aspirational targets. He gave them as a description of what love from the Spirit actually looks like. The Holy Spirit in you is capable of producing this love — even when you are not. Ask Him today. He will answer.`,
    bodyId: `Yesus ditanya perintah mana yang terbesar. Dia bisa memilih salah satu dari 613 hukum. Dia menjawab: kasihilah Tuhan Allahmu dengan segenap hatimu, segenap jiwamu, segenap akal budimu, dan segenap kekuatanmu. Lalu Dia menambahkan yang kedua: kasihilah sesamamu manusia seperti dirimu sendiri. Dan kemudian Dia berkata ini — semua Hukum dan Kitab Para Nabi bergantung pada kedua perintah ini.

Semuanya. Setiap hukum, setiap instruksi, setiap prinsip tentang cara hidup — bergantung pada kasih.

Ini berarti setiap konflik yang Anda alami pada dasarnya adalah masalah kasih. Setiap hubungan yang rusak, setiap ketegangan di tempat kerja, setiap perpecahan keluarga — di suatu tempat di dalamnya ada kegagalan kasih. Entah kasih kepada Tuhan — yang menghasilkan kerendahan hati, pengampunan, dan pengorbanan diri — atau kasih kepada sesama — yang berarti memilih kesejahteraan orang lain di atas preferensi Anda sendiri.

Matius 22:37-39. Kedengarannya sederhana. Ini tidak mudah. Ini membutuhkan kematian ego. Ini membutuhkan memilih seseorang yang telah menyakiti Anda. Ini membutuhkan mengampuni seseorang yang tidak layak. Ini membutuhkan bertahan dalam hubungan yang sulit ketika pergi akan lebih mudah.

Tapi inilah hal tentang perintah-perintah itu: Yesus tidak memberikannya sebagai target aspiratif. Dia memberikannya sebagai deskripsi tentang seperti apa kasih dari Roh sebenarnya. Roh Kudus dalam diri Anda mampu menghasilkan kasih ini — bahkan ketika Anda tidak mampu. Mintalah kepada-Nya hari ini. Dia akan menjawab.`,
  },
  {
    title: "Treasure in Jars of Clay",
    titleId: "Harta dalam Bejana Tanah Liat",
    author: "Jane",
    body: `Second Corinthians 4:7 is one of the most honest and beautiful verses in Paul's writings: but we have this treasure in jars of clay to show that this all-surpassing power is from God and not from us.

Jars of clay. In Paul's world, clay jars were the most ordinary, breakable containers you could imagine. They weren't valuable. They weren't impressive. They were just vessels. And Paul says: that's us.

We are ordinary. We are breakable. We struggle. We get it wrong. We carry wounds. We're not the polished version of ourselves that we present on our best days. We are jars of clay — fragile, common, unremarkable.

And God said: that's exactly what I want to use.

Because when something extraordinary comes out of something ordinary, the glory goes to the right place. When your broken self says something that changes someone's life, they don't credit your eloquence. They feel God. When your small act of generosity produces something disproportionate, nobody credits your resources. They encounter grace.

The treasure isn't diminished by the ordinary container. It's more visible in it. Your weakness is not the obstacle to your calling. It's the frame that makes His power obvious.

You are a jar of clay. He is the treasure. That's exactly how He planned it.`,
    bodyId: `2 Korintus 4:7 adalah salah satu ayat paling jujur dan indah dalam tulisan Paulus: tetapi harta ini ada di dalam bejana tanah liat, supaya nyata bahwa kekuatan yang melimpah-limpah itu berasal dari Allah, bukan dari diri kami.

Bejana tanah liat. Di dunia Paulus, bejana tanah liat adalah wadah paling biasa dan paling mudah pecah yang bisa dibayangkan. Tidak bernilai. Tidak mengesankan. Hanya wadah. Dan Paulus berkata: itulah kita.

Kita biasa. Kita mudah pecah. Kita berjuang. Kita salah. Kita membawa luka. Kita bukan versi diri kita yang dipoles di hari terbaik. Kita adalah bejana tanah liat — rapuh, umum, tidak luar biasa.

Dan Tuhan berkata: itulah yang ingin Aku gunakan.

Karena ketika sesuatu yang luar biasa keluar dari sesuatu yang biasa, kemuliaannya pergi ke tempat yang tepat. Ketika diri Anda yang rusak mengatakan sesuatu yang mengubah hidup seseorang, mereka tidak memuji kefasihan Anda. Mereka merasakan Tuhan. Ketika tindakan kemurahan hati kecil Anda menghasilkan sesuatu yang tidak proporsional, tidak ada yang memuji sumber daya Anda. Mereka bertemu kasih karunia.

Harta itu tidak berkurang oleh wadah yang biasa. Justru lebih terlihat di dalamnya. Kelemahan Anda bukan penghalang panggilan Anda. Ia adalah bingkai yang membuat kuasa-Nya nyata.

Anda adalah bejana tanah liat. Dia adalah hartanya. Persis begitulah Dia merencanakannya.`,
  },
  {
    title: "Don't Stop Meeting Together",
    titleId: "Jangan Berhenti Berkumpul Bersama",
    author: "Ashley",
    body: `Hebrews 10:25 was not written to people who were skipping church because they couldn't find a good one. It was written to people who were staying home because the church was getting them killed. First-century believers were facing public persecution — losing property, losing status, losing their lives. The temptation to stop meeting together wasn't comfort or convenience. It was survival.

And into that — not in spite of it, but because of it — the writer says: do not give up meeting together, as some are in the habit of doing, but encouraging one another — and all the more as you see the Day approaching.

All the more. Not less, as things get harder. More.

Because community is where courage is forged. You cannot produce in isolation what you build together. The faith of the person next to you shores up your faith on the days yours is thin. The worship of the room carries you when you can't carry yourself. The prayers of the community reach places your private prayers don't.

This isn't about filling a seat. It's about being in the room. Being in the conversation. Being present for someone who needs the proof that God is still real and still good.

Show up. All the more. The Day is approaching, and we need each other.`,
    bodyId: `Ibrani 10:25 tidak ditulis kepada orang-orang yang melewatkan gereja karena tidak bisa menemukan yang bagus. Ayat ini ditulis kepada orang-orang yang tinggal di rumah karena gereja membuat mereka dibunuh. Orang-orang percaya abad pertama menghadapi penganiayaan publik — kehilangan harta, kehilangan status, kehilangan nyawa. Godaan untuk berhenti berkumpul bukan kenyamanan. Tapi bertahan hidup.

Dan ke dalam itu — bukan terlepas dari itu, tapi karena itu — penulisnya berkata: janganlah kita menjauhkan diri dari pertemuan-pertemuan ibadah kita, seperti kebiasaan beberapa orang, tetapi marilah kita saling menasihati — dan semakin giat melakukannya menjelang hari Tuhan yang mendekat.

Semakin giat. Bukan berkurang saat segalanya semakin sulit. Semakin giat.

Karena komunitas adalah tempat keberanian ditempa. Anda tidak bisa menghasilkan sendiri dalam isolasi apa yang Anda bangun bersama. Iman orang di sebelah Anda menopang iman Anda di hari-hari ketika iman Anda tipis. Penyembahan seluruh ruangan memikul Anda ketika Anda tidak bisa memikul diri sendiri. Doa-doa komunitas menjangkau tempat-tempat yang tidak bisa dijangkau doa pribadi Anda.

Ini bukan soal mengisi kursi. Ini soal berada di ruangan itu. Berada dalam percakapan. Hadir untuk seseorang yang membutuhkan bukti bahwa Tuhan masih nyata dan masih baik.

Hadirlah. Semakin giat. Hari itu mendekat, dan kita saling membutuhkan.`,
  },
  {
    title: "The Revelation That Builds the Church",
    titleId: "Pewahyuan yang Membangun Gereja",
    author: "Jane",
    body: `When Jesus asked His disciples "who do you say I am?" — Peter got it. But what Jesus said next is extraordinary. He said: flesh and blood has not revealed this to you, but my Father in heaven. And on this rock — this revealed truth — I will build my church.

The church is built on revelation. Not on institution, not on tradition, not on charisma or clever programming. On the revealed reality of who Jesus is.

Matthew 16:16-18. When Peter said "You are the Messiah, the Son of the living God" — he wasn't concluding from evidence. God had opened his eyes. The Spirit had planted a certainty in him that went beyond rational argument.

That same revelation is still the foundation of everything. The church grows where people genuinely encounter Jesus — not just information about Him, but a real encounter with His risen person. And that encounter changes them in ways that no program can replicate.

This is why the most important thing the church does is create space for encounter. Not entertainment. Not education alone. Encounter. When people come into genuine contact with Jesus — their lives reorganise around Him. They become His witnesses without being told to. They give generously without being pressured. They serve willingly without needing recognition.

Everything flows from revelation. Ask God to make it real to you again today.`,
    bodyId: `Ketika Yesus bertanya kepada murid-murid-Nya "menurutmu siapakah Aku?" — Petrus mendapatkannya. Tapi apa yang Yesus katakan selanjutnya luar biasa. Dia berkata: bukan manusia yang menyatakan itu kepadamu, melainkan Bapa-Ku yang di surga. Dan di atas batu karang ini — kebenaran yang diwahyukan ini — Aku akan membangun jemaat-Ku.

Gereja dibangun di atas pewahyuan. Bukan institusi, bukan tradisi, bukan karisma atau program yang cerdik. Pada realitas yang diwahyukan tentang siapa Yesus.

Matius 16:16-18. Ketika Petrus berkata "Engkaulah Mesias, Anak Allah yang hidup" — dia bukan menyimpulkan dari bukti. Tuhan telah membuka matanya. Roh telah menanamkan kepastian di dalam dirinya yang melampaui argumen rasional.

Pewahyuan yang sama masih menjadi fondasi segalanya. Gereja bertumbuh di mana orang-orang sungguh-sungguh berjumpa dengan Yesus — bukan sekadar informasi tentang Dia, tapi perjumpaan nyata dengan pribadi-Nya yang bangkit. Dan perjumpaan itu mengubah mereka dengan cara yang tidak bisa ditiru oleh program apa pun.

Inilah mengapa hal terpenting yang dilakukan gereja adalah menciptakan ruang untuk perjumpaan. Bukan hiburan. Bukan pendidikan semata. Perjumpaan. Ketika orang-orang bersentuhan secara nyata dengan Yesus — hidup mereka tertata ulang di sekitar-Nya. Mereka menjadi saksi-Nya tanpa disuruh. Mereka memberi dengan murah hati tanpa ditekan. Mereka melayani dengan sukarela tanpa butuh pengakuan.

Semuanya mengalir dari pewahyuan. Mintalah Tuhan untuk membuatnya nyata kembali bagi Anda hari ini.`,
  },
  {
    title: "He Holds Your Right Hand",
    titleId: "Dia Memegang Tangan Kanan Anda",
    author: "Ashley",
    body: `There's a specific tenderness in Isaiah 41:13 that I've never quite got over: for I am the Lord your God who takes hold of your right hand and says to you, do not fear; I will help you.

Takes hold of your right hand. Not from a distance. Not with a statement. With His hand. The God of the universe, taking your specific hand, saying specifically to you: do not fear. I will help you.

This is personal. Not a general announcement. Not a broadcast. A one-on-one interaction with a God who knows which hand is dominant, who knows what you're facing, who has positioned Himself next to you before you even called out.

The path to breakthrough in No More Fear isn't some grand spiritual heroic act. It often begins with this: letting God take your hand. Letting Him lead where you couldn't see. Trusting before the fear disappears. Walking forward while He holds on.

You don't need to be fearless. You need to be held. And He has already reached out His hand.

Whatever you're facing today — He is not standing far off, watching to see if you'll manage. He has taken hold of your hand. You are not walking into anything alone. Fear doesn't have a right hand that can compete with His grip.`,
    bodyId: `Ada kelembutan khusus dalam Yesaya 41:13 yang tidak pernah hilang dari hati saya: sebab Akulah Tuhan Allahmu yang memegang tangan kananmu dan berkata kepadamu: janganlah takut; Akulah yang menolong engkau.

Memegang tangan kananmu. Bukan dari kejauhan. Bukan dengan sebuah pernyataan. Dengan tangan-Nya. Allah semesta alam, memegang tangan Anda yang spesifik, berkata khusus kepada Anda: janganlah takut. Akulah yang menolong engkau.

Ini personal. Bukan pengumuman umum. Bukan siaran. Interaksi satu-lawan-satu dengan Tuhan yang tahu tangan mana yang dominan, yang tahu apa yang Anda hadapi, yang sudah memposisikan diri di samping Anda bahkan sebelum Anda berseru.

Jalan menuju terobosan dalam Tidak Ada Lagi Ketakutan bukan tindakan heroik rohani yang besar. Sering kali dimulai dengan ini: membiarkan Tuhan memegang tangan Anda. Membiarkan-Nya memimpin ke tempat yang tidak bisa Anda lihat. Percaya sebelum ketakutan menghilang. Melangkah maju sementara Dia memegang Anda.

Anda tidak perlu menjadi pemberani. Anda perlu dipegang. Dan Dia sudah mengulurkan tangan-Nya.

Apa pun yang Anda hadapi hari ini — Dia tidak berdiri jauh, mengamati apakah Anda akan berhasil. Dia telah memegang tangan Anda. Anda tidak berjalan ke mana pun sendirian. Ketakutan tidak punya tangan kanan yang bisa bersaing dengan genggaman-Nya.`,
  },
  {
    title: "Press Toward the Thing You Haven't Reached Yet",
    titleId: "Teruslah Mengejar Hal yang Belum Anda Raih",
    author: "Jane",
    body: `Philippians 3:13-14 is Paul at his most relentless: brothers and sisters, I do not consider myself yet to have taken hold of it. But one thing I do: forgetting what is behind and straining toward what is ahead, I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.

One thing I do. Not ten things. Not a diversified spiritual portfolio. One thing: press on.

The word Paul uses for press on is dioko — it means to pursue urgently, to chase aggressively, to run after as if your life depends on it. This isn't a gentle spiritual saunter. This is someone who has decided that the prize is worth everything and is running accordingly.

What makes this possible is the forgetting. Forgetting what is behind. Not your identity. Not your lessons. The weight of past failure, past shame, past missed opportunity. You cannot run well carrying all of that. The breakthrough ahead requires releasing the burden behind.

What are you still carrying from your past that is slowing down your future? Fear that didn't come to pass. Shame from something already forgiven. Regret over a season that can't be recovered.

Put it down. Turn forward. Press on. The prize isn't behind you. It's ahead. And God is calling you toward it.`,
    bodyId: `Filipi 3:13-14 adalah Paulus yang paling gigih: saudara-saudara, aku sendiri tidak menganggap bahwa aku telah menangkapnya. Tetapi satu hal yang kulakukan: aku melupakan apa yang di belakangku dan mengarahkan diri kepada apa yang di depanku, dan berlari-lari menuju tujuan untuk memperoleh hadiah panggilan sorgawi dari Allah dalam Kristus Yesus.

Satu hal yang kulakukan. Bukan sepuluh hal. Bukan portofolio rohani yang terdiversifikasi. Satu hal: terus berlari.

Kata yang Paulus gunakan untuk berlari adalah dioko — artinya mengejar dengan mendesak, memburu secara agresif, mengejar seolah hidup bergantung padanya. Ini bukan jalan-jalan rohani yang santai. Ini seseorang yang sudah memutuskan bahwa hadiahnya layak untuk segalanya dan berlari sesuai dengan itu.

Yang membuat ini mungkin adalah melupakan. Melupakan apa yang di belakang. Bukan identitas Anda. Bukan pelajaran Anda. Beban kegagalan masa lalu, rasa malu masa lalu, kesempatan yang terlewat. Anda tidak bisa berlari dengan baik sambil membawa semua itu. Terobosan di depan mengharuskan melepaskan beban di belakang.

Apa yang masih Anda bawa dari masa lalu yang memperlambat masa depan Anda? Ketakutan yang tidak terjadi. Rasa malu dari sesuatu yang sudah diampuni. Penyesalan atas musim yang tidak bisa dipulihkan.

Letakkan itu. Berbaliklah ke depan. Teruslah berlari. Hadiahnya bukan di belakang Anda. Ia di depan. Dan Tuhan memanggil Anda menuju ke sana.`,
  },
  {
    title: "Take Every Thought Captive",
    titleId: "Tawanlah Setiap Pikiran",
    author: "Ashley",
    body: `Second Corinthians 10:5 describes the primary battleground of the Christian life: we take captive every thought to make it obedient to Christ. The battle isn't first in your circumstances. It's in your mind. The enemy knows this. The mind is where fear establishes its base camp.

Burnout doesn't start with too many activities. It starts with thoughts that convince you rest is irresponsible. Anxiety doesn't start with problems. It starts with thoughts that interpret uncertainty as evidence of disaster. Discouragement doesn't start with hard circumstances. It starts with thoughts that tell you the hard won't end.

The spiritual discipline of thought-capture is not positive thinking. It's warfare. It's the active, intentional refusal to let a thought run unchallenged just because it showed up. Every thought that is contrary to who God is, what God says, and who you are in Him — capture it. Challenge it. Bring it before Christ and ask: is this true?

Most fearful thoughts don't survive that question. Because most of them are predictions dressed as facts. What if? Probably. Surely by now. These aren't truth. They're projections.

Build a fortress around your mind. Not by avoiding hard realities, but by refusing to let unchecked thoughts build their structures inside you. You have the authority. Use it.`,
    bodyId: `2 Korintus 10:5 menggambarkan medan pertempuran utama kehidupan Kristen: kami menawan segala pikiran dan menaklukkannya kepada Kristus. Pertempuran bukan pertama-tama di keadaan Anda. Tapi di pikiran Anda. Musuh tahu ini. Pikiran adalah tempat di mana ketakutan mendirikan markas besarnya.

Kelelahan tidak dimulai dari terlalu banyak aktivitas. Ia dimulai dari pikiran yang meyakinkan Anda bahwa istirahat itu tidak bertanggung jawab. Kecemasan tidak dimulai dari masalah. Ia dimulai dari pikiran yang menginterpretasikan ketidakpastian sebagai bukti bencana. Keputusasaan tidak dimulai dari keadaan yang sulit. Ia dimulai dari pikiran yang memberitahu Anda bahwa kesulitan itu tidak akan berakhir.

Disiplin rohani menawan pikiran bukan berpikir positif. Ini peperangan. Ini penolakan aktif dan disengaja untuk membiarkan pikiran berjalan tanpa ditantang hanya karena ia muncul. Setiap pikiran yang bertentangan dengan siapa Tuhan, apa yang Tuhan katakan, dan siapa Anda di dalam-Nya — tawanlah. Tantanglah. Bawa ke hadapan Kristus dan tanyakan: apakah ini benar?

Kebanyakan pikiran ketakutan tidak bertahan dari pertanyaan itu. Karena kebanyakan adalah prediksi yang menyamar sebagai fakta. Bagaimana kalau? Mungkin. Pasti sekarang sudah. Ini bukan kebenaran. Ini proyeksi.

Bangun benteng di sekeliling pikiran Anda. Bukan dengan menghindari realitas yang sulit, tapi dengan menolak membiarkan pikiran yang tidak diperiksa membangun strukturnya di dalam Anda. Anda punya otoritas. Gunakanlah.`,
  },
  {
    title: "The Word in Your Mouth All Day",
    titleId: "Firman di Mulut Anda Sepanjang Hari",
    author: "Jane",
    body: `Joshua 1:8 gives one of the most specific instructions in all of scripture about how to experience consistent success: keep this Book of the Law always on your lips; meditate on it day and night, so that you may be careful to do everything written in it. Then you will be prosperous and successful.

Always on your lips. Day and night. Not just in the morning devotional. Not just Sunday. All day.

This isn't about volume of scripture consumption — it's about integration. The Word becoming so familiar to your thought life that it naturally surfaces when you're anxious, when you're tempted, when you're in a decision, when you're afraid.

Meditation in this context isn't a mindfulness technique. The Hebrew word hagah means to mutter, to growl, to speak under your breath. It's the picture of a person walking around all day quietly rehearsing what God said. Not performing for an audience. Just living in the Word.

When fear comes knocking — the Word comes to mind. When doubt rises — the Word comes to mouth. When the enemy suggests you're not enough — the Word answers back.

This is how you fortify the mind that Ashley spoke about yesterday. The Word becomes the material of your inner world. And when your inner world is built on truth, the outer world can shake without demolishing you.`,
    bodyId: `Yosua 1:8 memberikan salah satu instruksi paling spesifik di seluruh Kitab Suci tentang bagaimana mengalami keberhasilan yang konsisten: janganlah engkau lupa memperkatakan kitab Taurat ini, tetapi renungkanlah itu siang dan malam, supaya engkau bertindak hati-hati sesuai dengan segala yang tertulis di dalamnya. Maka perjalananmu akan berhasil dan engkau akan beruntung.

Selalu di bibirmu. Siang dan malam. Bukan hanya di renungan pagi. Bukan hanya hari Minggu. Sepanjang hari.

Ini bukan soal volume konsumsi Kitab Suci — ini soal integrasi. Firman menjadi begitu akrab dengan kehidupan pikiran Anda sehingga secara alami muncul ketika Anda cemas, ketika Anda tergoda, ketika Anda dalam keputusan, ketika Anda takut.

Meditasi dalam konteks ini bukan teknik mindfulness. Kata Ibrani hagah berarti berkomat-kamit, bergumam, berbicara pelan-pelan. Itu gambaran seseorang yang berjalan sepanjang hari dengan diam-diam mengulang apa yang Tuhan katakan. Bukan berakting untuk penonton. Hanya hidup dalam Firman.

Ketika ketakutan datang mengetuk — Firman muncul di pikiran. Ketika keraguan bangkit — Firman muncul di mulut. Ketika musuh menyarankan Anda tidak cukup — Firman menjawab balik.

Inilah cara Anda membentengi pikiran yang Ashley bicarakan kemarin. Firman menjadi bahan dunia batin Anda. Dan ketika dunia batin Anda dibangun di atas kebenaran, dunia luar bisa bergoncang tanpa menghancurkan Anda.`,
  },
  {
    title: "Don't Be Afraid — Just Believe",
    titleId: "Jangan Takut — Percaya Saja",
    author: "Ashley",
    body: `One of the most important moments in Jesus' ministry is in Mark 5. Jairus, a synagogue leader, comes to Jesus in desperation — his daughter is dying. Jesus agrees to come. But on the way, messengers arrive with the worst possible news: she's dead. Don't bother the teacher any further.

And in that moment — with the worst news in the air, with grieving already starting, with all reasonable hope gone — Jesus says something extraordinary: don't be afraid; just believe.

Don't be afraid. Just believe. Not both — not "don't be afraid AND believe" as though they're compatible companions. Just believe. As though belief and fear cannot occupy the same space at the same level, and Jesus is calling Jairus to choose.

He goes to the house. He puts out the mourners. He takes the girl's hand. And she gets up.

The word Jesus used — don't be afraid — is the same word used throughout the New Testament for the spirit of fear, the kind that produces timidity and paralysis. And He's saying: put that down. Just believe.

Your situation may have received the worst report. The deadline passed. The door closed. The news arrived. But Jesus is still saying the same thing He said to Jairus: don't be afraid. Just believe. He has not left the building.`,
    bodyId: `Salah satu momen terpenting dalam pelayanan Yesus ada di Markus 5. Yairus, seorang kepala rumah ibadat, datang kepada Yesus dalam keputusasaan — putrinya sedang sekarat. Yesus setuju untuk datang. Tapi dalam perjalanan, utusan tiba dengan berita terburuk: dia sudah mati. Jangan lagi merepotkan Guru.

Dan di momen itu — dengan berita terburuk di udara, dengan perkabungan sudah dimulai, dengan semua harapan yang masuk akal sudah sirna — Yesus berkata sesuatu yang luar biasa: jangan takut; percaya saja.

Jangan takut. Percaya saja. Bukan keduanya — bukan "jangan takut DAN percaya" seolah keduanya bisa berdampingan dengan nyaman. Percaya saja. Seolah iman dan ketakutan tidak bisa menempati ruang yang sama pada level yang sama, dan Yesus memanggil Yairus untuk memilih.

Dia pergi ke rumah itu. Dia menyuruh para peratap keluar. Dia memegang tangan gadis itu. Dan gadis itu bangun.

Kata yang Yesus gunakan — jangan takut — adalah kata yang sama yang digunakan di seluruh Perjanjian Baru untuk roh ketakutan, jenis yang menghasilkan kepengecutan dan kelumpuhan. Dan Dia berkata: letakkan itu. Percaya saja.

Situasi Anda mungkin sudah menerima laporan terburuk. Tenggat waktu berlalu. Pintu tertutup. Berita tiba. Tapi Yesus masih berkata hal yang sama yang Dia katakan kepada Yairus: jangan takut. Percaya saja. Dia belum meninggalkan ruangan.`,
  },
  {
    title: "Lord, Make Us Bold",
    titleId: "Tuhan, Jadikan Kami Berani",
    author: "Jane",
    body: `Acts 4:29 is one of the most raw and beautiful prayers in the New Testament. The apostles had just been threatened by the same authorities that crucified Jesus. They were told to stop speaking in His name. And they went back to their community and prayed — not for protection, not for comfort, not for the threats to stop. They prayed: now, Lord, consider their threats and enable your servants to speak your word with great boldness.

Enable us to be bold. That was the prayer.

Not safety. Not victory over the opponents. Not a change in circumstances. Lord, make us bold enough to keep going in the circumstances.

The result? Acts 4:31 — after they prayed, the place where they were meeting was shaken. And they were all filled with the Holy Spirit and spoke the word of God boldly.

The shaking wasn't God moving against the enemies. It was God confirming the prayer. The place shook. The filling came. And the boldness followed.

What threatens you into silence today? A relationship. A workplace. A social environment where your faith would be unwelcome. The same God who shook the upper room can shake yours. The same Spirit who filled those early disciples is available to fill you.

Pray the same prayer. Not for the threat to disappear. For the boldness to keep going.`,
    bodyId: `Kisah Para Rasul 4:29 adalah salah satu doa paling mentah dan indah di Perjanjian Baru. Para rasul baru saja diancam oleh otoritas yang sama yang menyalibkan Yesus. Mereka diperintahkan untuk berhenti berbicara dalam nama-Nya. Dan mereka kembali ke komunitas mereka dan berdoa — bukan untuk perlindungan, bukan untuk kenyamanan, bukan supaya ancaman berhenti. Mereka berdoa: sekarang, Tuhan, lihatlah ancaman mereka dan berilah hamba-hamba-Mu keberanian untuk memberitakan firman-Mu.

Berilah kami keberanian. Itulah doanya.

Bukan keamanan. Bukan kemenangan atas lawan. Bukan perubahan keadaan. Tuhan, jadikan kami cukup berani untuk terus maju di dalam keadaan itu.

Hasilnya? Kisah Para Rasul 4:31 — setelah mereka berdoa, tempat mereka berkumpul bergoncang. Dan mereka semua penuh dengan Roh Kudus dan memberitakan firman Allah dengan berani.

Goncangan itu bukan Tuhan bergerak melawan musuh. Itu Tuhan mengonfirmasi doa itu. Tempatnya bergoncang. Kepenuhan datang. Dan keberanian mengikuti.

Apa yang mengancam Anda menjadi diam hari ini? Sebuah hubungan. Tempat kerja. Lingkungan sosial di mana iman Anda tidak disambut. Tuhan yang sama yang mengguncang ruangan loteng itu bisa mengguncang milik Anda. Roh yang sama yang memenuhi murid-murid awal itu tersedia untuk memenuhi Anda.

Berdoalah doa yang sama. Bukan supaya ancamannya menghilang. Supaya Anda diberi keberanian untuk terus maju.`,
  },

  // ── SECTION 8: LOVE, REST & PEACE (Days 71–80) ──────────────────────────────
  {
    title: "Guard the Gate of Your Heart",
    titleId: "Jagalah Gerbang Hati Anda",
    author: "Ashley",
    body: `Proverbs 4:23 says above all else, guard your heart, for everything you do flows from it. Above all else. More important than guarding your reputation, your finances, your schedule — guard your heart.

Because whatever gets into your heart eventually gets into your life. Fear that you entertain becomes anxiety you live with. Bitterness you nurse becomes a lens that distorts everything you see. Doubt you welcome becomes the ceiling on your expectations. The heart is the source — and what flows from a polluted source pollutes everything downstream.

This is not paranoid isolation from the world. It's discernment about what you meditate on, what you agree with, what you rehearse in the quiet of your own mind. The heart doesn't protect itself. You have to guard it.

Practically: what are you letting in? What voices are you giving unfiltered access? What content are you consuming that shapes your emotional landscape before you've even prayed? The algorithm, the news feed, the conversation with the person who always leaves you discouraged — all of it is competing for residency in your heart.

You don't have to be cruel about it. But you do have to be intentional. The overflow of your heart shapes your words, your relationships, your decisions. Guard what goes in. Because what goes in always comes out.`,
    bodyId: `Amsal 4:23 berkata jagalah hatimu dengan segala kewaspadaan, karena dari situlah terpancar kehidupan. Dengan segala kewaspadaan. Lebih penting dari menjaga reputasi, keuangan, jadwal Anda — jagalah hati Anda.

Karena apa pun yang masuk ke hati Anda akhirnya masuk ke hidup Anda. Ketakutan yang Anda biarkan menjadi kecemasan yang Anda hidupi. Kepahitan yang Anda pelihara menjadi lensa yang mendistorsi semua yang Anda lihat. Keraguan yang Anda sambut menjadi batas atas harapan Anda. Hati adalah sumber — dan apa yang mengalir dari sumber yang tercemar mencemari semua yang ada di hilir.

Ini bukan isolasi paranoid dari dunia. Ini hikmat tentang apa yang Anda renungkan, apa yang Anda setujui, apa yang Anda ulang-ulang dalam kesunyian pikiran Anda sendiri. Hati tidak melindungi dirinya sendiri. Anda harus menjaganya.

Secara praktis: apa yang Anda biarkan masuk? Suara siapa yang Anda berikan akses tanpa filter? Konten apa yang Anda konsumsi yang membentuk lanskap emosional Anda bahkan sebelum Anda berdoa? Algoritma, umpan berita, percakapan dengan orang yang selalu meninggalkan Anda putus asa — semuanya bersaing untuk tempat tinggal di hati Anda.

Anda tidak harus kejam tentang ini. Tapi Anda harus disengaja. Limpahan hati Anda membentuk kata-kata, hubungan, keputusan Anda. Jagalah apa yang masuk. Karena apa yang masuk selalu keluar.`,
  },
  {
    title: "The Secret of Contentment",
    titleId: "Rahasia Kepuasan",
    author: "Jane",
    body: `Philippians 4:12-13 is Paul writing from prison. Not from a conference stage, not from a comfortable study — from a cell. And he writes: I have learned the secret of being content in any and every situation, whether well fed or hungry, whether living in plenty or in want. I can do all this through Him who gives me strength.

Contentment is a secret. A learned secret. It's not a personality type. It's not something some people are born with and others aren't. It's something you learn — through enough seasons of both plenty and want to discover that the peace underneath doesn't change with the circumstances.

I can do all this through Him who gives me strength. That verse is not about achieving anything. It's about enduring everything — with contentment, with peace, without losing yourself in either the feast or the famine.

The overflow life is not a permanent state of material abundance. It's a permanent state of inward fullness that seasons of material scarcity cannot take from you. It's knowing the Source doesn't fluctuate. His supply doesn't decrease when your account does.

Learn contentment. Not passivity. Not indifference to growth and change. But the settled peace of a person who has found that Jesus is enough — in every situation, at every income, in every season.`,
    bodyId: `Filipi 4:12-13 adalah Paulus menulis dari penjara. Bukan dari panggung konferensi, bukan dari ruang kerja yang nyaman — dari sel. Dan dia menulis: aku tahu apa artinya hidup berkekurangan dan tahu apa artinya berkelimpahan. Dalam segala hal dan dalam segala perkara aku telah belajar rahasianya, baik kenyang maupun lapar, baik berkelimpahan maupun berkekurangan. Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.

Kepuasan adalah sebuah rahasia. Rahasia yang dipelajari. Bukan tipe kepribadian. Bukan sesuatu yang dimiliki sebagian orang sejak lahir dan yang lain tidak. Ini sesuatu yang Anda pelajari — melalui cukup banyak musim kelimpahan dan kekurangan untuk menemukan bahwa kedamaian di bawahnya tidak berubah mengikuti keadaan.

Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku. Ayat itu bukan tentang mencapai apa pun. Ini tentang menanggung segalanya — dengan kepuasan, dengan damai, tanpa kehilangan diri baik dalam pesta maupun kelaparan.

Hidup yang melimpah bukan keadaan permanen kelimpahan materi. Ini keadaan permanen kepenuhan batin yang tidak bisa dirampas oleh musim kekurangan materi. Ini mengetahui Sumbernya tidak berfluktuasi. Persediaan-Nya tidak berkurang ketika rekening Anda berkurang.

Pelajarilah kepuasan. Bukan kepasifan. Bukan ketidakpedulian terhadap pertumbuhan dan perubahan. Tapi kedamaian yang mantap dari seseorang yang telah menemukan bahwa Yesus cukup — dalam setiap situasi, di setiap penghasilan, di setiap musim.`,
  },
  {
    title: "Abide — And You Will Bear Fruit You Didn't Manufacture",
    titleId: "Tinggallah — Dan Anda Akan Berbuah Tanpa Memproduksinya Sendiri",
    author: "Ashley",
    body: `John 15:4-5 is one of the most countercultural passages in the entire New Testament for a productivity-obsessed culture: abide in Me, as I also abide in you. No branch can bear fruit by itself; it must abide in the vine. Neither can you bear fruit unless you abide in Me. I am the vine; you are the branches. If you remain in Me and I in you, you will bear much fruit; apart from Me you can do nothing.

The word abide means to remain, to dwell, to make your home in. It's not a visit. It's a residency.

Notice what the branch doesn't do. It doesn't manufacture fruit. It doesn't strain and produce. It simply stays connected to the source, and fruit is the natural consequence of that connection. The branch's job is not production. It's connection.

Everything we've built our achievement culture around is upended here. You don't bear fruit by trying harder. You bear fruit by staying closer. The doing flows from the being. The output flows from the abiding.

This changes what your primary spiritual discipline looks like. Not another program. Not a better method. Simply staying. Remaining. Dwelling in His presence long enough that His life naturally flows through you into the people and situations around you.

Abide today. Let the fruit take care of itself.`,
    bodyId: `Yohanes 15:4-5 adalah salah satu bagian paling kontra-budaya di seluruh Perjanjian Baru untuk budaya yang terobsesi produktivitas: tinggallah di dalam Aku, seperti Aku di dalam kamu. Ranting tidak dapat berbuah dari dirinya sendiri; ia harus tinggal di pokok anggur. Demikian juga kamu, jika kamu tidak tinggal di dalam Aku. Akulah pokok anggur dan kamulah ranting-rantingnya. Barangsiapa tinggal di dalam Aku dan Aku di dalam dia, ia berbuah banyak; sebab di luar Aku kamu tidak dapat berbuat apa-apa.

Kata tinggal berarti menetap, berdiam, menjadikan rumah di dalam. Ini bukan kunjungan. Ini kependudukan.

Perhatikan apa yang tidak dilakukan oleh ranting. Ia tidak memproduksi buah. Ia tidak memaksa dan menghasilkan. Ia hanya tetap terhubung ke sumber, dan buah adalah konsekuensi alami dari koneksi itu. Tugas ranting bukan produksi. Tapi koneksi.

Semua yang kita bangun di budaya pencapaian kita dijungkirbalikkan di sini. Anda tidak berbuah dengan berusaha lebih keras. Anda berbuah dengan tinggal lebih dekat. Tindakan mengalir dari keberadaan. Hasil mengalir dari tinggal.

Ini mengubah seperti apa disiplin rohani utama Anda. Bukan program lain. Bukan metode yang lebih baik. Sekadar tinggal. Menetap. Berdiam dalam hadirat-Nya cukup lama sehingga hidup-Nya secara alami mengalir melalui Anda ke orang-orang dan situasi di sekitar Anda.

Tinggallah hari ini. Biarkan buahnya mengurus dirinya sendiri.`,
  },
  {
    title: "Learn from Me",
    titleId: "Belajarlah dari-Ku",
    author: "Jane",
    body: `Matthew 11:29 contains one of the most intimate invitations Jesus ever extended: take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls.

Learn from me. Not from the productivity gurus. Not from the performance metrics. From Me.

What does Jesus teach by example? Gentleness. Humility. These are not passive traits. Jesus was the most powerful person in any room He ever entered — and He was consistently the most gentle and humble. Power expressed through gentleness. Authority expressed through humility.

This is what He's offering to form in you. Not just a technique for rest — a character that naturally produces rest. Because the burden most people carry isn't primarily circumstantial. It's relational. It's the weight of needing to be right. Of needing to be seen. Of needing to be more than you are. Of performing for approval.

A gentle and humble heart doesn't carry that weight. It's already free from the need to prove itself. It doesn't need to win every argument. Doesn't need the recognition. Doesn't need to be in control.

That kind of soul is light. That's the rest Jesus is promising. Learn it from Him. He's the only teacher who embodies it completely.`,
    bodyId: `Matius 11:29 berisi salah satu undangan paling intim yang pernah Yesus sampaikan: pikullah kuk yang Kupasang dan belajarlah pada-Ku, karena Aku lemah lembut dan rendah hati, dan jiwamu akan mendapat ketenangan.

Belajarlah dari-Ku. Bukan dari para guru produktivitas. Bukan dari metrik kinerja. Dari-Ku.

Apa yang Yesus ajarkan melalui teladan? Kelembutan. Kerendahan hati. Ini bukan sifat pasif. Yesus adalah orang paling berkuasa di setiap ruangan yang pernah Dia masuki — dan Dia secara konsisten paling lemah lembut dan rendah hati. Kuasa yang diekspresikan melalui kelembutan. Otoritas yang diekspresikan melalui kerendahan hati.

Inilah yang Dia tawarkan untuk dibentuk dalam diri Anda. Bukan sekadar teknik untuk beristirahat — sebuah karakter yang secara alami menghasilkan istirahat. Karena beban yang dipikul kebanyakan orang bukan terutama keadaan. Tapi relasional. Itu berat dari kebutuhan untuk selalu benar. Kebutuhan untuk terlihat. Kebutuhan untuk menjadi lebih dari yang Anda sebenarnya. Tampil untuk mendapat persetujuan.

Hati yang lemah lembut dan rendah hati tidak memikul beban itu. Ia sudah bebas dari kebutuhan membuktikan diri. Ia tidak perlu memenangkan setiap argumen. Tidak butuh pengakuan. Tidak perlu mengendalikan.

Jiwa semacam itu ringan. Itulah istirahat yang Yesus janjikan. Pelajarilah dari-Nya. Dia satu-satunya guru yang menghidupinya sepenuhnya.`,
  },
  {
    title: "Resist — Standing on What You Know",
    titleId: "Lawanlah — Berdiri di Atas Apa yang Anda Ketahui",
    author: "Ashley",
    body: `First Peter 5:8-9 gives a both/and approach to the enemy that I think most Christians miss. Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour. Resist him, firm in your faith.

Two things. Watch. Resist. Not just one — both.

Watchfulness without resistance becomes anxiety. You see everything coming but you don't have the posture to stand against it. You're aware but paralysed. Resistance without watchfulness becomes recklessness. You're standing firm but you didn't see what was coming from the other direction.

Be watchful. Be sober. Don't be naive about the nature of spiritual opposition. The enemy is real. His tactics are real. His goal is destruction. Don't pretend otherwise.

And then resist. Firm in your faith. Not firm in your willpower. Not firm in your spiritual track record. Firm in your faith — in the finished work of Jesus, in the authority you carry, in the truth that greater is He who is in you.

The lion's roar is loud. But roaring isn't the same as winning. The roar is designed to make you freeze, to make you run, to make you surrender before the battle begins. Resist it. Firm in what you know to be true. The lion has already been defeated — he just hasn't stopped roaring yet.`,
    bodyId: `1 Petrus 5:8-9 memberikan pendekatan dua sisi terhadap musuh yang menurut saya kebanyakan orang Kristen lewatkan. Sadarlah dan berjaga-jagalah! Lawanmu si iblis berjalan keliling seperti singa yang mengaum-aum, mencari orang yang dapat ditelannya. Lawanlah dia dengan iman yang teguh.

Dua hal. Waspadalah. Lawanlah. Bukan hanya satu — keduanya.

Kewaspadaan tanpa perlawanan menjadi kecemasan. Anda melihat semua yang datang tapi tidak punya postur untuk melawannya. Anda sadar tapi lumpuh. Perlawanan tanpa kewaspadaan menjadi kecerobohan. Anda berdiri teguh tapi tidak melihat apa yang datang dari arah lain.

Waspadalah. Sadarlah. Jangan naif tentang sifat perlawanan rohani. Musuh itu nyata. Taktiknya nyata. Tujuannya adalah kehancuran. Jangan berpura-pura sebaliknya.

Dan kemudian lawanlah. Teguh dalam iman. Bukan teguh dalam kemauan keras. Bukan teguh dalam rekam jejak rohani. Teguh dalam iman — dalam karya Kristus yang sudah selesai, dalam otoritas yang Anda pikul, dalam kebenaran bahwa lebih besar Dia yang ada di dalam kamu.

Auman singa itu keras. Tapi mengaum bukan sama dengan menang. Auman itu dirancang untuk membuat Anda membeku, membuat Anda lari, membuat Anda menyerah sebelum pertempuran dimulai. Lawanlah. Teguh dalam apa yang Anda ketahui sebagai benar. Singa itu sudah dikalahkan — dia hanya belum berhenti mengaum.`,
  },
  {
    title: "He Leads You to Still Waters",
    titleId: "Dia Membimbing Anda ke Air yang Tenang",
    author: "Jane",
    body: `Psalm 23 is perhaps the most loved passage in all of scripture, and for good reason. David wasn't writing from a place of comfort — he'd known famine, exile, warfare, betrayal. And from that life, he wrote: The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.

Makes me lie down. He doesn't suggest. He doesn't recommend. He makes the sheep lie down. Because the sheep — left to itself — would keep grazing until it collapsed. The sheep doesn't know when to stop.

That sounds uncomfortably familiar.

The still waters aren't a reward for the sheep that worked hardest. They're a gift for every sheep that follows the shepherd. Rest isn't what you earn at the end of the productive season. Rest is what the Good Shepherd leads you to in the middle of it — because He knows that a restless, depleted sheep is a sheep that has wandered.

He wants to restore your soul. Not just fix your circumstances. Restore your soul — that interior place where peace lives or doesn't. Where joy flows or dries up. Where faith is strengthened or eroded.

Follow Him to still waters today. Let Him restore what the week has taken.`,
    bodyId: `Mazmur 23 mungkin adalah bagian yang paling dicintai di seluruh Kitab Suci, dan untuk alasan yang tepat. Daud tidak menulis dari tempat kenyamanan — dia mengenal kelaparan, pengasingan, peperangan, pengkhianatan. Dan dari kehidupan itu, dia menulis: Tuhan adalah gembalaku; takkan kekurangan aku. Ia membaringkan aku di padang yang berumput hijau. Ia membimbing aku ke air yang tenang. Ia menyegarkan jiwaku.

Membaringkan aku. Dia tidak menyarankan. Dia tidak merekomendasikan. Dia membaringkan domba itu. Karena domba — dibiarkan sendiri — akan terus merumput sampai ambruk. Domba tidak tahu kapan harus berhenti.

Itu terdengar tidak nyaman akrabnya.

Air yang tenang bukan hadiah untuk domba yang bekerja paling keras. Itu karunia untuk setiap domba yang mengikuti gembala. Istirahat bukan yang Anda dapatkan di akhir musim produktif. Istirahat adalah tempat Gembala yang Baik membimbing Anda di tengah-tengahnya — karena Dia tahu bahwa domba yang gelisah dan terkuras adalah domba yang sudah tersesat.

Dia ingin menyegarkan jiwa Anda. Bukan sekadar memperbaiki keadaan Anda. Menyegarkan jiwa Anda — tempat interior di mana damai tinggal atau tidak. Di mana sukacita mengalir atau mengering. Di mana iman diperkuat atau dikikis.

Ikutilah Dia ke air yang tenang hari ini. Biarlah Dia memulihkan apa yang telah dirampas oleh minggu ini.`,
  },
  {
    title: "We Stand in Grace",
    titleId: "Kita Berdiri dalam Kasih Karunia",
    author: "Ashley",
    body: `Romans 5:2 says through Jesus we have gained access by faith into this grace in which we now stand. Not in which we visit. Not in which we perform. In which we stand.

Standing is a position. It's stable. It's not moving. When you stand in something, it becomes your base — not a destination you're working toward but the ground beneath your feet.

Most Christians live as visitors to grace. They come when they've failed, receive forgiveness, feel better, and then go back to trying to earn their place through performance. Grace is the emergency room, not the home.

But Paul says we stand in it. We live in it. We breathe it. It's not what we reach for in crisis — it's what we're already standing on. The fall and the rise both happen inside grace. The success and the failure both happen inside grace. There is no moment of your day that you have stepped outside of it.

This changes how you face the morning. You don't wake up and check in with grace to see if you've still got it. You wake up standing in it. Secure. Positioned. Already loved, already forgiven, already accepted — and nothing you do today will change that.

Stand there. Stay there. Everything else gets built on that foundation.`,
    bodyId: `Roma 5:2 berkata oleh Yesus kita telah beroleh jalan masuk oleh iman kepada kasih karunia ini di mana kita sekarang berdiri. Bukan di mana kita berkunjung. Bukan di mana kita tampil. Di mana kita berdiri.

Berdiri adalah sebuah posisi. Stabil. Tidak bergerak. Ketika Anda berdiri di dalam sesuatu, itu menjadi dasar Anda — bukan tujuan yang sedang Anda tuju tapi tanah di bawah kaki Anda.

Kebanyakan orang Kristen hidup sebagai pengunjung kasih karunia. Mereka datang ketika gagal, menerima pengampunan, merasa lebih baik, lalu kembali berusaha membuktikan tempat mereka melalui kinerja. Kasih karunia adalah UGD, bukan rumah.

Tapi Paulus berkata kita berdiri di dalamnya. Kita hidup di dalamnya. Kita bernapas di dalamnya. Bukan yang kita raih dalam krisis — tapi yang sudah kita pijaki. Jatuh dan bangkit keduanya terjadi di dalam kasih karunia. Sukses dan kegagalan keduanya terjadi di dalam kasih karunia. Tidak ada momen di hari Anda di mana Anda melangkah keluar darinya.

Ini mengubah cara Anda menghadapi pagi. Anda tidak bangun dan memeriksa kasih karunia untuk melihat apakah Anda masih memilikinya. Anda bangun sudah berdiri di dalamnya. Aman. Diposisikan. Sudah dikasihi, sudah diampuni, sudah diterima — dan tidak ada yang Anda lakukan hari ini yang akan mengubah itu.

Berdirilah di sana. Tetaplah di sana. Semua yang lain dibangun di atas fondasi itu.`,
  },
  {
    title: "The Voice That Comes After the Storm",
    titleId: "Suara yang Datang Setelah Badai",
    author: "Jane",
    body: `First Kings 19 is one of the most humanising passages in scripture. Elijah has just had the greatest victory of his prophetic career — called down fire from heaven, defeated 450 false prophets, ended a three-year drought. And immediately afterward, he runs in terror from a single threat and collapses under a tree, asking God to let him die. I have had enough, Lord.

Sound familiar?

After great victories come great exhaustion. After public courage comes private fear. This is not spiritual failure. This is human reality — and the God who sent an angel to feed Elijah, who let him sleep, who nourished him for the journey, knows exactly what you need after you've given everything.

And then God speaks. Not in the earthquake. Not in the fire. Not in the wind. In a still, small voice. A gentle whisper. After all the noise of battle and triumph and collapse — a whisper.

What is He whispering to you today? Not in the loudest voice in your head — that's usually performance anxiety or fear. In the still, small voice that requires you to get quiet enough to hear.

Stop. Get still. The word He has for you is not in the storm. It's in the whisper that comes after.`,
    bodyId: `1 Raja-raja 19 adalah salah satu bagian yang paling memanusiakan dalam Kitab Suci. Elia baru saja mengalami kemenangan terbesar dalam karier kenabiannya — menurunkan api dari langit, mengalahkan 450 nabi palsu, mengakhiri kekeringan tiga tahun. Dan segera sesudahnya, dia berlari ketakutan dari satu ancaman saja dan ambruk di bawah sebatang pohon, meminta Tuhan membiarkannya mati. Sudah cukup, Tuhan.

Kedengarannya akrab?

Setelah kemenangan besar datang kelelahan besar. Setelah keberanian publik datang ketakutan pribadi. Ini bukan kegagalan rohani. Ini realitas manusia — dan Tuhan yang mengirim malaikat untuk memberi Elia makan, yang membiarkannya tidur, yang memberinya makan untuk perjalanan, tahu persis apa yang Anda butuhkan setelah Anda memberikan segalanya.

Dan kemudian Tuhan berbicara. Bukan dalam gempa bumi. Bukan dalam api. Bukan dalam angin. Dalam suara kecil yang lembut. Sebuah bisikan. Setelah semua kebisingan pertempuran dan kemenangan dan kerobohan — sebuah bisikan.

Apa yang Dia bisikkan kepada Anda hari ini? Bukan dalam suara paling keras di kepala Anda — itu biasanya kecemasan kinerja atau ketakutan. Dalam suara kecil yang lembut yang mengharuskan Anda cukup diam untuk mendengar.

Berhentilah. Diamlah. Firman yang Dia miliki untuk Anda bukan di dalam badai. Tapi dalam bisikan yang datang sesudahnya.`,
  },
  {
    title: "Where Two or Three Gather",
    titleId: "Di Mana Dua atau Tiga Orang Berkumpul",
    author: "Ashley",
    body: `Matthew 18:20 is one of the most practical and profound promises Jesus ever made: for where two or three gather in my name, there am I with them. Two or three. Not two thousand. Not a mega-church. Two or three people gathered in His name is enough to access His presence.

This means your small group matters. The Tuesday morning prayer call matters. The two people who meet over coffee to pray for their neighbourhood — that matters. The family that prays together before dinner — that matters. The group of friends who check in on each other and pray — that matters enormously.

We have a tendency in Christianity to scale things. To think that if something is small, it's less significant. But Jesus staked His presence on the smallest gathering — two or three — and promised to be fully present.

This is why the local church can't be replaced by watching a broadcast with thousands of simultaneous viewers. There's something about gathered, present, in-His-name community that carries a distinct promise. His presence is there in a way that's different — not in quality, but in kind.

Be part of a two or three. Don't outsource your community life to screens. Gather. In His name. And expect Him to be there — because He promised He would be.`,
    bodyId: `Matius 18:20 adalah salah satu janji paling praktis dan mendalam yang pernah Yesus buat: sebab di mana dua atau tiga orang berkumpul dalam nama-Ku, di situ Aku ada di tengah-tengah mereka. Dua atau tiga. Bukan dua ribu. Bukan mega-church. Dua atau tiga orang berkumpul dalam nama-Nya cukup untuk mengakses hadirat-Nya.

Ini berarti kelompok kecil Anda penting. Doa pagi Selasa penting. Dua orang yang bertemu sambil minum kopi untuk mendoakan lingkungannya — itu penting. Keluarga yang berdoa bersama sebelum makan — itu penting. Kelompok teman yang saling menanyakan kabar dan berdoa — itu sangat penting.

Kita punya kecenderungan dalam kekristenan untuk memperbesar skala segala sesuatu. Berpikir bahwa jika sesuatu itu kecil, itu kurang signifikan. Tapi Yesus mempertaruhkan hadirat-Nya pada perkumpulan terkecil — dua atau tiga — dan berjanji hadir sepenuhnya.

Inilah mengapa gereja lokal tidak bisa digantikan dengan menonton siaran dengan ribuan penonton bersamaan. Ada sesuatu tentang komunitas yang berkumpul, hadir, dalam-nama-Nya yang membawa janji yang berbeda. Hadirat-Nya ada di sana dengan cara yang berbeda — bukan dalam kualitas, tapi dalam jenisnya.

Jadilah bagian dari dua atau tiga. Jangan meng-outsource kehidupan komunitas Anda ke layar. Berkumpullah. Dalam nama-Nya. Dan harapkanlah Dia hadir — karena Dia berjanji akan ada di sana.`,
  },
  {
    title: "Love That Surpasses Knowledge",
    titleId: "Kasih yang Melampaui Pengetahuan",
    author: "Jane",
    body: `Ephesians 3:19 ends with a prayer that shouldn't be possible: to know this love that surpasses knowledge — that you may be filled to the measure of all the fullness of God.

Know the love that surpasses knowledge. Understand what exceeds understanding. Be filled with the fullness of God.

Paul is praying for something that logic cannot contain. The love of Christ isn't primarily intellectual content. It's an encounter. An experience. A being gripped by something so large and so personal at the same time that words break down trying to describe it.

And Paul's prayer is that you would be so full of this love that there's no room left for anything else — no room for fear, for shame, for insecurity, for scarcity. Filled to the measure of the fullness of God.

This is the answer to the fear we've been walking through for 79 days. Not strategy. Not willpower. Not technique. Love. Being so full of His love that fear has no room to set up house. Because perfect love casts out fear — and you cannot be filled with perfect love and simultaneously consumed with fear.

Ask for this today. Literally ask: fill me with the knowledge of Your love. Past what I can intellectually contain. Past what makes logical sense. Fill me. And watch what that fullness does to everything else.`,
    bodyId: `Efesus 3:19 diakhiri dengan doa yang seharusnya tidak mungkin: sehingga kamu mengenal kasih Kristus yang melampaui segala pengetahuan — dan kamu dipenuhi di dalam seluruh kepenuhan Allah.

Mengenal kasih yang melampaui pengetahuan. Memahami yang melampaui pemahaman. Dipenuhi dengan kepenuhan Allah.

Paulus sedang mendoakan sesuatu yang tidak bisa ditampung oleh logika. Kasih Kristus bukan terutama konten intelektual. Ini sebuah perjumpaan. Sebuah pengalaman. Sebuah dicengkeram oleh sesuatu yang begitu besar dan begitu personal pada saat bersamaan sehingga kata-kata hancur saat mencoba menggambarkannya.

Dan doa Paulus adalah supaya Anda begitu penuh dengan kasih ini sehingga tidak ada ruang tersisa untuk apa pun lagi — tidak ada ruang untuk ketakutan, untuk rasa malu, untuk ketidakamanan, untuk kekurangan. Dipenuhi di dalam seluruh kepenuhan Allah.

Inilah jawaban untuk ketakutan yang sudah kita telusuri selama 79 hari. Bukan strategi. Bukan kemauan keras. Bukan teknik. Kasih. Begitu penuh dengan kasih-Nya sehingga ketakutan tidak punya ruang untuk mendirikan rumah. Karena kasih yang sempurna mengusir ketakutan — dan Anda tidak bisa dipenuhi kasih yang sempurna dan sekaligus dikuasai ketakutan.

Mintalah ini hari ini. Secara harfiah minta: penuhilah aku dengan pengenalan akan kasih-Mu. Melampaui yang bisa kupahami secara intelektual. Melampaui yang masuk akal secara logis. Penuhilah aku. Dan lihatlah apa yang dilakukan kepenuhan itu terhadap semua yang lain.`,
  },

  // ── SECTION 9: PURPOSE, CALLING & KINGDOM (Days 81–90) ─────────────────────
  {
    title: "Known Before You Were Born",
    titleId: "Dikenal Sebelum Anda Dilahirkan",
    author: "Ashley",
    body: `Jeremiah 1:5 is one of the most identity-settling verses in all of scripture: before I formed you in the womb I knew you, before you were born I set you apart; I appointed you as a prophet to the nations.

Before you were formed. Before the first cell. Before your parents made their choice. God knew you. Had a plan for you. Set you apart. Appointed you.

The implications of this are enormous. You are not a product of circumstances. You are not a lucky accident. You are not defined by the conditions of your birth, the failures of your past, or the limitations others have placed on you. You were known, and then formed. The knowing preceded the forming.

This is why the enemy works so hard to destabilise your sense of identity. If he can get you to believe you're here by accident, that your life has no inherent meaning, that purpose is something you manufacture rather than receive — then you're running the wrong race toward the wrong destination.

But if you know that you were known before you were born, that a purpose preceded your existence, that an appointment was made before you drew your first breath — everything changes. You stop asking "why am I here" as a desperate question. You start asking it as a discernment question. The answer is already yes. You are here on purpose, for a purpose. Live accordingly.`,
    bodyId: `Yeremia 1:5 adalah salah satu ayat yang paling memantapkan identitas di seluruh Kitab Suci: sebelum Aku membentuk engkau dalam rahim ibumu, Aku telah mengenal engkau, dan sebelum engkau dilahirkan, Aku telah menguduskan engkau; Aku telah menetapkan engkau menjadi nabi bagi bangsa-bangsa.

Sebelum Anda dibentuk. Sebelum sel pertama. Sebelum orang tua Anda membuat pilihan mereka. Tuhan mengenal Anda. Punya rencana untuk Anda. Menguduskan Anda. Menetapkan Anda.

Implikasinya sangat besar. Anda bukan produk keadaan. Anda bukan keberuntungan semata. Anda tidak ditentukan oleh kondisi kelahiran, kegagalan masa lalu, atau batasan yang ditempatkan orang lain pada Anda. Anda dikenal, lalu dibentuk. Pengenalan mendahului pembentukan.

Inilah mengapa musuh bekerja begitu keras untuk menggoyahkan rasa identitas Anda. Jika dia bisa membuat Anda percaya bahwa Anda di sini secara kebetulan, bahwa hidup Anda tidak punya makna bawaan, bahwa tujuan adalah sesuatu yang Anda produksi bukan terima — maka Anda berlari di lomba yang salah menuju tujuan yang salah.

Tapi jika Anda tahu bahwa Anda dikenal sebelum Anda dilahirkan, bahwa tujuan mendahului keberadaan Anda, bahwa penunjukan dibuat sebelum Anda menarik napas pertama — segalanya berubah. Anda berhenti bertanya "mengapa aku di sini" sebagai pertanyaan putus asa. Anda mulai bertanyanya sebagai pertanyaan pencarian. Jawabannya sudah ya. Anda di sini dengan sengaja, untuk sebuah tujuan. Hiduplah sesuai dengan itu.`,
  },
  {
    title: "The Lord Holds Your Hand When You Stumble",
    titleId: "Tuhan Memegang Tangan Anda Saat Anda Tersandung",
    author: "Jane",
    body: `David's life is extraordinary and deeply human. He was a man after God's own heart who committed adultery and murder. He was a brilliant leader who was a terrible father to his own children. He was the greatest king Israel ever had and he spent years hiding in caves running from his own son.

And Psalm 37:23-24 speaks to exactly that kind of life: the Lord makes firm the steps of the one who delights in him; though he may stumble, he will not fall, for the Lord upholds him with his hand.

Though he may stumble. Not if. Though. Stumbling is assumed. What's promised is not a stumble-free path. What's promised is that the stumble will not become a fall — because Someone is upholding you.

The Lord upholds him with His hand. We're back to the hand again. The God who takes your right hand in Isaiah 41. The God who upholds you in Psalm 37. He is not a distant spectator who grades your stumbles. He is a present sustainer who catches you in them.

Your stumbles are not the end of your story. David's stumbles weren't the end of his. The hand that holds you is stronger than the thing that tripped you. Delight in Him. Walk forward. And trust the hand that upholds.`,
    bodyId: `Kehidupan Daud luar biasa dan sangat manusiawi. Dia adalah orang yang berkenan di hati Tuhan yang melakukan perzinahan dan pembunuhan. Dia pemimpin yang brilian yang menjadi ayah yang buruk bagi anak-anaknya sendiri. Dia raja terbesar yang pernah dimiliki Israel dan dia menghabiskan bertahun-tahun bersembunyi di gua-gua melarikan diri dari putranya sendiri.

Dan Mazmur 37:23-24 berbicara tepat tentang jenis kehidupan seperti itu: Tuhan menetapkan langkah-langkah orang yang berkenan kepada-Nya; meskipun ia tersandung, ia tidak akan jatuh, sebab Tuhan menopangnya dengan tangan-Nya.

Meskipun ia tersandung. Bukan jika. Meskipun. Tersandung sudah diasumsikan. Yang dijanjikan bukan jalan yang bebas dari sandungan. Yang dijanjikan adalah bahwa sandungan itu tidak akan menjadi kejatuhan — karena Seseorang menopang Anda.

Tuhan menopangnya dengan tangan-Nya. Kita kembali ke tangan lagi. Tuhan yang mengambil tangan kanan Anda di Yesaya 41. Tuhan yang menopang Anda di Mazmur 37. Dia bukan penonton jauh yang menilai sandungan Anda. Dia adalah penopang yang hadir yang menangkap Anda di dalamnya.

Sandungan Anda bukan akhir dari kisah Anda. Sandungan Daud bukan akhir kisahnya. Tangan yang memegang Anda lebih kuat dari hal yang membuat Anda tersandung. Bersukarialah di dalam-Nya. Berjalanlah maju. Dan percayalah pada tangan yang menopang.`,
  },
  {
    title: "The Name That Changes Battles",
    titleId: "Nama yang Mengubah Pertempuran",
    author: "Ashley",
    body: `When David walked toward Goliath, the giant saw a boy. A shepherd kid with a stick and some stones. He laughed. He cursed David by his gods. He promised to feed him to the birds.

And David answered with one of the most powerful speeches in the Old Testament: you come against me with sword and spear and javelin, but I come against you in the name of the Lord Almighty, the God of the armies of Israel, whom you have defied.

I come against you in the name of the Lord.

Not in confidence in my own ability. Not because I've trained for this moment. Because of whose name I carry. The battle that day was not between David and Goliath. It was between Goliath and the God of Israel. And that battle was over before it began.

First Samuel 17:45. The name changes everything about the confrontation. It changes the odds. It changes the authority. It changes the outcome.

What giant is you facing today? Not literally — but what looms large, what mocks you, what has been telling you that you're outnumbered and outmatched?

You don't come against it in your own name. You come in His. The name that has authority over every other name. The name before which every knee will bow. You come in that name. And the battle is already decided.`,
    bodyId: `Ketika Daud berjalan menuju Goliat, sang raksasa melihat seorang anak laki-laki. Bocah gembala dengan tongkat dan beberapa batu. Dia tertawa. Dia mengutuk Daud demi dewa-dewanya. Dia berjanji akan memberi makan Daud kepada burung-burung.

Dan Daud menjawab dengan salah satu pidato paling penuh kuasa di Perjanjian Lama: engkau datang kepadaku dengan pedang dan tombak dan lembing, tetapi aku datang kepadamu dalam nama Tuhan semesta alam, Allah tentara Israel, yang kauejek itu.

Aku datang kepadamu dalam nama Tuhan.

Bukan dalam kepercayaan pada kemampuan sendiri. Bukan karena aku sudah berlatih untuk momen ini. Karena nama siapa yang kubawa. Pertempuran hari itu bukan antara Daud dan Goliat. Itu antara Goliat dan Allah Israel. Dan pertempuran itu sudah selesai sebelum dimulai.

1 Samuel 17:45. Nama itu mengubah segalanya tentang konfrontasi. Ia mengubah peluang. Ia mengubah otoritas. Ia mengubah hasilnya.

Raksasa apa yang Anda hadapi hari ini? Bukan secara harfiah — tapi apa yang menjulang besar, apa yang mengejek Anda, apa yang selama ini memberitahu Anda bahwa Anda kalah jumlah dan kalah kekuatan?

Anda tidak datang menghadapinya dalam nama Anda sendiri. Anda datang dalam nama-Nya. Nama yang memiliki otoritas atas setiap nama lain. Nama yang di hadapannya setiap lutut akan bertelut. Anda datang dalam nama itu. Dan pertempuran sudah diputuskan.`,
  },
  {
    title: "The Mustard Seed Is the Strategy",
    titleId: "Biji Sesawi Adalah Strateginya",
    author: "Jane",
    body: `Jesus compares the Kingdom of Heaven to a mustard seed — the smallest of all seeds. Not because the Kingdom is small. Because the Kingdom strategy is small. It starts tiny, underground, invisible. And then it becomes the largest of garden plants. A tree so large that birds come and nest in its branches.

Matthew 13:31-32. God's preferred method of growth is not the spectacular launch. It's the quiet seed. It's the thing that starts so small you're embarrassed to call it anything. The prayer group of three people. The conversation that didn't seem significant. The act of generosity nobody saw. The word you spoke into someone who never told you it changed their life.

The enemy loves to make you feel like small things don't matter. That if it's not impressive, it's not impactful. But that's the opposite of how the Kingdom actually works.

Every large tree in your community started as a mustard seed. Every significant movement started as two or three people who believed God for more than they could see. Every revival started with someone who prayed faithfully in private before they ever saw the public fruit.

Don't despise the small beginning. Tend the seed. Water what's been planted. Trust the process that God designed. The tree that shelters nations started smaller than everything around it.`,
    bodyId: `Yesus membandingkan Kerajaan Surga dengan biji sesawi — biji yang terkecil dari semua biji. Bukan karena Kerajaan itu kecil. Karena strategi Kerajaan itu kecil. Ia dimulai mungil, di bawah tanah, tidak terlihat. Dan kemudian ia menjadi tanaman kebun yang terbesar. Pohon yang begitu besar sehingga burung-burung datang dan bersarang di cabang-cabangnya.

Matius 13:31-32. Metode pertumbuhan pilihan Tuhan bukan peluncuran yang spektakuler. Tapi biji yang diam. Hal yang dimulai begitu kecil sehingga Anda malu menyebutnya apa-apa. Kelompok doa tiga orang. Percakapan yang tampaknya tidak signifikan. Tindakan kemurahan hati yang tidak dilihat siapa pun. Kata yang Anda ucapkan kepada seseorang yang tidak pernah memberitahu Anda bahwa itu mengubah hidupnya.

Musuh suka membuat Anda merasa bahwa hal-hal kecil tidak penting. Bahwa jika tidak mengesankan, maka tidak berdampak. Tapi itu kebalikan dari cara Kerajaan sebenarnya bekerja.

Setiap pohon besar di komunitas Anda dimulai sebagai biji sesawi. Setiap gerakan signifikan dimulai sebagai dua atau tiga orang yang percaya kepada Tuhan untuk lebih dari yang bisa mereka lihat. Setiap kebangunan dimulai dengan seseorang yang berdoa dengan setia secara pribadi sebelum mereka melihat buah yang publik.

Jangan meremehkan permulaan yang kecil. Rawat bijinya. Sirami yang sudah ditanam. Percayalah pada proses yang Tuhan rancang. Pohon yang menaungi bangsa-bangsa dimulai lebih kecil dari semua yang ada di sekitarnya.`,
  },
  {
    title: "The City on a Hill Can't Stay Hidden",
    titleId: "Kota di Atas Bukit Tidak Bisa Disembunyikan",
    author: "Ashley",
    body: `Jesus said: you are the light of the world. A town built on a hill cannot be hidden. Neither do people light a lamp and put it under a bowl. Instead they put it on its stand, and it gives light to everyone in the house. In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven.

You are the light. Present tense. Not potentially. Not if you get it together. Not after a bit more growth. You are, right now, the light of the world.

And the thing about light is — it doesn't need to try. It just needs to be present. Light in a dark room doesn't announce itself. It doesn't compete with the darkness or argue with it. It just shows up, and darkness has no response. The darkness cannot make the light less bright. Light always wins.

Your presence in a dark environment is not a burden. It's a privilege. Your workplace, your neighbourhood, your family situation — you were placed there as light. And your light is not limited to grand spiritual moments. Matthew 5:16 says it's your good deeds — your ordinary acts of love, patience, generosity, faithfulness — that people see and attribute to God.

Don't hide. Don't dim. Let it shine.`,
    bodyId: `Yesus berkata: kamu adalah terang dunia. Kota yang terletak di atas gunung tidak mungkin tersembunyi. Orang tidak menyalakan pelita lalu meletakkannya di bawah gantang. Sebaliknya mereka meletakkannya di atas kaki dian, dan ia menerangi semua orang yang ada di dalam rumah itu. Demikianlah hendaknya terangmu bercahaya di depan orang, supaya mereka melihat perbuatanmu yang baik dan memuliakan Bapamu yang di surga.

Kamu adalah terang. Kala kini. Bukan berpotensi. Bukan jika Anda memperbaiki diri. Bukan setelah lebih banyak pertumbuhan. Kamu adalah, sekarang juga, terang dunia.

Dan hal tentang terang adalah — ia tidak perlu berusaha. Ia hanya perlu hadir. Terang di ruangan gelap tidak mengumumkan dirinya. Ia tidak bersaing dengan kegelapan atau berdebat dengannya. Ia hanya muncul, dan kegelapan tidak punya respons. Kegelapan tidak bisa membuat terang kurang terang. Terang selalu menang.

Kehadiran Anda di lingkungan yang gelap bukan beban. Itu kehormatan. Tempat kerja Anda, lingkungan Anda, situasi keluarga Anda — Anda ditempatkan di sana sebagai terang. Dan terang Anda tidak terbatas pada momen-momen rohani yang agung. Matius 5:16 berkata perbuatan baik Anda — tindakan biasa kasih, kesabaran, kemurahan hati, kesetiaan — itulah yang dilihat orang dan dikaitkan dengan Tuhan.

Jangan bersembunyi. Jangan meredup. Biarlah ia bersinar.`,
  },
  {
    title: "How Good When We Dwell Together",
    titleId: "Betapa Baiknya Ketika Kita Tinggal Bersama",
    author: "Jane",
    body: `Psalm 133 is three verses long and yet it contains one of the most profound truths about community in scripture: how good and pleasant it is when God's people live together in unity! It is like precious oil poured on the head... it is like the dew of Hermon falling on Mount Zion. For there the Lord bestows His blessing, even life forevermore.

There. Where unity is. Where God's people live together in genuine community, authentic relationship, the kind of togetherness that costs something — there the Lord bestows His blessing.

The blessing has an address. It's not distributed evenly across all spiritual activities. There is a specific blessing that is associated with the specific reality of God's people living together in unity.

This is why the enemy spends so much energy attacking church unity. He knows where the blessing lives. Every division he can sow, every misunderstanding he can inflame, every offence he can nurture to breaking point — he knows that if he can get people to stop dwelling together, he moves the blessing out of reach.

Pursue unity. Not uniformity — that's not what this is about. Unity amid difference, amid disagreement, amid the friction of people with different histories and opinions choosing to remain together in love. That's where the blessing is. That's where the life forevermore dwells.`,
    bodyId: `Mazmur 133 hanya tiga ayat panjangnya namun mengandung salah satu kebenaran paling mendalam tentang komunitas dalam Kitab Suci: betapa baiknya dan betapa indahnya apabila umat Allah hidup bersama dalam persatuan! Seperti minyak yang baik di atas kepala... seperti embun Hermon yang turun ke atas gunung Sion. Sebab ke sanalah Tuhan memerintahkan berkat, yaitu kehidupan untuk selama-lamanya.

Ke sanalah. Di mana persatuan berada. Di mana umat Tuhan hidup bersama dalam komunitas yang sungguh-sungguh, hubungan yang otentik, kebersamaan yang mengharuskan pengorbanan — ke sanalah Tuhan memerintahkan berkat.

Berkat itu punya alamat. Ia tidak didistribusikan secara merata ke semua aktivitas rohani. Ada berkat spesifik yang dikaitkan dengan realitas spesifik umat Tuhan yang hidup bersama dalam persatuan.

Inilah mengapa musuh menghabiskan begitu banyak energi menyerang kesatuan gereja. Dia tahu di mana berkat itu tinggal. Setiap perpecahan yang bisa dia tabur, setiap kesalahpahaman yang bisa dia kobarkan, setiap ketersinggungan yang bisa dia rawat sampai titik pecah — dia tahu bahwa jika dia bisa membuat orang berhenti tinggal bersama, dia memindahkan berkat itu di luar jangkauan.

Kejarlah persatuan. Bukan keseragaman — bukan itu maksudnya. Persatuan di tengah perbedaan, di tengah perselisihan, di tengah gesekan orang-orang dengan latar belakang dan pendapat berbeda yang memilih untuk tetap bersama dalam kasih. Di situlah berkatnya. Di situlah kehidupan selama-lamanya berdiam.`,
  },
  {
    title: "The Commission Has Not Been Recalled",
    titleId: "Amanat itu Belum Ditarik Kembali",
    author: "Ashley",
    body: `Matthew 28:19-20 is the last recorded command of Jesus before He ascended: go and make disciples of all nations, baptising them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age.

I am with you always. To the very end of the age.

Not until the first generation fulfilled it. Not until the church grew large enough to need a management structure. To the very end of the age. The commission and the presence go together — and both are still active.

This command was not for apostles only. The word for go here is as you go — it's woven into the movement of ordinary life. As you go to work. As you go to the school pickup. As you go to the grocery store, the gym, the neighbourhood event. As you go — make disciples.

Not everyone is called to preach to thousands. Everyone is called to multiply in the spheres they inhabit. Your faithfulness to one person changes their life, changes their family, changes their city over generations. That's how the Great Commission has worked for two thousand years.

You are still the plan. He is still with you. Go.`,
    bodyId: `Matius 28:19-20 adalah perintah terakhir Yesus yang tercatat sebelum Dia naik ke surga: pergilah, jadikanlah semua bangsa murid-Ku, baptislah mereka dalam nama Bapa dan Anak dan Roh Kudus, dan ajarlah mereka melakukan segala sesuatu yang telah Kuperintahkan kepadamu. Dan ketahuilah, Aku menyertai kamu senantiasa sampai akhir zaman.

Aku menyertai kamu senantiasa. Sampai akhir zaman.

Bukan sampai generasi pertama menyelesaikannya. Bukan sampai gereja tumbuh cukup besar untuk membutuhkan struktur manajemen. Sampai akhir zaman. Amanat dan hadirat berjalan bersama — dan keduanya masih aktif.

Perintah ini bukan untuk para rasul saja. Kata untuk pergilah di sini adalah sambil pergi — ia terjalin dalam gerakan kehidupan sehari-hari. Sambil pergi ke kantor. Sambil pergi menjemput anak di sekolah. Sambil pergi ke toko, ke gym, ke acara lingkungan. Sambil pergi — jadikanlah murid.

Tidak semua orang dipanggil untuk berkhotbah kepada ribuan orang. Semua orang dipanggil untuk melipatgandakan di lingkup yang mereka huni. Kesetiaan Anda kepada satu orang mengubah hidup mereka, mengubah keluarga mereka, mengubah kota mereka selama generasi-generasi. Begitulah Amanat Agung telah bekerja selama dua ribu tahun.

Anda masih rencananya. Dia masih menyertai Anda. Pergilah.`,
  },
  {
    title: "My God Will Meet All Your Needs",
    titleId: "Allahku Akan Memenuhi Segala Kebutuhanmu",
    author: "Jane",
    body: `Philippians 4:19 is a promise built on a testimony. Paul had just written about the Philippian church's extraordinary generosity — they had given sacrificially to support his ministry when no other church did. And from that context, he makes one of the most sweeping promises in his letters: my God will meet all your needs according to the riches of His glory in Christ Jesus.

All your needs. Not some. All. According to His riches — not according to the economy, not according to your current income, not according to what seems possible from where you stand. According to His riches in glory.

That's a different supply line. His riches in glory are not affected by inflation. They don't fluctuate with interest rates. They don't run out when the season gets hard.

The principle in Philippians 4 is: generosity unlocks the promise. The Philippians gave. And Paul anchors the promise to a God who saw what they gave and responded from a supply that dwarfs anything they could sacrifice.

Scarcity says: I can't give because I might not have enough. The Kingdom says: give from what you have, trusting the God whose supply is not limited by your current state. My God will meet all your needs. Not might. Will.

Live from that promise today.`,
    bodyId: `Filipi 4:19 adalah janji yang dibangun di atas sebuah kesaksian. Paulus baru saja menulis tentang kemurahan hati luar biasa jemaat Filipi — mereka telah memberi secara berkorban untuk mendukung pelayanannya ketika tidak ada gereja lain yang melakukannya. Dan dari konteks itu, dia membuat salah satu janji paling menyeluruh dalam surat-suratnya: Allahku akan memenuhi segala kebutuhanmu menurut kekayaan kemuliaan-Nya dalam Kristus Yesus.

Segala kebutuhanmu. Bukan sebagian. Segala. Menurut kekayaan-Nya — bukan menurut ekonomi, bukan menurut penghasilan Anda saat ini, bukan menurut apa yang tampak mungkin dari tempat Anda berdiri. Menurut kekayaan kemuliaan-Nya.

Itu jalur persediaan yang berbeda. Kekayaan kemuliaan-Nya tidak terpengaruh inflasi. Tidak berfluktuasi dengan suku bunga. Tidak habis ketika musim sulit.

Prinsip di Filipi 4 adalah: kemurahan hati membuka janji. Jemaat Filipi memberi. Dan Paulus menjangkarkan janji itu pada Tuhan yang melihat apa yang mereka berikan dan merespons dari persediaan yang jauh melampaui apa pun yang bisa mereka korbankan.

Kekurangan berkata: saya tidak bisa memberi karena mungkin tidak cukup. Kerajaan berkata: berilah dari apa yang kamu miliki, percayalah pada Tuhan yang persediaan-Nya tidak dibatasi oleh keadaanmu saat ini. Allahku akan memenuhi segala kebutuhanmu. Bukan mungkin. Akan.

Hiduplah dari janji itu hari ini.`,
  },
  {
    title: "Come to the Water",
    titleId: "Datanglah ke Air",
    author: "Ashley",
    body: `Isaiah 55:1-2 is one of the most generous invitations in all of prophecy: come, all you who are thirsty, come to the waters; and you who have no money, come, buy and eat! Come, buy wine and milk without money and without cost. Why spend money on what is not bread, and your labour on what does not satisfy?

Without money. Without cost. This is the economy of grace, laid out in the Old Testament before the cross made it fully available. Come not because you can afford it. Come not because you earned it. Come because you're thirsty. Come because you're hungry. Come.

And the question that cuts deepest: why spend your labour on what does not satisfy? Why pour your energy into things that leave you empty? Why chase the world's version of abundance — which always costs you more than you have and delivers less than you need?

There's bread here that actually satisfies. There's water that actually quenches. There's a life available that doesn't require you to have the money first or earn the access first. You just have to come.

What are you spending your labour on that isn't satisfying? What are you chasing that keeps leaving you a little emptier every time? Stop. Come to the water. He's been waiting with it already paid for.`,
    bodyId: `Yesaya 55:1-2 adalah salah satu undangan paling murah hati di seluruh nubuatan: ayo, hai semua orang yang haus, marilah ke sumber air; dan kamu yang tidak punya uang, marilah, belilah dan makanlah! Marilah, belilah anggur dan susu tanpa uang dan tanpa bayaran. Mengapakah kamu belanjakan uang untuk sesuatu yang bukan roti, dan upah jerih payahmu untuk sesuatu yang tidak mengenyangkan?

Tanpa uang. Tanpa bayaran. Inilah ekonomi kasih karunia, yang diletakkan di Perjanjian Lama sebelum salib membuatnya sepenuhnya tersedia. Datang bukan karena Anda mampu. Datang bukan karena Anda layak. Datang karena Anda haus. Datang karena Anda lapar. Datanglah.

Dan pertanyaan yang paling mengiris: mengapa kamu belanjakan upah jerih payahmu untuk sesuatu yang tidak mengenyangkan? Mengapa menuangkan energi Anda ke hal-hal yang meninggalkan Anda kosong? Mengapa mengejar versi kelimpahan dunia — yang selalu menuntut lebih dari yang Anda miliki dan memberikan kurang dari yang Anda butuhkan?

Ada roti di sini yang sungguh mengenyangkan. Ada air yang sungguh menghilangkan dahaga. Ada kehidupan yang tersedia yang tidak mengharuskan Anda punya uang dulu atau membuktikan diri layak dulu. Anda hanya harus datang.

Untuk apa Anda menghabiskan jerih payah yang tidak memuaskan? Apa yang Anda kejar yang terus meninggalkan Anda sedikit lebih kosong setiap kali? Berhentilah. Datanglah ke air. Dia sudah menunggu dengan semuanya sudah dibayar.`,
  },
  {
    title: "By the Grace of God I Am What I Am",
    titleId: "Oleh Kasih Karunia Allah Aku Adalah Apa yang Aku Ada",
    author: "Jane",
    body: `First Corinthians 15:10 is Paul at his most honest: but by the grace of God I am what I am, and His grace to me was not without effect. No, I worked harder than all of them — yet not I, but the grace of God that was with me.

By the grace of God I am what I am. Not by my effort. Not by my talent. Not by my family background or my education or my spiritual disciplines. By the grace of God.

And then immediately: His grace was not without effect. I worked harder than all of them. But the working was the grace working through him — not him working to earn more grace.

This is the grace and work paradox from Ashley's book. Grace doesn't produce passivity. It produces the most productive version of you that's possible — because it's no longer you working from your own limited supply, but God working through you from His unlimited supply.

Paul worked harder because grace was in him. Because when you know you're not working to prove something, when you know you're not working to earn approval, when you know the outcome isn't dependent on your performance alone — you work with a freedom and a capacity that performance-based effort can never match.

By the grace of God — I am. And because I am, I give everything I have. Not to become. Because I already am.`,
    bodyId: `1 Korintus 15:10 adalah Paulus yang paling jujur: tetapi oleh kasih karunia Allah aku adalah apa yang aku ada sekarang, dan kasih karunia-Nya terhadapku tidak sia-sia. Aku telah bekerja lebih keras dari mereka semua — tetapi bukan aku, melainkan kasih karunia Allah yang menyertai aku.

Oleh kasih karunia Allah aku adalah apa yang aku ada. Bukan oleh usahaku. Bukan oleh bakatku. Bukan oleh latar belakang keluarga atau pendidikan atau disiplin rohaniku. Oleh kasih karunia Allah.

Dan segera sesudahnya: kasih karunia-Nya terhadapku tidak sia-sia. Aku telah bekerja lebih keras dari mereka semua. Tapi pekerjaannya adalah kasih karunia yang bekerja melaluinya — bukan dia bekerja untuk mendapatkan lebih banyak kasih karunia.

Inilah paradoks kasih karunia dan kerja dari buku Ashley. Kasih karunia tidak menghasilkan kepasifan. Ia menghasilkan versi paling produktif dari diri Anda yang mungkin — karena bukan lagi Anda yang bekerja dari persediaan terbatas Anda sendiri, tapi Tuhan yang bekerja melalui Anda dari persediaan-Nya yang tidak terbatas.

Paulus bekerja lebih keras karena kasih karunia ada di dalam dirinya. Karena ketika Anda tahu Anda tidak bekerja untuk membuktikan sesuatu, ketika Anda tahu Anda tidak bekerja untuk mendapatkan persetujuan, ketika Anda tahu hasilnya tidak bergantung pada kinerja Anda semata — Anda bekerja dengan kebebasan dan kapasitas yang tidak bisa ditandingi oleh usaha berbasis kinerja.

Oleh kasih karunia Allah — aku ada. Dan karena aku ada, aku memberikan semua yang aku miliki. Bukan untuk menjadi. Karena aku sudah ada.`,
  },

  // ── SECTION 10: BREAKTHROUGH & COMPLETION (Days 91–100) ─────────────────
  {
    title: "Arise and Shine",
    titleId: "Bangkitlah dan Bersinar",
    author: "Ashley",
    body: `Isaiah 60:1 is a command that has always felt like a sunrise to me: arise, shine, for your light has come, and the glory of the Lord rises upon you. See, darkness covers the earth and thick darkness is over the peoples, but the Lord rises upon you and His glory appears over you.

Two realities exist simultaneously in this passage: thick darkness over the earth — and the Lord rising upon His people. The darkness is real. The world is dark. That's not spiritual pessimism, it's honest observation. Confusion, injustice, fear, suffering — thick darkness.

And into that darkness: arise. Shine. Because the glory has come.

You don't have to wait for the darkness to clear before you shine. You don't have to wait until the culture gets better, until the circumstances improve, until things are easier. Arise. The light isn't waiting for permission from the darkness. The darkness has no vote on when you get up.

This is the call to every generation of God's people. Not to retreat until conditions improve. But to rise — into the darkness, with the light — and let the glory of God that rests on His people become visible to a world that desperately needs it.

You have the light. The glory has come upon you. What are you waiting for? Arise. Shine.`,
    bodyId: `Yesaya 60:1 adalah sebuah perintah yang selalu terasa seperti matahari terbit bagi saya: bangkitlah, bersinar, karena terangmu sudah datang, dan kemuliaan Tuhan terbit atasmu. Sebab lihat, kegelapan menutupi bumi dan kekelaman menutupi bangsa-bangsa, tetapi atasmu terbit Tuhan, dan kemuliaan-Nya menyinari engkau.

Dua realitas ada secara bersamaan dalam bagian ini: kegelapan tebal di atas bumi — dan Tuhan terbit atas umat-Nya. Kegelapannya nyata. Dunia ini gelap. Itu bukan pesimisme rohani, itu pengamatan yang jujur. Kebingungan, ketidakadilan, ketakutan, penderitaan — kegelapan tebal.

Dan ke dalam kegelapan itu: bangkitlah. Bersinar. Karena kemuliaan sudah datang.

Anda tidak harus menunggu kegelapan mereda sebelum Anda bersinar. Anda tidak harus menunggu sampai budayanya membaik, sampai keadaannya membaik, sampai segalanya lebih mudah. Bangkitlah. Terang tidak menunggu izin dari kegelapan. Kegelapan tidak punya hak suara tentang kapan Anda bangkit.

Inilah panggilan untuk setiap generasi umat Tuhan. Bukan untuk mundur sampai kondisinya membaik. Tapi untuk bangkit — ke dalam kegelapan, dengan terang — dan membiarkan kemuliaan Tuhan yang ada di atas umat-Nya menjadi terlihat bagi dunia yang sangat membutuhkannya.

Anda punya terangnya. Kemuliaan sudah datang atas Anda. Apa yang Anda tunggu? Bangkitlah. Bersinar.`,
  },
  {
    title: "Stand Your Ground — That Is the Victory",
    titleId: "Berdirilah Teguh — Itulah Kemenangannya",
    author: "Jane",
    body: `Ephesians 6:13 says: put on the full armour of God, so that when the day of evil comes, you may be able to stand your ground, and after you have done everything, to stand.

After you have done everything, to stand.

The victory described in Ephesians 6 is not conquest. It's not advancing territory. It's standing. After you've done everything you know to do — stood in prayer, declared truth, resisted the enemy, walked in faithfulness — the measure of victory is that you're still standing.

Sometimes breakthrough looks like a dramatic transformation. More often it looks like the same person in the same situation, still believing, still standing, still walking forward with their integrity intact.

The enemy's goal is not always to destroy you directly. Often it's to wear you down. To get you to question whether it's worth it. To make the cost of standing seem greater than the value of what you're standing for. If he can get you to sit down, lie down, give up — he doesn't need to defeat you. You defeat yourself.

Don't sit down. Don't lie down. Don't give up. After you have done everything — stand. That's the instruction. That's also the victory. The enemy has no answer for a person who simply refuses to fall.`,
    bodyId: `Efesus 6:13 berkata: kenakanlah seluruh perlengkapan senjata Allah, supaya apabila datang hari yang jahat, kamu dapat bertahan, dan sesudah kamu menyelesaikan segala sesuatu, kamu tetap berdiri.

Sesudah kamu menyelesaikan segala sesuatu, kamu tetap berdiri.

Kemenangan yang digambarkan dalam Efesus 6 bukan penaklukan. Bukan merebut wilayah. Tapi berdiri. Setelah Anda melakukan semua yang Anda tahu harus dilakukan — berdiri dalam doa, mendeklarasikan kebenaran, melawan musuh, berjalan dalam kesetiaan — ukuran kemenangan adalah bahwa Anda masih berdiri.

Kadang terobosan terlihat seperti transformasi dramatis. Lebih sering ia terlihat seperti orang yang sama di situasi yang sama, masih percaya, masih berdiri, masih berjalan maju dengan integritas utuh.

Tujuan musuh tidak selalu menghancurkan Anda secara langsung. Sering kali ia menghabiskan Anda. Membuat Anda mempertanyakan apakah ini sepadan. Membuat biaya berdiri tampak lebih besar dari nilai apa yang Anda perjuangkan. Jika dia bisa membuat Anda duduk, berbaring, menyerah — dia tidak perlu mengalahkan Anda. Anda mengalahkan diri sendiri.

Jangan duduk. Jangan berbaring. Jangan menyerah. Sesudah kamu menyelesaikan segala sesuatu — berdirilah. Itulah instruksinya. Itulah juga kemenangannya. Musuh tidak punya jawaban untuk seseorang yang menolak untuk jatuh.`,
  },
  {
    title: "God Is Our Refuge — Not Our Last Resort",
    titleId: "Tuhan Adalah Tempat Perlindungan Kita — Bukan Pilihan Terakhir",
    author: "Ashley",
    body: `Psalm 46:1-2 was written during national catastrophe: God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea, though its waters roar and foam and the mountains quake with their surging.

Therefore we will not fear. The therefore is the hinge. Because God is our refuge — therefore fear has no ground.

But notice what kind of refuge He is: ever-present. Not a refuge you travel to, not a fortified city you have to find — always present, always available, already where you are. You don't need to find God in a crisis. He's already in it with you.

Most people treat God as the final option. When everything else has failed, when the human solutions are exhausted, when there's nowhere left to turn — they come to God. And He's gracious enough to meet them there. But He was available at the beginning of the trouble too.

Make Him the first resort. Not because you'll handle everything better — but because you'll handle everything from the right position. From the position of a person who has run immediately to their refuge instead of exhausting themselves first.

The earth can give way. The mountains can fall. And you will not fear — not because nothing went wrong, but because your refuge never moves.`,
    bodyId: `Mazmur 46:2-3 ditulis selama bencana nasional: Allah itu bagi kita tempat perlindungan dan kekuatan, sebagai penolong dalam kesesakan sangat terbukti. Sebab itu kita tidak akan takut, sekalipun bumi berubah, sekalipun gunung-gunung goyah ke dalam laut.

Sebab itu kita tidak akan takut. Sebab itu adalah engselnya. Karena Allah adalah tempat perlindungan kita — sebab itu ketakutan tidak punya pijakan.

Tapi perhatikan jenis tempat perlindungan apa Dia: yang selalu hadir. Bukan tempat perlindungan yang Anda perjalani ke sana, bukan kota benteng yang harus Anda temukan — selalu hadir, selalu tersedia, sudah di tempat Anda berada. Anda tidak perlu menemukan Tuhan dalam krisis. Dia sudah ada di dalamnya bersama Anda.

Kebanyakan orang memperlakukan Tuhan sebagai pilihan terakhir. Ketika semua yang lain gagal, ketika solusi manusia habis, ketika tidak ada tempat lagi untuk berpaling — mereka datang kepada Tuhan. Dan Dia cukup penuh kasih karunia untuk menemui mereka di sana. Tapi Dia juga tersedia di awal masalah.

Jadikan Dia pilihan pertama. Bukan karena Anda akan menangani segalanya lebih baik — tapi karena Anda akan menangani segalanya dari posisi yang tepat. Dari posisi seseorang yang segera berlari ke tempat perlindungannya alih-alih menghabiskan dirinya dulu.

Bumi bisa bergoyang. Gunung-gunung bisa runtuh. Dan Anda tidak akan takut — bukan karena tidak ada yang salah, tapi karena tempat perlindungan Anda tidak pernah bergerak.`,
  },
  {
    title: "The Living Sacrifice",
    titleId: "Persembahan yang Hidup",
    author: "Jane",
    body: `Romans 12:1 uses a phrase that I find both challenging and beautiful: offer your bodies as a living sacrifice, holy and pleasing to God — this is your true and proper worship.

Living sacrifice. In the Old Testament, the sacrifice died on the altar. In the New Testament, Paul flips it: you're alive, and you stay alive, but the altar is still your position. You give yourself — not once in a dramatic moment, but daily, continuously, as a lifestyle.

This is the answer to the question: what does complete surrender actually look like? It looks like showing up to your ordinary day as an act of worship. Getting up for the difficult conversation. Staying when leaving would be easier. Serving without being recognised. Forgiving without an apology. These are the daily expressions of a living sacrifice.

And then verse 2: do not conform to the pattern of this world, but be transformed by the renewing of your mind.

The altar changes your mind. When you live surrendered, when your whole self is an offering, your mind starts to be renewed. Not by a program. By the act of continuous surrender. You stop thinking like someone who needs to protect themselves, accumulate, perform, compete — and start thinking like someone who belongs to God.

This is your proper worship. It doesn't look spectacular. It looks like a surrendered life, daily given.`,
    bodyId: `Roma 12:1 menggunakan frasa yang menurut saya menantang sekaligus indah: persembahkanlah tubuhmu sebagai persembahan yang hidup, yang kudus dan yang berkenan kepada Allah — itu adalah ibadahmu yang sejati.

Persembahan yang hidup. Dalam Perjanjian Lama, korban mati di atas mezbah. Dalam Perjanjian Baru, Paulus membaliknya: Anda hidup, dan tetap hidup, tapi mezbah masih posisi Anda. Anda memberikan diri Anda — bukan sekali dalam momen dramatis, tapi setiap hari, terus-menerus, sebagai gaya hidup.

Inilah jawaban dari pertanyaan: seperti apa sebenarnya penyerahan total itu? Ia terlihat seperti menjalani hari biasa Anda sebagai tindakan ibadah. Bangun untuk percakapan yang sulit. Bertahan ketika pergi akan lebih mudah. Melayani tanpa diakui. Mengampuni tanpa permintaan maaf. Ini adalah ekspresi harian dari persembahan yang hidup.

Dan kemudian ayat 2: janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaharuan budimu.

Mezbah mengubah pikiran Anda. Ketika Anda hidup berserah, ketika seluruh diri Anda adalah persembahan, pikiran Anda mulai diperbarui. Bukan oleh program. Oleh tindakan penyerahan yang terus-menerus. Anda berhenti berpikir seperti seseorang yang perlu melindungi diri, mengumpulkan, tampil, bersaing — dan mulai berpikir seperti seseorang yang milik Tuhan.

Inilah ibadahmu yang sejati. Ia tidak terlihat spektakuler. Ia terlihat seperti hidup yang berserah, dipersembahkan setiap hari.`,
  },
  {
    title: "More Than Conquerors",
    titleId: "Lebih dari Pemenang",
    author: "Ashley",
    body: `Romans 8:37 says in all these things we are more than conquerors through Him who loved us. In all these things. Paul has just listed exactly what those things are: trouble, hardship, persecution, famine, nakedness, danger, sword. Not in the good seasons. In all these things.

More than conquerors. The Greek is hypernikao — hyper-conquering. Beyond conquering. Overwhelmingly victorious. It's not just that you win. It's that you win decisively, abundantly, beyond what was required.

And then the phrase that anchors it: through Him who loved us. Not through our strategy. Not through our resilience. Through love. The love of Christ that came down, took the cross, rose from the dead, and seated us in heavenly places — that love is the source of our hyper-victory.

You cannot read Romans 8:38-39 and conclude that anything has final authority over your life except God's love. Not death. Not life. Not angels or demons or the present or the future. Not height nor depth nor anything else in all creation.

You are not trying to become a conqueror. You already are one, in Christ. Today's opposition is not evidence to the contrary. It's the occasion to demonstrate what hyper-conquest looks like when ordinary people carry extraordinary love. Go be more than a conqueror. You already have everything you need.`,
    bodyId: `Roma 8:37 berkata dalam semuanya itu kita lebih dari pemenang oleh Dia yang telah mengasihi kita. Dalam semuanya itu. Paulus baru saja mencantumkan persis apa itu: kesusahan, kesesakan, penganiayaan, kelaparan, ketelanjangan, bahaya, pedang. Bukan di musim-musim yang baik. Dalam semuanya itu.

Lebih dari pemenang. Bahasa Yunaninya adalah hypernikao — hiper-menaklukkan. Melampaui penaklukan. Menang secara luar biasa. Bukan sekadar Anda menang. Tapi Anda menang secara tegas, berlimpah, melampaui yang dibutuhkan.

Dan kemudian frasa yang menjangkarkannya: oleh Dia yang telah mengasihi kita. Bukan melalui strategi kita. Bukan melalui ketangguhan kita. Melalui kasih. Kasih Kristus yang turun, menanggung salib, bangkit dari maut, dan mendudukkan kita di tempat-tempat surgawi — kasih itulah sumber hiper-kemenangan kita.

Anda tidak bisa membaca Roma 8:38-39 dan menyimpulkan bahwa apa pun memiliki otoritas final atas hidup Anda kecuali kasih Tuhan. Bukan maut. Bukan hidup. Bukan malaikat atau iblis atau masa kini atau masa depan. Bukan yang di atas maupun yang di bawah maupun sesuatu makhluk lain.

Anda bukan sedang berusaha menjadi pemenang. Anda sudah pemenang, di dalam Kristus. Perlawanan hari ini bukan bukti sebaliknya. Itu kesempatan untuk menunjukkan seperti apa hiper-penaklukan ketika orang biasa membawa kasih yang luar biasa. Pergilah menjadi lebih dari pemenang. Anda sudah punya semua yang Anda butuhkan.`,
  },
  {
    title: "Joy Is Your Strength — Not Your Reward",
    titleId: "Sukacita Adalah Kekuatan Anda — Bukan Hadiah Anda",
    author: "Jane",
    body: `Nehemiah 8:10 is spoken in one of the most unlikely moments. Israel has just heard the Law read to them for the first time in a generation. They're weeping — because they've heard how far they fell short. And Nehemiah, Ezra, and the Levites respond with an instruction that cuts against the grain of their grief: do not grieve, for the joy of the Lord is your strength.

Your strength. Not your mood. Not an emotional bonus. Your actual strength. The structural support that holds you up.

This means joy is not a reward for things going well. It's the fuel for staying strong when they're not. You don't earn joy by surviving hardship. You weaponise joy to get through it.

The enemy knows this. His most effective long-term strategy against you is not to destroy you — it's to steal your joy. Because a joyless person stops expecting God to be good. Stops worshipping from the heart. Stops carrying the presence that changes rooms. Stops being dangerous to the enemy's agenda.

Don't let him have it. Choose joy. Not as a denial of pain — but as the determination that God is still good and the story is still going somewhere worth celebrating. Joy is your strength. Nehemiah said so. And you're going to need it.`,
    bodyId: `Nehemia 8:10 diucapkan di salah satu momen yang paling tidak terduga. Israel baru saja mendengar Taurat dibacakan kepada mereka untuk pertama kalinya dalam satu generasi. Mereka menangis — karena mereka mendengar betapa jauh mereka dari standar. Dan Nehemia, Ezra, dan orang-orang Lewi merespons dengan instruksi yang melawan arus kesedihan mereka: janganlah kamu berdukacita, sebab sukacita karena Tuhan itulah kekuatanmu.

Kekuatanmu. Bukan suasana hatimu. Bukan bonus emosional. Kekuatanmu yang sesungguhnya. Penopang struktural yang menjaga Anda tegak.

Ini berarti sukacita bukan hadiah untuk hal-hal yang berjalan baik. Ia adalah bahan bakar untuk tetap kuat ketika tidak. Anda tidak mendapatkan sukacita dengan bertahan melewati kesulitan. Anda menjadikan sukacita senjata untuk melewatinya.

Musuh tahu ini. Strategi jangka panjangnya yang paling efektif melawan Anda bukan menghancurkan Anda — tapi mencuri sukacita Anda. Karena orang yang kehilangan sukacita berhenti mengharapkan Tuhan itu baik. Berhenti menyembah dari hati. Berhenti membawa hadirat yang mengubah ruangan. Berhenti menjadi berbahaya bagi agenda musuh.

Jangan biarkan dia mengambilnya. Pilihlah sukacita. Bukan sebagai penyangkalan rasa sakit — tapi sebagai tekad bahwa Tuhan masih baik dan kisahnya masih menuju ke suatu tempat yang layak dirayakan. Sukacita adalah kekuatan Anda. Nehemia mengatakannya. Dan Anda akan membutuhkannya.`,
  },
  {
    title: "Give — and Watch What Comes Back",
    titleId: "Berilah — dan Lihatlah Apa yang Kembali",
    author: "Ashley",
    body: `Luke 6:38 is one of the most counterintuitive financial statements in scripture: give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you.

The measure you use. If you measure generously, you receive generously. If you measure tightly — out of fear, out of scarcity, protecting what you have — the return reflects that measurement.

This is not a prosperity formula. It's a Kingdom principle. The scarcity life hoards because it's afraid of running out. The overflow life gives because it's connected to a supply that doesn't run out.

Running over. Poured into your lap. God's return on generosity is not efficient or calculated. It's extravagant. The measure is good, pressed down, shaken together — every possible ounce of space filled — and still it runs over.

This principle applies beyond money. Give generously with your time — and find your sense of time expanded. Give generously with your forgiveness — and find your relationships deepened. Give generously with your encouragement — and find your own spirit lifted. The Kingdom economy runs in the opposite direction from the world's economy.

Give from what you have. Trust the Source. Watch the measure come back running over.`,
    bodyId: `Lukas 6:38 adalah salah satu pernyataan finansial yang paling kontra-intuitif dalam Kitab Suci: berilah dan kamu akan diberi: suatu takaran yang baik, yang dipadatkan, yang diguncangkan dan yang tumpah ke luar akan dicurahkan ke dalam ribaanmu. Sebab takaran yang kamu pakai, itulah yang akan dipakai untuk kamu.

Takaran yang kamu pakai. Jika Anda menakar dengan murah hati, Anda menerima dengan murah hati. Jika Anda menakar dengan ketat — karena takut, karena kekurangan, melindungi apa yang Anda miliki — balasannya mencerminkan takaran itu.

Ini bukan rumus kemakmuran. Ini prinsip Kerajaan. Hidup kekurangan menimbun karena takut kehabisan. Hidup yang melimpah memberi karena terhubung ke persediaan yang tidak habis.

Tumpah ke luar. Dicurahkan ke ribaanmu. Balasan Tuhan atas kemurahan hati bukan efisien atau kalkulatif. Ia luar biasa. Takarannya baik, dipadatkan, diguncangkan — setiap ons ruang terisi — dan masih tumpah ke luar.

Prinsip ini berlaku melampaui uang. Berilah dengan murah hati dengan waktu Anda — dan temukan rasa waktu Anda meluas. Berilah dengan murah hati dengan pengampunan Anda — dan temukan hubungan Anda mendalam. Berilah dengan murah hati dengan dorongan semangat Anda — dan temukan roh Anda sendiri terangkat. Ekonomi Kerajaan berjalan berlawanan arah dengan ekonomi dunia.

Berilah dari apa yang Anda miliki. Percayalah pada Sumbernya. Lihatlah takaran itu kembali melimpah ruah.`,
  },
  {
    title: "Don't Be Afraid — The First and the Last Is Here",
    titleId: "Jangan Takut — Yang Pertama dan Yang Terakhir Ada di Sini",
    author: "Jane",
    body: `Revelation 1:17-18. John sees a vision of the risen Jesus — eyes like blazing fire, face like the sun, voice like rushing waters, feet like bronze glowing in a furnace. The most overwhelming vision of Christ in all of scripture. And John falls at His feet as though dead.

And Jesus does something unexpected. He places His right hand on John and says: do not be afraid. I am the First and the Last. I am the Living One; I was dead, and now look, I am alive for ever and ever! And I hold the keys of death and Hades.

Do not be afraid.

Not to a person managing well. Not to someone who had it together. To a man face down, overwhelmed by a vision he couldn't contain. Jesus placed His hand on him — and said the same thing He's been saying throughout this whole plan: do not be afraid.

The First and the Last holds you. The Living One who was dead and is alive forever — He holds the keys. Not death. Not the grave. Not the enemy. Jesus. The risen, glorious, overwhelming Christ has the keys.

This is where one hundred days of facing fear ends: with Him, alive, holding your right hand, saying one more time — do not be afraid. He has the last word. And His last word is not fear. It is life, forever and ever.`,
    bodyId: `Wahyu 1:17-18. Yohanes melihat penglihatan tentang Yesus yang bangkit — mata seperti api menyala, wajah seperti matahari, suara seperti air bah menggemuruh, kaki seperti tembaga yang membara di dapur api. Penglihatan Kristus yang paling dahsyat di seluruh Kitab Suci. Dan Yohanes jatuh di kaki-Nya seperti orang mati.

Dan Yesus melakukan sesuatu yang tidak terduga. Dia meletakkan tangan kanan-Nya atas Yohanes dan berkata: jangan takut. Aku adalah Yang Pertama dan Yang Terakhir. Aku adalah Yang Hidup; Aku sudah mati, dan lihatlah, Aku hidup untuk selama-lamanya! Dan Aku memegang kunci maut dan alam maut.

Jangan takut.

Bukan kepada orang yang sedang baik-baik saja. Bukan kepada seseorang yang punya segalanya di bawah kendali. Kepada seorang pria yang telungkup, kewalahan oleh penglihatan yang tidak bisa dia tampung. Yesus meletakkan tangan-Nya padanya — dan berkata hal yang sama yang sudah Dia katakan sepanjang seluruh rencana ini: jangan takut.

Yang Pertama dan Yang Terakhir memegang Anda. Yang Hidup yang sudah mati dan hidup untuk selama-lamanya — Dia memegang kunci-kuncinya. Bukan maut. Bukan kubur. Bukan musuh. Yesus. Kristus yang bangkit, mulia, dan dahsyat memegang kunci-kuncinya.

Di sinilah seratus hari menghadapi ketakutan berakhir: bersama-Nya, hidup, memegang tangan kanan Anda, berkata sekali lagi — jangan takut. Dia punya kata terakhir. Dan kata terakhir-Nya bukan ketakutan. Tapi kehidupan, untuk selama-lamanya.`,
  },
  {
    title: "The Harvest Is Still Coming",
    titleId: "Panen Masih Akan Datang",
    author: "Ashley",
    body: `Galatians 6:9: let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up. We come back to this verse on Day 99 because it's the verse that has carried more faithful people through more long seasons than almost any other in scripture.

The harvest is coming. At the proper time. Not your time. Not the time you planned for. The proper time — the time that God, who sees the whole picture, has determined is best.

Two conditions. Don't grow weary. Don't give up. That's it. The harvest isn't conditional on your brilliance or your strategy. It's conditional on your endurance.

There are people reading this who have been sowing faithfully for a long time. You've prayed for a family member for years. You've served in a ministry that's shown no visible results. You've invested in a relationship that hasn't turned yet. You've believed for a promise that hasn't arrived.

Don't give up. Don't grow weary. The harvest is still coming.

The enemy's most strategic move isn't to destroy your effort. It's to exhaust it. To make you stop sowing before the season turns. But you're one day closer to the harvest today than you were yesterday. The seed is in the ground. The conditions are building. Keep going.`,
    bodyId: `Galatia 6:9: janganlah jemu-jemu berbuat baik, karena apabila sudah datang waktunya, kita akan menuai, jika kita tidak menyerah. Kita kembali ke ayat ini di Hari ke-99 karena ini adalah ayat yang telah memikul lebih banyak orang setia melewati lebih banyak musim panjang daripada hampir semua ayat lain dalam Kitab Suci.

Panen akan datang. Pada waktunya. Bukan waktu Anda. Bukan waktu yang Anda rencanakan. Waktu yang tepat — waktu yang Tuhan, yang melihat keseluruhan gambaran, telah tentukan sebagai yang terbaik.

Dua syarat. Jangan jemu. Jangan menyerah. Itu saja. Panen tidak bersyarat pada kecemerlangan atau strategi Anda. Ia bersyarat pada ketahanan Anda.

Ada orang yang membaca ini yang sudah menabur dengan setia untuk waktu yang lama. Anda sudah mendoakan anggota keluarga selama bertahun-tahun. Anda sudah melayani dalam pelayanan yang tidak menunjukkan hasil yang terlihat. Anda sudah berinvestasi dalam hubungan yang belum berbalik. Anda sudah mempercayai janji yang belum tiba.

Jangan menyerah. Jangan jemu. Panen masih akan datang.

Langkah paling strategis musuh bukan menghancurkan usaha Anda. Tapi menghabiskannya. Membuat Anda berhenti menabur sebelum musim berubah. Tapi Anda satu hari lebih dekat ke panen hari ini daripada kemarin. Bijinya sudah di tanah. Kondisinya sedang terbangun. Teruslah maju.`,
  },
  {
    title: "Living the Life You Were Made For",
    titleId: "Menjalani Hidup yang Anda Diciptakan Untuknya",
    author: "Jane",
    body: `Third John 1:2 is a short prayer that contains everything: dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well.

One hundred days. Forty days of facing fear and understanding authority. Thirty days of discovering God's love and the overflow of grace. Thirty days of community, boldness, purpose, and breakthrough. And we end here — with a prayer that you would flourish. Body, circumstances, soul — all of it.

Even as your soul is getting along well. The soul is the foundation. Everything else rises or falls from the interior. When your soul is well — rooted in His presence, free from fear, overflowing with grace, anchored in the community of His people — the rest of life takes its proper shape.

This is what we were made for. Not survival. Not management. Not white-knuckling through difficulty hoping to arrive at something better. Full life. Abundant life. Overflow life. The life Jesus came to bring — excessive, superabundant, running over into everyone around you.

You've spent 100 days building the interior. Now go live it. Not perfectly. Not fearlessly. But faithfully — one day at a time, in His presence, with His people, carrying His name, speaking His love. This is the life. Go live it.`,
    bodyId: `3 Yohanes 1:2 adalah doa singkat yang berisi segalanya: saudaraku yang kekasih, aku berdoa supaya engkau baik-baik saja dan sehat-sehat, sama seperti jiwamu baik-baik saja.

Seratus hari. Empat puluh hari menghadapi ketakutan dan memahami otoritas. Tiga puluh hari menemukan kasih Tuhan dan limpahan kasih karunia. Tiga puluh hari komunitas, keberanian, tujuan, dan terobosan. Dan kita berakhir di sini — dengan doa agar Anda berkembang. Tubuh, keadaan, jiwa — semuanya.

Sama seperti jiwamu baik-baik saja. Jiwa adalah fondasinya. Segalanya naik atau turun dari yang di dalam. Ketika jiwa Anda baik — berakar dalam hadirat-Nya, bebas dari ketakutan, melimpah dengan kasih karunia, berlabuh dalam komunitas umat-Nya — sisa hidup mengambil bentuknya yang tepat.

Inilah tujuan kita diciptakan. Bukan bertahan. Bukan mengelola. Bukan mencengkeram melewati kesulitan berharap sampai di sesuatu yang lebih baik. Hidup yang penuh. Hidup yang berlimpah. Hidup yang melimpah. Hidup yang Yesus datang untuk bawa — berlebih, berlimpah-limpah, tumpah ke semua orang di sekitar Anda.

Anda sudah menghabiskan 100 hari membangun interior. Sekarang pergilah dan jalanilah. Bukan dengan sempurna. Bukan tanpa takut. Tapi dengan setia — satu hari pada satu waktu, dalam hadirat-Nya, bersama umat-Nya, membawa nama-Nya, menyatakan kasih-Nya. Inilah hidupnya. Pergilah menjalaninya.`,
  },
];

// Combine original 40 + extra 60
export const ALL_ASHLEY_JANE_DEVOTIONALS = [...ASHLEY_JANE_DEVOTIONALS, ...EXTRA_DEVOTIONALS];

export const ALL_ASHLEY_JANE_PASSAGES: string[] = [
  ...ASHLEY_JANE_PLAN_PASSAGES,
  // Days 41–50
  'Romans 4',         // Day 41: Faith credited as righteousness
  'Hebrews 10',       // Day 42: Draw near with confidence
  'Titus 3',          // Day 43: Saved by His mercy (was Romans 8 dup)
  '2 Corinthians 9',  // Day 44: Cheerful giver
  'Romans 6',         // Day 45: Dead to sin, alive in Christ
  'Matthew 11',       // Day 46: Come to Me, all who are weary
  '2 Chronicles 20',  // Day 47: The battle belongs to the Lord
  'Psalm 46',         // Day 48: Be still and know
  'Proverbs 23',      // Day 49: Apply your heart to instruction
  'Psalm 121',        // Day 50: He who watches over you (was Hebrews 12 dup)
  // Days 51–60
  'Colossians 1',     // Day 51: The firstborn over all creation (was 1 Cor 12 dup)
  'Ephesians 1',      // Day 52: Blessed with every spiritual blessing
  'Revelation 19',    // Day 53: King of kings
  'Philippians 3',    // Day 54: Press on toward the goal (was Colossians 1 dup)
  '1 Thessalonians 5', // Day 55: Pray without ceasing (was Ephesians 3 dup)
  'Acts 2',           // Day 56: The Spirit poured out
  'Hebrews 11',       // Day 57: By faith (was Matthew 16 dup)
  'John 13',          // Day 58: Love one another
  'Romans 10',        // Day 59: Beautiful feet — sharing the gospel
  'Acts 1',           // Day 60: You will receive power
  // Days 61–70
  'Matthew 22',       // Day 61: Love God and love your neighbor
  '2 Corinthians 4',  // Day 62: Treasure in jars of clay
  '1 Timothy 6',      // Day 63: Fight the good fight (was Hebrews 10 dup)
  'Mark 8',           // Day 64: Deny yourself, take up your cross (was Matthew 16 dup)
  'Psalm 103',        // Day 65: Bless the Lord, O my soul (was Isaiah 41 dup)
  '2 Corinthians 10', // Day 66: Weapons of our warfare (was Philippians 3 dup — moved to 54)
  'James 4',          // Day 67: Draw near to God (was 2 Cor 10 dup)
  '1 Peter 1',        // Day 68: Born again to a living hope (was Joshua 1 dup)
  'Mark 5',           // Day 69: The woman who touched His garment
  'Acts 4',           // Day 70: Boldness in the Holy Spirit
  // Days 71–80
  'Proverbs 3',       // Day 71: Trust in the Lord (was Proverbs 4 dup)
  'Psalm 42',         // Day 72: Hope in God (was Philippians 4 dup)
  '1 Corinthians 13', // Day 73: The greatest is love (was John 15 dup)
  '2 Peter 1',        // Day 74: Add to your faith virtue (was Matthew 11 dup)
  '1 Peter 5',        // Day 75: Cast your cares on Him
  'Psalm 23',         // Day 76: The Lord is my shepherd
  'Habakkuk 3',       // Day 77: Yet I will rejoice (was Romans 5 dup)
  '1 Kings 19',       // Day 78: Still small voice
  'Matthew 18',       // Day 79: Forgive seventy times seven
  'Galatians 2',      // Day 80: I have been crucified with Christ (was Ephesians 3 dup)
  // Days 81–90
  'Jeremiah 1',       // Day 81: Before you were born I knew you
  'Psalm 37',         // Day 82: Delight yourself in the Lord
  '1 Samuel 17',      // Day 83: David and Goliath
  'Matthew 13',       // Day 84: The kingdom is like treasure
  'Micah 6',          // Day 85: Do justice, love mercy (was Matthew 5 dup)
  'Psalm 133',        // Day 86: How good — unity
  'Matthew 28',       // Day 87: The Great Commission
  'Isaiah 55',        // Day 88: My Word will not return void (was Philippians 4 dup)
  'Joel 2',           // Day 89: I will pour out My Spirit (was Isaiah 55 dup — moved to 88)
  '1 Corinthians 15', // Day 90: Death is swallowed up in victory
  // Days 91–100
  'Isaiah 60',        // Day 91: Arise, shine
  'Psalm 24',         // Day 92: Lift up your heads, O gates (was Ephesians 6 dup)
  'Psalm 100',        // Day 93: Enter His gates with thanksgiving (was Psalm 46 dup)
  'Romans 12',        // Day 94: Living sacrifice
  'Revelation 21',    // Day 95: Behold, I make all things new (was Romans 8 dup)
  'Nehemiah 8',       // Day 96: Joy of the Lord is your strength
  'Luke 6',           // Day 97: A good measure, pressed down
  'Revelation 1',     // Day 98: First and last
  'Psalm 150',        // Day 99: Let everything praise the Lord (was Galatians 6 dup)
  '3 John 1',         // Day 100: Walking in truth
];
