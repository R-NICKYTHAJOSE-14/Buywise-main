# Buywise — AI-Powered E-Commerce Platform

Buywise is a modern, full-stack AI-driven e-commerce platform featuring an intelligent, unified AI Shopping Partner designed to assist customers with grounded product discovery, smart comparisons, affordability checks, and cart optimization.

---

## 🌟 Key Features

- **Unified AI Shopping Partner**: ReAct-loop AI assistant that queries live catalog and budget data to provide honest recommendations, side-by-side product comparisons, and affordability guidance.
- **Smart Catalog & Search**: Dynamic filtering across categories, price brackets, ratings, and brands with instant search and sort capabilities.
- **Product Insights & Reviews**: Detailed product specifications, verified customer reviews, dynamic rating aggregations, and AI-generated product highlights.
- **Cart & Order Management**: Full shopping cart with save-for-later, AI-powered cart optimization, seamless multi-step checkout, and order history tracking.
- **Financial & Budgeting Tools**: Built-in financial profile, monthly spending tracking, price watch alerts, and goal-oriented purchase planning.
- **Modern Responsive UI**: Built with Tailwind CSS and Radix UI primitives, featuring dark/light aesthetic accents, fluid animations, and mobile drawer views.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript
- **Database & ORM**: SQLite with [Prisma](https://www.prisma.io/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI primitives & Lucide Icons
- **AI Orchestration**: Custom tool-augmented ReAct orchestrator with Groq API integration

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or higher)
- npm, yarn, or bun

### 1. Clone the repository

```bash
git clone https://github.com/R-NICKYTHAJOSE-14/Buywise-main.git
cd Buywise-main
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update your `.env` file with appropriate keys if you want live AI LLM completions (e.g. `GROQ_API_KEY`).

### 4. Setup Database

Initialize the database schema with Prisma:

```bash
npm run db:push
```

*(Optional)* Seed initial data:
```bash
npx tsx scripts/seed.ts
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── prisma/             # Prisma schema & migrations
├── public/             # Static public assets
├── src/
│   ├── app/            # Next.js App Router (pages & API routes)
│   ├── components/     # Reusable UI components & dialogs
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # AI orchestrator, DB clients, utility functions
│   └── types/          # TypeScript definitions
├── db/                 # Local SQLite database files
└── scripts/            # Database seed and maintenance scripts
```

---

## 📄 License

This project is licensed under the MIT License.
