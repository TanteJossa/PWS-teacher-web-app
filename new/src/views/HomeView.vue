<template lang="pug">
v-container.bg-gradient-to-br.from-gray-900.to-blue-900.text-white.min-h-screen
  // Removed Header Section

  main
    // Hero Section (from index.html)
    section.hero-section.py-32.px-6.md_px-12.flex.flex-col.lg_flex-row.items-center.justify-between.min-h-screen
      div.lg_w-1_2.mb-10.lg_mb-0(data-aos="fade-right" data-aos-duration="1000")
        h2.text-5xl.md_text-6xl.font-bold.mb-8.leading-tight
          | Een onderzoek naar 
          span.text-blue-400 Automatische Beoordeling
          |  met behulp van AI
        p.text-xl.mb-10.text-gray-300.max-w-2xl
          | Ontvang directe, gedetailleerde feedback op jouw opdrachten. Verbeter je leerproces met onze geavanceerde AI technologie.
        div.d-flex.flex-wrap
          router-link.ma-1(to="/demo" style="background-color: #3b82f6;" class="text-white py-4 px-10 rounded-lg transition-all transform hover:scale-105 shadow-lg text-lg")
            | Probeer het nu
          router-link.ma-1(to="/info" class="border-2 border-blue-400 text-blue-400 hover:text-gray-900 py-4 px-10 rounded-lg transition-all transform hover:scale-105 text-lg" style="background-color: transparent;")
            | Meer informatie
          router-link.ma-1(to="/test/6804055b-f7d1-4500-a8c1-e4f1fa5d2616" target="_blank" rel="noopener noreferrer" style="background-color: #22c55e;" class="text-white py-4 px-10 rounded-lg transition-all transform hover:scale-105 shadow-lg text-lg")
            | Bekijk voorbeeld
      div.lg_w-1_2.relative(data-aos="fade-left" data-aos-duration="1000")
        div.absolute.-bottom-8.-right-8.bg-blue-700.p-6.rounded-lg.shadow-xl.floating-animation-slow.text-center
          p.text-2xl.font-bold 10 min
          p.text-md Per nagekeken toets
        div.floating-animation(v-if="$vuetify.display.mdAndUp" style="right: 0px; top: -120px")
          img.rounded-lg.shadow-2xl(src="@/assets/answer_page_example.png" width="200px" alt="AI Auto Beoordelaar Dashboard" )

    // Features Section (from index.html)
    section#features.py-20.px-6.md_px-12.bg-gray-900.bg-opacity-50
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        | Wat kan 
        span.text-blue-400 ons programma
        | ?
      v-row.gap-10
        v-col(cols="12" md="6")
          div.feature-card(data-aos="zoom-in" data-aos-delay="600")
            div.icon-wrapper
              i.fas.fa-pen
            h3.text-xl.font-bold.mb-3 Toetsen Maken
            p.text-gray-300 Een hele toets in 45 seconden met vragen, punten en leerdoelen.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="zoom-in" data-aos-delay="500")
            div.icon-wrapper
              i.fas.fa-camera
            h3.text-xl.font-bold.mb-3 Inscannen
            p.text-gray-300 Ons systeem herkent vrijwel alle handschriften en weet waar een antwoord is gegeven op een vraag.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="zoom-in" data-aos-delay="300")
            div.icon-wrapper
              i.fas.fa-brain
            h3.text-xl.font-bold.mb-3 Nakijken
            p.text-gray-300 Onze AI begrijpt complexe opdrachten en beordeelt net zoals een mens.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="zoom-in" data-aos-delay="200")
            div.icon-wrapper
              i.fas.fa-chart-line
            h3.text-xl.font-bold.mb-3 Analyseren
            p.text-gray-300 Ons programma analyseert alle resultaten en geeft handige feedback aan docent en leerling.

    // How It Works Section (from index.html)
    section#how-it-works.py-20.px-6.md_px-12
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        | Hoe 
        span.text-blue-400 werkt het
        | ?
      div.steps-container
        div.step(data-aos="fade-right")
          div.step-number 1
          div.step-content
            h3.text-xl.font-bold.mb-2 Upload je werk
            p.text-gray-300 Upload eenvoudig je toets naar de website.
        div.step(data-aos="fade-left")
          div.step-number 2
          div.step-content
            h3.text-xl.font-bold.mb-2 Inscannen
            p.text-gray-300 Ons programma herkent gemakkelijk de vragen. Daarna leest hij aan de hand van AI bijna alle handschriften.
        div.step(data-aos="fade-right")
          div.step-number 3
          div.step-content
            h3.text-xl.font-bold.mb-2 Nakijken
            p.text-gray-300 Ons programma is in staat gesloten, open en teken vragen na te kijken met een correlatie van 97% met een mens bij een echte scheikunde toets.
        div.step(data-aos="fade-left")
          div.step-number 4
          div.step-content
            h3.text-xl.font-bold.mb-2 Analyseren
            p.text-gray-300 Elke leerling krijgt een pdf met alle feedback, per vraag en per rubric punt. Daarnaast ook zijn score per leerdoel. Als docent kan je zien welke leerdoelen goed en slecht gaan.

    // START: Sections from nakijken.html
    section#nakijken-section.py-20.px-6.md_px-12.bg-gray-900.bg-opacity-50
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        | Hoe wij 
        span.text-blue-400 nakijken
      v-row.gap-10.max-w-6xl.mx-auto
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-right")
            div.icon-wrapper
              i.fas.fa-robot
            h3.text-xl.font-bold.mb-3 AI-gestuurde beoordeling
            p.text-gray-300
              | Onze AI beoordeelt antwoorden door ze te vergelijken met het modelantwoord en geeft punten op basis van de inhoudelijke overeenkomst, niet alleen op basis van exacte woorden. Het systeem begrijpt de context en kan verschillende formuleringen herkennen die hetzelfde betekenen.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-left")
            div.icon-wrapper
              i.fas.fa-file-alt
            h3.text-xl.font-bold.mb-3 Verschillende vraagtypen
            p.text-gray-300
              | Ons systeem kan meerdere soorten vragen beoordelen:
            ul.text-gray-300.list-disc.ml-6.mt-2.space-y-1
              li Meerkeuzevragen
              li Open vragen met korte antwoorden
              li Wiskundige berekeningen
              li Scheikundige reactievergelijkingen
              li Tekenvragen
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-right")
            div.icon-wrapper
              i.fas.fa-brain
            h3.text-xl.font-bold.mb-3 Few-shot learning
            p.text-gray-300
              | We gebruiken few-shot learning om ons AI-model te trainen met slechts enkele voorbeelden per vraagtype. Dit betekent dat het model leert van een klein aantal voorbeelden hoe het antwoorden moet beoordelen, zonder dat er duizenden voorbeelden nodig zijn.
            p.text-gray-300.mt-2
              | Door this aanpak kan ons systeem snel worden aangepast aan nieuwe vakgebieden en vraagtypen zonder uitgebreide hertraining.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-left")
            div.icon-wrapper
              i.fas.fa-clipboard-check
            h3.text-xl.font-bold.mb-3 Rubric-gebaseerd nakijken
            p.text-gray-300
              | Ons systeem gebruikt gedetailleerde rubrics om consistente beoordelingen te geven. Voor elke vraag stellen docenten criteria op die het systeem gebruikt om punten toe te kennen. This aanpak zorgt voor:
            ul.text-gray-300.list-disc.ml-6.mt-2.space-y-1
              li Consistent nakijken tussen verschillende leerlingen
              li Transparantie in de beoordeling
              li Gedetailleerde feedback per criterium

    // Modeltesten Section
    section#modeltesten.py-20.px-6.md_px-12
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        span.text-blue-400 Model testen
        |  en resultaten
      div.max-w-6xl.mx-auto
        div.feature-card.mb-12(data-aos="fade-up")
          h3.text-xl.font-bold.mb-5 Vergelijking van AI-modellen
          p.text-gray-300.mb-6
            | We hebben verschillende AI-modellen getest om te bepalen welke het beste presteert bij het beoordelen van antwoorden. Hieronder zie je een vergelijking van de nauwkeurigheid van verschillende modellen ten opzichte van menselijke beoordelaars:
          div.h-80.mb-10
            canvas(ref="modelComparisonChartRef")
          p.text-gray-300
            | Na uitgebreide tests hebben we gekozen voor een Gemini 2.0 flash gebaseerd model dat het beste presteert voor complexe open vragen, aangevuld met gespecialiseerde modellen voor specifieke vraagtypen zoals wiskundige berekeningen.
        v-row.gap-10
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-right")
              div.icon-wrapper
                i.fas.fa-vial
              h3.text-xl.font-bold.mb-3 Testmethode
              p.text-gray-300.mb-4
                | Onze testmethode bestond uit de volgende stappen:
              ol.text-gray-300.list-decimal.ml-6.space-y-2
                li Verzamelen van 100+ antwoorden van leerlingen op verschillende vraagtypen
                li Laten nakijken door mensen
                li Dezelfde antwoorden door verschillende AI-modellen laten beoordelen
                li Vergelijken van de AI-scores met de gemiddelde docentscores
                li Berekenen van correlatie en afwijkingen
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-left")
              div.icon-wrapper
                i.fas.fa-chart-bar
              h3.text-xl.font-bold.mb-3 Resultaten
              p.text-gray-300
                | Onze tests hebben aangetoond dat:
              ul.text-gray-300.list-disc.ml-6.mt-2.space-y-2
                li De correlatie tussen onze AI en menselijke beoordelaars is 97% voor scheikundevragen
                li Het systeem werkt consistent over verschillende vakgebieden
                li

    // Binomiale Verdelingen Section
    section#binomiale-verdelingen.py-20.px-6.md_px-12.bg-gray-900.bg-opacity-50
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        span.text-blue-400 Binomiale verdelingen
        |  en toetsen
      div.max-w-6xl.mx-auto
        v-row.gap-10.mb-12
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-right")
              h3.text-xl.font-bold.mb-3 Interactieve binomiale verdeling
              p.text-gray-300.mb-4
                | Experimenteer met verschillende parameters om te zien hoe een binomiale verdeling verandert. This model helpt ons bij het schatten van de betrouwbaarheid van onze AI-beoordelingen.
              div.mb-6
                label.block.text-gray-300.mb-2 Aantal trials (n):
                input.w-full(type="range" ref="binomialNRef" v-model="binomialN" min="1" max="50")
                div.flex.justify-between
                //-   span.text-gray-400 1
                span.text-blue-400(ref="binomialNValueRef") {{ binomialN }}
                //-   span.text-gray-400 50
              div.mb-6
                label.block.text-gray-300.mb-2 Kans op succes (p):
                input.w-full(type="range" ref="binomialPRef" v-model="binomialPInput" min="1" max="99")
                div.flex.justify-between
                //-   span.text-gray-400 0.01
                span.text-blue-400(ref="binomialPValueRef") {{ binomialP.toFixed(2) }}
                //-   span.text-gray-400 0.99
              div.h-64
                canvas(ref="binomialChartRef")
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-left")
              h3.text-xl.font-bold.mb-3 Toepassingen in nakijken
              p.text-gray-300.mb-4
                | Binomiale verdelingen helpen ons om de betrouwbaarheid van onze AI-beoordelingen te begrijpen en te verbeteren:
              div.space-y-4
                div.bg-gray-800.bg-opacity-70.p-4.rounded-lg
                  h4.text-blue-300.font-bold.mb-2 Kwaliteitscontrole
                  p.text-gray-300 We gebruiken binomiale verdelingen om te bepalen hoeveel antwoorden we steekproefsgewijs moeten controleren om een bepaalde betrouwbaarheid te garanderen.
                div.bg-gray-800.bg-opacity-70.p-4.rounded-lg
                  h4.text-blue-300.font-bold.mb-2 Betrouwbaarheidsintervallen
                  p.text-gray-300 Voor elke beoordeling berekenen we betrouwbaarheidsintervallen die aangeven hoe zeker we zijn van de gegeven score.
                div.bg-gray-800.bg-opacity-70.p-4.rounded-lg
                  h4.text-blue-300.font-bold.mb-2 Interfereren
                  p.text-gray-300 Als we na meer testen nog steeds geen betrokkenheid kunnen garanderen, zullen we de vraag markeren als 'docent nakijken'.

    // Few-Shot Learning Section
    section#few-shot-learning.py-20.px-6.md_px-12
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        span.text-blue-400 Few-Shot Learning
        |  uitgelegd
      div.max-w-6xl.mx-auto
        div.feature-card.mb-12(data-aos="fade-up")
          h3.text-xl.font-bold.mb-3 Wat is Few-Shot Learning?
          p.text-gray-300
            | Few-Shot Learning is een machine learning-techniek waarbij een model leert om nieuwe taken uit te voeren met slechts enkele voorbeelden, in tegenstelling tot traditionele methoden die duizenden voorbeelden vereisen.
          p.text-gray-300.mt-4
            | Het is te vergelijken met hoe een mens kan leren: als je een paar voorbeelden ziet van hoe een vraag moet worden beoordeeld, kun je dat patroon herkennen en toepassen op nieuwe situaties.
        v-row.gap-10
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-right")
              div.icon-wrapper
                i.fas.fa-lightbulb
              h3.text-xl.font-bold.mb-3 Hoe passen wij het toe?
              p.text-gray-300.mb-4
                | In ons nakijksysteem gebruiken we few-shot learning door:
              ul.text-gray-300.list-disc.ml-6.space-y-2
                li Het AI-model 3-5 voorbeelden te geven van hoe een antwoord moet worden beoordeeld
                li Het modelantwoord en een rubric met beoordelingscriteria mee te geven
                li Enkele voorbeelden te tonen van foute antwoorden en waarom these fout zijn
                li Het model te laten generaliseren naar nieuwe antwoorden
          v-col(cols="12" md="6")
            div.feature-card(data-aos="fade-left")
              div.icon-wrapper
                i.fas.fa-trophy
              h3.text-xl.font-bold.mb-3 Voordelen
              p.text-gray-300.mb-4
                | De voordelen van few-shot learning in ons systeem zijn:
              ul.text-gray-300.list-disc.ml-6.space-y-2
                li Snelle aanpassing aan nieuwe vraagtypen zonder uitgebreide hertraining
                li Docenten kunnen het systeem aanpassen zonder AI-expertise
                li Het systeem kan werken voor zeldzame vraagtypen waarvoor weinig trainingsdata beschikbaar is
                li Minder afhankelijkheid van grote datasets, wat de privacy van leerlingen beschermt
                li Betere prestaties bij complexe beoordelingen die context-afhankelijk zijn
        div.feature-card.mt-10(data-aos="fade-up")
          h3.text-xl.font-bold.mb-5 Praktijkvoorbeeld
          div.bg-gray-800.bg-opacity-70.p-6.rounded-lg.mb-6
            h4.text-blue-300.font-bold.mb-3 Voorbeeld van few-shot prompt voor scheikunde
            div.bg-gray-900.p-4.rounded.text-gray-300.font-mono.text-sm.overflow-auto
              p.mb-3
                span.text-blue-400 Vraag:
                |  Leg uit waarom water een hoger kookpunt heeft dan methaan.
              p.mb-3
                span.text-blue-400 Modelantwoord:
                |  Water heeft een hoger kookpunt dan methaan omdat watermoleculen onderling waterstofbruggen vormen. This zijn sterke intermoleculaire bindingen die meer energie (warmte) vereisen om te verbreken dan de zwakke vanderwaalskrachten tussen methaanmoleculen.
              p.mb-3
                span.text-blue-400 Rubric:
                |  [2 punten voor uitleg over waterstofbruggen, 1 punt voor vergelijking met vanderwaalskrachten, 1 punt voor link met benodigde energie]
              hr.my-4.border-gray-700
              p.mb-3
                span.text-green-400 Voorbeeld 1 (4/4 punten):
                |  "Water heeft waterstofbruggen tussen de moleculen. These waterstofbruggen zijn sterker dan de vanderwaalskrachten tussen methaanmoleculen. Daarom is er meer energie nodig om watermoleculen uit elkaar te halen, wat leidt tot een hoger kookpunt."
              p.mb-3
                span.text-yellow-400 Voorbeeld 2 (3/4 punten):
                |  "Watermoleculen hebben waterstofbruggen die sterker zijn dan de krachten tussen methaanmoleculen. Daarom heeft water een hoger kookpunt." [Mist expliciete link met benodigde energie]
              p
                span.text-red-400 Voorbeeld 3 (1/4 punten):
                |  "Water heeft een hoger kookpunt omdat het polair is en methaan niet." [Noemt alleen polariteit, niet specifiek waterstofbruggen of vergelijking]
          p.text-gray-300
            | Met slechts these drie voorbeelden kan ons AI-model nieuwe antwoorden beoordelen met een nauwkeurigheid die vergelijkbaar is met die van een docent. Het model begrijpt welke elementen belangrijk zijn in het antwoord en hoe het punten moet toekennen volgens de rubric.
    // END: Sections from nakijken.html

    // Learnt Section (from index.html)
    section#analyseren.py-20.px-6.md_px-12.bg-gray-900.bg-opacity-50
      h2.text-3xl.md_text-4xl.font-bold.mb-16.text-center(data-aos="fade-up")
        | Wat hebben wij 
        span.text-blue-400 geleerd
        | ?
      v-row.gap-10.max-w-6xl.mx-auto
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-right" data-aos-delay="200")
            div.icon-wrapper
              i.fas.fa-search
            h3.text-xl.font-bold.mb-3 Onderzoek
            ul.text-gray-300.space-y-2
              li • Meer dan 14 AI-modellen met elkaar vergeleken in meer dan 15.000 geautomatiseerde API-requests
              li • Onderzoek naar verschillende type AI-modellen en hun toepassingen, zoals: YOLO, diffusion, FFN, LLM's, latent-space-models etc.
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-left" data-aos-delay="300")
            div.icon-wrapper
              i.fas.fa-poll
            h3.text-xl.font-bold.mb-3 Enquête
            ul.text-gray-300.space-y-2
              li • Enquête afgenomen bij 51 docenten met verschillende achtergronden
              li • Vragen met specifiek doel gesteld, geen dubbele vragen of verschillend interpreteerbare vragen
              li • Statistische analyse d.m.v. draaitabellen, t-tests en een correlatie matrix
              li • Analyse m.b.v. AI-modellen om open vragen te analyseren en samen te vatten
              li • Duidelijke doelstelling voor ons onderzoek geformuleerd
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-right" data-aos-delay="400")
            div.icon-wrapper
              i.fas.fa-flask
            h3.text-xl.font-bold.mb-3 Praktijktest
            ul.text-gray-300.space-y-2
              li • Een scheikunde toets gemaakt voor een 3e klas en die gegeven
              li • Onze zelfontwikkelde blaadjes uitgelegd en de 3e klas begreep het in één keer
              li • De feedback blaadjes aan docent gegeven om aan de leerlingen uit te delen
        v-col(cols="12" md="6")
          div.feature-card(data-aos="fade-left" data-aos-delay="500")
            div.icon-wrapper
              i.fas.fa-code
            h3.text-xl.font-bold.mb-3 Onderzoek uitvoeren
            ul.text-gray-300.space-y-2
              li • Voornamelijk met Python (onderzoek ongeveer 4000 regels code)
              li • GitHub voor opslag
              li • Google Sheets voor analyse
              li • Python libraries zoals: Flask, Jinja, Jedi, Imutils, NumPy, Pandas, Pydantic, PyZbar, Segno, Scikit-image, SymPy, Torch, TorchVision, UV, Ultralytics, OpenCV-Python en TQDM
        v-col(cols="12")
          div.feature-card(data-aos="fade-up" data-aos-delay="600")
            div.icon-wrapper
              i.fas.fa-server
            h3.text-xl.font-bold.mb-3 Backend (veilig systeem dat de berekeningen doet)
            ul.text-gray-300.space-y-2
              li • 3 Python Flask servers op GCP (Google Cloud Platform): Hoofdserver, AI/GPT server en document-maak-server
              li • Route handling en onderzoek functies omgezet naar publieke routes die bestanden kunnen ontvangen en versturen
              li • GitHub voor code opslag
              li • 3500 regels handgeschreven Python
              li • Error handling geïmplementeerd

  footer.py-8.px-6.md_px-12.bg-gray-900.bg-opacity-80
    div.flex.flex-col.md_flex-row.justify-between.items-center
      div.flex.items-center.mb-4.md_mb-0
        div.text-blue-400.text-xl.mr-2
          i.fas.fa-robot
        h1.text-xl.font-bold.text-blue-300 PWS Joost & Jonathan
      p.text-gray-400 2025 gemaakt ter presentatie PWS

  canvas#particles-canvas(ref="particlesCanvasRef" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; pointer-events: none;")

