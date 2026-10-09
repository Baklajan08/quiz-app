console.log('app.js підключено');

// масив питань вікторини
const questions = [
  { question: 'Яка мова розмітки використовується для структури вебсторінок?', answer: 'HTML' },
  { question: 'Яка мова відповідає за стилі сторінки?', answer: 'CSS' },
  { question: 'Яка мова робить вебсторінки інтерактивними?', answer: 'JavaScript' },
  { question: 'Який тег позначає головний заголовок сторінки?', answer: 'h1' },
  { question: 'Яка CSS-технологія створює двовимірну сітку?', answer: 'Grid' }
];

// задані відповіді користувача
const userAnswers = ['HTML', 'CSS', 'Python', 'h1', 'Flexbox'];

// Виводить у консоль усі питання вікторини (цикл for...of)
function printQuestions(list) {
  console.log(`Усього питань: ${list.length}`);
  for (const item of list) {
    console.log(`- ${item.question}`);
  }
}

// порівнює відповіді користувача з правильними і виводить результат
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

// стрілкова функція - переводить кількість правильних відповідей у відсотки
const calcScorePercent = (correctCount, total) => Math.round(correctCount / total * 100);

printQuestions(questions);
const correct = checkAnswers(questions, userAnswers);
const percent = calcScorePercent(correct, questions.length);
console.log(`Результат: ${correct} з ${questions.length} (${percent}%)`);