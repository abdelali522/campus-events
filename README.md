# campus-events
Project Development Summary: Campus Events Hub
Author: Abdelali522
Date: (You can put today's date or the project completion date)

Abstract
This document summarizes the key development activities and functionalities implemented for the Campus Events Hub project. The project involved building a full-stack web application using Node.js, Express.js, EJS for templating, and MySQL for the database, with Git and GitHub for version control and collaboration.

1. Core Project Setup and Backend Development
Initialized a Node.js project with Express.js for server-side logic and routing.

Configured EJS as the view engine for dynamic HTML page generation.

Established a MySQL database connection pool for data persistence.

Implemented session management for user authentication using express-session.

Set up middleware for serving static files, parsing request bodies (JSON, URL-encoded), and managing user session data (e.g., res.locals.isLoggedIn, res.locals.user).

2. Key Functionalities Implemented
User Authentication:
User registration with input validation (name, university email, password, role) and password hashing (bcryptjs).

User login with email and password, session creation.

User logout and session destruction.

Profile viewing and updating capabilities (including profile photo uploads using Multer).

Event Management:
Creation of new events by authenticated users, including details like title, description, location, date/time, category, max attendees, and event image (using Multer).

Display of upcoming events on the main page.

Editing of existing events by the event organizer or an admin.

Deletion of events by the event organizer or an admin, including deletion of associated image files and handling of foreign key constraints (e.g., if registrations exist).

Viewing event-specific registration lists for organizers/admins.

Event Registration by Users:
Authenticated users can register for publicly available events.

Checks for event availability (not started, not full, user not already registered).

Registration information (user ID, event ID, status) stored in the database.

User Dashboard ("My Events"):
Display of events created by the logged-in user.

Display of events the logged-in user is registered for.

3. Client-Side Development
Developed client-side JavaScript (mainEvents.js, my-events.js) for:

Dynamically fetching and rendering event listings using AJAX (fetch API).

Handling user interactions such as event registration and deletion without full page reloads.

Client-side validation and feedback for forms (e.g., registration form).

Updating the UI in real-time based on server responses (e.g., changing button states, removing deleted event cards).

Ensured client-side scripts correctly access user login status passed from the server via EJS templates.

4. Database Interaction
Designed and interacted with MySQL database tables for users, events, categories, and event registrations.

Implemented SQL queries for CRUD (Create, Read, Update, Delete) operations on these tables.

Addressed database integrity, such as handling foreign key constraints during event deletion.

5. Version Control and Collaboration (Git & GitHub)
Initialized a local Git repository for the project.

Created a remote repository on GitHub.

Connected the local repository to the GitHub remote.

Pushed the initial project codebase to GitHub.

Troubleshot and resolved common Git issues such as rejected push (fetch first) and refusing to merge unrelated histories using git pull and git pull --allow-unrelated-histories.

Added a teammate as a collaborator to the GitHub repository.

6. Troubleshooting and Debugging
Diagnosed and fixed client-side JavaScript errors, notably a SyntaxError: Unexpected token '<' caused by a recursive EJS include in views/partials/head.ejs.

Ensured correct communication of login status from server (EJS locals) to client-side JavaScript variables.

Addressed issues related to UI updates not reflecting database changes immediately (e.g., event still showing after deletion).