</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import AOS from "aos";
import "aos/dist/aos.css"; // Import AOS styles
import { Chart, registerables } from "chart.js/auto"; // Import Chart.js

Chart.register(...registerables); // Register necessary components

const headerRef = ref(null);
const particlesCanvasRef = ref(null);
let animationFrameId = null;
const particles = [];

// Refs for charts and inputs
const modelComparisonChartRef = ref(null);
const binomialChartRef = ref(null);
const binomialNRef = ref(null);
const binomialPRef = ref(null);
const binomialNValueRef = ref(null);
const binomialPValueRef = ref(null);

let modelChartInstance = null;
let binomialChartInstance = null;

// Reactive refs for binomial chart inputs
const binomialN = ref(20); // Default value
const binomialPInput = ref(50); // Default value for slider (1-99)
const binomialP = ref(0.5); // Actual probability value (0.01-0.99)

// Watch for changes in the slider value and update the actual probability
watch(binomialPInput, (newValue) => {
  binomialP.value = newValue / 100;
});

// Smooth scrolling function
const smoothScroll = (targetId) => {
  const targetElement = document.querySelector(targetId);
  if (targetElement) {
    window.scrollTo({
      top: targetElement.offsetTop - 100, // Adjust offset for sticky header
      behavior: "smooth",
    });
  }
};

