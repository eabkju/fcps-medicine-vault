/**
 * FCPS Medicine Vault - Application Controller
 * High-performance, offline-first client-side question bank browser.
 */

import { db } from './db.js';
import { parseQuestionFile, mergeTopics } from './parser.js';
import { DEMO_DATA } from './demo-data.js';

class App {
  constructor() {
    this.topics = [];
    this.currentTopicNum = null;
    this.currentTopicTitle = '';
    this.activeBank = 'ALL';
    this.activeFormat = 'ALL';
    this.bookmarkedOnly = false;
    this.searchQuery = '';
    this.currentPage = 1;
    this.pageSize = 20;
    this.alwaysShowAnswers = false;
    this.userStateMap = new Map();
    this.searchDebounceTimer = null;

    // Elements
    this.dom = {
      html: document.documentElement,
      sidebar: document.getElementById('sidebar'),
      sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
      sidebarOverlay: document.getElementById('sidebarOverlay'),
      topicList: document.getElementById('topicList'),
      topicFilterInput: document.getElementById('topicFilterInput'),
      currentTopicTitle: document.getElementById('currentTopicTitle'),
      questionsContainer: document.getElementById('questionsContainer'),
      questionViewport: document.getElementById('questionViewport'),
      paginationSummary: document.getElementById('paginationSummary'),
      prevPageBtn: document.getElementById('prevPageBtn'),
      nextPageBtn: document.getElementById('nextPageBtn'),
      pageIndicatorText: document.getElementById('pageIndicatorText'),
      jumpPageInput: document.getElementById('jumpPageInput'),
      jumpPageBtn: document.getElementById('jumpPageBtn'),
      alwaysShowToggle: document.getElementById('alwaysShowToggle'),
      fontSizeBtn: document.getElementById('fontSizeBtn'),
      themePickerBtn: document.getElementById('themePickerBtn'),
      dataStatusBadge: document.getElementById('dataStatusBadge'),
      dataDot: document.getElementById('dataDot'),
      dataStatusText: document.getElementById('dataStatusText'),
      bankFilterGroup: document.getElementById('bankFilterGroup'),
      bookmarkedOnlyBtn: document.getElementById('bookmarkedOnlyBtn'),
      inTopicSearchInput: document.getElementById('inTopicSearchInput'),
      importDataBtnSidebar: document.getElementById('importDataBtnSidebar'),

      // Modals
      importModal: document.getElementById('importModal'),
      closeImportModalBtn: document.getElementById('closeImportModalBtn'),
      themeModal: document.getElementById('themeModal'),
      closeThemeModalBtn: document.getElementById('closeThemeModalBtn'),
      fontSizeModal: document.getElementById('fontSizeModal'),
      closeFontSizeModalBtn: document.getElementById('closeFontSizeModalBtn'),

      // Import actions
      pickFolderBtn: document.getElementById('pickFolderBtn'),
      folderInput: document.getElementById('folderInput'),
      pickZipBtn: document.getElementById('pickZipBtn'),
      zipInput: document.getElementById('zipInput'),
      pickFilesBtn: document.getElementById('pickFilesBtn'),
      filesInput: document.getElementById('filesInput'),
      loadDemoBtn: document.getElementById('loadDemoBtn'),
      dropzone: document.getElementById('dropzone'),
      parseProgressContainer: document.getElementById('parseProgressContainer'),
      progressStatusText: document.getElementById('progressStatusText'),
      progressPercentText: document.getElementById('progressPercentText'),
      progressBarFill: document.getElementById('progressBarFill'),
      storageInfoSection: document.getElementById('storageInfoSection'),
      storageStatsText: document.getElementById('storageStatsText'),
      clearDataBtn: document.getElementById('clearDataBtn'),
    };
  }

  async init() {
    this.bindEvents();
    await this.loadInitialSettings();
    await this.refreshState();
  }

  // Load saved theme, font size, answer toggle preference
  async loadInitialSettings() {
    const savedTheme = localStorage.getItem('fcps_theme') || 'dark';
    const savedSize = localStorage.getItem('fcps_font_size') || 'md';
    const savedAlwaysShow = localStorage.getItem('fcps_always_show') === 'true';

    this.setTheme(savedTheme, false);
    this.setFontSize(savedSize, false);
    this.setAlwaysShowAnswers(savedAlwaysShow, false);

    // Load last active topic / filters from settings if available
    const lastTopic = await db.getSetting('last_topic', null);
    if (lastTopic) this.currentTopicNum = lastTopic;
  }

