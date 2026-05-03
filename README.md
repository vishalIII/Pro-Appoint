# Pro-Appoint
Command	                        When to use
docker compose up --build	    -Dependencies, Dockerfile, or base image changed
docker compose up	            -Code changes only (JS/TS), containers already built
docker compose build	        -Pre-build images (no containers started)
docker compose down	            -Stop & remove containers
        
backend - http://localhost:5000/
frontend- http://127.0.0.1:5173/