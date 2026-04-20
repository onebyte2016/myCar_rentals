#!/bin/sh

if [ "$DATABASE" = "postgres" ]; then
    echo "Waiting for PostgreSQL..."
    until pg_isready -h $SQL_HOST -p $SQL_PORT -U $SQL_USER > /dev/null 2>&1; do
      sleep 1
    done
    echo "PostgreSQL is ready :-D"
fi

# Run migrations and start server
python manage.py makemigrations
python manage.py migrate
# python manage.py collectstatic --noinput
python manage.py runserver 0.0.0.0:8000