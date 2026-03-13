const CHARACTERS = {
  Abraham: {
    name: "Abraham",
    meaning: "Father of a multitude",
    era: "Patriarchs (c. 2100-2000 BC)",
    keyVerses: ["Genesis 12:1-3", "Genesis 15:6", "Romans 4:3", "Hebrews 11:8-10"],
    description: "Abraham, originally named Abram, is the foundational patriarch of the Hebrew faith and progenitor of the Israelite nation. Called by God at age 75 to leave his homeland, Abraham demonstrated radical faith by journeying to an unknown land with nothing but God's promise. Despite the obstacles—including his advanced age and Sarah's barrenness—Abraham trusted God's covenant, which was sealed through the birth of Isaac and ultimately fulfilled in his descendants numbering as the stars of heaven. His willingness to sacrifice his son Isaac exemplifies the ultimate test of faith and obedience to God.",
    keyEvents: ["Called by God to leave Ur", "Covenant at Bethel", "Birth of Ishmael through Hagar", "Covenant of Circumcision", "Sacrifice of Isaac on Mount Moriah"]
  },
  Moses: {
    name: "Moses",
    meaning: "Drawn out (from water)",
    era: "Exodus & Wilderness (c. 1400-1300 BC)",
    keyVerses: ["Exodus 3:1-14", "Deuteronomy 34:10", "Hebrews 3:5-6", "Acts 7:35-37"],
    description: "Moses stands as the greatest prophet and lawgiver in the Hebrew Bible, mediating God's covenant with Israel and leading the nation through forty years of wilderness wandering. Raised in Pharaoh's household yet deeply connected to his Hebrew heritage, Moses encountered God in the burning bush and became the instrument through which God delivered Israel from Egyptian bondage through ten miraculous plagues. He received the Torah—God's revealed law inscribed on two tablets of stone—at Mount Sinai, establishing the legal and ethical foundation for Israel's covenant relationship with God. Though his sin at Meribah prevented him from entering the Promised Land, Moses remained Israel's preeminent leader and the prototype of the coming Messiah.",
    keyEvents: ["Escape from Egypt as infant", "Encounter with God at burning bush", "Ten Plagues upon Egypt", "Parting of the Red Sea", "Receiving the Torah at Mount Sinai"]
  },
  David: {
    name: "David",
    meaning: "Beloved",
    era: "United Kingdom (c. 1040-970 BC)",
    keyVerses: ["1 Samuel 16:11-13", "Psalm 23:1", "2 Samuel 7:12-13", "Acts 13:22"],
    description: "David, the second and greatest king of Israel, began as a humble shepherd boy chosen by God to replace Saul and united the fractured nation into a powerful monarchy. His victory over the giant Goliath established his reputation as a warrior and God's chosen deliverer, while his friendship with Jonathan and his later conflicts with Saul revealed his complex character and moral development. Known as the 'Psalmist King,' David composed many of the Psalms that form the emotional and spiritual core of Hebrew worship, expressing raw faith, repentance, and praise to God. Despite serious moral failures—including his adultery with Bathsheba and the resulting murder of her husband Uriah—David's genuine repentance and his unshakeable faith in God's mercy made him a model of covenant faithfulness and typologically foreshadowed the Messiah.",
    keyEvents: ["Anointing as king by Samuel", "Victory over Goliath", "Friendship with Jonathan", "Reign over United Kingdom", "Psalm composition"]
  },
  Solomon: {
    name: "Solomon",
    meaning: "Peaceful",
    era: "United Kingdom (c. 970-930 BC)",
    keyVerses: ["1 Kings 3:11-12", "1 Kings 4:29-31", "Proverbs 1:1", "Matthew 6:28-29"],
    description: "Solomon, David's son, inherited and expanded Israel's kingdom to its greatest territorial extent and achieved unparalleled wealth, wisdom, and international influence during Israel's golden age. Granted extraordinary wisdom by God in a dream, Solomon employed his legendary discernment to rule justly and engage in extensive building projects, most notably the magnificent Temple in Jerusalem that served as the spiritual center of Israel's faith for centuries. His literary legacy includes Proverbs, Ecclesiastes, and the Song of Songs, which showcase his reflective wisdom and poetic insight into human nature, morality, and spirituality. However, his later years were marred by apostasy—accumulating numerous foreign wives who led him away from covenant faithfulness—resulting in a divided kingdom after his death that fragmented his united empire.",
    keyEvents: ["Dream at Gibeon with divine wisdom", "Building of the First Temple", "Reign of unprecedented peace and prosperity", "Compilation of Proverbs", "Spiritual decline and foreign alliances"]
  },
  Elijah: {
    name: "Elijah",
    meaning: "My God is Yahweh",
    era: "Divided Kingdom (c. 875-845 BC)",
    keyVerses: ["1 Kings 18:36-39", "1 Kings 19:11-13", "Malachi 4:5-6", "Matthew 17:1-3"],
    description: "Elijah the Tishbite was a towering prophetic figure in the northern kingdom of Israel, boldly confronting the idolatrous apostasy of King Ahab and Queen Jezebel with uncompromising zeal for God's exclusive worship. His dramatic confrontation with Baal's prophets at Mount Carmel—where fire from heaven consumed the offerings—demonstrated God's supremacy and sovereignty in spectacular fashion, validating his prophetic authority. Despite this triumph, Elijah experienced profound spiritual depression, fleeing into the wilderness where God revealed His presence not in dramatic phenomena but in a still, small voice, teaching the prophet about listening for God's subtle guidance. His mysterious translation to heaven in a whirlwind and his expected return in Jewish eschatology (as Elijah the forerunner) made him a pivotal figure whose example of zealous faith and dependence on God's strength influenced prophetic tradition throughout Hebrew history.",
    keyEvents: ["Declaration of drought to King Ahab", "Confrontation with Baal prophets at Mount Carmel", "Flight to Mount Horeb (Sinai)", "Vision of God in still small voice", "Translation to heaven in whirlwind"]
  },
  Elisha: {
    name: "Elisha",
    meaning: "My God is salvation",
    era: "Divided Kingdom (c. 850-790 BC)",
    keyVerses: ["1 Kings 19:19-21", "2 Kings 2:9-14", "2 Kings 5:1-14", "2 Kings 4:32-35"],
    description: "Elisha, chosen by Elijah as his successor and spiritual heir, became Israel's chief prophet and performed more recorded miracles than any other prophet in the Hebrew Bible, serving multiple kings across five decades. Called while plowing his field, Elisha demonstrated extraordinary supernatural power—healing the Syrian commander Naaman of leprosy, multiplying oil and bread to sustain the widow and starving families, raising the dead, and performing numerous signs that testified to God's compassionate intervention in human affairs. Unlike Elijah's confrontational style, Elisha embodied a more accessible, compassionate prophetic ministry, serving as counselor to kings and helper to the marginalized, yet his moral authority remained absolute when challenging royal sin and idolatry. His double portion of Elijah's spirit—which he requested before his predecessor's translation—manifested in the numerous miracles throughout his ministry, making him a prototype of Christ's compassionate healing power.",
    keyEvents: ["Called by Elijah at his plow", "Receipt of Elijah's cloak and double portion", "Healing of Naaman the leper", "Multiplication of widow's oil", "Raising of Shunammite woman's son"]
  },
  Isaiah: {
    name: "Isaiah",
    meaning: "Yahweh is salvation",
    era: "Divided Kingdom (c. 760-700 BC)",
    keyVerses: ["Isaiah 6:1-8", "Isaiah 40:1-11", "Isaiah 53:1-6", "Matthew 1:23"],
    description: "Isaiah, often called the 'Prince of Prophets,' stands as Israel's preeminent prophetic voice, delivering God's messages across six decades of Judah's religious and political turbulence with eloquence unmatched in Scripture. His famous encounter with the enthroned God in the Temple (chapter 6) established his prophetic credentials and set the agenda for his ministry: to harden Israel's heart in judgment while proclaiming hope to a faithful remnant. Isaiah's vision encompasses immediate historical crises and God's cosmic redemptive plans, moving seamlessly from denunciations of social injustice and religious hypocrisy to magnificent prophecies of Zion's restoration and the coming Messiah's establishment of God's kingdom. His profound messianic theology—particularly the Suffering Servant passages describing a figure who bears humanity's sins through vicarious suffering—profoundly shaped Jewish and Christian eschatological expectation and are among Scripture's most quoted passages.",
    keyEvents: ["Vision of God's throne in Temple", "Symbolic marriage to prophetess", "Prophecy against ten nations", "Deliverance of Jerusalem from Assyria", "Proclamation of messianic restoration"]
  },
  Jeremiah: {
    name: "Jeremiah",
    meaning: "Yahweh exalts/establishes",
    era: "Divided Kingdom/Exile (c. 645-580 BC)",
    keyVerses: ["Jeremiah 1:17-19", "Jeremiah 23:28-29", "Lamentations 1:1", "Matthew 2:17-18"],
    description: "Jeremiah, the prophet of Judah's final decline and the Babylonian exile, earned the designation 'the weeping prophet' for his anguished heart over his nation's spiritual decay and coming judgment despite his faithful proclamation of God's Word. Called while still young and initially resistant, Jeremiah experienced unprecedented opposition from priests, false prophets, and kings who rejected his message of repentance and submission to Babylon as God's judgment, yet he persisted with extraordinary courage born from intimate communion with God. His personal sufferings—beatings, imprisonment, mockery, and social isolation—coupled with his profound spiritual struggles and lament prayers, make his writings extraordinarily human and emotionally authentic, revealing both the agony and privilege of prophetic calling. His proclamation of a new covenant written on hearts rather than stone tablets, and his letters to exiles emphasizing hope and restoration, transformed Israel's understanding of covenant and redemption, infusing exile with redemptive purpose.",
    keyEvents: ["Divine call while young", "Temple sermon denouncing false worship", "Symbolic acts of judgment", "Imprisonment and persecution", "Lament over Jerusalem's destruction"]
  },
  Daniel: {
    name: "Daniel",
    meaning: "God is my judge",
    era: "Exile (c. 605-530 BC)",
    keyVerses: ["Daniel 1:8-16", "Daniel 3:28", "Daniel 6:22-23", "Matthew 24:15"],
    description: "Daniel, a Judean nobleman exiled to Babylon, exemplifies resolute faith and integrity under foreign dominance, maintaining covenant faithfulness while serving in Nebuchadnezzar's pagan court with distinction and unwavering moral conviction. His refusal to defile himself with the king's food, his God-given ability to interpret dreams and visions, and his elevation to high administrative positions demonstrated that faithfulness to God's law yields both integrity and wisdom recognizable even to pagan rulers. Daniel's faith was tested in the fiery furnace when he and his companions refused to worship the golden image, and later in the lion's den when his prayer practices violated the king's decree—in both instances God's supernatural deliverance vindicated his steadfast trust. His apocalyptic visions revealed God's comprehensive plan spanning centuries, depicting the rise and fall of earthly kingdoms while affirming God's ultimate sovereignty and the coming kingdom of the Son of Man, establishing him as Judaism's foremost visionary prophet.",
    keyEvents: ["Refusal to eat unclean food in Babylon", "Interpretation of Nebuchadnezzar's dreams", "Deliverance from the fiery furnace", "Deliverance from the lion's den", "Apocalyptic visions of future kingdoms"]
  },
  Esther: {
    name: "Esther",
    meaning: "Star",
    era: "Return & Restoration (c. 486-465 BC)",
    keyVerses: ["Esther 4:14", "Esther 7:3-6", "Esther 8:15-16", "Psalm 113:7-8"],
    description: "Esther, a Jewish orphan raised by her cousin Mordecai in the Persian diaspora, rose from obscurity to become queen of Persia and instrumental in preserving her people from annihilation, demonstrating that God providentially works through human courage even in seemingly God-absent circumstances. Her beauty and graciousness won King Ahasuerus's affection, positioning her uniquely to intercede for the Jewish people when Haman's conspiracy threatened their complete destruction, requiring her to risk her own life by approaching the king uninvited. At Mordecai's challenge—questioning whether she had reached her position 'for such a time as this'—Esther transcended her fear and personal safety to become her people's deliverer, fasting and preparing spiritually before making her desperate appeal. Though God's name never appears in the book bearing her name, His providential hand orchestrates events behind the scenes, using Esther's strategic intelligence, courage, and willingness to sacrifice herself to accomplish His people's deliverance.",
    keyEvents: ["Winning the beauty contest for queen", "Discovery of assassination plot", "Haman's conspiracy against Jews", "Fasting and prayer for deliverance", "Intercessory appeal before the king"]
  },
  Ruth: {
    name: "Ruth",
    meaning: "Friend/companion",
    era: "Judges (c. 1100 BC)",
    keyVerses: ["Ruth 3:11", "Ruth 4:13-17", "Matthew 1:5", "Hebrews 11:31"],
    description: "Ruth, a Moabite woman married to an Israelite, entered God's covenant family through marriage to Naomi's son, and after his death, demonstrated extraordinary loyalty to her Hebrew mother-in-law and faith in Israel's God, exemplifying the redemptive love that characterizes God's kingdom. Widowed and foreign in a hostile land, Ruth chose to remain with destitute Naomi rather than return to her people, declaring her commitment to Naomi's God and community with the phrase 'your people will be my people, and your God my God,' expressing faith in God's covenant beyond ethnic boundaries. Her humble gleaning in Boaz's fields eventually led to her marriage to the kinsman-redeemer, establishing a household and continuing the line of Judah, yet Scripture emphasizes her character and virtue rather than her social advancement. As the great-grandmother of King David and included in Jesus's genealogy, Ruth's story demonstrates that God welcomes humble foreign believers into His family, values the virtuous and faithful regardless of social status or ethnic origin, and accomplishes His redemptive purposes through the most unlikely candidates.",
    keyEvents: ["Loyalty to widowed Naomi", "Gleaning in Boaz's field", "Night meeting with Boaz at threshing floor", "Kinsman-redeemer transaction", "Birth of Obed, David's grandfather"]
  },
  Joshua: {
    name: "Joshua",
    meaning: "Yahweh is salvation",
    era: "Conquest of Canaan (c. 1400-1370 BC)",
    keyVerses: ["Joshua 1:8-9", "Joshua 6:20", "Joshua 23:8-11", "Hebrews 4:8-9"],
    description: "Joshua, chosen by God as Moses's successor, led the Israelite tribes in the conquest and settlement of Canaan, demonstrating military strategy combined with unwavering faith that God would fulfill His covenant promise of the Promised Land. His commission came with the assurance that God would be with him as He had been with Moses, requiring Joshua to meditate on God's law and demonstrate courage rooted not in military superiority but in covenant fidelity and trust in God's presence and power. Joshua's military campaigns—from the miraculous crossing of the Jordan River to the conquest of Jericho with circling priests and shouting soldiers—testified that Israel's victory depended not on human might but on obedience to God's Word and trust in His supernatural intervention. His final exhortation challenged Israel to maintain covenant loyalty and serve God exclusively, establishing the legal and spiritual framework for Israel's life in the Promised Land and prefiguring Jesus Christ as the leader who brings God's people into their eternal inheritance.",
    keyEvents: ["Commissioning as Moses's successor", "Miraculous crossing of Jordan River", "Conquest of Jericho", "Battle at Gibeon with sun standing still", "Allocation of tribal lands"]
  },
  Samuel: {
    name: "Samuel",
    meaning: "Name of God/God has heard",
    era: "Judges/United Kingdom (c. 1105-1015 BC)",
    keyVerses: ["1 Samuel 3:1-10", "1 Samuel 7:15-17", "1 Samuel 15:22", "Hebrews 11:32"],
    description: "Samuel, the last judge and first prophet-kingmaker, stood at the pivotal transition from Israel's tribal confederacy to monarchical government, anointing both Saul and David while maintaining prophetic independence and moral authority that superseded royal power. Born miraculously to barren Hannah in answer to fervent prayer and dedicated to lifetime temple service, Samuel experienced direct divine communication from childhood and became Israel's foremost spiritual authority during a period of Philistine threat and internal spiritual decline. His annual judicial circuit throughout Israel and his role establishing schools of prophets demonstrated his comprehensive spiritual leadership extending beyond cultic functions to encompassing justice, moral guidance, and prophetic training that renewed Israel's spiritual vitality. Samuel's tragic task of anointing Saul despite the king's eventual disobedience, followed by his anointing of David in secret, revealed the tension between God's choice and human choice, between prophetic insight and institutional authority, establishing the principle that God looks on the heart while people look on outward appearance.",
    keyEvents: ["Miraculous birth and dedication to temple", "Call from God as young boy", "Defeat of Philistines at Mizpah", "Anointing of Saul as first king", "Anointing of David as true king"]
  },
  Gideon: {
    name: "Gideon",
    meaning: "Cutter/mighty warrior",
    era: "Judges (c. 1169-1129 BC)",
    keyVerses: ["Judges 6:12-16", "Judges 6:36-40", "Judges 7:2-7", "Hebrews 11:32-33"],
    description: "Gideon, a fearful farmer called to lead Israel against overwhelming Midianite oppression, exemplified how God selects the weak and reluctant to accomplish mighty acts, transforming doubt into heroic faith through progressively demanding signs of God's commitment. Hiding wheat in a winepress to avoid Midianite detection, Gideon received a divine call assuring him that God would be with him, yet his persistent questions about God's reality ('show me a sign') revealed both faith and hesitation, prompting God to demonstrate His trustworthiness through the miraculous dew fleece. Despite his reluctance and his need for reassurance, God refined Gideon's army from thousands to a mere three hundred, teaching that victory depends not on human numbers or military strength but exclusively on divine power working through faith, resulting in a spectacular Midianite rout accomplished through psychological tactics—torches, pitchers, and trumpets—that magnified God's glory. Though Gideon's later years descended into apostasy and dynastic ambition, his initial calling and faith became paradigmatic of God's paradoxical principle of choosing weak vessels to display His strength.",
    keyEvents: ["Divine call from angel at Ophrah", "Sign of the dew fleece", "Reduction of army to three hundred", "Nighttime raid on Midianite camp", "Victory in valley of Jezreel"]
  },
  Joseph: {
    name: "Joseph",
    meaning: "Yahweh increases/adds",
    era: "Patriarchs (c. 1900-1800 BC)",
    keyVerses: ["Genesis 37:5-10", "Genesis 39:2-6", "Genesis 41:39-40", "Psalm 105:17-22"],
    description: "Joseph, the beloved son of Jacob whose dreams of greatness provoked his brothers' murderous jealousy, endured slavery and false accusation yet rose to become Egypt's vizier, revealing God's providential care that transforms suffering into redemptive purpose for his family and nation. Sold into slavery in Egypt by his bitter brothers, Joseph maintained integrity and faith despite sexual temptation from Potiphar's wife and imprisonment for her false accusation, earning respect through his character, faithfulness, and God-given ability to interpret dreams that caught Pharaoh's attention. His rise from prison to power positioned him to preserve his family during seven years of famine, and his revelation to his brothers—accompanied by forgiveness rather than revenge—demonstrated a heart transformed by God's providence and wisdom: 'You meant evil against me, but God meant it for good.' Joseph's management of Egypt's resources, his strategic population reorganization, and his faithful care for his aging father Jacob established him as a model of providential faithfulness and prefigured Christ's redemptive role in preserving God's people.",
    keyEvents: ["Dreams of future greatness", "Betrayal and sale into slavery", "Rise in Potiphar's household", "False accusation and imprisonment", "Interpretation of Pharaoh's dreams and rise to power"]
  },
  Jacob: {
    name: "Jacob",
    meaning: "Supplanter/heel-catcher",
    era: "Patriarchs (c. 2006-1859 BC)",
    keyVerses: ["Genesis 28:12-15", "Genesis 32:24-30", "Hosea 12:3-4", "Matthew 22:32"],
    description: "Jacob, the younger son whose deceptive nature ('supplanter') characterized his early life, was transformed through divine encounter and hardship into Israel, the father of the twelve tribes, exemplifying God's grace toward the morally compromised and His willingness to redirect human ambition toward covenant purposes. His infamous deception of his blind father Isaac for the blessing, coupled with his subsequent flight from Esau's wrath, drove him into exile where he encountered God's ladder of angels and received God's unconditional covenant promise—assurance that despite his sin, God would bless him and his descendants and establish His redemptive plan through his line. Jacob's years with Laban—marked by his own deception encountering his deceiver—produced the twelve sons who would become Israel's tribes, yet only through wrestling with God at Peniel, when he wrestled the angel through the night and refused to release until receiving a blessing, did he achieve spiritual transformation and the new name 'Israel' meaning 'one who struggles with God.' His reconciliation with Esau, his burial request in Canaan, and his blessing of Joseph's sons demonstrated a man whose faith matured through struggle, deception overcome by grace, and ultimate alignment with God's covenant purposes.",
    keyEvents: ["Deception of Isaac for the blessing", "Encounter with God's covenant at Bethel", "Years of service under Laban", "Wrestling match with God at Peniel", "Reconciliation with Esau and return to Canaan"]
  },
  Mary: {
    name: "Mary",
    meaning: "Of the sea/beloved",
    era: "Life of Christ (c. 20 BC-80 AD)",
    keyVerses: ["Luke 1:26-38", "John 19:26-27", "Acts 1:14", "Luke 2:19"],
    description: "Mary of Nazareth, the mother of Jesus, stands as one of Scripture's most significant yet enigmatic figures—a young woman of extraordinary faith who bore the Son of God and witnessed His ministry, death, and resurrection with a faith that deepened through progressive revelation and suffering. Though commonly venerated in Christian tradition, biblical accounts emphasize her yielding obedience to God's purposes rather than exceptional status, her astonished questioning ('how can this be?') revealing normal human bewilderment before receiving the angel's explanation of the Holy Spirit's overshadowing power. She pondered Jesus's words and acts throughout His ministry, supporting Him despite initial misunderstanding (Mark 3:21), standing faithfully at His crucifixion while disciples fled, and receiving His final provision—his entrusting her to John's care as His representative of family responsibility. Her presence in the Jerusalem church after Pentecost, listed among praying disciples awaiting the Holy Spirit, demonstrates her ongoing faith and integration into the apostolic community, though Scripture intentionally restrains her role to prevent the Marian devotion that would develop in later Christian tradition.",
    keyEvents: ["Angelic annunciation of Jesus's conception", "Birth of Jesus in Bethlehem", "Pondering of Jesus's words and actions", "Standing at Jesus's crucifixion", "Presence among apostles after resurrection"]
  },
  Jesus: {
    name: "Jesus",
    meaning: "Yahweh saves",
    era: "Life of Christ (c. 4 BC-30 AD)",
    keyVerses: ["Matthew 1:21", "John 1:1-14", "John 3:16", "1 Corinthians 15:3-4"],
    description: "Jesus of Nazareth, God incarnate in human form, stands as the central figure of Christianity and the fulfillment of Old Testament messianic prophecy—the Son of God whose incarnation, atoning death, resurrection, and ascension accomplished humanity's redemption and established the kingdom of God. Born of the Virgin Mary and baptized by John the Baptist, Jesus launched a three-year public ministry of teaching, healing, and miracle-working that attracted massive crowds yet provoked fierce opposition from religious authorities threatened by His claims of divine authority and His radical redefining of covenant righteousness as inward transformation rather than external observance. His ethical teachings—the Sermon on the Mount, parables of the kingdom, teachings on love and forgiveness—revolutionized moral consciousness while His miraculous healings, exorcisms, and raising of the dead demonstrated His power over disease, demonic forces, and death itself, validating His identity and proclaiming God's kingdom breaking into human history. His crucifixion as a condemned criminal, presented by the New Testament as a substitutionary atonement for human sin, followed by His resurrection three days later and fifty-day post-resurrection appearances, established Him as the victorious Lord who defeated death and opened the pathway to eternal communion with God for all who believe.",
    keyEvents: ["Virgin birth in Bethlehem", "Baptism by John in Jordan River", "Temptation in wilderness", "Crucifixion and resurrection", "Ascension and session at right hand of God"]
  },
  Peter: {
    name: "Peter",
    meaning: "Rock/stone",
    era: "Life of Christ/Early Church (c. 1 BC-67 AD)",
    keyVerses: ["Matthew 16:17-18", "John 21:15-17", "Acts 2:14-36", "1 Peter 1:3-5"],
    description: "Peter, a Galilean fisherman renamed Cephas (rock) by Jesus, became the foremost apostle and leader of the Jerusalem church, exemplifying both the boldness and fallibility of faithful discipleship as he progressed from impetuous disciple to foundational church leader. Despite his passionate but inconsistent faith—declaring Jesus as Messiah yet rebuking Jesus's crucifixion prediction, protesting his own unworthiness yet cutting off the servant's ear during arrest, denying knowing Jesus three times—Jesus entrusted Peter with the 'keys of the kingdom' and commissioned him to 'feed my lambs, sheep,' establishing his leadership role in the emerging church. Peter's Pentecost sermon converted thousands and his bold declarations before the Sanhedrin demonstrated spiritual transformation and Holy Spirit empowerment, yet his initial resistance to Gentile inclusion required divine vision and Paul's confrontation, showing his continued growth and adjustment of understanding. His letters (1 and 2 Peter) emphasize suffering as participation in Christ's redemptive work and ethical conduct as testimony to Christ's character, while traditions record his martyrdom in Rome through crucifixion, completing the trajectory from wavering disciple to faithful witness.",
    keyEvents: ["Calling as disciple by Jesus", "Declaration of Jesus as Messiah", "Walking on water with Jesus", "Denial of Jesus at trial", "Pentecost sermon and leadership"]
  },
  Paul: {
    name: "Paul",
    meaning: "Small/humble",
    era: "Early Church/Letters & Revelation (c. 5-67 AD)",
    keyVerses: ["Acts 9:3-6", "Galatians 2:20", "2 Timothy 4:6-7", "1 Corinthians 15:9-10"],
    description: "Paul (formerly Saul) of Tarsus, a Pharisaic persecutor of Christians transformed into Christianity's most prolific theologian and missionary, stands as the architect of Christian theology and the pioneer of Gentile mission, authoring thirteen New Testament epistles that shaped Christian doctrine for two millennia. His Damascus Road encounter with the risen Christ revolutionized his understanding of Jesus's messiahship and compelled him into apostolic ministry to Gentiles, which he pursued with unrelenting passion through missionary journeys across the Mediterranean establishing churches and training leaders despite repeated imprisonment, beatings, shipwreck, and deprivation. Paul's theological contributions—particularly his expositions of justification by faith rather than works of law, the church as Christ's body, and union with Christ through faith—liberated Christianity from Jewish legalism and articulated grace's radical inclusion of both Jew and Gentile into God's covenant family. His letters, addressed to specific churches addressing concrete problems and theological questions, remain Scripture's most sustained theological argument and provide the foundational understanding of redemption, sanctification, ecclesiology, and eschatology that undergird Christian faith and practice.",
    keyEvents: ["Persecution of Christians", "Damascus Road conversion", "Missionary journeys to Gentiles", "Council at Jerusalem debate", "Martyrdom in Rome"]
  },
  John: {
    name: "John",
    meaning: "Yahweh is gracious",
    era: "Life of Christ/Early Church/Letters & Revelation (c. 6 BC-100 AD)",
    keyVerses: ["John 13:23", "1 John 4:7-8", "Revelation 1:1-3", "John 21:24-25"],
    description: "John, the beloved disciple and author of the Fourth Gospel, 1, 2, and 3 John, and Revelation, stands as the most theologically reflective New Testament writer whose works emphasize incarnational theology, intimate communion with Christ, and cosmic eschatology. Initially a disciple of John the Baptist before following Jesus, John became part of Jesus's inner circle along with Peter and James, reclining on Jesus's bosom at the Last Supper, fleeing at the crucifixion, but becoming the disciple closest to the cross where Jesus committed His mother to his care. John's Gospel uniquely emphasizes Jesus's divine identity as the Word who existed with God before creation, presents His ministry through seven signs demonstrating His power, and records His extended farewell discourse on love, the Holy Spirit's role, and covenant relationship, making his account the most explicitly theological narrative of Jesus's life. His letters and Revelation, written to combat false teachings about Christ's humanity and to encourage persecuted churches, combine his profound theology with urgent pastoral concern, while his apocalyptic vision in Revelation unveils Christ's ultimate triumph over cosmic evil and the establishment of God's eternal kingdom.",
    keyEvents: ["Calling as John the Baptist's disciple", "Becoming part of Jesus's inner circle", "Reclining on Jesus at Last Supper", "Standing at Jesus's crucifixion", "Leadership in Jerusalem church"]
  },
  James: {
    name: "James",
    meaning: "Supplanter",
    era: "Early Church/Letters & Revelation (c. 5-62 AD)",
    keyVerses: ["James 1:2-4", "James 2:26", "Acts 12:2", "Acts 15:13-21"],
    description: "James, brother of John and son of Zebedee, was one of the Twelve Apostles and the first apostle to be martyred for his faith, while James the Less (possibly Jesus's cousin) became leader of the Jerusalem church and authored the epistle bearing his name emphasizing works as evidence of genuine faith. The James of Zebedee, known for his initial ambition (requesting preferred seats in the kingdom), experienced transformation into a committed martyr under King Herod's persecution, establishing the pattern of apostolic martyrdom and faithfulness unto death. The epistle attributed to James the Less addresses practical Christian living, warning against wealth and favoritism, demanding care for widows and orphans, and emphasizing that authentic faith produces works—not as a means of salvation but as inevitable evidence of genuine relationship with Christ. Both James figures exemplify different dimensions of apostolic commitment: John's brother through his martyrdom, and the Jerusalem James through his institutional leadership and theological emphasis on ethical living, making the name James representative of steadfast commitment regardless of personal cost.",
    keyEvents: ["Calling as apostle by Jesus", "Request for chief seats in kingdom", "Martyrdom under Herod Agrippa", "Leadership of Jerusalem church (the Less)", "Authorship of epistle (the Less)"]
  },
  Timothy: {
    name: "Timothy",
    meaning: "Honoring God",
    era: "Early Church/Letters & Revelation (c. 20-100 AD)",
    keyVerses: ["2 Timothy 1:5", "2 Timothy 4:5-7", "1 Timothy 4:12-16", "1 Timothy 6:20"],
    description: "Timothy, Paul's spiritual son and trusted companion, represents the second generation of Christian leadership and the importance of mentoring in maintaining apostolic faith and practice beyond the apostles' lifetime. The son of a believing Jewish mother (Eunice) and Greek father, Timothy received careful spiritual training from childhood and was deliberately chosen by Paul for missionary partnership, accompanying him on his second missionary journey and becoming his special representative to churches. Paul's epistles to Timothy (1 and 2 Timothy) constitute Christianity's earliest instruction manual for church leadership, addressing qualifications for elders and deacons, combating false teachings, establishing proper worship practices, and encouraging young Timothy to persevere in faithful ministry despite opposition and exhaustion. His role as pastoral leader in Ephesus, addressed in these letters as Timothy faced pressure to compromise theological truth and abandon countercultural Christian practices, established him as a prototype for subsequent pastoral leaders navigating similar tensions between cultural accommodation and covenant faithfulness.",
    keyEvents: ["Conversion through Paul's ministry", "Joining Paul's missionary team", "Leadership in Ephesian church", "Reception of 1 Timothy instruction", "Reception of 2 Timothy exhortation"]
  },
  Barnabas: {
    name: "Barnabas",
    meaning: "Son of encouragement",
    era: "Early Church (c. 5-50 AD)",
    keyVerses: ["Acts 4:36-37", "Acts 9:27", "Acts 11:24", "Acts 15:36-39"],
    description: "Barnabas, a Levite from Cyprus named Joseph but given the surname 'Son of Encouragement' by the apostles for his consistent spiritual support and generosity, served as Paul's mentor and missionary partner whose faithful partnership was crucial to early church development and Gentile mission expansion. His initial generosity—selling property and depositing funds for the community's benefit—exemplified the radical sharing characterizing early Jerusalem Christians, while his introduction of Paul to the skeptical apostles after Paul's conversion enabled Paul's integration into the church and launching of his apostolic ministry. Barnabas accompanied Paul on the first missionary journey and his role became so intertwined with Paul's that Paul was sometimes called Barnabas by Gentile audiences unfamiliar with his Jewish name, demonstrating the partnership's strength and public recognition of their collaborative ministry. Though Barnabas and Paul eventually separated over their disagreement concerning John Mark's reliability, this division enabled broader missionary coverage while demonstrating that even godly Christians can disagree sharply, yet both remain faithful to Christ's purposes.",
    keyEvents: ["Generosity to early church community", "Introduction of Paul to apostles", "First missionary journey with Paul", "Disagreement with Paul over John Mark", "Continued ministry in Cyprus"]
  },
  Stephen: {
    name: "Stephen",
    meaning: "Crown",
    era: "Early Church (c. 30-34 AD)",
    keyVerses: ["Acts 6:8-10", "Acts 7:54-60", "Acts 22:20", "Revelation 2:10"],
    description: "Stephen, the first Christian martyr (protomartyr), stands as a powerful witness whose death catalyzed the early church's expansion beyond Jerusalem and whose faithfulness unto death established the paradigm of Christian martyrdom that would characterize the faith throughout history. Chosen as one of seven deacons to distribute aid to widows, Stephen surpassed his administrative role by performing great wonders and signs, engaging in debates with synagogue opponents and speaking with the wisdom of the Holy Spirit that left them unable to answer. His extended testimony before the Sanhedrin recounted Israel's covenant history while addressing his accusers' resistance to the Holy Spirit, a speech that intensified their fury to murderous rage, resulting in his stoning while a young man named Saul guarded the executioners' cloaks. Stephen's vision of the opened heavens and the exalted Christ standing (rather than sitting) at God's right hand—a posture of active intercession—validated his testimony and provided encouragement in his dying moments, while his death initiated the first systematic persecution that scattered the Jerusalem church and inaugurated the global Gentile mission.",
    keyEvents: ["Selection as deacon for community aid", "Performing great wonders and signs", "Debate in synagogues against opponents", "Testimony before Sanhedrin", "Martyrdom by stoning and vision of Christ"]
  },
  Nicodemus: {
    name: "Nicodemus",
    meaning: "Victor of the people",
    era: "Life of Christ (c. 20-100 AD)",
    keyVerses: ["John 3:1-8", "John 7:50-51", "John 19:39-42"],
    description: "Nicodemus, a Pharisee and member of the Sanhedrin, represents the spiritually sensitive seeker who encounters Jesus privately despite institutional opposition, gradually moving from cautious inquiry toward public acknowledgment of Jesus despite significant social and professional risk. His nighttime visit to Jesus—prompted by recognition of Jesus's divine origin evidenced through His signs—initiated one of Scripture's most profound theological conversations about spiritual rebirth, wherein Jesus explained that entry into God's kingdom requires being 'born again' through the Holy Spirit, overturning Nicodemus's assumption that covenant identity and moral achievement qualified one for God's kingdom. Nicodemus's subsequent advocacy for Jesus before the Sanhedrin, insisting that the law requires testimony from the person himself before judgment, demonstrated growing courage despite his colleagues' hostility, showing incremental spiritual transformation through continued exposure to Jesus. His final appearance at the crucifixion, bringing costly spices (seventy-five pounds) for Jesus's burial alongside Joseph of Arimathea, suggests a complete conversion and willingness to identify publicly with the executed Jesus despite devastating loss of status and prestige among his peers.",
    keyEvents: ["Nighttime meeting with Jesus", "Teaching about being born again", "Defense of Jesus before Sanhedrin", "Public identification at Jesus's burial", "Preparation of body with myrrh and aloes"]
  },
  Martha: {
    name: "Martha",
    meaning: "Lady/mistress",
    era: "Life of Christ (c. 15-90 AD)",
    keyVerses: ["Luke 10:40-42", "John 11:20-27", "John 12:2"],
    description: "Martha of Bethany, sister of Mary and Lazarus, represents the practical, service-oriented believer whose anxiety-driven activism, while well-intentioned, can obstruct intimate communion with Christ and whose faith, though tested through grief, ultimately triumphed in encountering Christ's resurrection power. Her complaint to Jesus about her sister Mary's inattention to hospitality—sitting at Jesus's feet while Martha served alone—prompted Jesus's gentle rebuke that Mary had chosen 'what is better,' the 'one thing necessary,' emphasizing the priority of intimate listening to Jesus's teaching over anxious service. Yet Jesus's encounter with Martha following her brother Lazarus's death revealed profound theological growth, as she moved beyond service anxiety to articulate sophisticated christological faith: 'I believe that you are the Messiah, the Son of God, the one coming into the world,' and witnessed Christ's resurrection power demonstrated as Lazarus emerged from the tomb. Her presence at the dinner where Mary anointed Jesus with expensive perfume (likely her own perfume) suggests her transformation from service-anxiety to contemplative worship, alongside her sister's action, together expressing the balanced Christian life of action and contemplation.",
    keyEvents: ["Hosting Jesus in her home", "Complaint about Mary's inactivity", "Jesus's rebuke about priorities", "Lazarus's death and resurrection", "Witnessing Jesus's resurrection miracle"]
  },
  Lazarus: {
    name: "Lazarus",
    meaning: "God helps",
    era: "Life of Christ (c. 10-100 AD)",
    keyVerses: ["John 11:1-44", "John 12:1-3", "John 12:10-11"],
    description: "Lazarus of Bethany, brother of Martha and Mary, is most significant not for his life story but for his death and resurrection, through which Jesus demonstrated His power over death itself and foreshadowed His own resurrection three days later. The beloved friend whose illness prompted Jesus's delayed journey to Bethany—arriving after Lazarus had been dead four days—Lazarus became the focal point of Jesus's most prominent resurrection miracle and the sign that provoked the religious establishment's final conspiracy to eliminate Jesus. Jesus's command 'Lazarus, come out!' resulting in the wrapped, bound corpse emerging from the tomb alive declared Jesus's claim to be the resurrection and the life, embodying in concrete historical action the theological truth that Jesus possesses authority over the ultimate human enemy, death itself. Lazarus's post-resurrection existence—dining at Jesus's table while crowds gathered to see him—made him an unavoidable living testimony to Jesus's divine power that threatened religious authority's control, prompting plot against his life as well, establishing that resurrection faith necessarily provokes opposition from those committed to the old age's systems and patterns.",
    keyEvents: ["Illness prompting Jesus's journey", "Death and burial in tomb", "Resurrection through Jesus's command", "Dining with Jesus after resurrection", "Becoming testimony to Jesus's power"]
  },
  Rahab: {
    name: "Rahab",
    meaning: "Wide/spacious",
    era: "Conquest of Canaan (c. 1400-1370 BC)",
    keyVerses: ["Joshua 2:1-21", "Joshua 6:22-25", "Hebrews 11:31", "James 2:25"],
    description: "Rahab, a Canaanite prostitute in Jericho, becomes the unlikely instrument through whom God's redemptive purpose extended beyond Israel's covenant community, as her recognition of Israel's God and her protection of the Israelite spies transformed her into a venerated ancestor in David's lineage. Operating an inn on Jericho's wall, Rahab encountered Joshua's two spies and recognized something transcendent about Israel's God, confessing 'the Lord your God is God in heaven above and on earth below,' demonstrating faith that grasped God's sovereignty and Israel's assured victory despite human probability. Her deception of Jericho's authorities seeking the spies, coupled with her negotiation of a covenant ('kindness for kindness') ensuring her family's protection, demonstrated political acumen and survival instinct, yet Scripture interprets her actions through the lens of saving faith—Hebrews and James both cite her as exemplifying justified faith expressed through works. Her marriage to Salmon and motherhood of Boaz (Ruth's kinsman-redeemer and David's ancestor) incorporated her fully into Israel's community and covenant family, overcoming her former status as foreign prostitute through radical grace and faith, establishing her as a type of the believing Gentile welcomed into God's family through covenant faith.",
    keyEvents: ["Hosting of Israelite spies", "Protection and rescue of spies", "Covenant for family salvation", "Incorporation into Israel", "Marriage to Salmon and Boaz's birth"]
  },
  Samson: {
    name: "Samson",
    meaning: "Sun child/of the sun",
    era: "Judges (c. 1075-1050 BC)",
    keyVerses: ["Judges 13:3-5", "Judges 14:6", "Judges 16:28-30", "Hebrews 11:32"],
    description: "Samson, the last judge of Israel, represents the tragic paradox of supernatural gifting squandered through personal weakness and sensual indulgence, yet whose final redemptive action—pulling down Gaza's temple in suicidal judgment—accomplished more against Israel's Philistine oppressors than his entire preceding life. Separated to God from conception through the Nazarite vow—requiring abstinence from alcohol, haircuts, and unclean foods—Samson possessed supernatural strength demonstrating God's power to deliver Israel, tearing a lion apart barehanded and killing one thousand Philistines with a donkey's jawbone. Yet his personal life careened through selfish impulses, beginning with his illicit attraction to a Philistine woman, continuing through his riddle wager and subsequent rage-fueled vengeance cycles, until he fell in love with Delilah, whose determined seduction eventually revealed the secret of his strength. Captured, blinded, and imprisoned, Samson's final recorded prayer—requesting restoration of strength for one final act—initiated his redemptive death, as he positioned himself between Gaza's support pillars and toppled the structure, killing more Philistines in death than throughout his life, demonstrating that even compromised vessels can accomplish God's purposes through final submission and faith.",
    keyEvents: ["Supernatural strength demonstrations", "Marriage to Philistine woman", "Riddle wager and vengeance", "Seduction by Delilah", "Capture, blinding, and final redemptive act"]
  },
  Job: {
    name: "Job",
    meaning: "Persecuted/hated",
    era: "Patriarchs (date uncertain)",
    keyVerses: ["Job 1:1-3", "Job 1:20-21", "Job 42:1-6", "James 5:10-11"],
    description: "Job, the righteous man whose suffering became the focal point of Scripture's profoundest meditation on theodicy—why the innocent suffer—embodies the paradox of faithfulness tested through incomprehensible loss and pain that challenge every human understanding of divine justice and covenant faithfulness. Introduced as incomparably wealthy and righteous, Job suffered catastrophic losses through divine permission—the deaths of all his children and servants, loss of his herds and flocks, and his own affliction with painful boils covering his body—yet initially maintained faith through his famous affirmation: 'Naked came I from my mother's womb, and naked shall I return; the Lord gave and the Lord has taken away; blessed be the name of the Lord.' Yet as his suffering extended without apparent divine explanation, Job's faith wavered into protest and demands for God's justification, leading to extended dialogues with his friends who attempted to explain his suffering through conventional wisdom about sin and retribution. God's final response—delivered from the whirlwind and emphasizing divine incomprehensibility and cosmic scope beyond human understanding—reoriented Job's faith from intellectual justification toward trust in God's character despite inexplicable circumstances, with Job's restoration after his repentance establishing Scripture's paradoxical truth that suffering doesn't necessarily indicate divine disfavor and that faith persists through incomprehension.",
    keyEvents: ["Testing through loss of possessions and children", "Affliction with boils", "Dialogues with friends about suffering", "Theophany in the whirlwind", "Restoration and vindication"]
  },
  Ezekiel: {
    name: "Ezekiel",
    meaning: "God strengthens",
    era: "Exile (c. 595-570 BC)",
    keyVerses: ["Ezekiel 1:1-3", "Ezekiel 3:16-21", "Ezekiel 36:26-27", "Ezekiel 37:1-14"],
    description: "Ezekiel, a priest-prophet among the Babylonian exiles, stands as Scripture's most visionary and symbolically complex prophet, employing elaborate theatrical prophecies and cosmic visions to communicate God's judgment, exile's meaning, and ultimate restoration of Israel's spiritual heart. Transported to Babylon in King Jehoiachin's captivity, Ezekiel's inaugural vision—the incomprehensibly complex divine throne-chariot carried on wheels filled with eyes—established his prophetic authority and the astounding truth that God's presence accompanied Israel even in exile, overturning the assumption that Jerusalem's fall meant God's abandonment. His enacted prophecies—lying on his side for 390 days, binding his hair into bundles, eating defiled bread—communicated God's judgment with visceral intensity, while his more hopeful visions—Israel's future restoration, the river flowing from the temple watering the wasteland, the valley of dry bones rising to life—offered exiles hope beyond judgment. Ezekiel's vision of God's glory departing the temple (chapters 10-11) and later returning (chapter 43) framed Jerusalem's destruction as purposeful judgment rather than divine defeat, while his detailed plans for the restored temple expressed hope that exile held redemptive purpose and that God would reconstitute His people through spiritual renewal of their hearts, not merely external restoration.",
    keyEvents: ["Inaugural vision of divine throne-chariot", "Enacted prophecies of judgment", "Vision of God's glory departing temple", "Prophecies to exiles of restoration", "Vision of dry bones reviving"]
  },
  Nehemiah: {
    name: "Nehemiah",
    meaning: "Yahweh comforts",
    era: "Return & Restoration (c. 446-430 BC)",
    keyVerses: ["Nehemiah 1:4-11", "Nehemiah 2:17-18", "Nehemiah 8:1-8", "Nehemiah 13:14"],
    description: "Nehemiah, cupbearer to the Persian King Artaxerxes, became the practical administrator who rebuilt Jerusalem's walls and reinstituted covenant reform, exemplifying how political position can be leveraged for God's purposes and how material reconstruction serves spiritual renewal. Learning of Jerusalem's walls' desolation, Nehemiah's passionate prayer and fasting led to unprecedented access to the king, who granted him both permission and resources to return to Jerusalem and supervise restoration of the walls—a fifty-two-day project accomplished despite fierce opposition from surrounding peoples who perceived Jerusalem's restoration as threatening their regional interests. Nehemiah's leadership extended beyond construction to social and spiritual reform: addressing oppressive economic practices, redistributing ancestral lands, and orchestrating Ezra's public reading of the Torah before assembled Jerusalem crowds whose response—weeping with joy and remorse upon hearing God's law—demonstrated renewed covenant consciousness. His rigorous enforcement of covenant practices—prohibiting Sabbath commerce, preventing mixed marriages, confronting priests who abandoned their duties for personal gain—sometimes appears harsh, yet reflected his conviction that restored Jerusalem required not merely physical reconstruction but genuine spiritual transformation and alignment with God's law.",
    keyEvents: ["Learning of Jerusalem's wall desolation", "Securing royal permission and resources", "Rebuilding Jerusalem's walls", "Social and economic reform", "Covenant renewal under Ezra's leadership"]
  },
  Noah: {
    name: "Noah",
    meaning: "Rest/comfort/wandering",
    era: "Creation (c. 2948-2848 BC)",
    keyVerses: ["Genesis 6:8-9", "Genesis 7:1-5", "Hebrews 11:7", "1 Peter 3:20"],
    description: "Noah, the righteous man found faithful by God in a corruption-filled generation, became the instrument of God's judgment through the Flood and the vehicle of humanity's salvation through the Ark, standing as Scripture's preeminent example of covenant faithfulness maintained against cultural opposition and divine judgment. Described as 'righteous and blameless in his generation,' Noah walked with God in an era characterized by widespread violence and depravity, maintaining his integrity despite his culture's wholesale abandonment of righteousness, and his faith was validated when God revealed His judgment plan and commanded Noah to construct an Ark for his family's deliverance. Noah's obedience in building the massive Ark—the only way of escape for himself, his wife, his three sons, and their wives—despite lack of precedent for rain and apparent cultural ridicule, exemplified faithful obedience to God's revelation regardless of human reasonableness or social acceptance, an obedience that saved not only his family but ensured humanity's continuation and the fulfillment of God's post-Flood covenant establishing seasons, animal dominion, and the prohibition against murder. His post-Flood covenant role—serving as mediator of God's renewed covenant with humanity—and his later failures (drunkenness revealing his mortality despite his righteousness) establish him as a flawed yet faithful instrument through whom God preserved His purposes across the cataclysmic division between the old world and the post-Flood world.",
    keyEvents: ["Righteousness in corrupt generation", "Reception of building instructions for Ark", "Gathering of animals into Ark", "Survival of Flood with family", "Post-Flood covenant mediation"]
  }
};

