# MUKIJO - How to Run the Program
Follow these simple steps to run the backend API, frontend web portal, and mobile app.
---
## 🛠️ Step 1: Run the Backend (FastAPI)
The backend runs on **Windows** using a Python virtual environment.
1. Open your terminal in the project root and navigate to the `backend` folder:
   ```powershell
   cd backend
   ```
2. Create and activate the Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install the required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```
4. Set up the database schema:
   ```powershell
   python migrate_db.py
   ```
5. Start the API server:
   ```powershell
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```
   *The backend will now be running at `http://127.0.0.1:8001`.*
---
## 💻 Step 2: Run the Frontend (Next.js Web Portal)
The frontend is built with React/Next.js.
1. Open a new terminal window, navigate to the `frontend` folder:
   ```powershell
   cd frontend
   ```
2. Install the frontend dependencies:
   ```powershell
   npm install
   ```
3. Start the web application:
   ```powershell
   npm run dev
   ```
   *The frontend will now be running at `http://localhost:3000`.*
---
## 📱 Step 3: Run the Mobile App (Flutter)
The mobile app is built with Flutter.
1. Open a new terminal window, navigate to the `mukijo_app` folder:
   ```powershell
   cd mukijo_app
   ```
2. Fetch the mobile app dependencies:
   ```powershell
   flutter pub get
   ```
3. Run the app on a connected device, emulator, or browser:
   ```powershell
   flutter run
   ```
