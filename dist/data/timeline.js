const BIBLE_TIMELINE = [
  {
    era: "Creation",
    dates: "c. 4004-2948 BC (traditional chronology)",
    description: "The primordial age of cosmic creation when God fashioned the heavens and earth, established humanity in His image, and set the trajectory of redemption through covenant relationship. The era encompasses creation itself, humanity's initial innocence, the fall into sin, and the primeval history from Adam through Noah.",
    keyFigures: ["Adam", "Eve", "Noah", "Abel", "Enoch"],
    color: "#1a1a1a"
  },
  {
    era: "Patriarchs",
    dates: "c. 2100-1500 BC",
    description: "The era of the patriarchs when God initiated covenant relationship through Abraham, establishing the promise of descendants, land, and blessing that would define Israel's redemptive story. The patriarchal period encompasses Abraham's migration, Isaac's lineage, Jacob's transformative encounters, and Joseph's elevation in Egypt.",
    keyFigures: ["Abraham", "Isaac", "Jacob", "Joseph", "Sarah", "Rebecca", "Rachel", "Leah"],
    color: "#8B4513"
  },
  {
    era: "Exodus & Wilderness",
    dates: "c. 1450-1410 BC (early dating) or c. 1290-1250 BC (late dating)",
    description: "The era of Israel's deliverance from Egyptian slavery through Moses's mediation, God's revelation at Sinai, and forty years of wilderness discipline that formed Israel into a covenant community. This period established the Torah, the priesthood, the tabernacle, and the foundational practices that would characterize Israel's religious life.",
    keyFigures: ["Moses", "Aaron", "Joshua", "Miriam", "Pharaoh", "God's pillar of cloud and fire"],
    color: "#D4AF37"
  },
  {
    era: "Conquest of Canaan",
    dates: "c. 1400-1370 BC (early dating) or c. 1250-1220 BC (late dating)",
    description: "The era when Joshua led Israel across the Jordan River to possess the land promised to Abraham, establishing Israelite settlement through military campaign and tribal allocation. This period demonstrates God's faithfulness in fulfilling covenant promises while establishing Israel as an occupying nation in the ancient world.",
    keyFigures: ["Joshua", "Rahab", "Caleb", "Gideon", "Various Canaanite kings"],
    color: "#FF6347"
  },
  {
    era: "Judges",
    dates: "c. 1370-1050 BC",
    description: "The era of tribal independence when judge-leaders rose to deliver Israel from oppression while establishing the pattern of apostasy-judgment-repentance-deliverance that characterized Israel's covenant relationship. This period reveals Israel's chronic unfaithfulness alternating with God's persistent mercy, setting the stage for monarchy.",
    keyFigures: ["Samson", "Gideon", "Deborah", "Barak", "Jephthah", "Samuel", "Eli"],
    color: "#228B22"
  },
  {
    era: "United Kingdom",
    dates: "c. 1050-930 BC",
    description: "The era of Israel's greatest territorial expansion and political power under David and Solomon, when the nation achieved international prominence and constructed the Temple. This period established Jerusalem as Israel's religious capital and created the political structures that would define Israel until the Babylonian exile.",
    keyFigures: ["Saul", "David", "Solomon", "Nathan the prophet", "Bathsheba", "Absalom"],
    color: "#4169E1"
  },
  {
    era: "Divided Kingdom",
    dates: "c. 930-722 BC (Northern Kingdom) and c. 930-586 BC (Southern Kingdom)",
    description: "The era following Solomon's death when the kingdom split into Israel (north) and Judah (south), with both nations pursuing idolatry despite prophetic warnings, ultimately leading to Assyrian conquest of Israel and various threats against Judah. This period features the classical prophets Elijah, Elisha, Amos, and Hosea confronting systemic injustice and spiritual apostasy.",
    keyFigures: ["Jeroboam I", "Rehoboam", "Ahab", "Jezebel", "Elijah", "Elisha", "Amos", "Hosea", "Isaiah", "Hezekiah"],
    color: "#FF8C00"
  },
  {
    era: "Exile",
    dates: "c. 722-539 BC",
    description: "The era of judgment when Assyria destroyed the northern kingdom (722 BC) and Babylon destroyed Jerusalem and the Temple (586 BC), taking Judeans into forced diaspora. This period of displacement paradoxically produced deep theological reflection, synagogue worship, and prophetic literature emphasizing restoration and redemptive purpose within judgment.",
    keyFigures: ["Jeremiah", "Ezekiel", "Daniel", "Nebuchadnezzar", "Cyrus of Persia", "Judean exiles"],
    color: "#800000"
  },
  {
    era: "Return & Restoration",
    dates: "c. 539-400 BC",
    description: "The era following Cyrus's decree permitting Jewish return from Babylon, when the Temple was rebuilt, the Torah was publicly read by Ezra, and Judea's walls were reconstructed under Nehemiah. This period reestablished Jewish community identity and covenant practices, though without political independence under foreign rule.",
    keyFigures: ["Cyrus of Persia", "Zerubbabel", "Ezra", "Nehemiah", "Haggai", "Zechariah", "Malachi"],
    color: "#9932CC"
  },
  {
    era: "Intertestamental Period",
    dates: "c. 400-4 BC",
    description: "The era between the Old and New Testaments when Jewish communities developed rabbinic traditions, apocalyptic expectations, and various theological interpretations despite continued foreign rule under Persian, Greek, and Roman overlords. This period witnessed the translation of Hebrew scriptures into Greek (Septuagint), development of Pharisaic and Sadducean movements, and intensifying messianic expectations.",
    keyFigures: ["Hasmonean rulers", "John Hyrcanus", "Alexandra Salome", "Herod the Great", "Pharisees", "Sadducees"],
    color: "#6A5ACD"
  },
  {
    era: "Life of Christ",
    dates: "c. 4 BC-30 AD",
    description: "The era when God became incarnate in Jesus of Nazareth, who proclaimed God's kingdom, performed miraculous signs, died vicariously for humanity's sin, and rose triumphantly from the dead, establishing the foundation for Christianity. This period encompasses Jesus's birth, ministry, crucifixion, resurrection, and post-resurrection appearances that validated his claims and inaugurated the New Covenant age.",
    keyFigures: ["Jesus", "Mary", "Joseph", "John the Baptist", "The Twelve apostles", "Mary Magdalene", "Pilate"],
    color: "#DC143C"
  },
  {
    era: "Early Church",
    dates: "c. 30-100 AD",
    description: "The era following Jesus's ascension when the Holy Spirit empowered the apostles at Pentecost to proclaim the risen Christ, establish churches throughout the Mediterranean world, and navigate the crucial transition from Jewish sect to gentile-inclusive movement. This period witnessed explosive gospel growth despite persecution, the writing of New Testament epistles, and the spread of Christianity from Jerusalem to Rome.",
    keyFigures: ["Peter", "Paul", "John", "James", "Stephen", "Barnabas", "Timothy", "Priscilla and Aquila"],
    color: "#20B2AA"
  },
  {
    era: "Letters & Revelation",
    dates: "c. 50-100 AD",
    description: "The era when the apostles addressed specific churches through letters confronting false doctrine, encouraging persecuted communities, and developing theological understanding of Christ and the church. This period includes Paul's epistles, the Gospels' composition, Hebrews, James, 1 and 2 Peter, John's epistles, and the Apocalypse's visionary revelation of Christ's ultimate triumph.",
    keyFigures: ["Paul", "Peter", "John", "James", "Jude", "Unknown epistle authors", "John of Patmos"],
    color: "#FFD700"
  }
];

// ===== READING PLANS =====
