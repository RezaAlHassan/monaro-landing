# Reordia waitlist

A responsive landing page using the Reordia sales deck’s colors and fonts.

Run `python server.py`, then open http://localhost:3000.

The server saves unique email addresses in `data/waitlist.sqlite3`. This folder is excluded from version control and is never served to the browser. The form validates emails, handles duplicate signups, and shows clear success and error messages. Email notifications are not sent automatically.

The page can also be opened directly or served by a static host for a visual preview. To collect signups on a static host, connect `/api/waitlist` to a backend. The supplied Python server is for local use; a public deployment needs a production web server, HTTPS, and persistent storage.
