console.log('app.js підключено');

// Прибираємо статичну заглушку з HTML (динамічне видалення елемента)
const placeholder = document.querySelector('#questions-placeholder');
if (placeholder) {
  placeholder.remove();
}

// Дані: масив питань вікторини
const questions = [
  { question: 'Яка мова розмітки використовується для структури вебсторінок?', answer: 'HTML' },
  { question: 'Яка мова відповідає за стилі сторінки?', answer: 'CSS' },
  { question: 'Яка мова робить вебсторінки інтерактивними?', answer: 'JavaScript' },
  { question: 'Який тег позначає головний заголовок сторінки?', answer: 'h1' },
  { question: 'Яка CSS-технологія створює двовимірну сітку?', answer: 'Grid' }
];

// Жорстко задані відповіді користувача
const userAnswers = ['HTML', 'CSS', 'Python', 'h1', 'Flexbox'];

// Вибираємо контейнер списку та елемент підсумку
const questionsList = document.querySelector('#questions-list');
const questionsCount = document.querySelector('#questions-count');

// Виводить у консоль усі питання вікторини
function printQuestions(list) {
  console.log(`Усього питань: ${list.length}`);
  for (const item of list) {
    console.log(`- ${item.question}`);
  }
}

// Порівнює відповіді користувача з правильними, виводить результат
// кожного питання й повертає кількість правильних відповідей
function checkAnswers(list, answers) {
  let correctCount = 0;
  for (let i = 0; i < list.length; i++) {
    if (answers[i] === list[i].answer) {
      console.log(`Питання ${i + 1}: правильно`);
      correctCount++;
    } else {
      console.log(`Питання ${i + 1}: неправильно (правильна відповідь: ${list[i].answer})`);
    }
  }
  return correctCount;
}

// Стрілкова функція: переводить кількість правильних відповідей у відсотки
const calcScorePercent = (correctCount, total) => Math.round(correctCount / total * 100);

// Рендер списку: очищає контейнер і для кожного питання створює li
// з текстом питання, атрибутом data-answer і за умовою класом answered
function renderQuestions(list) {
  questionsList.innerHTML = '';
  list.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = item.question;
    li.dataset.answer = item.answer;
    if (userAnswers[index] !== undefined) {
      li.classList.add('answered');
    }
    questionsList.append(li);
  });
}

// Оновлює вміст наявного елемента-підсумку: кількість питань
const updateQuestionsCount = list => {
  questionsCount.textContent = `Усього питань: ${list.length}`;
};

printQuestions(questions);
const correct = checkAnswers(questions, userAnswers);
const percent = calcScorePercent(correct, questions.length);
console.log(`Результат: ${correct} з ${questions.length} (${percent}%)`);

// Виклики: частина з практики 7 (DOM)
renderQuestions(questions);
updateQuestionsCount(questions);