  // Refresh database status, topics, and render questions
  async refreshState() {
    const stats = await db.getStats();
    this.userStateMap = await db.getAllUserState();

    if (stats.totalQuestions > 0) {
      this.dom.dataDot.className = 'data-dot';
      const kCount = (stats.totalQuestions / 1000).toFixed(1);
      this.dom.dataStatusText.textContent = `${stats.totalQuestions.toLocaleString()} Qs`;
      this.dom.storageStatsText.textContent = `${stats.totalQuestions.toLocaleString()} questions cached across ${stats.totalTopics} topics.`;
      this.dom.storageInfoSection.style.display = 'block';

      this.topics = await db.getTopics();
      this.renderTopicList();

      if (!this.currentTopicNum || !this.topics.some(t => t.num === this.currentTopicNum)) {
        this.currentTopicNum = this.topics[0]?.num || null;
      }

      const activeTopic = this.topics.find(t => t.num === this.currentTopicNum);
      if (activeTopic) {
        this.currentTopicTitle = activeTopic.title;
        this.dom.currentTopicTitle.textContent = `${activeTopic.num} - ${activeTopic.title}`;
      }

      await this.loadQuestions();
    } else {
      this.dom.dataDot.className = 'data-dot empty';
      this.dom.dataStatusText.textContent = 'No Data';
      this.dom.storageInfoSection.style.display = 'none';
      this.renderEmptyState();
      // Auto open import modal if brand new
      this.openModal(this.dom.importModal);
    }
  }

  // Render Sidebar Topic List
  renderTopicList(filterText = '') {
    this.dom.topicList.innerHTML = '';
    const q = filterText.trim().toLowerCase();

    const filtered = this.topics.filter(t => {
      if (!q) return true;
      return t.num.includes(q) || t.title.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      this.dom.topicList.innerHTML = `<div style="padding: 16px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">No matching topics</div>`;
      return;
    }

    for (const t of filtered) {
      const item = document.createElement('div');
      item.className = `topic-item ${t.num === this.currentTopicNum ? 'active' : ''}`;
      item.dataset.topicNum = t.num;

      item.innerHTML = `
        <div class="topic-item-left">
          <span class="topic-num">${t.num}</span>
          <span class="topic-title" title="${t.title}">${t.title}</span>
        </div>
        <span class="topic-count">${t.count.toLocaleString()}</span>
      `;

      item.addEventListener('click', () => {
        this.selectTopic(t.num, t.title);
        // On mobile, close sidebar after selection
        if (window.innerWidth <= 900) {
          this.closeSidebar();
        }
      });

      this.dom.topicList.appendChild(item);
    }
  }

  // Select Topic
  async selectTopic(topicNum, topicTitle) {
    if (this.currentTopicNum === topicNum) return;
    this.currentTopicNum = topicNum;
    this.currentTopicTitle = topicTitle;
    this.currentPage = 1;
    this.dom.currentTopicTitle.textContent = `${topicNum} - ${topicTitle}`;

    // Update active highlight in sidebar
    const items = this.dom.topicList.querySelectorAll('.topic-item');
    items.forEach(el => {
      el.classList.toggle('active', el.dataset.topicNum === topicNum);
    });

    await db.saveSetting('last_topic', topicNum);
    await this.loadQuestions();
  }

  // Load and render questions for current topic & filters
  async loadQuestions() {
    if (!this.currentTopicNum) return;

    // Show loading state
    this.dom.questionsContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
        <div>Loading questions...</div>
      </div>
    `;

    const res = await db.queryQuestions({
      topicNum: this.currentTopicNum,
      bank: this.activeBank,
      format: this.activeFormat,
      search: this.searchQuery,
      bookmarkedOnly: this.bookmarkedOnly,
      userStateMap: this.userStateMap,
      page: this.currentPage,
      pageSize: this.pageSize
    });

    this.currentPage = res.page;
    this.renderQuestions(res.questions, res.total, res.totalPages);
  }

  // Render question cards list
  renderQuestions(questions, totalCount, totalPages) {
    this.dom.questionsContainer.innerHTML = '';

    // Update pagination controls
    const startIdx = totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const endIdx = Math.min(this.currentPage * this.pageSize, totalCount);

    this.dom.paginationSummary.textContent = `${totalCount.toLocaleString()} questions (Showing ${startIdx}–${endIdx})`;
    this.dom.pageIndicatorText.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
    this.dom.jumpPageInput.max = totalPages || 1;
    this.dom.jumpPageInput.value = this.currentPage;
    this.dom.prevPageBtn.disabled = this.currentPage <= 1;
    this.dom.nextPageBtn.disabled = this.currentPage >= totalPages;

    if (questions.length === 0) {
      this.dom.questionsContainer.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">No questions found</h3>
          <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 360px; margin: 0 auto;">
            Try switching banks (All Banks, Genesis, BCPS), format, or clearing your search filter.
          </p>
        </div>
      `;
      return;
    }

    for (const q of questions) {
      const card = this.createQuestionCard(q);
      this.dom.questionsContainer.appendChild(card);
    }

    // Scroll to top of viewport
    this.dom.questionViewport.scrollTop = 0;
  }

