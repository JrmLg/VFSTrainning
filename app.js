let dataType = ''
let allFigures = []
let selectedFigures = []
let currentFigure = null
let feedbackHistory = []
const MAX_FEEDBACK = 10
let currentStep = 0
let totalSteps = 0
let currentPhase = ''

function startSelection(type) {
  dataType = type
  document.getElementById('menu').classList.add('hidden')
  fetch(`${type}s.json`)
    .then((res) => res.json())
    .then((data) => {
      allFigures = data.map((f) => ({ ...f, score: 0 }))

      allFigures.forEach((f) => {
        const img = new Image()
        img.src = f.image
      })
      showSelectionScreen()
    })
}

function showSelectionScreen() {
  const container = document.getElementById('selection')
  container.classList.remove('hidden')

  const listHTML = allFigures
    .map(
      (f) =>
        `<label class="figure-item">
      <input type="checkbox" class="figure-checkbox" name="figures" value="${f.id}"  />
      ${f.id} - ${f.name}
    </label>`,
    )
    .join('')

  container.innerHTML = `
    <h2>Sélectionne les ${dataType}s</h2>

    <div class="control-buttons">
      <button type="button" class="control-button toggle-check green" onclick="toggleCheckboxes(true)">
        Tout sélectionner
      </button>
      <button type="button" class="control-button toggle-check red" onclick="toggleCheckboxes(false)">
        Tout désélectionner
      </button>
    </div>

    <div style="text-align: center; margin-bottom: 10px;">
      <p>Choix aléatoire :</p>
      <div class="control-buttons">
        ${[4, 5, 6, 7, 8, 9, 10]
          .map((n) => `<button type="button" class="control-button checkbox-button" onclick="selectRandomFigures(${n})">${n}</button>`)
          .join('')}
      </div>
    </div>

    <form id="selectionForm">
      <div id="figuresList">
        ${listHTML}
      </div>
      <button type="submit" id="startButton" disabled>Commencer</button>
    </form>
  `
  const checkboxes = document.querySelectorAll('.figure-checkbox')
  const checkboxButtons = document.querySelectorAll('.checkbox-button')
  const startButton = document.getElementById('startButton')
  const toggleCheckers = document.querySelectorAll('.toggle-check')

  function updateStartButtonState() {
    const anyChecked = [...checkboxes].some((cb) => cb.checked)
    startButton.disabled = !anyChecked
  }

  checkboxButtons.forEach((btn) => btn.addEventListener('click', updateStartButtonState))
  toggleCheckers.forEach((btn) => btn.addEventListener('click', updateStartButtonState))
  checkboxes.forEach((cb) => cb.addEventListener('change', updateStartButtonState))
  updateStartButtonState()

  document.getElementById('selectionForm').onsubmit = (e) => {
    e.preventDefault()
    const selected = [...document.querySelectorAll('input[name="figures"]:checked')].map((cb) => cb.value)
    selectedFigures = allFigures.filter((f) => selected.includes(f.id)).map((f) => ({ ...f, score: 0 }))
    document.getElementById('selection').classList.add('hidden')
    startLearningPhase()
  }
}

function toggleCheckboxes(state) {
  const checkboxes = document.querySelectorAll('.figure-checkbox')
  checkboxes.forEach((cb) => (cb.checked = state))
}

function selectRandomFigures(count) {
  if (!count || count < 1) return

  const shuffled = shuffleArray([...allFigures])
  const selected = shuffled.slice(0, count)
  const checkboxes = document.querySelectorAll('.figure-checkbox')

  checkboxes.forEach((cb) => {
    cb.checked = selected.some((f) => f.id === cb.value)
  })
}

function startLearningPhase() {
  const container = document.getElementById('exercise')
  container.classList.remove('hidden')

  currentStep = 0
  totalSteps = selectedFigures.length
  currentPhase = 'Apprentissage'
  feedbackHistory = []
  updateFeedbackUI()
  updateProgress(currentPhase)

  let i = 0

  function showFigure() {
    if (i >= selectedFigures.length) {
      startQuizPhase()
      return
    }

    const f = selectedFigures[i]
    container.innerHTML = `
      <br>
      <div class="exercise-header">
        <h2>${f.id} - ${f.name}</h2>
      </div>

      <div class="exercise-image">
        <img src="${f.image}" alt="${f.name}" />
      </div>


      <div class="exercise-options">
        <button onclick="skipLearning()" style="margin-left:10px;">Passer l'apprentissage</button>
        <button onclick="next()">Suivant</button>
      </div>
    `

    function next() {
      i++
      currentStep++
      updateProgress(currentPhase)
      showFigure()
    }

    window.next = next
  }

  showFigure()
}

function skipLearning() {
  startQuizPhase()
}

function quitTraining() {
  currentStep = 0
  totalSteps = 0
  currentPhase = ''
  feedbackHistory = []

  updateFeedbackUI()
  updateProgress('')

  document.getElementById('exercise').classList.add('hidden')
  document.getElementById('statusContainer').classList.add('hidden')
  document.getElementById('menu').classList.remove('hidden')
}

function startQuizPhase() {
  currentPhase = 'Entraînement'
  currentStep = 0
  feedbackHistory = []
  updateFeedbackUI()
  updateProgress(currentPhase)
  askQuestion()
}

