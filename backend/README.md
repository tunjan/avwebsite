# Backend

This is the backend for the AVWebsite project. It's a Node.js application written in TypeScript that uses Express.js, Prisma, and Passport.js.

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Set up the database:**

    - Make sure you have a PostgreSQL database running.
    - Create a `.env` file in the `backend` directory and add the following environment variable:

      ```
      DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
      ```

    - Run the following command to create the database tables:

      ```bash
      npx prisma migrate dev
      ```

3.  **Seed the database:**

    ```bash
    npm run prisma:seed
    ```

4.  **Start the development server:**

    ```bash
    npm run dev
    ```

The server will be running at `http://localhost:3000`.
