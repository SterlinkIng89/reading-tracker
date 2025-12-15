# Reading Tracker

A reading tracker application with a Steam library view style, designed to help users track their reading progress, manage their personal library, and keep a log of their reading habits. Built with a modern tech stack ensuring performance and scalability.

## Features

-   **User Authentication**: Secure sign-up and sign-in functionality using JWT.
-   **Book Discovery**: Integrated with Google Books API to search and add books to your library.
-   **Library Management**: Organize your books, track reading status (reading, completed), and manage your collection.
-   **Progress Tracking**: Log daily reading sessions, track pages read, and visualize your progress.
-   **Reading Logs**: Keep detailed notes and history of your reading sessions.
-   **Responsive Design**: A modern, responsive user interface built with Astro and TailwindCSS.

## Tech Stack

### Frontend
-   **Framework**: [Astro](https://astro.build/)
-   **UI Library**: [React](https://reactjs.org/)
-   **Styling**: [TailwindCSS](https://tailwindcss.com/)

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
-   **Database Driver**: [Motor](https://motor.readthedocs.io/) (Async MongoDB driver)
-   **Authentication**: JWT (JSON Web Tokens)

### Database
-   **Database**: [MongoDB](https://www.mongodb.com/)

### Infrastructure
-   **Containerization**: Docker & Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed:
-   [Docker](https://www.docker.com/get-started)
-   [Docker Compose](https://docs.docker.com/compose/install/)

You will also need a **Google Books API Key**. You can get one from the [Google Cloud Console](https://console.cloud.google.com/).

## Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/SterlinkIng89/reading-tracker.git
    cd reading-tracker
    ```

2.  **Environment Configuration**
    
    Create a `.env` file in the root directory based on `.env.example`. You can also configure separate `.env` files in `backend/` and `frontend/` if needed, but the root `.env` is primarily used by Docker Compose.

    **Root `.env` example:**
    ```env
    MONGO_USER=mongoadmin
    MONGO_PASS=mongopass
    MONGO_HOST=mongo
    MONGO_AUTH_DB=admin
    MONGO_HOST_PORT=27018
    
    JWT_SECRET=your_super_secret_key
    JWT_EXPIRE_MINUTES=60
    REFRESH_TOKEN_EXPIRE_DAYS=7
    
    ALLOWED_ORIGINS=http://localhost:3000
    
    GOOGLE_BOOKS_API_KEY=your_google_books_api_key
    
    PUBLIC_API_BASE=http://localhost:8000
    ```

3.  **Build and Run**
    ```bash
    docker-compose up --build
    ```

## Usage

Once the application is running via Docker Compose:

-   **Frontend**: Access the application at [http://localhost:3000](http://localhost:3000).
-   **Backend API**: The API is available at [http://localhost:8000](http://localhost:8000).
-   **API Documentation**: Interactive API docs (Swagger UI) are available at [http://localhost:8000/docs](http://localhost:8000/docs).
-   **MongoDB**: Accessible locally at `mongodb://localhost:27018` (credentials: `mongoadmin`/`mongopass`).

### Utility Commands

**View Frontend Logs:**
```bash
docker-compose logs --follow frontend
```

**View Backend Logs:**
```bash
docker-compose logs --follow backend
```