  // Build a Question Card DOM element
  createQuestionCard(q) {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.dataset.qId = q.id;

    const userState = this.userStateMap.get(q.id) || { bookmarked: false, attempted: false, userAnswer: null };
    const isBookmarked = userState.bookmarked;

    // Header with badges & bookmark
    const header = document.createElement('div');
    header.className = 'question-header';
    header.innerHTML = `
      <div class="badges-row">
        <span class="q-badge badge-bank" data-bank="${q.bank}">${this.formatBankName(q.bank)}</span>
        <span class="q-badge badge-format">${q.format}</span>
        <span class="q-number">Q# ${q.qNum}</span>
      </div>
      <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark for Review'}">
        ${isBookmarked ? '★' : '☆'}
      </button>
    `;

    const bookmarkBtn = header.querySelector('.bookmark-btn');
    bookmarkBtn.addEventListener('click', async () => {
      await db.toggleBookmark(q.id);
      userState.bookmarked = !userState.bookmarked;
      this.userStateMap.set(q.id, userState);
      bookmarkBtn.classList.toggle('active', userState.bookmarked);
      bookmarkBtn.textContent = userState.bookmarked ? '★' : '☆';
      bookmarkBtn.title = userState.bookmarked ? 'Remove Bookmark' : 'Bookmark for Review';
      if (this.bookmarkedOnly) {
        await this.loadQuestions();
      }
    });

    card.appendChild(header);

    // Question Stem
    const stemEl = document.createElement('div');
    stemEl.className = 'question-stem';
    stemEl.textContent = q.stem;
    card.appendChild(stemEl);

    // Options Container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-list';

    // Explanation Box (Created early so interactive answering can toggle it)
    const explanationBox = document.createElement('div');
    explanationBox.className = 'explanation-box';
    explanationBox.style.display = this.alwaysShowAnswers ? 'block' : (userState.attempted ? 'block' : 'none');

    let explHtml = '';
    if (q.officialKeys) {
      explHtml += `<div class="official-keys-banner">🔑 Official Keys: ${q.officialKeys}</div>`;
    } else if (q.correctOption) {
      explHtml += `<div class="official-keys-banner">🔑 Correct Option: [${q.correctOption}]</div>`;
    }

    if (q.explanation) {
      explHtml += `<div class="explanation-content">${q.explanation}</div>`;
    }

    if (q.provenance) {
      explHtml += `<div class="provenance-line">Provenance: ${q.provenance}</div>`;
    }

    explanationBox.innerHTML = explHtml || '<div style="font-style: italic; color: var(--text-muted);">No detailed explanation provided for this question.</div>';

    // RENDER OPTIONS BASED ON FORMAT (SBA vs MCQ)
    if (q.format === 'SBA') {
      this.renderSbaOptions(q, optionsContainer, explanationBox, userState);
    } else {
      this.renderMcqOptions(q, optionsContainer, explanationBox, userState);
    }

    card.appendChild(optionsContainer);
    card.appendChild(explanationBox);

    // Card Footer Actions
    const footer = document.createElement('div');
    footer.className = 'card-footer-actions';
    const isRevealed = explanationBox.style.display === 'block';

    footer.innerHTML = `
      <button class="reveal-answer-btn">
        ${isRevealed ? 'Hide Answer & Rationale' : 'Reveal Answer & Rationale'}
      </button>
      <div style="font-size: 0.8rem; color: var(--text-muted);">${q.fileName ? q.fileName.replace(/\.txt$/i, '') : ''}</div>
    `;

    const revealBtn = footer.querySelector('.reveal-answer-btn');
    revealBtn.addEventListener('click', () => {
      const currentlyShown = explanationBox.style.display === 'block';
      explanationBox.style.display = currentlyShown ? 'none' : 'block';
      revealBtn.textContent = currentlyShown ? 'Reveal Answer & Rationale' : 'Hide Answer & Rationale';
    });

    card.appendChild(footer);

    return card;
  }

