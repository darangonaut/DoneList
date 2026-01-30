
Cieľom MVP je: **Prísť do appky, zapísať úspech, vidieť históriu dňa.**

---

## 📋 Špecifikácia MVP: "DoneLog"

### 1. Funkčný rozsah (Features)

* **Google Auth:** Používateľ sa prihlási jedným klikom. Žiadne heslá, žiadne potvrdzovacie maily.
* **Logovací Input:** Jednoduché textové pole na hlavnej obrazovke ("Čo si práve dokonal?").
* **Feed úspechov:** Časovo zoradený zoznam aktivít pre aktuálny deň.
* **Mazanie úloh:** Možnosť odstrániť chybný záznam.
* **PWA Setup:** Možnosť pridať na plochu (ikona + splash screen).

### 2. Technické zadanie

* **Frontend:** HTML5, CSS3 (odporúčam **Tailwind CSS** pre moderný vzhľad bez námahy) a Vanilla JS alebo React.
* **Backend:** Firebase
* *Authentication:* Metóda Google.
* *Cloud Firestore:* NoSQL databáza.


* **Hosting:** Firebase Hosting (má SSL certifikát v cene, čo je podmienka pre PWA).

### 3. Dátový model (Firestore)

Kolekcia `logs` bude obsahovať dokumenty s touto štruktúrou:

```javascript
{
  userId: "abc123googleid",
  text: "Dokončený návrh UI",
  timestamp: serverTimestamp(), // dôležité pre zoradenie
  category: "work" // pre začiatok stačí "default"
}

```

---

## 🎨 Dizajnové smerovanie (UI/UX)

Vychádzajme z toho obrázku, čo sme vygenerovali:

* **Farebná paleta:** Jemná krémová/mentolová (pôsobí upokojujúco, nie stresujúco ako červená pri To-Do listoch).
* **Hlavné tlačidlo:** Dominantné tlačidlo **[+]** v spodnej časti (ľahko dosiahnuteľné palcom).
* **Písmo:** Bezpätkové, čisté (napr. Inter alebo Montserrat).

---

## 🛠 Krok za krokom (Roadmapa vývoja)

### Fáza 1: Firebase Setup (1 hodina)

1. Vytvor projekt v [Firebase Console](https://console.firebase.google.com/).
2. Povoliť **Google Authentication**.
3. Vytvoriť **Firestore databázu** v testovacom režime.

### Fáza 2: Základný kód (2-4 hodiny)

1. Vytvoriť `index.html` s prihlasovacím tlačidlom.
2. Napísať funkciu `addTask()` – po stlačení Enter/tlačidla sa dáta odošlú do Firestore.
3. Napísať funkciu `renderTasks()` – v reálnom čase (onSnapshot) bude vykresľovať zoznam úloh.

### Fáza 3: Premena na PWA (30 min)

1. Vytvoriť `manifest.json` (ikonka, farby).
2. Pridať jednoduchý `service-worker.js` (pre offline režim).

---
