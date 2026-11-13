/**
 * Hand-authored selection for the subhāṣita pack, part 2: subhāṣitas, kāvya openings and stotra verses.
 * The Sanskrit TEXT is never typed here: `from` + `find` (an incipit used only to LOCATE the verse) point at a
 * corpus witness and ../gen-verses.ts copies the text from it. Authored here: selection, attribution (`work`, `ref`),
 * theme, level, the English translation (Samskuru's own wording) and optional padaccheda `words`.
 *
 * from: 'srb' = Subhāṣitaratnabhāṇḍāgāra (Devanagari e-text) · 'gretil:<file stem>' = GRETIL TEI (IAST → Devanagari)
 */
export interface OtherSpec {
  id: string;
  from: string;
  find: string;
  work: string;
  ref: string;
  theme: string;
  level: 2 | 3 | 4 | 5;
  translation: string;
  words?: string;
}

const HIT = 'gretil:nArAyaNa-hitopadeza';
const PANC = 'gretil:viSNuzarman-paJcatantra';
const MSS = 'gretil:mahAsubhASitasaMgraha-1-9979';
const MANU = 'gretil:manusmRti';
const BHARTR = 'gretil:bhatRhari-zatakatraya';
const W_HIT = 'हितोपदेशः';
const W_PANC = 'पञ्चतन्त्रम्';
const W_MSS = 'महासुभाषितसङ्ग्रहः';
const W_SRB = 'सुभाषितरत्नभाण्डागारम्';
const W_MANU = 'मनुस्मृतिः';
const W_NITI = 'नीतिशतकम्';
const W_VAIR = 'वैराग्यशतकम्';