  // Render Single Best Answer (SBA) Options
  renderSbaOptions(q, container, explanationBox, userState) {
    const isAlwaysShow = this.alwaysShowAnswers;
    const cleanCorrectLetter = (q.correctOption && q.correctOption.length === 1) ? q.correctOption.toUpperCase() : null;

    for (const opt of q.options) {
      const row = document.createElement('div');
      row.className = 'sba-option-row';
      row.dataset.letter = opt.letter;

      // Check if should highlight
      const isCorrectOption = cleanCorrectLetter && opt.letter === cleanCorrectLetter;
      const isUserChoice = userState.attempted && userState.userAnswer === opt.letter;

      if (isAlwaysShow) {
        if (isCorrectOption) row.classList.add('correct');
      } else if (userState.attempted) {
        if (isCorrectOption) row.classList.add('correct');
        if (isUserChoice && !isCorrectOption) row.classList.add('wrong');
      }

      row.innerHTML = `
        <span class="sba-letter">${opt.letter}</span>
        <span class="sba-text">${opt.text}</span>
      `;

      // Interactive Click Handling
      row.addEventListener('click', async () => {
        if (this.alwaysShowAnswers) return;

        const isCorrect = isCorrectOption || false;
        userState.attempted = true;
        userState.userAnswer = opt.letter;
        userState.isCorrect = isCorrect;
        this.userStateMap.set(q.id, userState);
        await db.saveAnswer(q.id, opt.letter, isCorrect);

        // Update visuals on all options in this card
        const allRows = container.querySelectorAll('.sba-option-row');
        allRows.forEach(r => {
          r.classList.remove('correct', 'wrong');
          const l = r.dataset.letter;
          if (cleanCorrectLetter && l === cleanCorrectLetter) {
            r.classList.add('correct');
          }
          if (l === opt.letter && !isCorrect) {
            r.classList.add('wrong');
          }
        });

        // Reveal explanation
        explanationBox.style.display = 'block';
      });

      container.appendChild(row);
    }
  }

  // Render Multiple True/False (MCQ) Options
  renderMcqOptions(q, container, explanationBox, userState) {
    const isAlwaysShow = this.alwaysShowAnswers;
    const userAnswers = userState.userAnswer || {};

    for (const opt of q.options) {
      const row = document.createElement('div');
      row.className = 'mcq-option-row';
      row.dataset.letter = opt.letter;

      const hasVal = opt.val !== null && opt.val !== undefined;
      const expectedVal = opt.val ? opt.val.toLowerCase() : null;

      row.innerHTML = `
        <div class="mcq-left">
          <span class="mcq-letter">${opt.letter}</span>
          <span class="mcq-text">${opt.text}</span>
        </div>
        <div class="mcq-actions">
          ${isAlwaysShow && hasVal ? `
            <span class="tf-status-badge ${opt.val === 'True' ? 'badge-true' : 'badge-false'}">
              ${opt.val === 'True' ? '✓ True' : '✗ False'}
            </span>
          ` : `
            <button class="tf-btn tf-t-btn ${userAnswers[opt.letter] === 'true' ? 'selected-true' : ''}" data-val="true">T</button>
            <button class="tf-btn tf-f-btn ${userAnswers[opt.letter] === 'false' ? 'selected-false' : ''}" data-val="false">F</button>
          `}
        </div>
      `;

      if (!isAlwaysShow) {
        const btnT = row.querySelector('.tf-t-btn');
        const btnF = row.querySelector('.tf-f-btn');

        const handlePick = async (picked) => {
          userAnswers[opt.letter] = picked;
          userState.attempted = true;
          userState.userAnswer = userAnswers;

          btnT.classList.toggle('selected-true', picked === 'true');
          btnF.classList.toggle('selected-false', picked === 'false');

          if (hasVal) {
            const isMatch = picked === expectedVal;
            if (isMatch) {
              row.style.borderColor = 'var(--success)';
            } else {
              row.style.borderColor = 'var(--error)';
            }
          }

          this.userStateMap.set(q.id, userState);
          await db.saveAnswer(q.id, userAnswers, true);
        };

        btnT.addEventListener('click', () => handlePick('true'));
        btnF.addEventListener('click', () => handlePick('false'));
      }

      container.appendChild(row);
    }
  }