// Header scroll effect handler - No longer needed as header is removed
// const handleScroll = () => {
//   const header = headerRef.value;
//   if (header) {
//     if (window.scrollY > 100) {
//         header.style.backdropFilter = 'blur(10px)';
//         header.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
//         header.style.padding = '0.75rem 1.5rem';
//     } else {
//         header.style.backdropFilter = 'blur(5px)';
//         header.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
//         header.style.padding = '1rem 1.5rem';
//     }
//   }
// };

// --- Particle Effect Logic ---
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
    this.color = `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.1})`;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > this.canvas.width) {
      this.speedX = -this.speedX;
    }
    if (this.y < 0 || this.y > this.canvas.height) {
      this.speedY = -this.speedY;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  const canvas = particlesCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  particles.length = 0; // Clear existing particles

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  let resizeListener = () => resizeCanvas(); // Store listener reference
  window.addEventListener("resize", resizeListener);

  const particleCount = Math.min(
    Math.max(window.innerWidth, window.innerHeight) / 10,
    100
  );
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(canvas));
  }

  animateParticles(ctx, canvas);

  // Cleanup resize listener on component unmount
  onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeListener);
  });
}

function animateParticles(ctx, canvas) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw(ctx);

    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - distance / 150)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  animationFrameId = requestAnimationFrame(() => animateParticles(ctx, canvas));
}
// --- End Particle Effect Logic ---

