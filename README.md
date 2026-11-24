# FCPS Part 1 Medicine Question Bank Explorer ⚕️

A modern, responsive, high-performance web application designed for doctors preparing for the **FCPS Part 1 (Medicine & Allied) / BCPS** examinations.

Designed for long study sessions on **Mobile, Tablet, and Desktop** devices.

---

## 🌟 Key Highlights & Architecture

### 🔒 1. Zero-Data Repository Policy (100% Client-Side & Private)
- **NO question `.txt` or `.zip` files are stored in this GitHub repository**.
- All question parsing, rendering, and progress caching take place **100% inside your browser** using HTML5 and the browser's high-speed **IndexedDB** database.
- **Privacy Guaranteed**: Your study files and progress never touch an external server. Once loaded, the web app works completely offline without an internet connection.

### 📁 2. Flexible Local File Selection
On launch (or anytime from the Data Manager), you can select your question data:
- **Select Data Folder**: Pick the folder containing your 29 question `.txt` files directly (e.g. from `/sdcard/fcps all qstn`).
- **Upload Zip Archive**: Select a `.zip` archive containing the text files (automatically unpacked in browser memory via bundled JSZip).
- **Select Multiple Files**: Select multiple `.txt` files directly.
- **Interactive Demo**: Try 10 preview questions instantly without selecting any files.

### 💾 3. Persistent In-Memory & IndexedDB Cache
- You only need to select your folder or zip **once**.
- All ~74,000 questions, topic breakdowns, and question bank indexes are cached locally in your browser's IndexedDB.
- When you reopen the web app tomorrow or next week, all your questions and progress load instantly in less than 1 second.
- Tracks bookmarks (★) and answered questions.

### 📚 4. Structured Topic & Question Bank Browsing
- Automatically organizes questions by **Davidson's Principles and Practice of Medicine** chapters (Chapters 01 to 36):
  - *01 - Clinical Decision-Making*
  - *07 - Poisoning & Toxicology*
  - *18 - Diabetes Mellitus*
  - *21 - Gastrointestinal Disease*
  - *24 - Kidney and Urinary Tract Disease*
  - *25 - Cardiovascular Disease*
  - *26 - Respiratory Disease*
  - ...and all remaining specialties!
- Within each topic, filter dynamically by **Question Bank**:
  - `All Banks`
  - `Genesis`
  - `BCPS / FCPS`
  - `MHS`
- Filter by Format:
  - `SBA (Single Best Answer)`
  - `MCQ (Multiple True/False)`
  - `Bookmarked Only (★)`
- Instant keyword search across questions within each topic.

### 👁️ 5. "Always Show Answer" vs "Interactive Practice Mode"
- **Study / Review Mode (Always Show Answer ON)**:
  - Correct keys, True/False tags, and clinical rationales are visible immediately.
- **Practice / Exam Mode (Always Show Answer OFF)**:
  - **SBA Mode**: Click an option (A, B, C, D, E) to test yourself. It turns green if correct, or red with the right answer highlighted if wrong, and unfolds the clinical explanation.
  - **MCQ (True/False) Mode**: Interactive `[T]` and `[F]` buttons for each stem (A through E) with instant color-coded feedback and official keys.
  - Per-card "Reveal Answer & Rationale" toggle to peek if stuck.

### 🎨 6. Student-Friendly Themes & Font Sizing
- **4 Distinct Themes**:
  1. 🌙 **Dark Mode**: Deep midnight palette `#0b0f17` designed for night study without eye fatigue.
  2. 📜 **Brown Sepia**: Warm vintage paper/amber library theme like a high-end Kindle.
  3. 🌿 **Medical Green**: Soothing forest/clinical sage palette recommended for visual comfort.
  4. ☀️ **Light Mode**: Clean clinical paper theme with crisp contrast.
- **Scalable Font Size**:
  - Small (14px), Medium (16px), Large (18px), Extra Large (20px).

### 📱 7. Mobile & Tablet Friendly
- Responsive slide-over drawer navigation for mobile.
- Generous touch target sizes (minimum 44px).
- Sticky bottom pagination bar with quick jump to any page number.
- Keyboard shortcuts on desktop (`←` Previous Page, `→` Next Page).

---

## 🚀 Publishing to GitHub & Deploying to GitHub Pages

### Step 1: Initialize Git and Push to GitHub
```bash
cd /data/data/com.termux/files/home/fcps-question-bank
git init
git add .
git commit -m "Initial commit: FCPS Medicine Vault Web App"

# Create a new repository on github.com (e.g. username/fcps-question-bank)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git branch -M main
git push -u origin main
```

*(Notice: `.gitignore` guarantees that no `.txt` or `.zip` files will ever be committed to the repository)*

### Step 2: Enable GitHub Pages (Free Hosting)
1. Go to your repository on GitHub: `https://github.com/<username>/<repo>`.
2. Click **Settings** > **Pages** (under Code and automation).
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** / root (`/`)
   - Click **Save**.
4. In about 30–60 seconds, GitHub Pages will give you your live URL:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/`

Open that URL in your mobile Chrome, tablet, or PC browser. Click **Select Data Folder** and choose `/sdcard/fcps all qstn`, and your entire question vault is ready for study!

---

## 💻 Local Testing & Usage

To run locally on your Android/Termux or PC:
```bash
cd /data/data/com.termux/files/home/fcps-question-bank
python3 -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

---

## 🛠️ Tech Stack
- **Pure Modern JavaScript (ES Modules)** — Zero build tools, zero dependencies.
- **HTML5 & CSS3 Variables** — Native theme and responsive design without heavy UI frameworks.
- **IndexedDB Storage Engine** — Handles 74,000+ questions with instant indexing and sub-millisecond retrieval.
- **JSZip (Local offline bundle)** — Fast client-side zip decompression.
