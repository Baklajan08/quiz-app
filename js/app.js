console.log('app.js підключено');

/*
  Практика 10: клієнтський фреймворк Vue 3 (підключено через CDN, без збірки).
  Вибір: Vue підключається одним тегом без Babel, а його шаблони близькі до HTML проєкту.
  Ручний DOM-код з практик 7-9 (renderQuestion, renderQuestions, markAnswers,
  updateQuestionsCount та всі querySelector) видалено: його замінили шаблон у index.html
  і компонент QuizQuestion. Попередні версії лишаються в історії Git.
*/

// Адреса API (Open Trivia Database, без ключа)
const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

// Будує об'єкт питання; correctIndex - індекс правильної відповіді в options
const buildQuestion = (id, question, options, answer) => ({
  id,
  question,
  options,
  answer,
  correctIndex: options.indexOf(answer)
});

// Локальні питання: показуються до завантаження і лишаються, якщо запит не вдався
const localQuestions = [
  buildQuestion(1, 'Яка мова розмітки використовується для структури вебсторінок?', ['HTML', 'CSS', 'Python', 'SQL'], 'HTML'),
  buildQuestion(2, 'Яка мова відповідає за стилі сторінки?', ['HTML', 'CSS', 'JavaScript', 'Java'], 'CSS'),
  buildQuestion(3, 'Яка мова робить вебсторінки інтерактивними?', ['XML', 'JavaScript', 'SQL', 'Markdown'], 'JavaScript'),
  buildQuestion(4, 'Який тег позначає головний заголовок сторінки?', ['header', 'title', 'h1', 'main'], 'h1'),
  buildQuestion(5, 'Яка CSS-технологія створює двовимірну сітку?', ['Flexbox', 'Float', 'Position', 'Grid'], 'Grid')
];

// Стрілкова функція: переводить кількість правильних відповідей у відсотки
const calcScorePercent = (correctCount, total) => Math.round(correctCount / total * 100);

// Розкодовує HTML-сутності (&quot;, &#039; тощо) у звичайний текст
const decodeHtml = text =>
  new DOMParser().parseFromString(text, 'text/html').documentElement.textContent;

// Перемішує масив (алгоритм Фішера-Єйтса), повертає новий масив
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Перетворює питання з API у формат застосунку, розкодовуючи HTML-сутності
function convertApiQuestion(item, index) {
  const answer = decodeHtml(item.correct_answer);
  const options = shuffle([...item.incorrect_answers.map(decodeHtml), answer]);
  return buildQuestion(index + 1, decodeHtml(item.question), options, answer);
}

// Компонент одного питання. Props: question, options, correctIndex.
// Локальний реактивний стан selectedIndex; про вибір повідомляє подією answer(selectedIndex)
const QuizQuestion = {
  name: 'QuizQuestion',
  props: {
    question: { type: String, required: true },
    options: { type: Array, required: true },
    correctIndex: { type: Number, required: true }
  },
  emits: ['answer'],
  data() {
    return { selectedIndex: null };
  },
  computed: {
    // Похідне значення: чи вже обрано відповідь
    answered() {
      return this.selectedIndex !== null;
    }
  },
  methods: {
    // Фіксує вибір і передає його батьківському компоненту
    choose(index) {
      if (this.answered) return;
      this.selectedIndex = index;
      this.$emit('answer', index);
    },
    // CSS-клас кнопки залежно від стану (правильна / помилкова)
    optionClass(index) {
      if (!this.answered) return '';
      if (index === this.correctIndex) return 'answer-btn--correct';
      if (index === this.selectedIndex) return 'answer-btn--wrong';
      return '';
    }
  },
  template: `
    <fieldset class="quiz-fieldset">
      <legend class="question-text">{{ question }}</legend>
      <div class="answers-grid" :class="{ 'answers-grid--locked': answered }">
        <button
          v-for="(option, index) in options"
          :key="option"
          type="button"
          class="answer-btn"
          :class="optionClass(index)"
          :aria-disabled="answered"
          @click="choose(index)"
        >
          {{ option }}
          <span v-if="answered && index === correctIndex" class="answer-status"><span aria-hidden="true">✓</span> Правильно</span>
          <span v-else-if="answered && index === selectedIndex" class="answer-status"><span aria-hidden="true">✗</span> Неправильно</span>
        </button>
      </div>
    </fieldset>
  `
};

