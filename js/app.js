console.log('app.js підключено');

// Режим сховища: 'localStorage' (етап 1) або 'indexedDB' (етап 2, з міграцією)
const STORAGE_MODE = 'localStorage';

const LS_KEY = 'quizResults';              // ключ localStorage з масивом результатів
const LS_MIGRATED_KEY = 'quizResultsMigrated'; // прапорець: міграцію вже виконано
const DB_NAME = 'QuizDB';
const DB_VERSION = 1;
const STORE_NAME = 'results';

// Зберігає масив результатів у localStorage як JSON-рядок
function saveToLocalStorage(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

// Читає масив результатів із localStorage; пошкоджені дані не ламають застосунок,
// а дають порожній список
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Пошкоджені дані в localStorage:', error);
    return [];
  }
}

// Відкриває базу. onupgradeneeded спрацьовує лише при створенні бази або підвищенні версії:
// саме тут створюється object store з автоінкрементним ключем id
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB недоступна в цьому браузері'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// З'єднання з базою відкривається один раз і використовується повторно
let dbPromise = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB().catch(error => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

// Додає або оновлює запис (put): без id створює новий, з наявним id оновлює
async function addResult(item) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Повертає всі записи сховища (транзакція readonly)
async function getAllResults() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Видаляє запис за ключем id
async function deleteResult(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Одноразова міграція: якщо store порожній, а в localStorage є збережені результати,
// переносить їх в IndexedDB і ставить прапорець, щоб не дублювати при наступних запусках.
// Старі дані в localStorage лишаються як резервна копія. Повертає кількість перенесених записів
async function migrateFromLocalStorage() {
  if (localStorage.getItem(LS_MIGRATED_KEY) === 'true') return 0;

  const oldItems = loadFromLocalStorage();
  if (oldItems.length === 0) return 0;

  const existing = await getAllResults();
  if (existing.length > 0) return 0;

  for (const item of oldItems) {
    await addResult(item);
  }
  localStorage.setItem(LS_MIGRATED_KEY, 'true');
  return oldItems.length;
}

// Повертає всі збережені результати
async function loadResults() {
  if (STORAGE_MODE === 'localStorage') return loadFromLocalStorage();
  return getAllResults();
}

// Зберігає новий результат (для localStorage id призначаємо самі: максимальний + 1)
async function storeResult(item) {
  if (STORAGE_MODE === 'localStorage') {
    const items = loadFromLocalStorage();
    const id = items.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    items.push({ ...item, id });
    saveToLocalStorage(items);
    return;
  }
  await addResult(item);
}

// Видаляє результат за id
async function eraseResult(id) {
  if (STORAGE_MODE === 'localStorage') {
    saveToLocalStorage(loadFromLocalStorage().filter(r => r.id !== id));
    return;
  }
  await deleteResult(id);
}

// Відсоток правильних відповідей одного збереженого результату
const resultPercent = r => (r.total ? calcScorePercent(r.score, r.total) : 0);

// Форматує ISO-дату у зрозумілий вигляд
const formatDate = iso => new Date(iso).toLocaleString('uk-UA');

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
      status: { message: '', type: '' },
      // збережені результати й повідомлення про помилку сховища
      results: [],
      storageError: ''
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
    },
    // 5 найкращих результатів. Масив з getAll сортується на клієнті:
    // спочатку за відсотком (від більшого), при рівності новіші вище
    bestResults() {
      return [...this.results]
        .sort((a, b) => resultPercent(b) - resultPercent(a) || new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    }
  },
  methods: {
    resultPercent,
    formatDate,

    // Обробник події answer від дочірнього компонента: перевіряє відповідь і оновлює бали
    onAnswer(selectedIndex) {
      if (this.isAnswered) return;
      const correct = selectedIndex === this.current.correctIndex;
      if (correct) this.score++;
      this.lastAnswerCorrect = correct;
      this.answeredIds.push(this.current.id);
    },
    // Перехід до наступного питання; після останнього показує результат і зберігає його
    nextQuestion() {
      if (this.isFinished) {
        this.restart();
        return;
      }
      if (this.isLast) {
        this.isFinished = true;
        console.log(`Результат: ${this.score} з ${this.questions.length} (${this.percent}%)`);
        this.saveCurrentResult();
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

    // оновлює список результатів із сховища (після кожної CRUD-операції)
    async refreshResults() {
      this.results = await loadResults();
    },
    // початкове завантаження сховища. У режимі IndexedDB спершу виконується міграція.
    // Якщо сховище недоступне, користувач бачить зрозуміле повідомлення
    async initStorage() {
      try {
        if (STORAGE_MODE === 'indexedDB') {
          const moved = await migrateFromLocalStorage();
          if (moved > 0) {
            console.log(`Міграція: перенесено ${moved} результатів з localStorage в IndexedDB`);
          }
        }
        await this.refreshResults();
      } catch (error) {
        this.storageError = 'Не вдалося відкрити локальне сховище браузера. Можливо, воно вимкнене або увімкнено приватний режим. Результати не зберігатимуться між перезавантаженнями.';
        console.error(error);
      }
    },
    // зберігає результат щойно завершеної вікторини
    async saveCurrentResult() {
      try {
        await storeResult({
          date: new Date().toISOString(),
          score: this.score,
          total: this.questions.length
        });
        await this.refreshResults();
      } catch (error) {
        this.storageError = 'Не вдалося зберегти результат у локальному сховищі. Після перезавантаження він зникне.';
        console.error(error);
      }
    },
    // видаляє результат за id і перемальовує список
    async onDelete(id) {
      try {
        await eraseResult(id);
        await this.refreshResults();
      } catch (error) {
        this.storageError = 'Не вдалося видалити результат із локального сховища.';
        console.error(error);
      }
    },

    // fetch -> перевірка response.ok -> JSON -> перетворення -> запис у реактивний стан.
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
  // Після створення застосунку одразу відновлюємо результати зі сховища й завантажуємо питання
  mounted() {
    this.initStorage();
    this.loadData();
  }
}).mount('#app');