  // Format Bank badge label
  formatBankName(bank) {
    switch (bank) {
      case 'BCPS_FCPS': return 'BCPS / FCPS';
      case 'GENESIS': return 'Genesis';
      case 'MHS': return 'MHS';
      default: return bank;
    }
  }

  // Empty state when no data files loaded
  renderEmptyState() {
    this.dom.currentTopicTitle.textContent = 'Welcome to FCPS Medicine Vault';
    this.dom.questionsContainer.innerHTML = `
      <div style="padding: 60px 20px; text-align: center; max-width: 600px; margin: 40px auto; background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <div style="font-size: 3.5rem; margin-bottom: 16px;">⚕️</div>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 12px;">Get Started with Your Question Bank</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem; line-height: 1.6;">
          Your questions are stored directly on your device. To begin practicing, select the folder containing your FCPS/Davidson text question files or zip archive.
        </p>
        <button id="emptyStateSelectBtn" class="btn-primary" style="max-width: 260px; margin: 0 auto;">
          📁 Select Question Files
        </button>
      </div>
    `;

    document.getElementById('emptyStateSelectBtn')?.addEventListener('click', () => {
      this.openModal(this.dom.importModal);
    });
  }

  // Toggle "Always Show Answer" mode
  setAlwaysShowAnswers(val, save = true) {
    this.alwaysShowAnswers = val;
    this.dom.alwaysShowToggle.classList.toggle('active', val);
    if (save) {
      localStorage.setItem('fcps_always_show', val ? 'true' : 'false');
      db.saveSetting('always_show_answer', val);
      this.loadQuestions();
    }
  }

  // Change Theme
  setTheme(themeName, save = true) {
    this.dom.html.dataset.theme = themeName;
    if (save) {
      localStorage.setItem('fcps_theme', themeName);
      db.saveSetting('theme', themeName);
    }
    // Update theme card active state in modal
    const cards = document.querySelectorAll('.theme-card-option');
    cards.forEach(c => c.classList.toggle('active', c.dataset.themeVal === themeName));
  }

  // Change Font Size
  setFontSize(size, save = true) {
    this.dom.html.dataset.fontSize = size;
    if (save) {
      localStorage.setItem('fcps_font_size', size);
      db.saveSetting('font_size', size);
    }
    const btns = document.querySelectorAll('.font-size-btn');
    btns.forEach(b => b.classList.toggle('active', b.dataset.size === size));
  }

  // Modal helpers
  openModal(modal) {
    modal.classList.add('open');
  }

  closeModal(modal) {
    modal.classList.remove('open');
  }

  openSidebar() {
    this.dom.sidebar.classList.add('open');
    this.dom.sidebarOverlay.classList.add('open');
  }

  closeSidebar() {
    this.dom.sidebar.classList.remove('open');
    this.dom.sidebarOverlay.classList.remove('open');
  }