// Кореневий компонент: увесь стан вікторини в реактивному data()
Vue.createApp({
  components: { QuizQuestion },
  data() {
    return {
      questions: localQuestions,
      currentIndex: 0,
      score: 0,
      answeredIds: [],
      lastAnswerCorrect: null,
      isFinished: false,
      // round входить у :key компонента, щоб після нового завантаження питань
      // компонент створювався заново і не зберігав старий вибір
      round: 0,
      loading: false,
      status: { message: '', type: '' }
    };
  },
  computed: {
    // Поточне питання
    current() {
      return this.questions[this.currentIndex];
    },
    questionNumber() {
      return this.currentIndex + 1;
    },
    isLast() {
      return this.currentIndex === this.questions.length - 1;
    },
    // Чи відповіли на поточне питання
    isAnswered() {
      return this.answeredIds.includes(this.current.id);
    },
    // Відсоток правильних відповідей перераховується сам при зміні score
    percent() {
      return calcScorePercent(this.score, this.questions.length);
    },
    feedbackText() {
      if (!this.isAnswered) return '';
      return this.lastAnswerCorrect
        ? '✓ Правильно!'
        : `✗ Неправильно. Правильна відповідь: ${this.current.answer}`;
    },
    nextLabel() {
      if (this.isFinished) return 'Почати спочатку';
      return this.isLast ? 'Показати результат' : 'Наступне питання';
    }
  },
  methods: {
    // Обробник події answer від дочірнього компонента: перевіряє відповідь і оновлює бали
    onAnswer(selectedIndex) {
      if (this.isAnswered) return;
      const correct = selectedIndex === this.current.correctIndex;
      if (correct) this.score++;
      this.lastAnswerCorrect = correct;
      this.answeredIds.push(this.current.id);
    },
    // Перехід до наступного питання; після останнього показує результат
    nextQuestion() {
      if (this.isFinished) {
        this.restart();
        return;
      }
      if (this.isLast) {
        this.isFinished = true;
        console.log(`Результат: ${this.score} з ${this.questions.length} (${this.percent}%)`);
        return;
      }
      this.currentIndex++;
      this.lastAnswerCorrect = null;
    },
    // Скидає стан вікторини
    restart() {
      this.currentIndex = 0;
      this.score = 0;
      this.answeredIds = [];
      this.lastAnswerCorrect = null;
      this.isFinished = false;
      this.round++;
    },
    setStatus(message, type) {
      this.status = { message, type };
    },
    // fetch -> перевірка response.ok -> JSON -> перетворення -> запис у реактивний стан.
    // Помилки HTTP і мережі ловить catch, стан завантаження вимикається у finally
    async loadData() {
      this.loading = true;
      this.setStatus('Завантаження питань…', 'loading');

      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          const httpError = new Error(`Сервер відповів кодом ${response.status}`);
          if (response.status === 429) {
            httpError.userMessage = 'Забагато запитів. Зачекайте кілька секунд і натисніть «Оновити питання».';
          }
          throw httpError;
        }

        const data = await response.json();
        console.log('Відповідь API:', data);

        if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
          throw new Error(`API не повернув питань (response_code: ${data.response_code})`);
        }

        this.questions = data.results.map(convertApiQuestion);
        this.restart();
        this.setStatus(`Завантажено питань з API: ${this.questions.length}`, 'success');
      } catch (error) {
        this.setStatus(
          error.userMessage || 'Не вдалося завантажити питання. Перевірте з\'єднання та натисніть «Оновити питання».',
          'error'
        );
        console.error(error);
      } finally {
        this.loading = false;
      }
    }
  },
  // Після створення застосунку одразу завантажуємо питання з API
  mounted() {
    this.loadData();
  }
}).mount('#app');