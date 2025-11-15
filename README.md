# Bimal Skating Park Management System

A comprehensive management system for skating parks with ticket management, sales tracking, expense management, staff management, and multi-branch support.

## Features

### 🎫 Ticket Management
- Quick ticket creation with QR code generation
- Ticket history with lifetime data access
- Extra time ticket management
- Partial and full refund support
- Player status tracking
- Ticket deactivation after 1 hour
- Discount management
- Contact number search

### 💰 Sales Management
- Sales record tracking
- Product and customer management
- Manual discount entry
- Optional customer name
- Sales analytics and reporting

### 💸 Expense Management
- Expense tracking by category
- Date-based filtering
- Expense analytics

### 👥 Staff & User Management
- Multi-role support (Admin, Staff)
- Staff dashboard with limited access
- User authentication and authorization
- Branch-based access control

### 📊 Dashboard & Analytics
- Real-time dashboard
- Daily, weekly, monthly summaries
- Revenue and expense tracking
- Ticket statistics
- Sales reports

### 🏢 Multi-Branch Support
- Multiple branch management
- Branch-specific data isolation
- Branch settings and configuration

### 📅 Date Support
- Dual date system (English & Nepali dates)
- Nepali date conversion
- Date-based filtering and reporting

### 🔐 Security & Backup
- User authentication
- Role-based access control
- Automated backup system
- Data restore functionality

## Tech Stack

### Frontend
- React 18
- Vite
- Axios for API calls
- React Router
- Context API for state management

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- QR Code Generation
- PDF Generation

## Project Structure

```
newBimalMama/
├── client/          # React frontend application
│   ├── src/
│   │   ├── api/     # API configuration
│   │   ├── components/  # Reusable components
│   │   ├── pages/   # Page components
│   │   └── context/ # Context providers
│   └── public/      # Static assets
│
├── backend/         # Node.js backend application
│   ├── models/      # Mongoose models
│   ├── routes/      # API routes
│   ├── middleware/ # Custom middleware
│   ├── utils/       # Utility functions
│   └── config/       # Configuration files
│
└── backups/         # Backup storage
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the backend server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
```

Start the development server:

```bash
npm run dev
```

## Usage

1. **Initial Setup**: Create an admin account on first run
2. **Branch Setup**: Configure your branches in the settings
3. **Staff Management**: Add staff members with appropriate roles
4. **Ticket Creation**: Use the quick entry form to create tickets
5. **Sales & Expenses**: Track daily sales and expenses
6. **Reports**: View analytics and generate reports

## Key Features in Detail

### Ticket System
- Automatic ticket number generation (date-based)
- QR code generation for each ticket
- Player name tracking
- Group ticket support
- Extra time management
- Automatic deactivation after 1 hour

### Sales System
- Product catalog management
- Customer database
- Sales with discount support
- Payment method tracking
- Sales history

### Dashboard
- Real-time statistics
- Revenue tracking
- Expense monitoring
- Ticket analytics
- Sales summaries

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Branch-based data isolation
- Protected API routes

## Backup & Restore

- Automated backup system
- Manual backup creation
- Data restore functionality
- Backup download option

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.

---

**Note**: Make sure to configure your MongoDB connection string and JWT secret in the `.env` file before running the application.