  // File Import Handlers
  async handleFileList(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.zip'));
    if (files.length === 0) {
      alert('Please select .txt question files or a .zip archive.');
      return;
    }

    this.dom.parseProgressContainer.style.display = 'block';
    this.dom.progressStatusText.textContent = `Reading ${files.length} file(s)...`;
    this.dom.progressPercentText.textContent = '0%';
    this.dom.progressBarFill.style.width = '0%';

    let allQuestions = [];
    let allTopics = [];
    let processedCount = 0;

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        // Unzip in browser memory using JSZip
        this.dom.progressStatusText.textContent = `Extracting ${file.name}...`;
        if (window.JSZip) {
          const zip = await JSZip.loadAsync(file);
          const zipFiles = Object.keys(zip.files).filter(n => n.endsWith('.txt') && !n.startsWith('__MACOSX'));
          let zIdx = 0;
          for (const zName of zipFiles) {
            zIdx++;
            this.dom.progressStatusText.textContent = `Parsing ${zName} (${zIdx}/${zipFiles.length})...`;
            const text = await zip.files[zName].async('text');
            const res = parseQuestionFile(text, zName);
            allQuestions.push(...res.questions);
            allTopics = mergeTopics(allTopics, res.topics);
          }
        } else {
          alert('JSZip library is loading. Please try again.');
          return;
        }
      } else {
        // Text file
        this.dom.progressStatusText.textContent = `Parsing ${file.name}...`;
        const text = await file.text();
        const res = parseQuestionFile(text, file.name);
        allQuestions.push(...res.questions);
        allTopics = mergeTopics(allTopics, res.topics);
      }