// --- Chart Logic ---
function binomialCoefficient(n, k) {
  let res = 1;
  if (k < 0 || k > n) return 0; // Added boundary check
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k; // Optimization

  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return res;
}

function binomialProbability(n, k, p) {
  if (p < 0 || p > 1) return 0; // Added boundary check
  const coef = binomialCoefficient(n, k);
  // Handle potential precision issues for large n or extreme p
  if (coef === 0) return 0;
  try {
    const term1 = Math.pow(p, k);
    const term2 = Math.pow(1 - p, n - k);
    // Check for NaN or Infinity which can happen with Math.pow(0,0) or large exponents
    if (!isFinite(term1) || !isFinite(term2)) {
      // Fallback or alternative calculation might be needed for extreme cases
      // For now, returning 0 to avoid crashing the chart
      console.warn(
        `Binomial probability calculation resulted in non-finite number for n=${n}, k=${k}, p=${p}`
      );
      return 0;
    }
    return coef * term1 * term2;
  } catch (error) {
    console.error("Error calculating binomial probability:", error);
    return 0; // Prevent chart errors
  }
}

function updateBinomialChart() {
  if (!binomialChartInstance || !binomialChartRef.value) return;

  const nVal = parseInt(binomialN.value); // Use reactive ref value
  const pVal = parseFloat(binomialP.value); // Use reactive ref value

  const labels = [];
  const data = [];

  for (let k = 0; k <= nVal; k++) {
    labels.push(k);
    const prob = binomialProbability(nVal, k, pVal);
    data.push(isNaN(prob) ? 0 : prob); // Ensure data is always a number
  }

  binomialChartInstance.data.labels = labels;
  binomialChartInstance.data.datasets[0].data = data;
  binomialChartInstance.update();
}

