# 🚀 Collaborative Workflow Orchestration System

---

## 🔗 Repository & Live Links

* **GitHub Repo:** https://github.com/jagan-238/esmagico-assignment
* **Frontend URL:**https://esmagico-assignment-3h3j.vercel.app/
* **Backend URL:** https://esmagico-assignment.onrender.com/

---

## 📌 Overview

This project is a backend-driven **workflow orchestration system** where:

* Users create projects and invite collaborators
* Tasks can depend on other tasks
* Execution order is computed using graph algorithms
* Simulation selects tasks based on constraints
* Webhooks notify external systems on task completion

---

## 🏗 Architecture Overview

```
Client (React)
   ↓
API Layer (Express)
   ↓
Service Layer (Business Logic)
   ↓
MongoDB (Mongoose)
```

* Controllers → handle requests
* Services → contain core logic
* Models → database schema
* Socket layer → real-time updates

---

## 🔗 Dependency Logic

* Tasks form a **Directed Acyclic Graph (DAG)**
* Each task stores dependencies using ObjectId references
* Validation ensures:

  * Dependencies exist
  * Belong to same project
  * No self-dependency
  * No cycles

### Execution Order:

* Computed using **Topological Sort**
* Ensures tasks run only after dependencies complete

---

## ⚡ Concurrency Handling

* Implemented using **Optimistic Locking**
* Each task has a `versionNumber`

### Flow:

1. Client sends versionNumber
2. Server compares with DB
3. If mismatch → `409 Conflict`
4. Prevents stale updates

---

## 🧪 Simulation Approach

Simulation selects tasks based on:

* Dependency completion
* Available hours
* Task priority

### Output:

* executionOrder
* selectedTasks
* blockedTasks
* skippedTasks
* remainingHours

### Strategy:

* Greedy selection approach
* Prioritizes high-value tasks within constraints

---

## 🔔 Webhook System

* Triggered when task status becomes **Completed**
* Sends HTTP POST request with payload

### Example Payload:

```json
{
  "event": "task.completed",
  "task": {
    "id": "...",
    "title": "...",
    "status": "Completed"
  },
  "project": {
    "id": "...",
    "name": "Project Name"
  }
}
```

* Includes retry mechanism (3 attempts)
* Logs all webhook attempts in DB

---

## 🧠 Assumptions

* Tasks belong to a single project
* Dependencies are intra-project only
* Status values are controlled:

  * Pending
  * Running
  * Completed
  * Failed

---

## ⚖ Tradeoffs

* Used greedy scheduling instead of optimal scheduling
* No distributed locking (kept system simple)
* Real-time updates are event-based (not guaranteed delivery)
* Minimal UI validation (focus on backend correctness)

---

## 🛠 Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* Socket.IO
* Axios
* JWT Authentication

---

## 🚀 Setup Instructions

### 1. Clone repo

```
git clone <repo-url>
cd project
```

### 2. Install dependencies

```
npm install
```

### 3. Create .env file

```
PORT=3000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
```

### 4. Run server

```
npm run dev
```

---

## 🧪 Testing

### ✔ Cycle Detection

* Prevents circular dependencies

### ✔ Stale Update Rejection

* Validates version mismatch

### ✔ Execution Ordering

* Ensures correct DAG traversal

### ✔ Simulation Logic

* Validates task selection logic

---

## 🤖 AI_USAGE

### Tools Used:

* ChatGPT (design, debugging, explanation)

### Key Prompts:

* "How to implement DAG in Node.js?"
* "Topological sorting for tasks"
* "Webhook retry logic"
* "Optimistic locking in MongoDB"

### AI vs Manual Work:

AI-assisted:

* Architecture understanding
* Debugging webhook issues
* Concept explanations

Manual:

* Service layer implementation
* API design
* Testing and integration

---

## 🎥 Walkthrough Video

* Duration: 3–5 minutes
* Demonstrates:

  * Project creation
  * Task creation
  * Dependency setup
  * Execution plan
  * Simulation
  * Webhook trigger

---

## 🎯 Conclusion

This system demonstrates:

* Graph-based problem solving (DAG)
* Backend system design
* Event-driven architecture
* Workflow automation

Inspired by systems like:

* Apache Airflow
* Asana
* Jira

---

## 👨‍💻 Author

Jagan Mohan Reddy
