<template lang="pug">
v-container 
    v-card
        v-card-title Welkom op onze PWS site
        v-card-text
            p Hier laten wij een demo over wat we gemaakt hebben.
            | Hierboven zie je een app-bar met daarin verschillende pagina's:
            v-divider
            v-table
                tbody
                    tr
                        td
                            b Demo:
                        td Een voorbeeld van hier het inladen van handgeschreven toetsblaadjes gaat, 99% correct (op slecht leesbar handschriften na)
                    tr 
                        td 
                            b Tests: 
                        td Een lijst met tests die in onze database staan en docenten hebben opgeslagen, klik om te openen en te bekijken. We slaan niet elke foto en sectie op in de database ivm opslag, daarom lijken dingen soms te missen
                    tr
                        td 
                            b PWS:
                        td ons pdf document
                    tr
                        td 
                            b Antwoordpagina: 
                        td Een uitprintbare antwoordpagina zodat elke docent dit programma gratis kan gebruiken
            v-divider.mt-2
            v-row
                v-col
                    h2 Dingen die het programma kan:
                    v-divider
                    v-table
                        tbody
                            tr
                                td Toetsen maken
                                td
                                    ul
                                        li Voor alle vakken een toets maken
                                        li Een hele toets in 45 seconden, met: vragen, punten en leerdoelen
                                        li Onbewuste nakijkregels van docenten worden vastgelegd
                                        li Wiskundige formules en tabellen
                                        li Output naar Word/.docx (met wiskundige formules en tabellen) in examenformaat, zodat docenten specifieke vragen kunnen kopieren naar eigen toetsen
                            tr
                                td Inscannen
                                td 
                                    ul
                                        li Open vragen
                                        li (bijna) alle handschriften
                                        li Programma "weet" waar een antwoord is gegeven op een vraag
                                        li Leerling nummers herkennen
                                        li 5 minuten voor 30 leerlingen
                                        li docent controle over hele process
                            tr
                                td Nakijken
                                td
                                    ul 
                                        li Gesloten, open, en teken vragen
                                        li correlatie van 97% met mens bij een echte scheikundetoets 
                                        li Feedback per punt en tips over stof per punt (scheelt discussies met leerlingen voor docent)
                                        li 5 minuten een hele klas van 30 leerlingen nagekeken
                                        li docent controle over hele process
                            tr  
                                td Analyse
                                td
                                    ul 
                                        li Per leerling een pdf met alle feedback, per vraag en per rubric punt
                                        li Per leerling een score per leerdoel
                                        li Voor docent overzicht welke leerdoelen behaald en welke niet behaald zijn door de klas
                    v-divider.mt-2
                v-col
                    h2 Dingen die wij hebben gedaan/geleerd:
                    v-divider
                    v-table
                        tbody
                            tr
                                td Onderzoek
                                td
                                    ul
                                        li Meer dan 14 AI-modellen met elkaar vergeleken in meer dan 15 000 geautomatiseerde api-requests
                                        li Onderzoek naar verschillende type ai modellen en de toepassing en implementatie, zoals: yolo, diffusion, ffn, llm's, latent-space-models etc.
                            tr
                                td Enquête
                                td
                                    ul 
                                        li Enquête afgenomen bij 51 docenten met verschillende achtergronden
                                        li Vragen met een specifiek doel gesteld, geen dubbele vragen of verschillend interpreteerbare vragen
                                        li Statistische analyse dvm: draaitabellen, t-tests en een correlatie matrix
                                        li Analyse mbv. Ai modellen om de open vragen te analyseren en samen te vatten tot korte duidelijke punten
                            tr
                                td Onderzoek uitvoeren
                                td
                                    ul
                                        li Voornamelijk met python (onderzoek ongeveer 4000 regels code)
                                        li Github voor opslag
                                        li Google Sheets voor analyse
                                        li Python libraries zoals:  
                                            i Flask, jinja, jedi, imutuls, numpy, pandas, pydantic, pyzbar, segno, skikit-image, sympy, torch, torchvision, uv, ultralitics, opencv-pythonn en tqdm
                            tr  
                                td Backend (veilig systeem dat de berekeningen doet)
                                td
                                    ul 
                                        li 3 python flask servers op GCP (Google Cloud Platform) run: 
                                            i Hoofdserver, ai/gpt server en document-maak-server
                                        li route handling en onderzoek functies omzetten naar publieke routes die bestanden kunnen ontvangen en versturen
                                        li Github voor code opslag
                                        li 3500 regels handgeschreven python
                                        li error handling
                            tr
                                td Frontend (deze website)
                                td
                                    ul 
                                        li Node.js (javascript) met vite voor laad tijd van 4 seconden
                                        li Vuejs met Vuetify voor automatische material design opmaak een hoge responsiveness
                                        li Axios voor requests en pug voor betere html opmaak
                                        li Pinia voor locale datastore, en vuejs router voor route management
                                        li Google Firebase Hosting voor publiek draaien van deze site
                                        li Github voor version history
                                        li Google Firstore met Google Firebase Datastore voor opslag van toetsen en account management
                                        li OOP based data systeem met 4000 regels aan classes, zoals:
                                            i User, File, Question, RubricPoint, Target, GptQuestionSettings, GptTestSettings, TestPdfSettings, Test, ContextData, ScanPage, ScanSection, ScanQuestion, Student, StudentQuestionResult, StudentPointResult, GradeInstance en TestManager
                                        li Totale frontend ongeveer 8000 regels code
                                        li Pdf worken voor tekstextractie uit pdf
                                        li katex voor wiskundige formules





                    v-divider.mt-2





</template>

<script>
// Data 


// Components


export default {
    name: 'HomeView',
    components: {

    },
    props: {

    },
    emits: [],
    setup() {

    },
    data() {
        return {

        }
    },
    computed: {

    },
    methods: {

    },
    watch: {

    },
    // created() {

    // },
    mounted() {

    },


}
</script>

<style scoped></style>
