# reading-tracker

Utils commands

docker-compose logs --follow frontend

## Mongo local connection (host clients)

If you connect to MongoDB from your host (Compass, mongosh, etc.) use the host-published port. By default in this project we publish the container on port 27018 to avoid colliding with a local mongod that may already be running.

Connection string examples (use these from your host machine):

- mongodb://mongoadmin:mongopass@127.0.0.1:27018/admin
- mongodb://mongoadmin:mongopass@127.0.0.1:27018/?authSource=admin

You can change the published port in `.env` with `MONGO_HOST_PORT` (default: 27018).
