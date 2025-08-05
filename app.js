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
  fetch(`${type}.json`)
    .then((res) => res.json())
    .then((data) => {
      allFigures = data.map((f) => ({ ...f, score: 0 }))
      showSelectionScreen()
    })
}

function showSelectionScreen() {
  const container = document.getElementById('selection')
  container.classList.remove('hidden')

  const listHTML = allFigures
    .map(
      (f) =>
        `<label>
      <input type="checkbox" class="figure-checkbox" name="figures" value="${f.id}" checked />
      ${f.id} - ${f.name}
    </label><br>`,
    )
    .join('')

  container.innerHTML = `
    <h2>Sélectionne les ${dataType}</h2>

    <div class="control-buttons">
      <button type="button" class="control-button green" onclick="toggleCheckboxes(true)">🟩</button>
      <button type="button" class="control-button red" onclick="toggleCheckboxes(false)">🟥</button>
    </div>

    <div style="text-align: center; margin-bottom: 10px;">
      <p>Choix aléatoire :</p>
      <div class="control-buttons">
        ${[4, 5, 6, 7, 8, 9, 10]
          .map((n) => `<button type="button" class="control-button" onclick="selectRandomFigures(${n})">${n}</button>`)
          .join('')}
      </div>
    </div>

    <form id="selectionForm">
      <div id="figuresList">
        ${listHTML}
      </div>
      <button type="submit">Commencer</button>
    </form>
  `

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
      <h2>${f.id} - ${f.name}</h2>
      <img src="${f.image}" alt="${f.name}" />
      <br>
      <button onclick="next()">Suivant</button>
      <button onclick="skipLearning()" style="margin-left:10px;">Passer l'apprentissage</button>
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
  // Réinitialiser variables
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
  <br><button onclick="quitTraining()" style="margin-top:10px; background:#f44336; color:white;">Quitter l'entraînement</button>
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
        <h2>Quel est le nom de cette figure ?</h2>
        <img src="${figure.image}" alt="question" />
        <br>${renderOptions(shuffled, 'name')}
      `
    case 'name-to-img':
      return `
        <h2>Quelle est l'image de : ${figure.name} ?</h2>
        ${renderOptions(shuffled, 'image')}
      `
    case 'id-to-name':
      return `
        <h2>Quel est le nom de la figure ${figure.id} ?</h2>
        ${renderOptions(shuffled, 'name')}
      `
    case 'name-to-id':
      return `
        <h2>Quelle est la lettre ou le numéro de : ${figure.name} ?</h2>
        ${renderOptions(shuffled, 'id')}
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
  }

  // Ajouter au tableau d’historique
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
  const gameStatus = document.getElementById('gameStatus')
  const progressBar = document.getElementById('progressBar')
  const progressText = document.getElementById('progressText')

  statusDiv.classList.remove('hidden')
  gameStatus.textContent = `Phase : ${statusLabel}`

  let percent = 0

  if (statusLabel === 'Apprentissage') {
    percent = Math.round((currentStep / totalSteps) * 100)
  } else if (statusLabel === 'Entraînement') {
    const totalScore = selectedFigures.reduce((sum, f) => sum + Math.min(f.score, 3), 0)
    const maxScore = selectedFigures.length * 3
    percent = Math.round((totalScore / maxScore) * 100)
  }

  progressBar.style.width = percent + '%'
  progressText.textContent = `${percent}%`
}
