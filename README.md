# Pro-Appoint
Command	                        When to use
docker compose up --build	    -Dependencies, Dockerfile, or base image changed
docker compose up	            -Code changes only (JS/TS), containers already built
docker compose build	        -Pre-build images (no containers started)
docker compose down	            -Stop & remove containers

Redis notes:
- In Docker Compose, the backend now connects to Redis with `redis://redis:6379`.
- For local non-Docker backend runs, set `REDIS_URL=redis://127.0.0.1:6379` in `backend/.env`.
        
backend - http://localhost:5000/
frontend- http://127.0.0.1:5173/
