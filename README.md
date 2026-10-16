# CareCircle

<div align="center">
  <img src="mobile/assets/images/cc_logo.png" alt="CareCircle Logo" width="100" height="100" />
  <h3>Community Mental Health Peer-Support Network</h3>
  <p><strong>A Digital Sanctuary for Empathy, Collective Resilience, and Accessible Mental Wellbeing</strong></p>

[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~57.0.25-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android APK](https://img.shields.io/badge/Android%20APK-Download%20Preview-brightgreen?logo=android&logoColor=white)](https://expo.dev)

</div>

---

## 📱 Mobile App (Android APK Download)

You can download and install the standalone preview APK directly onto your Android device for testing without needing Expo Go or a development server.

| Platform    | Build Type                  | Download Link                                                                                                                       |
| :---------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Android** | Standalone Preview (`.apk`) | [📥 **Download CareCircle APK**](https://expo.dev/accounts/kaij789/projects/carecircle/builds/e9c369bb-cc8f-4ce4-bfaf-91562d3580b7) |

> [!TIP]
> **Android Installation Note**:
> When installing the `.apk` on your phone, if prompted with _"Install unknown apps"_, tap **Settings** and allow your browser/file manager to install. Tap **Install anyway** if Google Play Protect flags the unverified developer signature.

---

**CareCircle** is a community-driven mental health platform engineered to provide accessible peer support, emotional tracking, and professional resources. Unlike conventional clinical therapy, CareCircle emphasizes **collective resilience**, **shared experiences**, and **empathetic non-judgmental guidance**.

Designed around the **"Digital Sanctuary"** philosophy, every interaction is crafted to reduce cognitive load, promote calm, and foster genuine human connection in a safe, moderated space.

---

## 🌟 Core Features

### 1. 🚀 Onboarding & Startup Experience

- **Branded Startup Loading Screen**: Smooth, ambient loading screen featuring the CareCircle emblem, rotating circular progress indicator, and soft breathing animations in primary Serene Sky Blue (`#285F8E`).
- **Interactive 3-Step Walkthrough**:
  - **Slide 1**: _Connect & Share_ — Highlights Peer Support Chat & Community Forum + Session Scheduling.
  - **Slide 2**: _Awareness & Growth_ — Highlights Mood & Wellbeing Tracker + Goal Setting & Progress Tracker.
  - **Slide 3**: _Safety & Knowledge_ — Highlights Resource Library & Crisis Support Directory with full-width launch action.
- **Dynamic Status Bar & Insets**: Seamless edge-to-edge support with custom safe area insets for notches, Dynamic Island, and Android status bars.
- **Persistent State**: Automatically stores onboarding completion in local device storage, with on-demand tour access from login.

### 2. 💬 Peer Support Chat & Community Forum

- **Moderated Circles**: Safe topic-based forums covering anxiety, mindfulness, depression, stress management, and daily gratitude.
- **Real-Time Peer Chat**: Instant peer-to-peer messaging powered by Socket.IO with typing indicators and online status.
- **Empathetic Community**: Users can create posts, comment, react, and share lived experiences safely.

### 3. 📅 Session Scheduling & 1-on-1 Guidance

- **Book Peer Sessions**: Schedule structured 1-on-1 sessions with verified, qualified peer supporters.
- **Session Reports**: Automated session summaries, feedback collection, and downloadable PDF reports via `pdfkit`.
- **Status & Calendar Management**: Real-time session statuses (Pending, Confirmed, Completed, Cancelled) and calendar scheduling.

### 4. 🌿 Mood & Wellbeing Tracker

- **Expressive Mood Check-Ins**: Daily emotional logging with 5 intuitive expressive vector faces (Terrible, Bad, Neutral, Good, Great).
- **Trend Insights & History**: Visual representation of mood variations, streak analytics, and longitudinal emotional wellness tracking.
- **Export & Share**: Generate shareable mood reports for personal reflection or peer supporters.

### 5. 🎯 Goal Setting & Progress Tracker

- **Personalized Goals**: Set wellness targets across categories like Meditation, Walking, Journaling, and Sleep.
- **Progress Milestones**: Visual progress rings, streak counters, and daily habit completion logs.
- **Achievements & Badges**: Earn supportive milestones and encouraging badges as personal habits strengthen.

### 6. 📚 Resource Library & Crisis Support Directory

- **Curated Mental Health Toolkits**: Expert-reviewed coping strategies, breathing audio exercises, and grounding guides for panic/anxiety.
- **24/7 Verified Crisis Directory**: Immediate one-tap access to emergency crisis hotlines (e.g., 988 Lifeline, 1333, text lines).
- **Offline Safety**: Crucial emergency contacts and distress guidance are always instantly accessible.

---

## 🎨 Design System ("Serene Support")

The UI follows the design specifications in [`DESIGN.md`](./DESIGN.md), focused on **Modern Minimalism** mixed with **Soft Tonal Layering**:

| Token                      | Hex Value             | Role & Usage                                             |
| -------------------------- | --------------------- | -------------------------------------------------------- |
| **Primary (Sky Blue)**     | `#285F8E`             | Brand presence, primary buttons, active tabs & pills     |
| **Secondary (Sage Green)** | `#3E6658`             | Growth indicators, completion streaks, secondary buttons |
| **Surface / Background**   | `#F7FAFD`             | Clean, tranquil canvas with zero harsh contrast          |
| **Card / Surface Low**     | `#FFFFFF`             | Elevated cards with soft ambient drop shadows            |
| **Text (Slate)**           | `#181C1F`             | High-legibility neutral typography                       |
| **Text Secondary**         | `#41474F`             | Captions, subtitles, and explanatory body text           |
| **Outline / Border**       | `#C1C7D0`             | Subtle card dividers and input borders                   |
| **Crisis Accent**          | `#BA1A1A` / `#FFDAD6` | Emergency SOS indicators and urgent alerts               |

- **Typography**: Public Sans / System Rounded with generous line-height (1.6x+) to prevent visual crowding.
- **Shapes**: Rounded radii (`0.5rem` for standard elements, `1rem` for content cards, and pill shapes for badges).

---

## 🏗️ Architecture & Tech Stack

### Frontend (`/mobile`)

- **Framework**: React Native 0.86 with Expo SDK 57
- **Language**: TypeScript 6.0
- **Navigation**: React Navigation 7 (Native Stack & Bottom Tabs)
- **Styling**: NativeWind (TailwindCSS 3.4) + StyleSheet
- **State & Storage**: React Context (`AuthContext`) + Cross-platform `tokenStorage`
- **Real-Time**: `socket.io-client` 4.8

### Backend (`/backend`)

- **Runtime**: Node.js with Express 5
- **Database**: MongoDB with Mongoose 9 (supports MongoDB Memory Server for test isolation)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing
- **Real-Time Server**: Socket.IO 4.8
- **PDF Generation**: `pdfkit` for session summary exports
- **Testing**: Built-in Node test runner (`node --test`)

---

## 📁 Repository Structure

```
carecircle/
├── backend/                       # Express & Node.js Backend
│   ├── src/
│   │   ├── config/                # Database & Socket configuration
│   │   ├── controllers/           # Auth, Session, Mood, Goal, Forum controllers
│   │   ├── middleware/            # Auth, Admin & Validation middleware
│   │   ├── models/                # 21 Mongoose models (User, Goal, Session, etc.)
│   │   ├── routes/                # REST API endpoint definitions
│   │   └── services/              # Session reports, Goal tracking, Reminders
│   ├── test/                      # Automated API integration tests
│   ├── package.json
│   └── server.js                  # App entry point & Socket.IO server
│
├── mobile/                        # React Native (Expo) Mobile App
│   ├── assets/                    # Logos, illustrations, and vector assets
│   ├── src/
│   │   ├── components/            # Reusable UI components (Logo, Cards, Modals)
│   │   ├── constants/             # Colors, Themes, Moods, Goal categories
│   │   ├── hooks/                 # Color scheme and device hooks
│   │   ├── navigation/            # AppNavigator, AuthNavigator, MainNavigator
│   │   ├── screens/
│   │   │   ├── onboarding/        # LoadingScreen & OnboardingSlides (1, 2, 3)
│   │   │   ├── auth/              # LoginScreen & SignupScreen
│   │   │   ├── main/              # Home, Sessions, Goals, Community, Reports
│   │   │   ├── forum/             # Community discussion boards
│   │   │   ├── mood/              # Mood check-in and tracking screens
│   │   │   ├── resources/         # Mental health guides & toolkits
│   │   │   └── crisis/            # 24/7 Crisis Support Directory
│   │   ├── services/              # API clients and persistent token storage
│   │   └── store/                 # AuthContext & Session management
│   ├── App.tsx                    # Root React Native component
│   └── package.json
│
├── DESIGN.md                      # Comprehensive design system & style tokens
└── README.md                      # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- [Expo Go](https://expo.dev/go) app (for physical testing) or Android Studio / Xcode (for emulators)

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Create a .env file with:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/carecircle
# JWT_SECRET=your_jwt_secret_key

# Start the server in development mode
npm run dev

# Run automated tests
npm test
```

The backend server will run on `http://localhost:5000`.

---

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start the Expo development server
npm start
```

#### Run on specific platforms:

- **Android Emulator**: `npm run android`
- **iOS Simulator**: `npm run ios`
- **Web Browser**: `npm run web`
- **Physical Device**: Open **Expo Go** and scan the QR code printed in the terminal.

---

## 🛡️ Safety & Moderation Principles

1. **Crisis Intervention First**: Emergency hotlines and verified distress resources are prioritized above all regular navigation.
2. **Peer Non-Clinical Boundary**: CareCircle connects peers for empathy and shared experiences. It is explicitly not a clinical substitute for emergency medical care.
3. **Data Privacy & Ephemeral Chats**: User sessions, journal notes, and mood check-ins are protected with strict JWT authorization and role-based access.

---

## 📄 License

This project is licensed under the ISC License.
