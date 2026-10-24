console.log('app.js підключено');

// Прибираємо статичну заглушку з HTML
const placeholder = document.querySelector('#questions-placeholder');
if (placeholder) {
  placeholder.remove();
}

// Дані: питання з варіантами відповіді; answer — текст правильної відповіді
const questions = [
  { question: 'Яка мова розмітки використовується для структури вебсторінок?', options: ['HTML', 'CSS', 'Python', 'SQL'], answer: 'HTML' },
  { question: 'Яка мова відповідає за стилі сторінки?', options: ['HTML', 'CSS', 'JavaScript', 'Java'], answer: 'CSS' },
  { question: 'Яка мова робить вебсторінки інтерактивними?', options: ['XML', 'JavaScript', 'SQL', 'Markdown'], answer: 'JavaScript' },
  { question: 'Який тег позначає головний заголовок сторінки?', options: ['header', 'title', 'h1', 'main'], answer: 'h1' },
  { question: 'Яка CSS-технологія створює двовимірну сітку?', options: ['Flexbox', 'Float', 'Position', 'Grid'], answer: 'Grid' }
];

// Стан вікторини
let currentIndex = 0;
let score = 0;
let isChecked = false;
let isFinished = false;
const answeredIndexes = new Set();

// Вибираємо елементи сторінки
const quizForm = document.querySelector('#quiz-form');
const questionText = document.querySelector('#question-text');
const answersContainer = document.querySelector('#answers');
const questionCurrent = document.querySelector('#question-current');
const questionTotal = document.querySelector('#question-total');
const progressBar = document.querySelector('#progress');
const feedback = document.querySelector('#feedback');
const checkBtn = document.querySelector('#check-btn');
const nextBtn = document.querySelector('#next-btn');
const questionsList = document.querySelector('#questions-list');
const questionsCount = document.querySelector('#questions-count');

// Виводить у консоль усі питання вікторини
function printQuestions(list) {
  console.log(`Усього питань: ${list.length}`);
  for (const item of list) {
    console.log(`- ${item.question}`);
  }
}

// Стрілкова функція: переводить кількість правильних відповідей у відсотки
const calcScorePercent = (correctCount, total) => Math.round(correctCount / total * 100);

// Стрілкова функція: повертає індекс правильної відповіді в масиві options
const getCorrectIndex = item => item.options.indexOf(item.answer);

// Рендер списку всіх питань: li з текстом, атрибутом data-answer
// і класом answered для питань, на які вже відповіли
function renderQuestions(list) {
  questionsList.innerHTML = '';
  list.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = item.question;
    li.dataset.answer = item.answer;
    if (answeredIndexes.has(index)) {
      li.classList.add('answered');
    }
    questionsList.append(li);
  });
}

// Оновлює вміст наявного елемента-підсумку: кількість питань
const updateQuestionsCount = list => {
  questionsCount.textContent = `Усього питань: ${list.length}`;
};

// Малює поточне питання: лічильник, прогрес і radio-кнопки з варіантами
function renderQuestion() {
  const item = questions[currentIndex];
  isChecked = false;

  questionText.textContent = item.question;
  questionCurrent.textContent = currentIndex + 1;
  questionTotal.textContent = `з ${questions.length}`;
  progressBar.max = questions.length;
  progressBar.value = currentIndex + 1;
  progressBar.textContent = `${currentIndex + 1} з ${questions.length}`;

  feedback.textContent = '';
  feedback.className = 'feedback';
  answersContainer.innerHTML = '';
  answersContainer.classList.remove('answers-grid--locked');

  item.options.forEach((optionText, index) => {
    const label = document.createElement('label');
    label.className = 'answer-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = index;
    input.required = true;

    const text = document.createElement('span');
    text.className = 'answer-btn';
    text.textContent = optionText;

    label.append(input, text);
    answersContainer.append(label);
  });

  checkBtn.disabled = false;
  nextBtn.disabled = true;
  nextBtn.textContent = currentIndex === questions.length - 1 ? 'Показати результат' : 'Наступне питання';
}

// Додає до кнопки відповіді текстовий індикатор, щоб стан не залежав лише від кольору
function addStatus(button, icon, text) {
  const status = document.createElement('span');
  status.className = 'answer-status';
  const iconElement = document.createElement('span');
  iconElement.setAttribute('aria-hidden', 'true');
  iconElement.textContent = icon;
  status.append(iconElement, ` ${text}`);
  button.append(status);
}

// Фарбує правильну та помилкову відповідь і блокує вибір
function markAnswers(chosenIndex, correctIndex) {
  const options = answersContainer.querySelectorAll('.answer-option');
  options.forEach((label, index) => {
    const button = label.querySelector('.answer-btn');
    label.querySelector('input').disabled = true;
    if (index === correctIndex) {
      button.classList.add('answer-btn--correct');
      addStatus(button, '✓', 'Правильно');
    } else if (index === chosenIndex) {
      button.classList.add('answer-btn--wrong');
      addStatus(button, '✗', 'Неправильно');
    }
  });
  answersContainer.classList.add('answers-grid--locked');
}

// Показує підсумок після останнього питання
function showResult() {
  isFinished = true;
  const percent = calcScorePercent(score, questions.length);
  questionText.textContent = 'Вікторину завершено';
  answersContainer.innerHTML = '';
  feedback.textContent = `Результат: ${score} з ${questions.length} (${percent}%)`;
  feedback.className = 'feedback feedback--result';
  checkBtn.disabled = true;
  nextBtn.textContent = 'Почати спочатку';
  nextBtn.disabled = false;
  console.log(`Результат: ${score} з ${questions.length} (${percent}%)`);
}

// Скидає стан вікторини й починає її спочатку
function restartQuiz() {
  currentIndex = 0;
  score = 0;
  isFinished = false;
  answeredIndexes.clear();
  quizForm.reset();
  renderQuestion();
  renderQuestions(questions);
}

// Обробник submit: перевіряє обрану відповідь без перезавантаження сторінки. 
quizForm.addEventListener('submit', event => {
  event.preventDefault();
  if (isChecked || isFinished) return;

  const chosen = quizForm.querySelector('input[name="answer"]:checked');
  if (!chosen) return;

  const item = questions[currentIndex];
  const chosenIndex = Number(chosen.value);
  const correctIndex = getCorrectIndex(item);

  isChecked = true;
  answeredIndexes.add(currentIndex);

  if (chosenIndex === correctIndex) {
    score++;
    feedback.textContent = '✓ Правильно!';
    feedback.classList.add('feedback--correct');
  } else {
    feedback.textContent = `✗ Неправильно. Правильна відповідь: ${item.answer}`;
    feedback.classList.add('feedback--wrong');
  }

  markAnswers(chosenIndex, correctIndex);
  checkBtn.disabled = true;
  nextBtn.disabled = false;
  renderQuestions(questions);
});

// Обробник click: переходить до наступного питання, скидає форму
nextBtn.addEventListener('click', () => {
  if (isFinished) {
    restartQuiz();
    return;
  }
  if (currentIndex === questions.length - 1) {
    showResult();
    return;
  }
  currentIndex++;
  quizForm.reset();
  renderQuestion();
});

// Початковий стан сторінки
printQuestions(questions);
renderQuestion();
renderQuestions(questions);
updateQuestionsCount(questions);