function askQuestion() {
  // Vérifie si toutes les figures ont un score >= 3
  const allLearned = selectedFigures.every((f) => f.score >= 3)

  if (allLearned) {
    document.getElementById('exercise').innerHTML = `<h2>Bravo, entraînement terminé 🎉</h2>`
    // Cacher la barre de progression
    document.getElementById('statusContainer').classList.add('hidden')

    setTimeout(() => {
      document.getElementById('exercise').classList.add('hidden')
      document.getElementById('menu').classList.remove('hidden')

      // Réinitialiser progression et variables
      currentStep = 0
      totalSteps = 0
      currentPhase = ''
      feedbackHistory = []
      updateFeedbackUI()
    }, 3000)
    return
  }

  // Génère les candidats
  const candidates = selectedFigures.flatMap((f) => {
    if (f.score < 3) return Array(3).fill(f) // figures non maîtrisées plus fréquentes
    if (Math.random() < 0.1) return [f] // 10% chance de revoir une figure maîtrisée
    return []
  })

  // Prendre une figure au hasard
  const shuffledCandidates = shuffleArray(candidates)
  currentFigure = shuffledCandidates[Math.floor(Math.random() * shuffledCandidates.length)]

  const questionType = pickQuestionType()
  const html = renderQuestion(currentFigure, questionType)
  document.getElementById('exercise').innerHTML = `
  ${html}
  <button onclick="quitTraining()" style="margin-top:10px; background:#f44336; color:white;">Quitter l'entraînement</button>
`
  updateProgress(currentPhase)
}

function pickQuestionType() {
  const types = ['img-to-name', 'name-to-img', 'id-to-name', 'name-to-id']
  return types[Math.floor(Math.random() * types.length)]
}

function renderQuestion(figure, type) {
  const options = getRandomOptions(figure)
  const shuffled = shuffleArray([figure, ...options.slice(0, 3)])

  switch (type) {
    case 'img-to-name':
      return `
        <h2>Quel est le nom de ce ${dataType} ?</h2>
        <div class="exercise-image">
          <img src="${figure.image}" alt="question" />
        </div>
        <div class="compact-options">
          ${renderOptions(shuffled, 'name')}
        </div>
      `
    case 'name-to-img':
      return `
        <h2>Quelle est l'image de : ${figure.name} ?</h2>
        <div class="exercise-image-options ${dataType}">
          ${renderOptions(shuffled, 'image')}
        </div>
      `
    case 'id-to-name':
      return `
        <br>
        <h2>Quel est le nom du ${dataType} ${figure.id} ?</h2>
        <div class="standard-options">
          ${renderOptions(shuffled, 'name')}
        </div>
      `
    case 'name-to-id':
      return `
        <br>
        <h2>Quelle est ${dataType == 'bloc' ? 'le numéro' : 'la lettre'} de : ${figure.name} ?</h2>
        <div class="standard-options">
          ${renderOptions(shuffled, 'id')}
        </div>
      `
  }
}

function renderOptions(figures, field) {
  return figures
    .map((f) => {
      if (field === 'image') {
        return `<img src="${f.image}" class="option-img" onclick="checkAnswer('${f.id}')"/>`
      } else {
        return `<button onclick="checkAnswer('${f.id}')">${f[field]}</button>`
      }
    })
    .join(' ')
}

function checkAnswer(chosenId) {
  const correct = chosenId === currentFigure.id

  if (correct) {
    currentFigure.score++
  } else {
    currentFigure.score = 0

    const wrongFigure = selectedFigures.find((f) => f.id === chosenId)
    if (wrongFigure && wrongFigure.id !== currentFigure.id) {
      wrongFigure.score = Math.max(0, wrongFigure.score - 1)
    }
  }
  updateProgress(currentPhase)

  feedbackHistory.push({
    result: correct ? 'correct' : 'wrong',
    number: feedbackHistory.length + 1,
  })
  if (feedbackHistory.length > MAX_FEEDBACK) {
    feedbackHistory.shift()
  }

  updateFeedbackUI()
  setTimeout(() => askQuestion(), 500) // petit délai avant la prochaine question
}

function updateFeedbackUI() {
  const container = document.getElementById('feedbackHistory')
  container.classList.remove('hidden')
  container.innerHTML = feedbackHistory
    .map((item) => {
      const cls = item.result === 'correct' ? 'feedback-correct' : 'feedback-wrong'
      const symbol = item.result === 'correct' ? '✓' : '✗'
      return `<div class="feedback-dot ${cls}" data-tooltip="Question ${item.number}">${symbol}</div>`
    })
    .join('')
}

function getRandomOptions(excludeFigure) {
  return shuffleArray(selectedFigures.filter((f) => f.id !== excludeFigure.id))
}

function shuffleArray(arr) {
  let copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function updateProgress(statusLabel) {
  const statusDiv = document.getElementById('statusContainer')
  const progressBar = document.getElementById('progressBar')
  const progressLabel = document.getElementById('progressLabel')

  statusDiv.classList.remove('hidden')

  let percent = 0

  if (currentPhase === 'Apprentissage') {
    percent = Math.round((currentStep / totalSteps) * 100)
  } else if (currentPhase === 'Entraînement') {
    const currentTotal = selectedFigures.reduce((sum, f) => sum + Math.min(f.score, 3), 0)
    const maxTotal = selectedFigures.length * 3
    percent = Math.round((currentTotal / maxTotal) * 100)
  }

  progressBar.style.width = percent + '%'
  progressLabel.textContent = `Phase : ${statusLabel} - ${percent}%`
}