// Watch for changes in n and p to update the binomial chart
watch([binomialN, binomialP], updateBinomialChart);

function initializeCharts() {
  // Model Comparison Chart
  const modelCtx = modelComparisonChartRef.value?.getContext("2d");
  if (modelCtx && !modelChartInstance) {
    modelChartInstance = new Chart(modelCtx, {
      type: "bar",
      data: {
        labels: ["Gemini-2.0-flash", "GPT-4o", "gemini-1.5-pro", "GPT-4o-mini", "Mode van alles"],
        datasets: [
          {
            label: "Correlatie met menselijke beoordelaars",
            data: [0.97, 0.85, 0.87, 0.90, 0.93],
            backgroundColor: [
              "rgba(59, 130, 246, 0.8)",
              "rgba(59, 130, 246, 0.6)",
              "rgba(59, 130, 246, 0.6)",
              "rgba(59, 130, 246, 0.6)",
              "rgba(59, 130, 246, 0.7)",
            ],
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: { color: "rgba(255, 255, 255, 0.7)" },
          },
          x: {
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: { color: "rgba(255, 255, 255, 0.7)" },
          },
        },
        plugins: {
          legend: { labels: { color: "rgba(255, 255, 255, 0.7)" } },
        },
      },
    });
  }

  // Binomial Distribution Chart
  const binomialCtx = binomialChartRef.value?.getContext("2d");
  if (binomialCtx && !binomialChartInstance) {
    binomialChartInstance = new Chart(binomialCtx, {
      type: "bar",
      data: {
        labels: [], // Initial empty labels
        datasets: [
          {
            label: "Kans",
            data: [], // Initial empty data
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              // Format y-axis ticks as percentages if desired
              // callback: function(value) { return (value * 100).toFixed(0) + '%'; }
            },
          },
          x: {
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: { color: "rgba(255, 255, 255, 0.7)" },
          },
        },
        plugins: {
          legend: { labels: { color: "rgba(255, 255, 255, 0.7)" } },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  // Format tooltip value as percentage
                  label += (context.parsed.y * 100).toFixed(2) + "%";
                }
                return label;
              },
            },
          },
        },
      },
    });
    updateBinomialChart(); // Initial chart draw
  }
}
// --- End Chart Logic ---

