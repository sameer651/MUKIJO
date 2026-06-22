# MUKIJO - Club & Community Management Platform
MUKIJO is a full-featured, cross-platform Club and Community Management system. It enables club administrators, coaches, members, and partners to connect and coordinate activities, bookings, courses, payments, fundraising, and events in one unified ecosystem.
The codebase is organized as a monorepo consisting of three main modules:
1. **Backend**: FastAPI web server & database interface (Python)
2. **Frontend**: Next.js administrator & member dashboard web portal (React / Next.js)
3. **Mobile App**: Flutter multi-platform application for club members and coaches (Dart / Flutter)
---
## 📂 Repository Architecture
```
MUKIJO/
├── backend/             # FastAPI Backend API
│   ├── app/             # Application logic (routes, models, schemas, services)
│   ├── main.py          # Uvicorn entry point
│   ├── requirements.txt # Python dependencies
│   └── migrate_db.py    # Database schema migration helper
│
├── frontend/            # Next.js Web Application
│   ├── app/             # App Router pages (dashboards, overview, login, registration)
│   ├── components/      # Reusable React components
│   └── package.json     # Node.js dependencies & scripts
│
└── mukijo_app/          # Flutter Mobile Application
    ├── lib/             # Dart source files (screens, providers, core, models)
    ├── pubspec.yaml     # Flutter package specifications
    └── android/ios/...  # Native platform build folders
```
---
## ⚡ Tech Stack
| Module | Core Technology | Primary Libraries | Default URL/Port |
| :--- | :--- | :--- | :--- |
| **Backend** | Python 3.10+ & FastAPI | SQLAlchemy, PostgreSQL (Psycopg2), Pydantic, Pandas | `http://127.0.0.1:8001` |
| **Frontend** | React & Next.js 15 (App Router) | TailwindCSS, Fetch API | `http://localhost:3000` |
| **Mobile App** | Flutter & Dart | Riverpod (State Management), GoRouter, HTTP | Cross-platform |
---
## ⚙️ Setup & Installation
### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **Flutter SDK (3.3.0+)**
- **PostgreSQL Database Server**
---
### 2. Backend Setup
The backend runs a FastAPI service connecting to a PostgreSQL database.
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` folder (or copy from the existing template/configuration):
   ```ini
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   FRONTEND_URL=http://localhost:3000
   ```
5. Apply database migrations / create schema:
   ```bash
   python migrate_db.py
   ```
6. Start the development server (runs on port `8001` by default):
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```
---
### 3. Frontend Setup
The frontend provides the admin and web-based dashboard portal.
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the development server (runs on port `3000` by default):
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
---
### 4. Mobile App Setup (Flutter)
The mobile app targets Android, iOS, Windows, macOS, and Web platforms using Flutter.
1. Navigate to the mobile app directory:
   ```bash
   cd mukijo_app
   ```
2. Fetch package dependencies:
   ```bash
   flutter pub get
   ```
3. Check connected devices and start the application:
   ```bash
   # Show active devices / simulators
   flutter devices
   # Run on selected device (ensure backend server on port 8001 is running)
   flutter run
   ```
   > 💡 **Note on API Connection:**
   > - If running on the **Android Emulator**, the app automatically directs API calls to `http://10.0.2.2:8001` (alias for host's loopback).
   > - On iOS Simulator or other platforms, it connects to `http://127.0.0.1:8001`.
   > - These configurations are managed in `lib/core/api_client.dart`.
---
## 🌟 Features Overview
- 🔒 **Unified Authentication**: Separate dashboards for Club Owners (Admin), Coaches, Members, and Venue Partners with standard JWT auth.
- 👥 **Group Management**: Manage groups, class rosters, and easily import members via CSV files.
- 📅 **Schedules & Courses**: Organize ongoing course schedules, register attendees, and log daily activities.
- 🎫 **Event Organization**: Create, RSVP to, and coordinate club events.
- 🏟️ **Venue Partner Booking**: Book sports fields, community halls, or private classrooms with real-time slots verification, slot blocking/unblocking, and payouts analytics.
- 💰 **Payments & Fundraising**: Keep track of member dues, payment histories, and direct fundraising campaign initiatives.
- 💬 **Real-time Messaging**: Direct, secure internal channels between administrators, coaches, members, and venue partners.
- 📝 **Customizable Onboarding**: Custom application forms for roles, with visual builders and approval stages.