export const OTHER_SPECS: OtherSpec[] = [
  // ---- anuṣṭubh subhāṣitas ---------------------------------------------------------------------------------
  { id: 'vidya-dadati-vinayam', from: HIT, find: 'vidyā dadāti vinayaṃ', work: W_HIT, ref: 'प्रस्ताविका 6', theme: 'vidyā', level: 2,
    translation: 'Learning gives humility; from humility one becomes worthy; from worthiness one gains wealth; from wealth comes right conduct, and from that, happiness.' },
  { id: 'udyamena-hi-sidhyanti', from: HIT, find: 'udyamena hi sidhyanti', work: W_HIT, ref: 'प्रस्ताविका 36', theme: 'udyama', level: 2,
    translation: 'Tasks are accomplished by effort, not by wishes alone. Deer do not walk into the mouth of a sleeping lion.' },
  { id: 'ayam-nijah-paro-veti', from: MSS, find: 'ayaṃ nijaḥ paro veti', work: W_HIT, ref: '1.71', theme: 'udāratā', level: 2,
    translation: '"This one is mine, that one is a stranger": such is the reckoning of the small-minded. For those of generous conduct the whole earth is one family.' },
  { id: 'kakah-krsnah-pikah-krsnah', from: 'srb', find: 'काकः कृष्णः पिकः कृष्णः', work: W_SRB, ref: 'व्योमचरान्योक्तयः 120', theme: 'guṇa', level: 2,
    translation: 'The crow is black and the cuckoo is black; what is the difference between cuckoo and crow? When spring arrives, the crow is a crow and the cuckoo a cuckoo.' },
  { id: 'satyam-bruyat-priyam-bruyat', from: MANU, find: 'satyaṃ brūyāt priyaṃ', work: W_MANU, ref: '4.138', theme: 'vāk', level: 3,
    translation: 'One should speak what is true and speak what is pleasant; one should not speak an unpleasant truth, nor a pleasant falsehood. This is the eternal dharma.' },
  { id: 'shaile-shaile-na-manikyam', from: 'srb', find: 'शैले शैले न माणिक्यं', work: W_SRB, ref: 'सामान्यनीतिः 183', theme: 'sajjana', level: 2,
    translation: 'There is not a ruby on every mountain, nor a pearl in every elephant. Good people are not found everywhere, nor sandalwood in every forest.' },
  { id: 'pustakastha-tu-ya-vidya', from: 'srb', find: 'पुस्तकस्था तु या विद्या', work: W_SRB, ref: 'सामान्यनीतिः 413', theme: 'vidyā', level: 2,
    translation: 'Knowledge that stays in a book and money that is in another\'s hand: when the time of need arises, that is neither knowledge nor money.' },
  { id: 'alasasya-kuto-vidya', from: MSS, find: 'alasasya kuto vidyā', work: W_MSS, ref: '3160', theme: 'udyama', level: 2,
    translation: 'How can a lazy person have learning? How can one without learning have wealth? How can one without wealth have a friend? And how can one without a friend have happiness?' },
  { id: 'vidvattvam-ca-nrpatvam-ca', from: PANC, find: 'vidvattvaṃ ca nṛpatvaṃ ca', work: W_PANC, ref: '2.58', theme: 'vidyā', level: 2,
    translation: 'Being learned and being a king are never equal. A king is honoured in his own country; a learned person is honoured everywhere.' },
  { id: 'ajaramaravat-prajno', from: HIT, find: 'ajarāmaravat prājño', work: W_HIT, ref: 'प्रस्ताविका 3', theme: 'vidyā', level: 3,
    translation: 'A wise person should pursue knowledge and wealth as if free from old age and death, and should practise dharma as if death had already seized him by the hair.' },
  { id: 'anekasamshayocchedi', from: HIT, find: 'anekasaṃśayocchedi', work: W_HIT, ref: 'प्रस्ताविका 10', theme: 'vidyā', level: 3,
    translation: 'It cuts through many doubts and shows what lies beyond sight. Learning is the eye of everyone; one who lacks it is truly blind.' },
  { id: 'kavyashastravinodena', from: HIT, find: 'kāvyaśāstravinodena', work: W_HIT, ref: '1.1', theme: 'vidyā', level: 2,
    translation: 'The wise pass their time in the enjoyment of poetry and learning; fools pass theirs in vice, in sleep or in quarrelling.' },
  { id: 'durjanah-parihartavyo', from: HIT, find: 'durjanaḥ parihartavyo', work: W_HIT, ref: '1.90', theme: 'durjana', level: 3,
    translation: 'A wicked person should be avoided even when adorned with learning. Is a snake not frightening even though it is adorned with a jewel?' },
  { id: 'dharma-eva-hato-hanti', from: MANU, find: 'dharma eva hato hanti', work: W_MANU, ref: '8.15', theme: 'dharma', level: 3,
    translation: 'Dharma, when destroyed, destroys; dharma, when protected, protects. Therefore dharma must not be destroyed, lest destroyed dharma destroy us.' },
  { id: 'yatra-naryas-tu-pujyante', from: MANU, find: 'yatra nāryas tu pūjyante', work: W_MANU, ref: '3.56', theme: 'dharma', level: 3,
    translation: 'Where women are honoured, there the gods rejoice. Where they are not honoured, all rites are fruitless.' },
  { id: 'tyajed-ekam-kulasyarthe', from: PANC, find: 'tyajed ekaṃ kulasyārthe grāmasyārthe kulaṃ tyajet grāmaṃ janapadasyārthe ātmārthe', work: W_PANC, ref: '3.83', theme: 'nīti', level: 3,
    translation: 'One should give up one person for the sake of the family, the family for the sake of the village, the village for the sake of the country, and the whole earth for the sake of the self.' },
  { id: 'arthanasham-manastapam', from: HIT, find: 'arthanāśaṃ manastāpaṃ', work: W_HIT, ref: '1.127', theme: 'nīti', level: 3,
    translation: 'A sensible person should not make known a loss of money, an anguish of mind, misconduct in the home, having been cheated, or having been insulted.' },
  { id: 'udaye-savita-rakto', from: 'srb', find: 'उदये सविता रक्तो', work: W_SRB, ref: 'सज्जनप्रशंसा 19', theme: 'sajjana', level: 2,
    translation: 'The sun is red at its rising and red also at its setting. In prosperity and in adversity the great remain the same.' },
  { id: 'chayam-anyasya-kurvanti', from: 'srb', find: 'छायामन्यस्य कुर्वन्ति', work: W_SRB, ref: 'वृक्षान्योक्तयः 4', theme: 'paropakāra', level: 2,
    translation: 'They give shade to others while they themselves stand in the heat, and even their fruits are for others. Trees are like good people.' },
  { id: 'ashtadashapuraneshu', from: MSS, find: 'aṣṭādaśapurāṇeṣu', work: W_MSS, ref: '3587', theme: 'paropakāra', level: 2,
    translation: 'In the eighteen Purāṇas, Vyāsa has two things to say: helping others leads to merit, and hurting others leads to sin.' },
  { id: 'upadesho-hi-murkhanam', from: PANC, find: 'upadeśo hi mūrkhāṇāṃ', work: W_PANC, ref: '1.420', theme: 'mūrkha', level: 3,
    translation: 'Advice given to fools makes them angry, not calm. Giving milk to snakes only increases their venom.' },
  { id: 'shad-doshah-purusheneha', from: 'srb', find: 'षड्दोषाः पुरुषेणेह', work: W_HIT, ref: '1.34', theme: 'udyama', level: 3,
    translation: 'A person who wants to prosper in this world must give up six faults: sleep, drowsiness, fear, anger, laziness and procrastination.' },
  { id: 'rupayauvanasampanna', from: HIT, find: 'rūpayauvanasampannā', work: W_HIT, ref: 'प्रस्ताविका 38', theme: 'vidyā', level: 3,
    translation: 'Though endowed with beauty and youth and born in a great family, those without learning do not shine, like kiṃśuka flowers that have no scent.' },
  { id: 'yatha-hy-ekena-cakrena', from: HIT, find: 'yathā hy ekena cakreṇa', work: W_HIT, ref: 'प्रस्ताविका 30', theme: 'udyama', level: 3,
    translation: 'Just as a chariot cannot move on a single wheel, so fate does not succeed without human effort.' },
  { id: 'hastasya-bhushanam-danam', from: 'srb', find: 'हस्तस्य भूषणं दानं', work: W_SRB, ref: 'सामान्यनीतिः 291', theme: 'dāna', level: 2,
    translation: 'Giving is the ornament of the hand, truth the ornament of the throat, and sacred learning the ornament of the ear. What need is there of other ornaments?' },
  { id: 'sarpah-krurah-khalah-krurah', from: 'srb', find: 'सर्पः क्रूरः खलः क्रूरः', work: W_SRB, ref: 'दुर्जननिन्दा 33', theme: 'durjana', level: 2,
    translation: 'A snake is cruel and a wicked person is cruel, but the wicked person is crueller than the snake. A snake can be calmed by a spell; a wicked person is never calmed.' },
  { id: 'priyavakyapradanena', from: 'srb', find: 'प्रियवाक्यप्रदानेन', work: W_SRB, ref: 'सामान्यनीतिः 83', theme: 'vāk', level: 2,
    translation: 'All creatures are pleased by the gift of kind words. Therefore that is what one should speak. Why be poor in words?' },
  { id: 'vagarthav-iva-samprktau', from: 'gretil:kAlidAsa-raghuvaMza', find: 'vāgarthāv iva saṃpṛktau', work: 'रघुवंशम्', ref: '1.1', theme: 'maṅgala', level: 3,
    translation: 'For the right understanding of word and meaning, I bow to Pārvatī and the Supreme Lord, the parents of the world, who are united like word and meaning.' },
  { id: 'kva-suryaprabhavo-vamshah', from: 'gretil:kAlidAsa-raghuvaMza', find: 'kva sūryaprabhavo vaṃśaḥ', work: 'रघुवंशम्', ref: '1.2', theme: 'vinaya', level: 4,
    translation: 'How great the dynasty sprung from the Sun, and how limited my understanding! In my folly I wish to cross an ocean that is hard to cross on a small raft.' },
  { id: 'akrtva-parasantapam', from: MSS, find: 'akṛtvā parasantāpam', work: W_MSS, ref: '108', theme: 'santoṣa', level: 3,
    translation: 'Without causing pain to others, without bowing to the wicked and without leaving the path of the good: even a little gained in this way is a great deal.' },
  { id: 'yatha-khanan-khanitrena', from: MANU, find: 'yathā khanan khanitreṇa', work: W_MANU, ref: '2.218', theme: 'guru', level: 3,
    translation: 'As a man who digs with a spade reaches water, so one who serves the teacher attentively reaches the knowledge that lies in the teacher.' },
  { id: 'daridran-bhara-kaunteya', from: HIT, find: 'daridrān bhara kaunteya', work: W_HIT, ref: '1.15', theme: 'dāna', level: 3,
    translation: 'Support the poor, O son of Kuntī; do not give wealth to one who is already rich. Medicine is good for the sick; what use is medicine to one who is healthy?' },
  { id: 'ko-tibharah-samarthanam', from: PANC, find: "ko 'tibhāraḥ samarthānāṃ", work: W_PANC, ref: '2.57', theme: 'udyama', level: 3,
    translation: 'What burden is too heavy for the capable? What is far for the enterprising? What country is foreign to the learned? Who is a stranger to those who speak kindly?' },
  { id: 'alpanam-api-vastunam', from: HIT, find: 'alpānām api vastūnāṃ', work: W_HIT, ref: '1.35', theme: 'saṅgha', level: 3,
    translation: 'Even small things, when joined together, accomplish a task. Rutting elephants are bound by blades of grass twisted into a rope.' },
  { id: 'amantram-aksharam-nasti', from: MSS, find: 'amantram akṣaraṃ nāsti', work: W_MSS, ref: '2423', theme: 'guṇa', level: 3,
    translation: 'There is no syllable that is not a sacred formula, no root that is not a medicine, and no person who is unfit. What is rare is someone who can bring them into use.' },
  { id: 'lalayet-panca-varshani', from: 'gretil:garuDapurANa', find: 'lālayet pañca varṣāṇi', work: W_SRB, ref: 'सामान्यनीतिः 308', theme: 'nīti', level: 3,
    translation: 'One should fondle a son for five years and discipline him for ten. When he has reached his sixteenth year, one should treat a son as a friend.' },
  { id: 'vajrad-api-kathorani', from: 'srb', find: 'वज्रादपि कठोराणि', work: W_SRB, ref: 'सज्जनप्रशंसा 4', theme: 'sajjana', level: 4,
    translation: 'Harder than diamond and softer than a flower: who is able to understand the minds of those who are above the ordinary?' },
  { id: 'mata-shatruh-pita-vairi', from: 'srb', find: 'माता शत्रुः पिता वैरी', work: W_HIT, ref: 'प्रस्ताविका 37', theme: 'vidyā', level: 2,
    translation: 'A mother is an enemy and a father a foe if they have not had their child educated. Such a child does not shine in an assembly, like a heron among swans.' },
  { id: 'ko-rthah-putrena-jatena', from: HIT, find: "ko 'rthaḥ putreṇa jātena", work: W_HIT, ref: 'प्रस्ताविका 12', theme: 'vidyā', level: 3,
    translation: 'What is the use of a son being born who is neither learned nor virtuous? What is the use of a blind eye? Such an eye is only a source of pain.' },
  { id: 'abhivadanashilasya', from: MSS, find: 'abhivādanaśīlasya', work: W_MSS, ref: '2336', theme: 'vinaya', level: 3,
    translation: 'For one who habitually greets elders respectfully and always serves the aged, four things grow: length of life, wisdom, fame and strength.' },
  { id: 'na-kashcit-kasyacin-mitram', from: HIT, find: 'na kaścit kasyacin mitraṃ', work: W_HIT, ref: '1.72', theme: 'mitra', level: 3,
    translation: 'No one is anyone\'s friend, and no one is anyone\'s enemy. Friends and enemies alike are made by conduct.' },
  { id: 'shruyatam-dharmasarvasvam', from: PANC, find: 'śrūyatāṃ dharmasarvasvaṃ', work: W_PANC, ref: '3.104', theme: 'dharma', level: 3,
    translation: 'Listen to the essence of dharma, and having heard it, hold it fast: do not do to others what is disagreeable to yourself.' },
  // ---- longer metres -------------------------------------------------------------------------------------
  { id: 'paropakaraya-phalanti-vrkshah', from: 'srb', find: 'परोपकाराय फलन्ति वृक्षाः', work: W_SRB, ref: 'परोपकारप्रशंसा 10', theme: 'paropakāra', level: 2,
    translation: 'Trees bear fruit for the good of others; rivers flow for the good of others; cows give milk for the good of others. This body, too, is meant for the good of others.' },
  { id: 'ya-kundendu-tushara-hara-dhavala', from: 'srb', find: 'या कुन्देन्दुतुषारहारधवला', work: W_SRB, ref: 'सरस्वती 13', theme: 'stuti', level: 4,
    translation: 'She who is white as jasmine, the moon and a garland of snow, who is clothed in white, whose hands are adorned by the fine staff of the vīṇā, who is seated on a white lotus, who is always praised by Brahmā, Viṣṇu, Śiva and the other gods: may that blessed Sarasvatī, who removes all dullness without remainder, protect me.' },
  { id: 'na-corahaaryam-na-ca-rajaharyam', from: 'srb', find: 'न चोरहार्यं न च राजहार्यं', work: W_SRB, ref: 'विद्याप्रशंसा 13', theme: 'vidyā', level: 3,
    translation: 'It cannot be stolen by thieves or seized by kings; it is not divided among brothers and it is no burden to carry. When spent it only ever grows. The wealth of learning is the chief of all wealth.' },
  { id: 'yesham-na-vidya-na-tapo-na-danam', from: BHARTR, find: 'yeṣāṃ na vidyā na tapo na dānaṃ', work: W_NITI, ref: '13', theme: 'vidyā', level: 3,
    translation: 'Those who have neither learning nor austerity nor generosity, neither knowledge nor good character nor virtue nor dharma, are a burden on the earth in this mortal world: they roam about as beasts in human form.' },
  { id: 'sahitya-sangita-kala-vihinah', from: BHARTR, find: 'sāhityasaṅgītakalāvihīnaḥ', work: W_NITI, ref: '12', theme: 'kalā', level: 3,
    translation: 'A person without literature, music or art is plainly an animal without tail or horns. That he lives without eating grass is the great good fortune of the animals.' },
  { id: 'keyurani-na-bhushayanti', from: BHARTR, find: 'keyūrāṇi na bhūṣayanti', work: W_NITI, ref: '19', theme: 'vāk', level: 4,
    translation: 'Armlets do not adorn a person, nor necklaces bright as the moon, nor bathing, nor ointments, nor flowers, nor well-dressed hair. Cultivated speech alone truly adorns a person. All other ornaments wear away; the ornament of speech is the lasting ornament.' },
  { id: 'arambha-gurvi-kshayini-kramena', from: BHARTR, find: 'ārambhagurvī kṣayiṇī krameṇa', work: W_NITI, ref: '60', theme: 'mitra', level: 4,
    translation: 'Large at first and gradually shrinking, or small at first and afterwards growing: like the shadow in the first and the second half of the day, such are the friendships of the wicked and of the good.' },
  { id: 'jadyam-dhiyo-harati', from: BHARTR, find: 'jāḍyaṃ dhiyo harati', work: W_NITI, ref: '23', theme: 'satsaṅga', level: 4,
    translation: 'It takes away dullness of mind, pours truth into speech, leads to the height of honour, drives away sin, makes the heart clear and spreads fame in every direction. Tell me, what does the company of the good not do for people?' },
  { id: 'manasi-vacasi-kaye', from: 'srb', find: 'मनसि वचसि काये', work: W_NITI, ref: '79', theme: 'sajjana', level: 5,
    translation: 'Filled with the nectar of goodness in thought, word and body, gladdening the three worlds with a stream of kindnesses, always making mountains of the atom-sized virtues of others and rejoicing in their own hearts: how many such good people are there?' },
  { id: 'papan-nivarayati', from: BHARTR, find: 'pāpān nivārayati', work: W_NITI, ref: '73', theme: 'mitra', level: 4,
    translation: 'He keeps you from wrongdoing and urges you towards what is good; he hides what should be hidden and makes your virtues known; he does not abandon you in misfortune and gives when the time calls for it. The good declare this to be the mark of a true friend.' },
  { id: 'udyoginam-purushasimham', from: HIT, find: 'udyoginaṃ puruṣasiṃham', work: W_HIT, ref: 'प्रस्ताविका 33', theme: 'udyama', level: 4,
    translation: 'Fortune comes to the lion among men who exerts himself; it is cowards who say, "Fate must give it." Strike fate down and show your manhood with all your strength. If you have made the effort and still do not succeed, where is the fault?' },
  { id: 'asty-uttarasyam-dishi', from: 'gretil:kAlidAsa-kumArasaMbhava', find: 'asty uttarasyāṃ diśi', work: 'कुमारसम्भवम्', ref: '1.1', theme: 'kāvya', level: 4,
    translation: 'In the northern quarter there is a king of mountains named Himālaya, divine in nature, who, plunging into the eastern and the western oceans, stands like a measuring rod of the earth.' },
  { id: 'kashcit-kanta-viraha-guruna', from: 'gretil:kAlidAsa-meghadUta-edkale', find: 'kaś cit kāntāvirahaguruṇā', work: 'मेघदूतम्', ref: '1.1', theme: 'kāvya', level: 5,
    translation: 'A certain yakṣa, who had been careless in his duty, lost his powers through his master\'s curse, which was heavy to bear because it parted him from his beloved and had to be endured for a year. He made his dwelling in the hermitages of Rāmagiri, where the waters were hallowed by the bathing of Janaka\'s daughter and the trees gave deep shade.' },
  { id: 'ya-srshtih-srashtur-adya', from: 'gretil:kAlidAsa-abhijJAnazakuntala', find: 'yā sṛṣṭiḥ sraṣṭur ādyā', work: 'अभिज्ञानशाकुन्तलम्', ref: '1.1', theme: 'maṅgala', level: 5,
    translation: 'That which is the Creator\'s first creation (water); that which carries the offering made according to rule (fire); that which is the offerer (the sacrificer); the two that fix the time (sun and moon); that which has sound as its quality and pervades all (ether); that which they call the source of all seeds (earth); and that by which living beings have breath (air): may the Lord, endowed with these eight visible forms, protect you.' },
  { id: 'adityasya-gatagatair', from: BHARTR, find: 'ādityasya gatāgatair', work: W_VAIR, ref: '43', theme: 'kāla', level: 5,
    translation: 'With the rising and setting of the sun, life wears away day by day. Under the weight of many tasks and occupations the passing of time is not even noticed. Seeing birth, old age, misfortune and death, no fear arises. The world has drunk the wine of carelessness, made of delusion, and has gone mad.' },
  { id: 'bhoga-na-bhukta-vayam-eva-bhuktah', from: BHARTR, find: 'bhogā na bhuktā vayam eva', work: W_VAIR, ref: '7', theme: 'vairāgya', level: 4,
    translation: 'We did not consume pleasures; we ourselves were consumed. We did not practise austerity; we ourselves were scorched. Time did not pass; we ourselves passed away. Desire did not grow old; we ourselves grew old.' },
  { id: 'arthagamo-nityam-arogita-ca', from: MSS, find: 'arthāgamo nityam arogitā ca', work: W_HIT, ref: 'प्रस्ताविका 20', theme: 'sukha', level: 4,
    translation: 'A steady income, constant good health, a wife who is dear and speaks kindly, an obedient son, and learning that earns a living: these six, O king, are the joys of the world of the living.' },
  { id: 'guna-gunajneshu-guna-bhavanti', from: HIT, find: 'guṇā guṇajñeṣu guṇā bhavanti', work: W_HIT, ref: 'प्रस्ताविका 46', theme: 'guṇa', level: 4,
    translation: 'Virtues are virtues among those who recognise virtue; reaching a person without virtue they turn into faults. Rivers flow with sweet water, but on reaching the sea they become undrinkable.' },
  { id: 'bhavanti-namras-taravah', from: 'srb', find: 'भवन्ति नम्रास्तरवः', work: W_SRB, ref: 'परोपकारप्रशंसा 11', theme: 'paropakāra', level: 4,
    translation: 'Trees bend low when their fruit appears; clouds hang very low with their fresh water; good people are not made proud by riches. This is simply the nature of those who help others.' },
  { id: 'eko-devah-keshavo-va-shivo-va', from: BHARTR, find: 'eko devaḥ keśavo vā', work: W_NITI, ref: '69', theme: 'vairāgya', level: 4,
    translation: 'One god, whether Keśava or Śiva; one friend, whether a king or an ascetic; one dwelling, whether in a city or in a forest; one wife, whether a beautiful woman or a cave.' },
  { id: 'shrivallabheti-varadeti', from: 'gretil:kulazekhara-mukundamAlA', find: 'śrīvallabheti varadeti', work: 'मुकुन्दमाला', ref: '1', theme: 'bhakti', level: 5,
    translation: '"Beloved of Śrī", "Giver of boons", "Compassionate one", "Lover of your devotees", "Skilled in cutting off rebirth", "Lord", "You who rest on the serpent", "Abode of the world": make me one who utters such words every day, O Mukunda.' },
  { id: 'vipadi-dhairyam-athabhyudaye-kshama', from: 'gretil:vidyAkara-subhASitaratnakoza', find: 'vipadi dhairyam athābhyudaye kṣamā', work: 'सुभाषितरत्नकोशः', ref: '1225', theme: 'sajjana', level: 4,
    translation: 'Courage in misfortune and forbearance in success, eloquence in the assembly and valour in battle, delight in good repute and devotion to sacred learning: these come naturally to the great-souled.' },
  { id: 'shrotram-shrutenaiva-na-kundalena', from: 'srb', find: 'श्रोत्रं श्रुतेनैव न कुण्डलेन', work: W_SRB, ref: 'परोपकारप्रशंसा 12', theme: 'paropakāra', level: 4,
    translation: 'The ear shines by sacred learning, not by an earring; the hand by giving, not by a bracelet; and the body of good people shines by helping others, not by sandal paste.' },
  { id: 'prarabhyate-na-khalu-vighnabhayena', from: PANC, find: 'prārabhyate na khalu', work: W_PANC, ref: '3.244', theme: 'udyama', level: 4,
    translation: 'The low do not begin at all for fear of obstacles; the middling begin and stop when obstacles strike; but those of the highest quality, though struck by obstacles a thousand times over, do not give up what they have begun.' },
  { id: 'mahimnah-param-te', from: 'gretil:zivamahimnastava', find: 'mahimnaḥ pāraṃ te', work: 'शिवमहिम्नःस्तोत्रम्', ref: '1', theme: 'stuti', level: 5,
    translation: 'If praise of you by one who does not know the farthest limit of your greatness is unfitting, then even the words of Brahmā and the other gods fall short before you. And so, if no one who praises you to the limit of his own understanding is to be blamed, then my attempt at a hymn, too, O Hara, is beyond reproach.' },
];