      processedCount++;
      const pct = Math.round((processedCount / files.length) * 50);
      this.dom.progressPercentText.textContent = `${pct}%`;
      this.dom.progressBarFill.style.width = `${pct}%`;
    }

    if (allQuestions.length === 0) {
      alert('No valid questions found in the selected files. Make sure they match the question bank structure.');
      this.dom.parseProgressContainer.style.display = 'none';
      return;
    }

    // Save batch to IndexedDB
    this.dom.progressStatusText.textContent = `Saving ${allQuestions.length.toLocaleString()} questions to browser cache...`;
    await db.saveBatch(allQuestions, (saved, total) => {
      const pct = 50 + Math.round((saved / total) * 50);
      this.dom.progressPercentText.textContent = `${pct}%`;
      this.dom.progressBarFill.style.width = `${pct}%`;
    });

    // Save topics
    await db.saveTopics(allTopics);
    await db.saveSetting('dataset_meta', {
      totalQuestions: allQuestions.length,
      fileCount: files.length,
      importedAt: Date.now()
    });

    this.dom.progressStatusText.textContent = `Complete! Indexed ${allQuestions.length.toLocaleString()} questions.`;
    this.dom.progressPercentText.textContent = '100%';
    this.dom.progressBarFill.style.width = '100%';

    setTimeout(async () => {
      this.dom.parseProgressContainer.style.display = 'none';
      this.closeModal(this.dom.importModal);
      await this.refreshState();
    }, 800);
  }

  // Load Built-in Demo Questions
  async loadDemoDataset() {
    this.dom.parseProgressContainer.style.display = 'block';
    this.dom.progressStatusText.textContent = 'Loading demo questions...';
    this.dom.progressBarFill.style.width = '50%';
    this.dom.progressPercentText.textContent = '50%';

    await db.saveBatch(DEMO_DATA.questions);
    await db.saveTopics(DEMO_DATA.topics);
    await db.saveSetting('dataset_meta', {
      totalQuestions: DEMO_DATA.questions.length,
      isDemo: true,
      importedAt: Date.now()
    });

    this.dom.progressBarFill.style.width = '100%';
    this.dom.progressPercentText.textContent = '100%';

    setTimeout(async () => {
      this.dom.parseProgressContainer.style.display = 'none';
      this.closeModal(this.dom.importModal);
      await this.refreshState();
    }, 500);
  }

  // Event Listeners Setup
  bindEvents() {
    // Mobile Drawer
    this.dom.sidebarToggleBtn.addEventListener('click', () => {
      if (this.dom.sidebar.classList.contains('open')) {
        this.closeSidebar();
      } else {
        this.openSidebar();
      }
    });

    this.dom.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

    // Always Show Answer Master Toggle
    this.dom.alwaysShowToggle.addEventListener('click', () => {
      this.setAlwaysShowAnswers(!this.alwaysShowAnswers);
    });

    // Theme Modal Triggers
    this.dom.themePickerBtn.addEventListener('click', () => this.openModal(this.dom.themeModal));
    this.dom.closeThemeModalBtn.addEventListener('click', () => this.closeModal(this.dom.themeModal));
    document.querySelectorAll('.theme-card-option').forEach(el => {
      el.addEventListener('click', () => {
        this.setTheme(el.dataset.themeVal);
        this.closeModal(this.dom.themeModal);
      });
    });

    // Font Size Modal Triggers
    this.dom.fontSizeBtn.addEventListener('click', () => this.openModal(this.dom.fontSizeModal));
    this.dom.closeFontSizeModalBtn.addEventListener('click', () => this.closeModal(this.dom.fontSizeModal));
    document.querySelectorAll('.font-size-btn').forEach(b => {
      b.addEventListener('click', () => {
        this.setFontSize(b.dataset.size);
        this.closeModal(this.dom.fontSizeModal);
      });
    });

    // Import Modal Triggers
    this.dom.dataStatusBadge.addEventListener('click', () => this.openModal(this.dom.importModal));
    this.dom.importDataBtnSidebar.addEventListener('click', () => this.openModal(this.dom.importModal));
    this.dom.closeImportModalBtn.addEventListener('click', () => this.closeModal(this.dom.importModal));

    // File pickers
    this.dom.pickFolderBtn.addEventListener('click', () => this.dom.folderInput.click());
    this.dom.folderInput.addEventListener('change', (e) => this.handleFileList(e.target.files));

    this.dom.pickZipBtn.addEventListener('click', () => this.dom.zipInput.click());
    this.dom.zipInput.addEventListener('change', (e) => this.handleFileList(e.target.files));

    this.dom.pickFilesBtn.addEventListener('click', () => this.dom.filesInput.click());
    this.dom.filesInput.addEventListener('change', (e) => this.handleFileList(e.target.files));

    this.dom.loadDemoBtn.addEventListener('click', () => this.loadDemoDataset());

    // Drag and Drop
    this.dom.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dom.dropzone.classList.add('dragover');
    });
    this.dom.dropzone.addEventListener('dragleave', () => this.dom.dropzone.classList.remove('dragover'));
    this.dom.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dom.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files) this.handleFileList(e.dataTransfer.files);
    });

    // Clear Data
    this.dom.clearDataBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all cached questions and progress?')) {
        await db.clearAll();
        await this.refreshState();
      }
    });

    // Bank Filters
    this.dom.bankFilterGroup.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.bankFilterGroup.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeBank = btn.dataset.bank;
        this.currentPage = 1;
        this.loadQuestions();
      });
    });

    // Format Filters (SBA / MCQ / All)
    document.querySelectorAll('[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFormat = btn.dataset.format;
        this.currentPage = 1;
        this.loadQuestions();
      });
    });

    // Bookmarked Only Pill
    this.dom.bookmarkedOnlyBtn.addEventListener('click', () => {
      this.bookmarkedOnly = !this.bookmarkedOnly;
      this.dom.bookmarkedOnlyBtn.classList.toggle('active', this.bookmarkedOnly);
      this.currentPage = 1;
      this.loadQuestions();
    });

    // Topic List Filter Input
    this.dom.topicFilterInput.addEventListener('input', (e) => {
      this.renderTopicList(e.target.value);
    });

    // In-Topic Search Input (Debounced)
    this.dom.inTopicSearchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.loadQuestions();
      }, 250);
    });

    // Pagination
    this.dom.prevPageBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadQuestions();
      }
    });

    this.dom.nextPageBtn.addEventListener('click', () => {
      this.currentPage++;
      this.loadQuestions();
    });

    this.dom.jumpPageBtn.addEventListener('click', () => {
      const pageVal = parseInt(this.dom.jumpPageInput.value, 10);
      if (pageVal && pageVal >= 1) {
        this.currentPage = pageVal;
        this.loadQuestions();
      }
    });

    // Keyboard Shortcuts (Left/Right arrow for pagination)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && !this.dom.prevPageBtn.disabled) {
        this.dom.prevPageBtn.click();
      } else if (e.key === 'ArrowRight' && !this.dom.nextPageBtn.disabled) {
        this.dom.nextPageBtn.click();
      }
    });
  }
}

// Instantiate and start app
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