onMounted(() => {
  // Initialize AOS
  AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: false,
    mirror: true,
  });

  // Add scroll listener for header - No longer needed
  // window.addEventListener('scroll', handleScroll);

  // Initialize particles
  initParticles();

  // Initialize Charts
  initializeCharts();
});

onBeforeUnmount(() => {
  // Remove scroll listener - No longer needed
  // window.removeEventListener('scroll', handleScroll);

  // Cancel particle animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Destroy charts
  if (modelChartInstance) {
    modelChartInstance.destroy();
    modelChartInstance = null;
  }
  if (binomialChartInstance) {
    binomialChartInstance.destroy();
    binomialChartInstance = null;
  }
});
</script>

<style scoped>
/* Styles from thannie_front_page/styles.css */

/* Main Styles */
/* body styles applied to the root div */
div {
  font-family: "Inter", sans-serif; /* Ensure Inter font is loaded globally */
  scroll-behavior: smooth;
  position: relative; /* Establish stacking context for z-index */
}

/* Header Animation - handled by script now */

/* Feature Cards */
.feature-card {
  background-color: rgba(31, 41, 55, 0.7);
  border-radius: 1rem;
  padding: 2rem;
  transition: all 0.3s ease;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2),
    0 10px 10px -5px rgba(0, 0, 0, 0.1);
  background-color: rgba(31, 41, 55, 0.9);
}

