# Public deployment (Render)

This project is now configured for public deployment using Docker.

## What was added
- `Dockerfile` for container build and run
- `.dockerignore` to keep builds clean
- `render.yaml` for one-click Render setup with persistent SQLite storage

## Deploy steps
1. Push this project to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Connect your GitHub repo and select this project.
4. Render will detect `render.yaml` and create the web service.
5. Wait for deploy to complete and open the generated public URL.

## Notes
- SQLite is stored on a mounted disk at `/var/data/pathfinding.db`, so data survives restarts.
- App binds to `0.0.0.0` and reads `PORT` automatically for hosted environments.
