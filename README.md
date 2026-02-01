# DoneList 🚀

**DoneList** is a minimalist Progressive Web App (PWA) crafted with a strict Apple-inspired aesthetic. It's not just a log—it's a psychological tool designed to help you overcome "achievement amnesia" and build lasting discipline through the celebration of daily victories.

👉 **Live Demo:** [https://donelist-8b4e7.firebaseapp.com](https://donelist-8b4e7.firebaseapp.com)

![UI Style](https://img.shields.io/badge/UI-Apple%20Style-F2F2F7?style=for-the-badge&logo=apple)
![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Animations-Framer%20Motion-FF0055?style=for-the-badge&logo=framer)

## 🧠 Why DoneList?

Most of us suffer from **achievement amnesia**. At the end of the day, we remember exactly which three emails we didn't answer, but we completely ignore the ten things we actually solved. DoneList "hacks" your psychology:

- **Fight Negative Bias:** Our brains are wired to notice threats and unfinished tasks. DoneList acts as a counterbalance, forcing you to acknowledge real progress.
- **Dopamine on Demand:** Unlike To-Do lists where the feeling disappears when you delete a task, DoneList builds an archive of victories you can return to anytime.
- **Objective Productivity:** Change the feeling of "I did nothing today" into clear facts. See exactly where your energy is really going.
- **Fuel for Hard Days:** Your archive is proof that you are capable of getting things done, even when you don't feel like it.

## ✨ Key Features

- **🔮 AI Mentor:** Your personal stoic coach powered by Google Gemini. It analyzes your logs in your language to provide tailored motivation and insights.
- **📅 Calendar & Today View:** Switch between a focused "Today" list and a comprehensive "Calendar" archive to visualize your consistency over time.
- **Hierarchical Reflections:** Daily, weekly, and monthly rituals to crown your best moments—from **🌟 Daily Stars** to **💎 Weekly Jewels** and **🏆 Monthly Trophies**.
- **Victory Cards 📸:** Generate beautiful, minimalist images of your top wins with one click, ready to be shared on Instagram Stories or saved to your gallery.
- **Smart Tags & Focus Mode:** Categorize your wins with `#tags`. Tap any tag to filter your entire history and see category-specific progress in the heatmap.
- **Immersive Writing Mode:** A dramatic full-screen transformation from a floating [+] button into a clean, focused writing space.
- **Activity Heatmap:** A GitHub-style year-long visualization of your consistency, automatically tinted by your dominant category of the day.
- **Adaptive Aesthetics:** Full support for System Light/Dark modes across the entire app, including an animated storytelling landing page with scientific charts.
- **Minimalist Constraints:** A 280-character limit with a visual counter keeps your entries concise, powerful, and easy to review.
- **iOS Native Feel:** Swipe-to-delete gestures, haptic feedback, and a PWA setup optimized for the "Add to Home Screen" experience.

## 🛠 Tech Stack

- **Frontend:** [React](https://reactjs.org/) + [Framer Motion](https://www.framer.com/motion/)
- **AI Intelligence:** [Google Gemini API](https://ai.google.dev/) (Gemini 2.5 Flash)
- **Image Generation:** [html-to-image](https://www.npmjs.com/package/html-to-image)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend:** [Firebase](https://firebase.google.com/) (Auth, Firestore with Security Rules, Hosting)
- **Visuals:** [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) for celebrations

## 🚀 Quick Start (Local Dev)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/darangonaut/DoneList.git
   cd DoneList
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up AI (Optional):**
   Get your API key from [Google AI Studio](https://aistudio.google.com/).
   Create a `.env.local` file in the root directory:
   ```bash
   echo "VITE_GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## 📋 Roadmap

- [x] Smart Categories (#work, #health, #personal) with color tagging.
- [x] Shareable "Victory Cards" optimized for Instagram Stories.
- [x] Hierarchical reflections (Day/Week/Month).
- [x] AI Mentor (Analyze progress and provide motivation).
- [x] Calendar View for browsing history.
- [ ] Voice-to-text logging (Siri-style input).
- [ ] Push Notifications for evening reminders.
- [ ] Fulltext search.

---
Created to celebrate every step of progress. *Done is better than perfect.*