.icon-wrapper {
  font-size: 2rem;
  color: #3b82f6;
  margin-bottom: 1.5rem;
  width: 60px;
  height: 60px;
  background-color: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.feature-card:hover .icon-wrapper {
  background-color: rgba(59, 130, 246, 0.2);
  transform: scale(1.1);
}

/* Testimonial Cards (If needed later) */
.testimonial-card {
  background-color: rgba(31, 41, 55, 0.7);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-bottom: 4px solid #3b82f6;
}

.testimonial-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2),
    0 10px 10px -5px rgba(0, 0, 0, 0.1);
  background-color: rgba(31, 41, 55, 0.9);
}

/* How It Works Section */
.steps-container {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.steps-container::before {
  content: "";
  position: absolute;
  width: 4px;
  background-color: #3b82f6;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1; /* Adjusted z-index */
}

.step {
  display: flex;
  align-items: center;
  margin-bottom: 4rem;
  position: relative; /* Added for z-index context */
  z-index: 2; /* Ensure steps are above the line */
}

.step:nth-child(odd) {
  flex-direction: row-reverse;
}

.step-number {
  width: 60px;
  height: 60px;
  background-color: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 2rem;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
  flex-shrink: 0; /* Prevent shrinking */
  z-index: 3; /* Ensure number is above content */
}

.step-content {
  flex: 1;
  background-color: rgba(31, 41, 55, 0.7);
  padding: 1.5rem;
  border-radius: 1rem;
  transition: all 0.3s ease;
  max-width: calc(50% - 5rem); /* Adjusted from original */
  min-width: 200px; /* Added minimum width */
  position: relative; /* Added for z-index context */
  z-index: 2; /* Ensure content is above the line */
}

.step:hover .step-content {
  transform: translateX(10px);
  background-color: rgba(31, 41, 55, 0.9);
}

.step:nth-child(odd):hover .step-content {
  transform: translateX(-10px);
}

/* Floating Animation */
.floating-animation {
  animation: floating 5s ease-in-out infinite;
  position: absolute

}

.floating-animation-slow {
  animation: floating 7s ease-in-out infinite;
}

@keyframes floating {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-15px);
  }
  100% {
    transform: translateY(0px);
  }
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .steps-container::before {
    left: 30px; /* Adjusted from 30px */
    transform: translateX(0);
  }

  .step,
  .step:nth-child(odd) {
    flex-direction: row;
  }

  .step-number {
    margin-left: 0;
    margin-right: 1.5rem;
  }

  .step-content {
    max-width: calc(100% - 60px - 1.5rem - 1rem); /* Adjusted calculation */
  }

  .step:hover .step-content,
  .step:nth-child(odd):hover .step-content {
    transform: translateX(5px);
  }
}

