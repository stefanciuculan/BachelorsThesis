from app import db, bcrypt
from sqlalchemy.sql import func

class Users(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    date_joined = db.Column(db.DateTime, server_default=func.now())

    def set_password(self, pw): self.password_hash = bcrypt.generate_password_hash(pw).decode('utf-8')
    def check_password(self, pw): return bcrypt.check_password_hash(self.password_hash, pw)

    reviews         = db.relationship('Reviews',    back_populates='user',            cascade='all, delete-orphan', passive_deletes=True)
    wishlist        = db.relationship('Wishlist',   back_populates='user',            cascade='all, delete-orphan', passive_deletes=True)
    lender_loans    = db.relationship('Loans',      foreign_keys='Loans.lender_id',   back_populates='lender')
    borrower_loans  = db.relationship('Loans',      foreign_keys='Loans.borrower_id', back_populates='borrower')


class Books(db.Model):
    __tablename__ = 'books'

    book_id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title             = db.Column(db.String(255), nullable=False)
    author            = db.Column(db.String(255), nullable=False)
    isbn              = db.Column(db.String(20),  unique=True)
    publication_year  = db.Column(db.Integer)
    genre             = db.Column(db.String(100))
    cover_image_url   = db.Column(db.String(255))
    description       = db.Column(db.Text)
    rating            = db.Column(db.Numeric(3, 2))
    date_added        = db.Column(db.DateTime, server_default=func.now())

    reviews  = db.relationship('Reviews', back_populates='book', cascade='all, delete-orphan', passive_deletes=True)
    loans    = db.relationship('Loans',   back_populates='book', cascade='all, delete-orphan', passive_deletes=True)
    wishlist = db.relationship('Wishlist',back_populates='book', cascade='all, delete-orphan', passive_deletes=True)


class Reviews(db.Model):
    __tablename__ = 'reviews'

    review_id    = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    book_id      = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False)
    rating       = db.Column(db.Integer, nullable=False)
    review_text  = db.Column(db.Text)
    review_date  = db.Column(db.DateTime, server_default=func.now())

    user = db.relationship('Users', back_populates='reviews')
    book = db.relationship('Books', back_populates='reviews')


class Loans(db.Model):
    __tablename__ = 'loans'

    loan_id         = db.Column(db.Integer, primary_key=True)
    book_id         = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False)
    lender_id       = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    borrower_id     = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'))
    loan_start_date = db.Column(db.Date)
    loan_end_date   = db.Column(db.Date)
    loan_status     = db.Column(db.String(20), default='available')   # available | pending | active | returned | cancelled

    lender   = db.relationship('Users', foreign_keys=[lender_id],   back_populates='lender_loans')
    borrower = db.relationship('Users', foreign_keys=[borrower_id], back_populates='borrower_loans')
    book     = db.relationship('Books', back_populates='loans')


class Wishlist(db.Model):
    __tablename__ = 'wishlist'

    user_id    = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    book_id    = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), primary_key=True)
    date_added = db.Column(db.DateTime, server_default=func.now())

    user = db.relationship('Users', back_populates='wishlist')
    book = db.relationship('Books')


class ReadBooks(db.Model):
    __tablename__ = 'read_books'

    user_id   = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    book_id   = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), primary_key=True)
    date_read = db.Column(db.DateTime, server_default=func.now())

    user = db.relationship('Users')
    book = db.relationship('Books')

class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    message_id = db.Column(db.Integer, primary_key=True)
    loan_id    = db.Column(db.Integer, db.ForeignKey("loans.loan_id", ondelete="CASCADE"), nullable=False)
    sender_id  = db.Column(db.Integer, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    text       = db.Column(db.Text, nullable=False)
    ts         = db.Column(db.DateTime, server_default=func.now())

    sender = db.relationship("Users")
    loan   = db.relationship("Loans")
