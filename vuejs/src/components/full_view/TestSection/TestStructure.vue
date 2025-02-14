
<template lang="pug">
div
    v-progress-linear(v-if="test.loading.structure" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")
    v-card()
        v-tabs(v-model="selected_test_source_local")
            v-tab(value="gpt") AI
            v-tab(value="pdf") PDF's
        v-card-text
            v-tabs-window(v-model="selected_test_source_local")
                v-tabs-window-item.w-100(value="gpt")
                    v-radio-group(v-model="test.gpt_test.school_type" inline)
                        v-radio(value="basisschool" label="basisschool")
                        v-radio(value="vmbo" label="vmbo")
                        v-radio(value="havo" label="havo")
                        v-radio(value="vwo" label="vwo")
                        v-radio(value="mbo" label="mbo")
                        v-radio(value="hbo" label="hbo")
                        v-radio(value="universiteit" label="universiteit")

                    v-number-input(type="number" v-model="test.gpt_test.school_year")
                    v-combobox(label="Vak" v-model="test.gpt_test.school_subject"  :items="courses.map(e => e.subject)" )
                        template(#item="{ item, props }")
                            v-list-item(
                                @click="test.gpt_test.school_subject = item.title; selected_course ? test.grade_rules = selected_course.exam_grade_rules : {}"
                            ) {{item.title}}
                    v-expansion-panels(density="compact" elevation="0")
                        v-expansion-panel
                            v-expansion-panel-title Nakijkregels
                            v-expansion-panel-text
                                v-textarea(
                                    label="Nakijkregels"
                                    hint="Dit wordt aan het nakijkmodel meegegeven om het resultaat te verbeteren, schijf hier bijvoorbeeld concreet kleine nakijkregels zoals super en sub script bij O2"
                                    auto-grow
                                    v-model="test.grade_rules"
                                    :rows="2"
                                )
                                i.text-warning Let op! Het selecteren van een ander van overschrijft deze waarde.
                    v-combobox(label="Onderwerp" v-model="test.gpt_test.subject" :items="subjects")
                    v-textarea(label="geleerde stof (optioneel)" auto-grow :rows="2" v-model="test.gpt_test.learned")
                    v-textarea(label="Onderwerpen die voor moeten komen" hint="Scheiden met komma's" auto-grow :rows="2" v-model="test.gpt_test.requested_topics")
                    v-btn.mt-2(@click="test.generateGptTest()") Genereer vragen

                v-tabs-window-item(value="pdf")
                    v-btn(text="Laad structuur met gpt request uit pdfs" @click="test.loadTestStructure()" :loading="test.loading.structure")

    LearningTargets(:test="test")
    QuestionsEditor(:test="test")
    DownloadTest(:test="test")
</template>

<script>
import LearningTargets from '@/components/full_view/TestSection/LearningTargets.vue';
import QuestionsEditor from '@/components/full_view/TestSection/QuestionsEditor.vue';
import GenerateQuestion from '@/components/full_view/TestSection/GenerateQuestion.vue';
import DownloadTest from '@/components/full_view/TestSection/DownloadTest.vue';

export default {
    name: 'TestStructure',
    components: {
        LearningTargets,
        QuestionsEditor,
        GenerateQuestion,
        DownloadTest
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_test_source: {
            type: String,
            required: true
        }
    },
    emits: ['update:selected_test_source'],
    data() {
        return {
            courses: [
                {
                    "subject": "Natuurkunde",
                    "topics": [
                    "Mechanica",
                    "Elektriciteit en Magnetisme",
                    "Golven",
                    "Warmteleer",
                    "Moderne Natuurkunde"
                    ],
                    "exam_grade_rules": "De examinator beoordeelt het natuurkunde-examen op basis van de volgende regels:\n\n1. **Correctheid van Antwoorden:**\n   a. Elke vraag heeft een specifiek puntenaantal gebaseerd op de complexiteit en het aantal vereiste stappen.\n   b. Antwoorden worden beoordeeld op wetenschappelijke nauwkeurigheid, gebruik van correcte formules, en juiste eenheden.\n   c. Deelpunten worden toegekend voor correcte tussenstappen, zelfs als het eindantwoord onjuist is, mits de gebruikte methode en formules relevant zijn.\n   d. Bij numerieke antwoorden moet de significantie van cijfers in acht worden genomen.\n   e. Fouten in berekeningen (bijv. rekenfouten) leiden tot puntenaftrek, maar doorrekenfouten (fout voortzetten in volgende berekeningen) worden slechts één keer bestraft.\n\n2. **Begrip en Inzicht:**\n   a. Antwoorden moeten blijk geven van begrip van de onderliggende natuurkundige principes.\n   b. Toelichtingen en verklaringen moeten helder, logisch en consistent zijn met de natuurkundige wetten.\n   c. Bij open vragen wordt beoordeeld of de kandidaat de relevante concepten kan toepassen op nieuwe situaties.\n\n3. **Gebruik van Hulpmiddelen:**\n   a. Het gebruik van een goedgekeurde rekenmachine is toegestaan.\n   b. Het gebruik van een formuleblad (bijv. Binas) is toegestaan, maar de kandidaat moet de juiste formules correct selecteren en toepassen.\n   c. Ongestoornd gebruik van niet-toegestane hulpmiddelen (bijv. internet, communicatieapparatuur) leidt tot ongeldigverklaring van het examen.\n\n4. **Presentatie en Structuur:**\n    a. Antwoorden moeten leesbaar en gestructureerd zijn.\n    b. Duidelijke scheiding tussen verschillende onderdelen van een vraag is vereist.\n    c. Gebruik van correcte natuurkundige terminologie is vereist.\n\n5. **Specifieke Instructies:**\n   a. De examinator volgt alle specifieke instructies en beoordelingscriteria die in het correctievoorschrift van het examen zijn opgenomen.\n   b. Bij twijfel over de interpretatie van een antwoord of beoordelingscriterium, overlegt de examinator met een tweede corrector of gecommitteerde.\n\n6. **Afronding:**\n   a.  Het eindcijfer wordt berekend volgens de normeringstabel behorende bij het examen.\n   b.  Het eindcijfer wordt afgerond op één decimaal (volgens de standaard afrondingsregels).\n\n7. **Tweede Correctie:** Alle examens worden door een tweede corrector nagekeken. Bij een significant verschil in beoordeling tussen de eerste en tweede corrector, wordt overlegd om tot een definitief cijfer te komen. Indien geen overeenstemming wordt bereikt, beslist de gecommitteerde."
                },
                {
                    "subject": "Wiskunde",
                    "topics": [
                    "Algebra",
                    "Meetkunde",
                    "Analyse/Calculus",
                    "Statistiek en Kansrekening"
                    ],
                    "exam_grade_rules": "De examinator beoordeelt het wiskunde-examen op basis van de volgende regels:\n\n1. **Correcte Methoden:**\n    a. De gebruikte wiskundige methoden moeten correct en relevant zijn voor het probleem.\n    b. Deelpunten worden toegekend voor correcte stappen in de uitwerking, zelfs als het eindantwoord onjuist is.\n    c. Alternatieve, correcte oplossingsmethoden worden eveneens geaccepteerd en beoordeeld.\n\n2. **Nauwkeurigheid:**\n    a. Berekeningen moeten nauwkeurig worden uitgevoerd.\n    b. Antwoorden moeten, waar van toepassing, worden vereenvoudigd en in de juiste vorm worden gepresenteerd (bijv. breuken vereenvoudigen, exacte antwoorden versus decimale benaderingen).\n    c. Afrondingsfouten worden bestraft, tenzij anders vermeld in de opgave.\n\n3. **Notatie en Symbolen:**\n    a. Correcte wiskundige notatie en symbolen moeten worden gebruikt.\n    b. Variabelen moeten duidelijk worden gedefinieerd.\n    c. Onjuist of inconsistent gebruik van notatie leidt tot puntenaftrek.\n\n4. **Logische Redenering:**\n    a. De oplossing moet een logische en coherente redenering volgen.\n    b. Stappen in de redenering moeten duidelijk worden uitgelegd en gerechtvaardigd.\n    c. Bij bewijzen moeten alle stappen expliciet worden vermeld en gebaseerd zijn op bekende definities en stellingen.\n\n5. **Grafieken en Diagrammen:**\n    a. Grafieken en diagrammen moeten correct, duidelijk en volledig zijn.\n    b. Assen moeten worden benoemd en voorzien van de juiste schaalverdeling.\n    c. Belangrijke punten (bijv. snijpunten, extremen) moeten worden aangegeven.\n\n6. **Hulpmiddelen:**\n    a. Het gebruik van een (grafische) rekenmachine is toegestaan, tenzij anders vermeld.\n    b. De kandidaat moet aangeven wanneer en hoe de rekenmachine is gebruikt.\n    c. Het gebruik van niet-toegestane hulpmiddelen leidt tot ongeldigverklaring.\n\n7. **Specifieke Instructies:** De examinator volgt strikt het correctievoorschrift en de daarin opgenomen specifieke beoordelingscriteria.\n\n8. **Afronding en Tweede Correctie:**\n    a. Het eindcijfer wordt berekend volgens de normeringstabel en afgerond volgens de standaardregels.\n    b. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen wordt overlegd, en de gecommitteerde neemt de eindbeslissing."
                },
                    {
                    "subject": "Economie",
                    "topics": [
                    "Micro-economie",
                    "Macro-economie",
                    "Internationale Economie",
                    "Bedrijfseconomie"
                    ],
                    "exam_grade_rules": "De examinator beoordeelt het economie-examen op basis van de volgende regels:\n\n1. **Economische Begrippen:**\n    a. Correct gebruik van economische begrippen en terminologie.\n    b. Duidelijke definities van relevante concepten.\n    c. Aantonen van begrip van de relaties tussen economische variabelen.\n\n2. **Analyse en Toepassing:**\n    a. Correcte toepassing van economische modellen en theorieën.\n    b. Analyse van economische vraagstukken met behulp van relevante gegevens.\n    c. Logische redeneringen en onderbouwde conclusies.\n\n3. **Grafieken en Tabellen:**\n   a. Correcte interpretatie en gebruik van grafieken en tabellen.\n   b. Juiste labels en schaalverdeling bij grafieken.\n   c. Verklaring van veranderingen in grafieken en tabellen.\n\n4. **Actualiteit en Context:**\n    a. Waar relevant, relatie leggen met actuele economische ontwikkelingen.\n    b. Rekening houden met de context van het vraagstuk (bijv. land, sector).\n\n5. **Argumentatie en Onderbouwing:**\n   a. Heldere en gestructureerde argumentatie.\n    b. Gebruik van relevante economische argumenten ter onderbouwing van standpunten.\n    c. Afwegen van voor- en nadelen van verschillende economische beleidsopties.\n\n6. **Rekenkundige Vaardigheden:**\n    a. Correct uitvoeren van berekeningen (bijv. elasticiteiten, indexcijfers).\n    b. Juiste interpretatie van de uitkomsten van berekeningen.\n\n7. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift nauwkeurig, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen. Bij significante verschillen volgt overleg, en de gecommitteerde neemt de eindbeslissing. Het eindcijfer wordt berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                },
                    {
                    "subject": "Biologie",
                    "topics": [
                    "Celbiologie",
                    "Ecologie",
                    "Fysiologie van Mens en Dier",
                    "Evolutie",
                    "Planten"
                    ],
                    "exam_grade_rules": "De examinator beoordeelt het biologie-examen op basis van de volgende regels:\n\n1. **Feitelijke Kennis:**\n    a. Correcte weergave van biologische feiten, begrippen en processen.\n    b. Gebruik van correcte biologische terminologie.\n\n2. **Begrip en Inzicht:**\n    a. Aantonen van begrip van de samenhang tussen biologische processen en structuren.\n    b. Verklaren van biologische verschijnselen op basis van biologische principes.\n    c. Toepassen van biologische kennis op nieuwe situaties.\n\n3. **Experimenten en Onderzoek:**\n    a. Correct interpreteren van onderzoeksgegevens (tabellen, grafieken).\n    b. Formuleren van een correcte hypothese en conclusie.\n    c. Beschrijven van een correcte onderzoeksmethode.\n    d. Benoemen van variabelen (onafhankelijk, afhankelijk, controle).\n\n4. **Schema's en Tekeningen:**\n    a. Correcte en duidelijke schema's en tekeningen (indien gevraagd).\n    b. Juiste benoeming van onderdelen.\n\n5. **Specifieke Instructies en Tweede Correctie:**\n    a. De examinator volgt het correctievoorschrift nauwkeurig en past de specifieke beoordelingscriteria toe.\n    b. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het eindcijfer wordt bepaald volgens de normeringstabel en afgerond volgens de standaardregels."
                },
                {
                    "subject": "Scheikunde",
                    "topics": [
                    "Atoombouw en Periodiek Systeem",
                    "Chemische Reacties",
                    "Zuren en Basen",
                    "Organische Chemie",
                    "Anorganische Chemie"
                    ],
                    "exam_grade_rules": "De examinator beoordeelt het scheikunde-examen op basis van de volgende regels:\n\n1. **Chemische Kennis:**\n    a. Correcte weergave van chemische feiten, begrippen, formules en reactievergelijkingen.\n    b. Gebruik van correcte chemische nomenclatuur.\n\n2. **Rekenkundige Vaardigheden:**\n    a. Correct uitvoeren van stoichiometrische berekeningen.\n    b. Correct gebruik van eenheden en significante cijfers.\n    c. Correcte berekeningen met betrekking tot zuur-base evenwichten, pH, en concentraties.\n\n3. **Reactievergelijkingen:**\n    a. Correct opstellen en kloppend maken van reactievergelijkingen.\n    b. Aangeven van de aggregatietoestanden (s, l, g, aq).\n\n4. **Begrip en Inzicht:**\n   a. Aantonen van begrip van de onderliggende chemische principes.\n    b. Verklaren van chemische verschijnselen.\n    c. Toepassen van chemische kennis op nieuwe situaties.\n\n5. **Laboratoriumvaardigheden:**\n    a. Correct interpreteren van experimentele gegevens.\n    b. Beschrijven van een correcte experimentele opzet.\n    c. Benoemen van veiligheidsmaatregelen (indien relevant).\n\n6. **Organische Chemie:**\n   a. Correct tekenen van structuurformules.\n   b. Benoemen van organische verbindingen.\n   c. Beschrijven van reacties van organische verbindingen.\n\n7. **Specifieke Instructies en Tweede Correctie:**\n    a. Strikt volgen van het correctievoorschrift en de bijbehorende beoordelingscriteria.\n    b. Een tweede corrector beoordeelt onafhankelijk het examen. Bij significante verschillen volgt overleg en neemt de gecommitteerde de eindbeslissing. Het cijfer wordt berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                },
                {
                        "subject": "Natuur, Leven en Technologie",
                        "topics": [
                            "Modules over diverse interdisciplinaire onderwerpen"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het NLT-examen op basis van de volgende regels:\n\n1. **Integratie van Disciplines:**\n a. Aantonen van begrip van de samenhang tussen de verschillende natuurwetenschappelijke disciplines (natuurkunde, scheikunde, biologie, aardwetenschappen).\n b. Correct toepassen van kennis en vaardigheden uit de verschillende disciplines.\n\n2. **Onderzoeksvaardigheden:**\n a. Correct interpreteren van onderzoeksgegevens (tabellen, grafieken).\n b. Formuleren van een correcte hypothese en conclusie.\n c. Beschrijven van een correcte onderzoeksmethode.\n d. Benoemen van variabelen (onafhankelijk, afhankelijk, controle).\n e. Kritisch evalueren van de betrouwbaarheid en validiteit van een onderzoek.\n\n3. **Concept-Context Benadering:**\n a. Toepassen van natuurwetenschappelijke concepten op realistische contexten.\n b. Verklaren van verschijnselen in de context met behulp van de relevante concepten.\n\n4. **Communicatie:**\n    a. Heldere en gestructureerde uitleg van de onderzoeksresultaten en conclusies.\n    b. Gebruik van correcte wetenschappelijke terminologie.\n\n5. **Module-Specifieke Kennis:**\n    a. Correcte weergave van de specifieke kennis en vaardigheden die horen bij de getoetste module(s).\n    b. Toepassen van deze kennis en vaardigheden op de gestelde vragen.\n\n 6. **Specifieke Instructies, Afronding en Tweede Correctie:** De examinator volgt het correctievoorschrift van de specifieke module(s) nauwkeurig, met inbegrip van de beoordelingscriteria. Een tweede corrector kijkt het examen onafhankelijk na. Bij significante verschillen is er overleg, met de gecommitteerde als eindbeslisser. Het eindcijfer wordt berekend volgens de geldende normen en correct afgerond."
                    },
                    {
                        "subject": "Nederlands",
                        "topics": [
                            "Leesvaardigheid",
                            "Schrijfvaardigheid",
                            "Taalbeschouwing",
                            "Literatuur"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het Nederlands-examen op basis van de volgende regels:\n\n1. **Leesvaardigheid:**\n    a. Correct beantwoorden van vragen over de inhoud van teksten.\n    b. Aantonen van begrip van de hoofdgedachte en structuur van teksten.\n    c. Correct interpreteren van teksten (bedoeling van de schrijver, standpunten, argumenten).\n    d. Correct samenvatten van teksten.\n\n2. **Schrijfvaardigheid:**\n    a. Correct formuleren (helder, correct taalgebruik, passend bij het doel en publiek).\n    b. Duidelijke structuur en opbouw van de tekst.\n    c. Correcte spelling en interpunctie.\n    d. Logische en overtuigende argumentatie (indien van toepassing).\n    e. Aansluiten bij de eisen van de specifieke tekstsoort (bijv. betoog, beschouwing, brief).\n\n3. **Taalbeschouwing:**\n   a. Correct toepassen van grammaticale regels.\n    b. Correcte spelling van woorden.\n    c. Aantonen van kennis van woordenschat en uitdrukkingen.\n\n4. **Literatuur:**\n   a. Aantonen van kennis van literaire begrippen en perioden.\n   b. Correct interpreteren van literaire werken (thema's, motieven, symboliek, personages).\n c. Beschrijven van de relatie tussen vorm en inhoud van literaire werken.\n\n5. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift strikt, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij aanzienlijke verschillen overleggen zij, en de gecommitteerde neemt de definitieve beslissing. Het eindcijfer wordt berekend volgens de normeringstabel en afgerond zoals voorgeschreven."
                    },
                {
                "subject": "Engels",
                "topics": [
                "Reading Comprehension",
                "Writing",
                "Listening Comprehension",
                "Speaking",
                "Literature"
                ],
                "exam_grade_rules": "De examinator beoordeelt het Engels-examen op basis van de volgende regels:\n\n1. **Reading Comprehension:**\n a. Accurate answers to questions about the content of texts.\n b. Demonstrated understanding of the main ideas and structure of texts.\n c. Correct interpretation of texts (author's intention, viewpoints, arguments).\n\n2. **Writing:**\n a. Correct and clear formulation (appropriate language, style, and register).\n b. Clear structure and organization of the text.\n c. Correct grammar, spelling, and punctuation.\n d. Logical and convincing argumentation (if applicable).\n e. Adherence to the requirements of the specific text type.\n\n3. **Listening Comprehension:**\n   a. Correctly answering questions on spoken texts, dialogues and monologues.\n b. Showing understanding of key information, details, and speakers' intentions.\n\n4. **Speaking: (If assessed as part of the central exam - often it's school-based)**\n a. Clear and fluent delivery of language.\n b. Correct and comprehensible pronunciation, intonation and stress.\n c. Grammatically sound production of spoken text.\n d. Use of correct vocabulary related to topics.\n\n5. **Literature:**\n a. Demonstrating understanding of characters, setting, plot of relevant works.\n b. Using correct terminology to discuss literary devices and themes.\n c. Making reasonable interpretations based on evidence from the text.\n\n6. **Specifieke Instructies en Tweede Correctie:**\n De examinator volgt strikt het correctievoorschrift, inclusief specifieke beoordelingscriteria. Een tweede examinator beoordeelt onafhankelijk het examen. Bij significante verschillen, overleggen zij en de gecommitteerde maakt de uiteindelijke beslissing. Het eindcijfer is berekend volgens de normeringstabel en afgerond volgens de voorschriften."
                },
                {
                        "subject": "Frans",
                        "topics": [
                            "Compréhension écrite",
                            "Production écrite",
                            "Compréhension orale",
                            "Production orale",
                            "Grammaire et Vocabulaire"

                        ],
                        "exam_grade_rules": "De examinator beoordeelt het Frans-examen op basis van de volgende regels:\n\n1. **Compréhension écrite:**\n    a. Réponses correctes aux questions sur le contenu des textes.\n    b. Compréhension des idées principales et de la structure des textes.\n    c. Interprétation correcte des textes (intention de l'auteur, points de vue, arguments).\n\n2. **Production écrite:**\n   a. Formulation correcte et claire (langue appropriée, style, registre).\n   b. Structure et organisation claires du texte.\n    c. Grammaire, orthographe et ponctuation correctes.\n    d. Argumentation logique et convaincante (le cas échéant).\n    e. Respect des exigences du type de texte spécifique.\n\n3. **Compréhension Orale (Als dit onderdeel centraal examen is):**\n    a. Correct beantwoorden van vragen over gesproken teksten.\n    b. Tonen van begrip van sleutelinformatie, details en intenties van de spreker.\n\n4. **Production Orale (Als dit onderdeel centraal examen is):**\n a. Duidelijke en vloeiende taalproductie.\n b. Correcte en begrijpelijke uitspraak.\n c. Grammaticaal correct gesproken tekst.\n d. Gebruik van correcte woordenschat met betrekking tot onderwerpen.\n\n5. **Grammaire et Vocabulaire:**\n a. Application correcte des règles grammaticales.\n b. Orthographe correcte des mots.\n c. Connaissance du vocabulaire et des expressions.\n\n6. **Specifieke Instructies en Tweede Correctie:** De examinator volgt strikt het correctievoorschrift, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het eindcijfer is berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                    },
                    {
                        "subject": "Duits",
                        "topics": [
                            "Leseverstehen",
                            "Schreiben",
                            "Hörverstehen",
                            "Sprechen",
                            "Grammatik und Wortschatz"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het Duits-examen op basis van de volgende regels:\n\n1. **Leseverstehen:**\n a. Richtige Antworten auf Fragen zum Inhalt der Texte.\n b. Verständnis der Hauptgedanken und der Struktur der Texte.\n c. Korrekte Interpretation der Texte (Absicht des Autors, Standpunkte, Argumente).\n\n2. **Schreiben:**\n a. Korrekte und klare Formulierung (angemessene Sprache, Stil, Register).\n b. Klare Struktur und Organisation des Textes.\n c. Korrekte Grammatik, Rechtschreibung und Zeichensetzung.\n d. Logische und überzeugende Argumentation (falls zutreffend).\n e. Einhaltung der Anforderungen der jeweiligen Textsorte.\n\n3. **Hörverstehen:**\n    a. Richtige Beantwortung von Fragen zu den gehörten Texten.\n    b. Verstehen von Schlüsselinformation, Details und Sprecherabsichten.\n\n4. **Sprechen (indien als Teil des Zentralexamens geprüft):**\n    a. Klare und fließende Sprachproduktion.\n    b. Korrekte und verständliche Aussprache.\n    c. Grammatikalisch korrektes Sprechen.\n    d. Angemessener Wortschatz.\n\n5. **Grammatik und Wortschatz:**\n a. Korrekte Anwendung grammatikalischer Regeln.\n b. Richtige Schreibweise von Wörtern.\n c. Kenntnis von Vokabeln und Ausdrücken.\n\n6. **Specifieke Instructies en Tweede Correctie:** De examinator volgt strikt het correctievoorschrift, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het cijfer is berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                    },
                    {
                        "subject": "Spaans",
                        "topics": [
                            "Comprensión de lectura",
                            "Expresión escrita",
                            "Comprensión auditiva",
                            "Expresión oral",
                            "Gramática y vocabulario"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het Spaans-examen op basis van de volgende regels:\n\n1. **Comprensión de lectura:**\n    a. Respuestas correctas a preguntas sobre el contenido de los textos.\n    b. Comprensión de las ideas principales y la estructura de los textos.\n    c. Interpretación correcta de los textos (intención del autor, puntos de vista, argumentos).\n\n2. **Expresión escrita:**\n a. Formulación correcta y clara (lenguaje, estilo y registro apropiados).\n b. Estructura y organización claras del texto.\n c. Gramática, ortografía y puntuación correctas.\n d. Argumentación lógica y convincente (si corresponde).\n e. Cumplimiento de los requisitos del tipo de texto específico.\n\n3. **Comprensión Auditiva (Si es un examen central):**\n    a. Beantwoorden van vragen over gesproken teksten.\n    b. Begrip tonen van de belangrijkste informatie, details, en intenties van de spreker.\n\n4. **Expresión Oral (Si es un examen central):**\n    a. Duidelijke en vloeiende taalproductie.\n    b. Correcte en verstaanbare uitspraak.\n    c. Grammaticaal correct gesproken tekst.\n    d. Correct gebruik van woordenschat met betrekking tot de onderwerpen.\n\n5.  **Gramática y Vocabulario:**\n  a. Aplicación correcta de reglas gramaticales.\n b. Ortografía correcta de palabras.\n c. Conocimiento de vocabulario y expresiones.\n\n6. **Specifieke Instructies en Tweede Correctie:** De examinator volgt strikt het correctievoorschrift, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het eindcijfer wordt berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                    },
                        {
                        "subject": "Latijn",
                        "topics": [
                            "Taalvaardigheid",
                            "Cultuur"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het Latijn-examen op basis van de volgende regels:\n\n1. **Taalvaardigheid:**\n    a. **Vertaling:**\n        i.  Accurate vertaling van Latijnse zinnen en teksten naar correct Nederlands.\n        ii. Begrip van de grammaticale structuren en woordbetekenissen in de context.\n        iii. Vloeiende en begrijpelijke Nederlandse weergave van de Latijnse tekst.\n    b. **Grammatica:**\n        i.  Correcte identificatie en analyse van grammaticale vormen (naamvallen, werkwoordstijden, etc.).\n        ii. Correcte toepassing van grammaticale regels bij het beantwoorden van vragen.\n    c. **Woordenschat:**\n        i.  Kennis van de betekenis van Latijnse woorden.\n        ii. Juiste keuze van Nederlandse equivalenten.\n\n2. **Cultuur:**\n   a. Correcte en relevante antwoorden op vragen over de Romeinse geschiedenis, mythologie, literatuur en maatschappij.\n    b. Aantonen van inzicht in de culturele context van de Latijnse teksten.\n    c. Verbanden kunnen leggen tussen de Latijnse cultuur en de moderne wereld (indien van toepassing).\n\n3. **Specifieke Instructies en Tweede Correctie:** De examinator volgt strikt het correctievoorschrift en de daarin opgenomen specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen wordt overlegd; de gecommitteerde beslist uiteindelijk. Het eindcijfer wordt berekend volgens de normeringstabel en correct afgerond."
                    },
                    {
                        "subject": "Grieks",
                        "topics": [
                            "Taalvaardigheid",
                            "Cultuur"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het examen Grieks op basis van de volgende regels:\n\n1. **Taalvaardigheid:**\n a. **Vertaling:**\n i. Accurate vertaling van Griekse zinnen en teksten naar correct Nederlands.\n ii. Begrip van de grammaticale structuren en woordbetekenissen in context.\n iii. Vloeiende en begrijpelijke Nederlandse weergave van de Griekse tekst.\n b. **Grammatica:**\n i. Correcte identificatie en analyse van grammaticale vormen.\n ii. Correcte toepassing van grammaticale regels.\n c. **Woordenschat:**\n i. Kennis van de betekenis van Griekse woorden.\n ii. Juiste keuze van Nederlandse equivalenten.\n\n2. **Cultuur:**\n a. Correcte en relevante antwoorden op vragen over de Griekse geschiedenis, mythologie, literatuur, filosofie en maatschappij.\n b. Aantonen van inzicht in de culturele context van de Griekse teksten.\n c. Verbanden kunnen leggen tussen de Griekse cultuur en de moderne wereld (indien van toepassing).\n\n3. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift strikt, met inbegrip van alle specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante meningsverschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het eindcijfer wordt berekend aan de hand van de normeringstabel en correct afgerond."
                    },
                    {
                        "subject": "Geschiedenis",
                        "topics": [
                            "Tijdvakken",
                            "Thema's",
                            "Vaardigheden"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het geschiedenis-examen op basis van de volgende regels:\n\n1. **Feitelijke Kennis:**\n a. Correcte weergave van historische feiten, gebeurtenissen, personen en begrippen.\n b. Plaatsen van gebeurtenissen in de juiste tijdvakken en thema's.\n\n2. **Historisch Redeneren:**\n    a. Oorzaak-en-gevolg relaties kunnen uitleggen.\n    b. Veranderingen en continuïteit kunnen identificeren en verklaren.\n    c. Standpunten en meningen van historische personen kunnen herkennen en verklaren.\n    d. Vergelijkingen kunnen maken tussen historische perioden en gebeurtenissen.\n\n3. **Bronnenonderzoek:**\n a. Informatie uit historische bronnen (teksten, afbeeldingen, kaarten) kunnen halen.\n b. De bruikbaarheid, betrouwbaarheid en representativiteit van bronnen kunnen beoordelen.\n c. Bronnen kunnen gebruiken om een historisch argument te onderbouwen.\n\n4.  **Begrip en Inzicht**:\n a. Historische context plaatsen bij gebeurtenissen en personen.\n b. Uitleggen hoe ontwikkelingen invloed op elkaar hebben gehad.\n\n5. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift nauwkeurig, inclusief de specifieke beoordelingscriteria. Het examen wordt onafhankelijk nagekeken door een tweede corrector. Bij significante verschillen in beoordeling wordt overlegd; de gecommitteerde beslist uiteindelijk. Het eindcijfer wordt berekend volgens de normeringstabel en afgerond zoals voorgeschreven."
                    },
                    {
                        "subject": "Aardrijkskunde",
                        "topics": [
                            "Fysische Geografie",
                            "Sociale Geografie",
                            "Economische Geografie",
                            "Milieuvraagstukken"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het aardrijkskunde-examen op basis van de volgende regels:\n\n1. **Feitelijke Kennis:**\n    a. Correcte weergave van aardrijkskundige feiten, begrippen en processen.\n    b. Gebruik van correcte aardrijkskundige terminologie.\n\n2. **Geografisch Inzicht:**\n a. Aantonen van begrip van de relaties tussen verschijnselen in de fysische en sociale omgeving.\n    b. Verklaren van ruimtelijke spreidingspatronen en processen.\n    c. Toepassen van aardrijkskundige kennis op concrete situaties en gebieden.\n\n3. **Kaartvaardigheden:**\n   a. Correct interpreteren van kaarten (verschillende soorten, legenda, schaal).\n    b. Informatie uit kaarten halen en combineren.\n c.  Locaties en gebieden op kaarten identificeren.\n\n4. **Geografische Informatiesystemen (GIS):** (indien van toepassing in het curriculum/examen)\n a. Begrip van de basisprincipes van GIS.\n    b. Interpreteren van GIS-data en kaarten.\n\n5. **Onderzoeksvaardigheden:**\n    a. Interpreteren van geografische data (tabellen, grafieken, diagrammen).\n    b. Formuleren van een geografische onderzoeksvraag.\n    c. Trekken van conclusies op basis van geografische gegevens.\n\n6. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift strikt, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het cijfer wordt berekend volgens de normeringstabel en afgerond volgens de standaardregels."
                    },
                    {
                        "subject": "Maatschappijleer",
                        "topics": [
                            "Rechtsstaat",
                            "Parlementaire Democratie",
                            "Verzorgingsstaat",
                            "Pluriforme Samenleving",
                            "Internationale Betrekkingen"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het maatschappijleer-examen op basis van de volgende regels:\n\n1. **Feitelijke Kennis:**\n    a. Correcte weergave van begrippen, feiten en processen met betrekking tot de rechtsstaat, democratie, verzorgingsstaat, pluriforme samenleving en internationale betrekkingen.\n    b. Gebruik van correcte maatschappijleer-terminologie.\n\n2. **Begrip en Inzicht:**\n    a. Aantonen van begrip van de samenhang tussen de verschillende onderdelen van de maatschappij.\n    b. Verklaren van maatschappelijke vraagstukken en ontwikkelingen.\n    c. Toepassen van maatschappijleer-kennis op actuele situaties.\n\n3. **Waarden en Normen:**\n    a. Herkennen en analyseren van verschillende waarden en normen in de samenleving.\n    b. Beargumenteren van standpunten over maatschappelijke kwesties.\n    c. Reflecteren op de eigen waarden en normen in relatie tot maatschappelijke vraagstukken.\n\n4. **Brongebruik:**\n   a. Informatie halen uit verschillende soorten bronnen (teksten, grafieken, tabellen).\n   b. De betrouwbaarheid en representativiteit van bronnen beoordelen.\n\n5. **Specifieke Instructies en Tweede Correctie:** De examinator volgt strikt het correctievoorschrift, met inbegrip van de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen volgt overleg, waarbij de gecommitteerde de eindbeslissing neemt. Het eindcijfer wordt bepaald aan de hand van de normeringstabel en correct afgerond."
                    },
                    {
                        "subject": "Informatica",
                        "topics": [
                            "Programmeren",
                            "Computersystemen",
                            "Databases",
                            "Webtechnologie",
                            "Algoritmiek en Datastructuren"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het informatica-examen op basis van de volgende regels:\n\n1. **Programmeer Concepten:**\n   a. Aantonen van begrip van basisconcepten van programmeren (variabelen, datatypen, lussen, condities, functies).\n    b. Correct toepassen van deze concepten bij het schrijven van code.\n    c. Schrijven van leesbare, gestructureerde en efficiënte code.\n\n2. **Algoritmen en Datastructuren:**\n    a. Aantonen van begrip van algoritmen en datastructuren (bijv. sorteren, zoeken, lijsten, bomen, graphs).\n    b. Kunnen analyseren van de efficiëntie van algoritmen (tijdscomplexiteit, ruimtecomplexiteit).\n    c. Correct implementeren van algoritmen en datastructuren.\n\n3. **Probleemoplossend Vermogen:**\n   a. Vertalen van een probleemomschrijving naar een werkend computerprogramma.\n    b. Systematisch testen en debuggen van code.\n c.  Vinden van creatieve oplossingen voor computationele problemen.\n\n4. **Computersystemen:**\n   a. Kennis van de basiscomponenten van computersystemen (hardware, software).\n   b. Begrip van de werking van besturingssystemen en netwerken.\n\n5. **Databases (Indien Getoetst):**\n a. Kunnen ontwerpen van een eenvoudige database (entiteiten, attributen, relaties).\n b. Schrijven van SQL-queries om data op te vragen, toe te voegen, te wijzigen en te verwijderen.\n\n6. **Webtechnologie (Indien Getoetst):**\n a.  Maken van eenvoudige webpagina's met HTML, CSS en JavaScript.\n b. Begrijpen hoe client-server interactie werkt.\n\n7. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift nauwgezet, inclusief de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij aanzienlijke verschillen wordt overlegd, en de gecommitteerde beslist uiteindelijk. Het eindcijfer wordt vastgesteld volgens de normeringstabel en correct afgerond."
                    },
                    {
                        "subject": "Filosofie",
                        "topics": [
                            "Ethiek",
                            "Kennistheorie",
                            "Metafysica",
                            "Logica",
                            "Sociale en Politieke Filosofie"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het filosofie-examen op basis van de volgende regels:\n\n1. **Begrip van Filosofische Concepten:**\n    a. Correcte definities en uitleg van filosofische begrippen en theorieën.\n    b. Aantonen van inzicht in de relaties tussen verschillende filosofische concepten.\n\n2. **Argumentatie en Redenering:**\n   a. Heldere en gestructureerde argumentatie.\n    b. Gebruik van relevante filosofische argumenten ter onderbouwing van standpunten.\n    c. Kritische analyse van argumenten van anderen.\n    d. Identificatie van drogredenen en zwakke punten in redeneringen.\n\n3. **Analyse en Interpretatie:**\n    a. Correcte interpretatie van filosofische teksten.\n    b. Analyse van filosofische problemen en vraagstukken.\n c.  Verbanden leggen tussen filosofische ideeën en concrete situaties.\n\n4. **Zelfstandig Denken:**\n a. Ontwikkelen van een eigen beargumenteerd standpunt.\n    b. Kritisch reflecteren op eigen aannames en overtuigingen.\n c.  Formuleren van originele vragen en ideeën.\n\n5. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift nauwkeurig, met inbegrip van de specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen wordt overlegd; de gecommitteerde neemt de uiteindelijke beslissing. Het eindcijfer wordt berekend conform de normeringstabel en afgerond volgens de voorschriften."
                    },
                    {
                        "subject": "Onderzoek & Ontwerpen",
                        "topics": [
                            "Onderzoekscyclus",
                            "Ontwerpproces",
                            "Projectmanagement",
                            "Vakspecifieke kennis en vaardigheden"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het O&O-examen (vaak een combinatie van proces en product) op basis van de volgende regels:\n\n1. **Onderzoek:**\n    a. **Probleemstelling:** Duidelijke, relevante en onderzoekbare probleemstelling.\n    b. **Hypothese:** Toetsbare hypothese(s) gerelateerd aan de probleemstelling.\n    c. **Methode:** Geschikte onderzoeksmethode(n) gekozen en correct uitgevoerd.\n    d. **Data:** Relevante data verzameld en correct verwerkt.\n    e. **Analyse:** Correcte analyse van de data, leidend tot onderbouwde conclusies.\n    f. **Conclusie:** Duidelijke conclusie(s) gerelateerd aan de hypothese(s) en probleemstelling.\n    g. **Reflectie/Evaluatie:** Kritische reflectie op het onderzoeksproces en de resultaten.\n\n2. **Ontwerpen:**\n   a. **Probleemanalyse:** Grondige analyse van het ontwerpprobleem.\n    b. **Eisen en Wensen:** Duidelijk geformuleerde eisen en wensen.\n    c. **Ontwerp:** Functioneel en innovatief ontwerp dat voldoet aan de eisen en wensen.\n    d. **Prototype:** Werkend prototype (of gedetailleerde beschrijving/simulatie).\n    e. **Testen:** Systematisch testen van het prototype.\n    f. **Evaluatie:** Kritische evaluatie van het ontwerp en het prototype.\n\n3. **Projectmanagement:**\n a. **Planning:** Realistische planning en taakverdeling.\n    b. **Samenwerking:** Effectieve samenwerking (indien van toepassing).\n    c. **Communicatie:** Duidelijke communicatie over het project (tussentijds en eindverslag).\n   d. **Presentatie:** Professionele presentatie van het project (proces en product).\n\n4. **Vakoverstijgende Vaardigheden:** Creativiteit, doorzettingsvermogen, probleemoplossend vermogen, kritisch denken.\n\n5. **Rapportage**: Correcte weergave in verslaglegging, volgens de geldende eisen.\n\n6. **Specifieke Instructies en Beoordelingsteam:** De examinator(en) volgen de specifieke beoordelingscriteria van de school en/of het examenreglement nauwkeurig. Vaak is er een beoordelingsteam (meerdere docenten, eventueel externen). Bij verschil van mening wordt overlegd om tot een gezamenlijk oordeel te komen. Het eindcijfer is gebaseerd op zowel het proces als het product."
                    },
                    {
                        "subject": "Bedrijfseconomie",
                        "topics": [
                            "Marketing",
                            "Financiering",
                            "Management en Organisatie",
                            "Externe Verslaggeving",
                            "Interne Verslaggeving"
                        ],
                        "exam_grade_rules": "De examinator beoordeelt het bedrijfseconomie-examen op basis van de volgende regels:\n\n1. **Feitelijke Kennis:**\n    a. Correcte definities en uitleg van bedrijfseconomische begrippen en concepten.\n    b. Aantonen van kennis van relevante wet- en regelgeving (indien van toepassing).\n\n2. **Toepassing:**\n    a. Correct toepassen van bedrijfseconomische principes en methoden op concrete cases en situaties.\n    b. Analyseren van bedrijfseconomische vraagstukken en problemen.\n    c. Formuleren van oplossingen en aanbevelingen.\n\n3. **Rekenkundige Vaardigheden:**\n    a. Correct uitvoeren van berekeningen (bijv. ratio's, kengetallen, kostprijsberekeningen, investeringsanalyses).\n    b. Interpreteren van de uitkomsten van berekeningen.\n\n4. **Externe Verslaggeving:**\n    a. Begrip van de opbouw en inhoud van de balans, resultatenrekening en het kasstroomoverzicht.\n   b. Analyseren van financiële overzichten.\n\n5. **Interne Verslaggeving:**\n    a. Begrip van kostensoorten en kostprijsberekeningen.\n    b. Toepassen van budgetteringsmethoden.\n\n6. **Argumentatie:**\n   a.  Onderbouwen van standpunten met relevante bedrijfseconomische argumenten.\n  b.  Afwegen van voor- en nadelen van verschillende opties.\n\n7. **Specifieke Instructies en Tweede Correctie:** De examinator volgt het correctievoorschrift nauwgezet, met inbegrip van alle specifieke beoordelingscriteria. Een tweede corrector beoordeelt het examen onafhankelijk. Bij significante verschillen is er overleg; de gecommitteerde beslist. Het eindcijfer wordt berekend volgens de normeringstabel en correct afgerond."
                    }
            ]
        }
    },
    computed: {
        selected_test_source_local: {
            get() {
                return this.selected_test_source
            },
            set(val) {
                this.$emit('update:selected_test_source', val)
            }
        },
        selected_course(){
            return this.courses.find(course => course.subject == this.test.gpt_test.school_subject)
        },
        subjects(){
            if (!this.selected_course) return []
            return this.selected_course.topics
            
        }
    }
};
</script>