/* Scrollbar Styling (Might not work in scoped styles, better globally) */
/* Consider moving scrollbar styles to a global CSS file like src/style.css */
/* ::-webkit-scrollbar {
    width: 10px;
}

::-webkit-scrollbar-track {
    background: #1f2937;
}

::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: #2563eb;
} */

/* Form Focus Animations (If forms are added later) */
input:focus,
textarea:focus {
  transform: scale(1.01);
}

/* Button Animations */
button {
  overflow: hidden;
  position: relative;
}

button::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.1);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.5s ease;
}

button:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* Gradient Text Animation */
@keyframes gradientText {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.hero-section h2 span,
h2 span {
  /* Ensure this doesn't conflict with Tailwind text-blue-400 */
  /* background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6); */
  /* background-size: 200% auto; */
  /* background-clip: text; */
  /* -webkit-background-clip: text; */
  /* color: transparent; */ /* Required for background-clip: text */
  /* animation: gradientText 3s linear infinite; */
  /* Reverted to simple color due to complexity and potential conflicts */
  color: #60a5fa; /* Using a color from the gradient */
}

/* Ensure FontAwesome icons work if library is loaded */
[class^="fa-"],
[class*=" fa-"] {
  font-family: "Font Awesome 6 Free" !important; /* Adjust if using different version */
  font-weight: 900;
}

/* Style for range inputs */
input[type="range"] {
  -webkit-appearance: none; /* Override default look */
  appearance: none;
  width: 100%; /* Full-width */
  height: 8px; /* Specified height */
  background: #374151; /* Grey background */
  outline: none; /* Remove outline */
  opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
  -webkit-transition: 0.2s; /* 0.2 seconds transition on hover */
  transition: opacity 0.2s;
  border-radius: 5px;
}

input[type="range"]:hover {
  opacity: 1; /* Fully opaque on hover */
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; /* Override default look */
  appearance: none;
  width: 20px; /* Set a specific slider handle width */
  height: 20px; /* Slider handle height */
  background: #3b82f6; /* Blue background */
  cursor: pointer; /* Cursor on hover */
  border-radius: 50%; /* Circular thumb */
}

input[type="range"]::-moz-range-thumb {
  width: 20px; /* Set a specific slider handle width */
  height: 20px; /* Slider handle height */
  background: #3b82f6; /* Blue background */
  cursor: pointer; /* Cursor on hover */
  border-radius: 50%; /* Circular thumb */
  border: none; /* Remove border in Firefox */
}

#particles-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
