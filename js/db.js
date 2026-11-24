/**
 * FCPS Medicine Vault - IndexedDB Storage Engine
 * Manages fast local storage, indexing, and offline caching for tens of thousands of questions.
 */

const DB_NAME = 'FCPS_QuestionVault_DB';
const DB_VERSION = 1;

class QuestionDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Store for questions
        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('topicNum', 'topicNum', { unique: false });
          qStore.createIndex('bank', 'bank', { unique: false });
          qStore.createIndex('format', 'format', { unique: false });
          qStore.createIndex('topic_bank', ['topicNum', 'bank'], { unique: false });
          qStore.createIndex('topic_format', ['topicNum', 'format'], { unique: false });
        }

        // Store for topic summaries
        if (!db.objectStoreNames.contains('topics')) {
          db.createObjectStore('topics', { keyPath: 'num' });
        }

        // Store for user progress & bookmarks
        if (!db.objectStoreNames.contains('user_state')) {
          const stateStore = db.createObjectStore('user_state', { keyPath: 'id' });
          stateStore.createIndex('bookmarked', 'bookmarked', { unique: false });
          stateStore.createIndex('attempted', 'attempted', { unique: false });
        }

        // Store for app settings & metadata
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB init error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // Batch insert questions with progress reporting
  async saveBatch(questions, onProgress) {
    await this.init();
    const CHUNK_SIZE = 2500;
    const total = questions.length;
    let saved = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['questions'], 'readwrite');
        const store = tx.objectStore('questions');

        for (const q of chunk) {
          store.put(q);
        }

        tx.oncomplete = () => {
          saved += chunk.length;
          if (onProgress) onProgress(saved, total);
          resolve();
        };

        tx.onerror = (e) => reject(e.target.error);
      });
    }
  }

  // Save topic summaries
  async saveTopics(topicsArray) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['topics'], 'readwrite');
      const store = tx.objectStore('topics');
      for (const t of topicsArray) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Get all topics
  async getTopics() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['topics'], 'readonly');
      const store = tx.objectStore('topics');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Save app setting
  async saveSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Get app setting
  async getSetting(key, defaultValue = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : defaultValue);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Get user state for a question
  async getUserState(qId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['user_state'], 'readonly');
      const store = tx.objectStore('user_state');
      const req = store.get(qId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Get all user state as a map for fast lookup
  async getAllUserState() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['user_state'], 'readonly');
      const store = tx.objectStore('user_state');
      const req = store.getAll();
      req.onsuccess = () => {
        const map = new Map();
        for (const item of (req.result || [])) {
          map.set(item.id, item);
        }
        resolve(map);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Toggle bookmark
  async toggleBookmark(qId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['user_state'], 'readwrite');
      const store = tx.objectStore('user_state');
      const getReq = store.get(qId);

      getReq.onsuccess = () => {
        const current = getReq.result || { id: qId, bookmarked: false, attempted: false };
        current.bookmarked = !current.bookmarked;
        current.updatedAt = Date.now();
        store.put(current);
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Save question answer attempt
  async saveAnswer(qId, answerData, isCorrect) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['user_state'], 'readwrite');
      const store = tx.objectStore('user_state');
      const getReq = store.get(qId);

      getReq.onsuccess = () => {
        const current = getReq.result || { id: qId, bookmarked: false };
        current.attempted = true;
        current.userAnswer = answerData;
        current.isCorrect = isCorrect;
        current.updatedAt = Date.now();
        store.put(current);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Query questions for a topic with filters and pagination
  async queryQuestions({ topicNum, bank = 'ALL', format = 'ALL', search = '', bookmarkedOnly = false, userStateMap = null, page = 1, pageSize = 20 }) {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['questions'], 'readonly');
      const store = tx.objectStore('questions');
      const index = store.index('topicNum');
      const req = index.getAll(topicNum);

      req.onsuccess = () => {
        let items = req.result || [];

        // Filter by Bank
        if (bank && bank !== 'ALL') {
          items = items.filter(q => q.bank === bank);
        }

        // Filter by Format
        if (format && format !== 'ALL') {
          items = items.filter(q => q.format === format);
        }

        // Filter by Search Query
        if (search && search.trim()) {
          const query = search.trim().toLowerCase();
          items = items.filter(q => {
            const stemMatch = q.stem && q.stem.toLowerCase().includes(query);
            const explMatch = q.explanation && q.explanation.toLowerCase().includes(query);
            const provMatch = q.provenance && q.provenance.toLowerCase().includes(query);
            const optMatch = q.options && q.options.some(o => o.text && o.text.toLowerCase().includes(query));
            return stemMatch || explMatch || provMatch || optMatch;
          });
        }

        // Filter by Bookmarked Only
        if (bookmarkedOnly && userStateMap) {
          items = items.filter(q => {
            const st = userStateMap.get(q.id);
            return st && st.bookmarked;
          });
        }

        const totalFiltered = items.length;
        const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
        const safePage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (safePage - 1) * pageSize;
        const pagedQuestions = items.slice(startIndex, startIndex + pageSize);

        resolve({
          questions: pagedQuestions,
          total: totalFiltered,
          page: safePage,
          totalPages,
          pageSize
        });
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Get metadata stats
  async getStats() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['questions', 'topics', 'user_state', 'settings'], 'readonly');
      const qStore = tx.objectStore('questions');
      const tStore = tx.objectStore('topics');
      const uStore = tx.objectStore('user_state');
      const sStore = tx.objectStore('settings');

      const countReq = qStore.count();
      let topicsList = [];
      let userStates = [];
      let metaInfo = null;

      tStore.getAll().onsuccess = (e) => { topicsList = e.target.result || []; };
      uStore.getAll().onsuccess = (e) => { userStates = e.target.result || []; };
      sStore.get('dataset_meta').onsuccess = (e) => { metaInfo = e.target.result ? e.target.result.value : null; };

      tx.oncomplete = () => {
        let bookmarkedCount = 0;
        let attemptedCount = 0;
        let correctCount = 0;

        for (const st of userStates) {
          if (st.bookmarked) bookmarkedCount++;
          if (st.attempted) {
            attemptedCount++;
            if (st.isCorrect) correctCount++;
          }
        }

        resolve({
          totalQuestions: countReq.result || 0,
          totalTopics: topicsList.length,
          bookmarkedCount,
          attemptedCount,
          correctCount,
          metaInfo
        });
      };

      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Clear all data
  async clearAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['questions', 'topics', 'user_state', 'settings'], 'readwrite');
      tx.objectStore('questions').clear();
      tx.objectStore('topics').clear();
      tx.objectStore('user_state').clear();
      tx.objectStore('settings').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
}

export const db = new QuestionDB();
