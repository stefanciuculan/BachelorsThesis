import pandas as pd
from app import db, create_app
from app.models import Books
from datetime import datetime, timezone

app = create_app()
csv_file = "./bd/books.csv"

df = pd.read_csv(csv_file, encoding="ISO-8859-1")

with app.app_context():
    for index, row in df.iterrows():
        book = Books(
            isbn=row["isbn10"],
            cover_image_url=row["thumbnail"],
            title=row["title"],
            author=row["authors"],
            genre=row["categories"],
            rating=row["average_rating"],
            description=row["description"],
            publication_year=int(row["published_year"]),
            date_added=datetime.now(timezone.utc)
        )
        db.session.add(book)

    db.session.commit()
    print("Import complet!")
