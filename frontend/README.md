# Frontend

The browser application is served directly by Spring Boot from
`backend/src/main/resources/static`:

- `login.html` + `js/login.js` — sign-in
- `index.html` + `js/dashboard.js` — role-aware dashboard
- `schools.html` + `js/schools.js` — platform school management
- `users.html` + `js/users.js` — accounts, roles and privileges
- `students.html`, `staff.html`, `attendance.html`, `grades.html`,
  `library.html`, `fees.html`, `messages.html`, `notifications.html`
- `js/api.js` — token storage, selected-school scoping and fetch wrapper
- `js/app.js` — shared shell, navigation, modals, toasts and page guards
- `css/app.css` — complete design system for the portal

There is no separate Node build step: the files are plain HTML, CSS and
JavaScript and are copied into the application image by Maven.