/** Padaccheda word lists ("पदम्=gloss|…"), keyed by verse id; accepted only if they re-join to the corpus text. */
export const OTHER_WORDS: Record<string, string> = {
  'vidya-dadati-vinayam': 'विद्या=learning|ददाति=gives|विनयम्=humility|विनयात्=from humility|याति=one reaches|पात्रताम्=worthiness|पात्रत्वात्=from worthiness|धनम्=wealth|आप्नोति=one obtains|धनात्=from wealth|धर्मम्=dharma, right conduct|ततः=from that|सुखम्=happiness',
  'udyamena-hi-sidhyanti': 'उद्यमेन=by effort|हि=indeed|सिध्यन्ति=succeed|कार्याणि=tasks|न=not|मनोरथैः=by wishes|न=not|हि=indeed|सुप्तस्य=of a sleeping|सिंहस्य=lion|प्रविशन्ति=enter|मुखे=into the mouth|मृगाः=deer',
  'ayam-nijah-paro-veti': 'अयम्=this one|निजः=one\'s own|परः=a stranger|वा=or|इति=thus|गणना=reckoning|लघुचेतसाम्=of the small-minded|उदारचरितानाम्=of those of generous conduct|तु=but|वसुधा=the earth|एव=itself|कुटुम्बकम्=a family',
  'kakah-krsnah-pikah-krsnah': 'काकः=the crow|कृष्णः=black|पिकः=the cuckoo|कृष्णः=black|कः=what|भेदः=difference|पिककाकयोः=between cuckoo and crow|वसन्तसमये=when the spring season|प्राप्ते=has arrived|काकः=the crow|काकः=(is) a crow|पिकः=the cuckoo|पिकः=(is) a cuckoo',
  'satyam-bruyat-priyam-bruyat': 'सत्यम्=what is true|ब्रूयात्=one should speak|प्रियम्=what is pleasant|ब्रूयात्=one should speak|न=not|ब्रूयात्=one should speak|सत्यम्=a truth|अप्रियम्=unpleasant|प्रियम्=pleasant|च=and|न=not|अनृतम्=an untruth|ब्रूयात्=one should speak|एषः=this|धर्मः=dharma|सनातनः=eternal',
  'shaile-shaile-na-manikyam': 'शैले=on a mountain|शैले=on every mountain|न=not|माणिक्यम्=a ruby|मौक्तिकम्=a pearl|न=not|गजे=in an elephant|गजे=in every elephant|साधवः=good people|न=not|हि=indeed|सर्वत्र=everywhere|चन्दनम्=sandalwood|न=not|वने=in a forest|वने=in every forest',
  'pustakastha-tu-ya-vidya': 'पुस्तकस्था=staying in a book|तु=but|या=which|विद्या=knowledge|परहस्तगतम्=gone into another\'s hand|धनम्=money|कार्यकाले=when the time for action|समुत्पन्ने=has arisen|न=not|सा=that|विद्या=knowledge|न=not|तत्=that|धनम्=money',
  'alasasya-kuto-vidya': 'अलसस्य=of a lazy person|कुतः=whence?|विद्या=learning|अविद्यस्य=of one without learning|कुतः=whence?|धनम्=wealth|अधनस्य=of one without wealth|कुतः=whence?|मित्रम्=a friend|अमित्रस्य=of one without a friend|कुतः=whence?|सुखम्=happiness',
  'vidvattvam-ca-nrpatvam-ca': 'विद्वत्त्वम्=being learned|च=and|नृपत्वम्=being a king|च=and|न=not|एव=at all|तुल्यम्=equal|कदाचन=ever|स्वदेशे=in his own country|पूज्यते=is honoured|राजा=a king|विद्वान्=a learned person|सर्वत्र=everywhere|पूज्यते=is honoured',
  'kavyashastravinodena': 'काव्यशास्त्रविनोदेन=with the enjoyment of poetry and learning|कालः=time|गच्छति=passes|धीमताम्=of the wise|व्यसनेन=with vice|तु=but|मूर्खाणाम्=of fools|निद्रया=with sleep|कलहेन=with quarrelling|वा=or',
  'dharma-eva-hato-hanti': 'धर्मः=dharma|एव=itself|हतः=destroyed|हन्ति=destroys|धर्मः=dharma|रक्षति=protects|रक्षितः=protected|तस्मात्=therefore|धर्मः=dharma|न=not|हन्तव्यः=to be destroyed|मा=lest|नः=us|धर्मः=dharma|हतः=destroyed|अवधीत्=should destroy',
  'yatra-naryas-tu-pujyante': 'यत्र=where|नार्यः=women|तु=indeed|पूज्यन्ते=are honoured|रमन्ते=rejoice|तत्र=there|देवताः=the gods|यत्र=where|एताः=these|तु=but|न=not|पूज्यन्ते=are honoured|सर्वाः=all|तत्र=there|अफलाः=fruitless|क्रियाः=rites',
  'udaye-savita-rakto': 'उदये=at rising|सविता=the sun|रक्तः=red|रक्तः=red|च=and|अस्तमये=at setting|तथा=likewise|सम्पत्तौ=in prosperity|च=and|विपत्तौ=in adversity|च=and|महताम्=of the great|एकरूपता=sameness of form',
  'chayam-anyasya-kurvanti': 'छायाम्=shade|अन्यस्य=for another|कुर्वन्ति=they make|तिष्ठन्ति=they stand|स्वयम्=themselves|आतपे=in the heat|फलानि=fruits|अपि=even|परार्थाय=for the sake of others|वृक्षाः=trees|सत्पुरुषाः=good people|इव=like',
  'ashtadashapuraneshu': 'अष्टादशपुराणेषु=in the eighteen Purāṇas|व्यासस्य=of Vyāsa|वचनद्वयम्=a pair of statements|परोपकारः=helping others|पुण्याय=for merit|पापाय=for sin|परपीडनम्=hurting others',
  'hastasya-bhushanam-danam': 'हस्तस्य=of the hand|भूषणम्=the ornament|दानम्=giving|सत्यम्=truth|कण्ठस्य=of the throat|भूषणम्=the ornament|श्रोत्रस्य=of the ear|भूषणम्=the ornament|शास्त्रम्=sacred learning|भूषणे=in an ornament|किम्=what|प्रयोजनम्=use',
  'priyavakyapradanena': 'प्रियवाक्यप्रदानेन=by the giving of kind words|सर्वे=all|तुष्यन्ति=are pleased|जन्तवः=creatures|तस्मात्=therefore|तत्=that|एव=alone|वक्तव्यम्=should be spoken|वचने=in speech|का=what|दरिद्रता=poverty',
  'vagarthav-iva-samprktau': 'वागर्थौ=word and meaning|इव=like|सम्पृक्तौ=united|वागर्थप्रतिपत्तये=for the understanding of word and meaning|जगतः=of the world|पितरौ=the two parents|वन्दे=I bow to|पार्वतीपरमेश्वरौ=Pārvatī and the Supreme Lord',
  'paropakaraya-phalanti-vrkshah': 'परोपकाराय=for the good of others|फलन्ति=bear fruit|वृक्षाः=trees|परोपकाराय=for the good of others|वहन्ति=flow|नद्यः=rivers|परोपकाराय=for the good of others|दुहन्ति=give milk|गावः=cows|परोपकारार्थम्=for the sake of helping others|इदम्=this|शरीरम्=body',
  'mata-shatruh-pita-vairi': 'माता=the mother|शत्रुः=an enemy|पिता=the father|वैरी=a foe|येन=by whom|बालः=the child|न=not|पाठितः=educated|न=not|शोभते=shines|सभामध्ये=in the midst of an assembly|हंसमध्ये=among swans|बकः=a heron|यथा=like',
  'sarpah-krurah-khalah-krurah': 'सर्पः=a snake|क्रूरः=cruel|खलः=a wicked person|क्रूरः=cruel|सर्पात्=than a snake|क्रूरतरः=crueller|खलः=the wicked person|मन्त्रेण=by a spell|शाम्यते=is calmed|सर्पः=a snake|न=not|खलः=a wicked person|शाम्यते=is calmed|कदा=ever',
  'upadesho-hi-murkhanam': 'उपदेशः=advice|हि=indeed|मूर्खाणाम्=to fools|प्रकोपाय=for anger|न=not|शान्तये=for calm|पयःपानम्=the drinking of milk|भुजङ्गानाम्=of snakes|केवलम्=only|विषवर्धनम्=an increase of venom',
  'amantram-aksharam-nasti': 'अमन्त्रम्=not a sacred formula|अक्षरम्=a syllable|न=not|अस्ति=is|न=not|अस्ति=is|मूलम्=a root|अनौषधम्=not a medicine|अयोग्यः=unfit|पुरुषः=a person|न=not|अस्ति=is|योजकः=one who puts to use|तत्र=there|दुर्लभः=hard to find',
  'shruyatam-dharmasarvasvam': 'श्रूयताम्=let it be heard|धर्मसर्वस्वम्=the whole essence of dharma|श्रुत्वा=having heard|च=and|एव=indeed|अवधार्यताम्=let it be held fast|आत्मनः=to oneself|प्रतिकूलानि=things disagreeable|परेषाम्=to others|न=not|समाचरेत्=one should do',
};
