from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app import db
from app.models import Users, Books, Wishlist, Reviews, Loans, ReadBooks, ChatMessage
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, case
from datetime import datetime, timedelta, date, timezone
from app.recommender import recommender
from collections import Counter
import random

api = Blueprint('api', __name__)
CORS(api)

@api.route('/register', methods=['POST'])
def register():
    d = request.get_json()
    if not d or not all(k in d for k in ('username', 'email', 'password')):
        return jsonify({'message': 'Missing fields'}), 400
    if Users.query.filter_by(email=d['email']).first():
        return jsonify({'message': 'Email already registered'}), 409
    if Users.query.filter_by(username=d['username']).first():
        return jsonify({'message': 'Username taken'}), 409
    u = Users(username=d['username'], email=d['email'], date_joined=datetime.now(timezone.utc))
    u.set_password(d['password'])
    db.session.add(u)
    db.session.commit()
    return jsonify({'message': 'ok'}), 201

@api.route('/login', methods=['POST'])
def login():
    d = request.get_json()
    u = Users.query.filter_by(email=d['email']).first()
    if not u or not u.check_password(d['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    t = create_access_token(identity=str(u.user_id))
    return jsonify({'access_token': t}), 200

@api.route('/books', methods=['GET'])
def get_books():
    books = Books.query.all()
    return jsonify([{"title": book.title, "author": book.author} for book in books])


@api.route('/wishlist/add', methods=['POST'])
@jwt_required()
def wishlist_add():
    uid = get_jwt_identity()
    bid = request.get_json().get('book_id')
    if not Books.query.get(bid): return jsonify({'message': 'Book not found'}), 404
    if Wishlist.query.filter_by(user_id=uid, book_id=bid).first():
        return jsonify({'message': 'Already'}), 200
    db.session.add(Wishlist(user_id=uid, book_id=bid))
    db.session.commit()
    return jsonify({'message': 'added'}), 201

@api.route('/wishlist/remove', methods=['DELETE'])
@jwt_required()
def wishlist_remove():
    uid = get_jwt_identity()
    bid = request.get_json().get('book_id')
    w = Wishlist.query.filter_by(user_id=uid, book_id=bid).first()
    if not w: return jsonify({'message': 'not found'}), 404
    db.session.delete(w); db.session.commit()
    return jsonify({'message': 'removed'}), 200

@api.route('/wishlist', methods=['GET'])
@jwt_required()
def wishlist_list():
    uid = get_jwt_identity()
    rows = db.session.query(Books).join(Wishlist, Wishlist.book_id == Books.book_id).filter(Wishlist.user_id == uid).all()
    j = lambda b: {'id': b.book_id, 'title': b.title, 'author': b.author, 'coverUrl': b.cover_image_url, 'description': b.description, 'rating': float(b.rating or 0)}
    return jsonify([j(b) for b in rows]), 200

@api.route('/reviews/add', methods=['POST'])
@jwt_required()
def add_review():
    user_id = get_jwt_identity()
    data = request.get_json()
    book_id = data.get("book_id")
    rating = data.get("rating")
    review_text = data.get("review_text")

    book = Books.query.get(book_id)
    if not book:
        return jsonify({"message": "Book not found"}), 404

    exists = Reviews.query.filter_by(user_id=user_id, book_id=book_id).first()
    if exists:
        return jsonify({"message": "You have already reviewed this book"}), 409

    new_review = Reviews(
        user_id=user_id,
        book_id=book_id,
        rating=rating,
        review_text=review_text,
        review_date=datetime.now(timezone.utc)
    )
    db.session.add(new_review)
    db.session.commit()

    return jsonify({"message": "Review added!"}), 201

@api.route('/books/random', methods=['GET'])
def get_random_books():
    all_books = Books.query.all()
    sample_books = random.sample(all_books, min(len(all_books), 8))
    return jsonify([
        {
            "id": book.book_id,
            "title": book.title,
            "author": book.author,
            "cover_image_url": book.cover_image_url
        }
        for book in sample_books
    ])
    
@api.route('/user/recommendations', methods=['GET'])
@jwt_required()
def user_recommendations():
    uid = get_jwt_identity()

    reviews = (
        db.session.query(Reviews)
        .join(Books, Reviews.book_id == Books.book_id)
        .filter(Reviews.user_id == uid)
        .all()
    )
    wishlist = (
        db.session.query(Wishlist)
        .join(Books, Wishlist.book_id == Books.book_id)
        .filter(Wishlist.user_id == uid)
        .all()
    )
    read_books = (
        db.session.query(ReadBooks)
        .join(Books, ReadBooks.book_id == Books.book_id)
        .filter(ReadBooks.user_id == uid)
        .all()
    )

    rating_weights = {1: -1, 2: -1, 3: 0, 4: 1, 5: 2}
    weight_map = {}

    for r in reviews:
        weight_map[r.book_id] = weight_map.get(r.book_id, 0) + rating_weights.get(r.rating, 0)
    for w in wishlist:
        weight_map[w.book_id] = weight_map.get(w.book_id, 0) + 2
    for rb in read_books:
        weight_map[rb.book_id] = weight_map.get(rb.book_id, 0) + 1

    cnt_author = Counter()
    cnt_genre  = Counter()

    for book_id, w in weight_map.items():
        book = Books.query.get(book_id)
        if not book:
            continue
        cnt_author[book.author] += w
        if book.genre:
            cnt_genre[book.genre] += w

    author_name = cnt_author.most_common(1)[0][0] if cnt_author else ""
    genre_name  = cnt_genre.most_common(1)[0][0] if cnt_genre else ""

    seed_ids = list(weight_map.keys())
    exclude  = set(seed_ids)

    content_recs = recommender.similar_books(
        seed_ids=seed_ids,
        topn=24,
        exclude_ids=exclude,
        weight_map=weight_map
    )

    author_books = []
    if author_name:
        author_books = (
            Books.query
            .filter(Books.author.ilike(f"%{author_name}%"))
            .filter(~Books.book_id.in_(exclude))
            .limit(24)
            .all()
        )

    genre_books = []
    if genre_name:
        genre_books = (
            Books.query
            .filter(Books.genre.ilike(f"%{genre_name}%"))
            .filter(~Books.book_id.in_(exclude))
            .limit(24)
            .all()
        )

    to_json = lambda b: {
        "id":       b.book_id,
        "title":    b.title,
        "author":   b.author,
        "coverUrl": b.cover_image_url
    }

    return jsonify({
        "mode":        "personalized",
        "author":      author_name,
        "genre":       genre_name,
        "books":       [to_json(b) for b in content_recs],
        "secondary":   [to_json(b) for b in author_books],
        "genre_books": [to_json(b) for b in genre_books],
    }), 200
    
@api.route("/books/<int:book_id>", methods=["GET"])
def get_book_by_id(book_id):
    book = Books.query.filter_by(book_id=book_id).first()
    if not book:
        return jsonify({"message": "Book not found"}), 404

    return jsonify({
        "id": book.book_id,
        "title": book.title,
        "author": book.author,
        "genre": book.genre,
        "publication_year": book.publication_year,
        "cover_image_url": book.cover_image_url,
        "description": book.description,
        "rating": float(book.rating or 0)
    }), 200

@api.route("/books/<int:book_id>/reviews", methods=["GET"])
def get_reviews_for_book(book_id):
    reviews = Reviews.query.filter_by(book_id=book_id).all()
    if not reviews:
        return jsonify([]), 200

    return jsonify([
        {
            "review_id": r.review_id,
            "user": Users.query.get(r.user_id).username,
            "rating": r.rating,
            "review_text": r.review_text,
            "date": r.review_date.isoformat()
        } for r in reviews
    ]), 200


@api.route("/books/genre")
def get_books_by_genre():
    verify_jwt_in_request(optional=True)
    uid = get_jwt_identity()
    name  = request.args.get("name", "", type=str)
    page  = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)

    q = Books.query.filter(Books.genre.ilike(f"%{name}%"))
    total = q.count()
    books = q.order_by(func.lower(Books.title))\
             .offset((page-1)*limit).limit(limit).all()

    wl_ids = {w.book_id for w in Wishlist.query.filter_by(user_id=uid)} if uid else set()

    return jsonify({
        "total": total,
        "books": [
            {
                "id": b.book_id,
                "title": b.title,
                "author": b.author,
                "coverUrl": b.cover_image_url,
                "description": b.description,
                "rating": float(b.rating or 0),
                "inWishlist": b.book_id in wl_ids
            }
            for b in books
        ]
    })

@api.route("/books/search", methods=["GET"])
def search_books():
    verify_jwt_in_request(optional=True)
    uid     = get_jwt_identity()
    q       = request.args.get("q", "", type=str).strip()
    page    = max(1, request.args.get("page", 1, type=int))
    limit   = max(1, min(request.args.get("limit", 10, type=int), 50))
    pattern = f"%{q.lower()}%"

    if not q:
        return jsonify({"total": 0, "books": []}), 200

    # 0 = potrivire in titlu, 1 = in autor, 2 = in descriere
    priority = case(
        (func.lower(Books.title).ilike(pattern), 0),
        (func.lower(Books.author).ilike(pattern), 1),
        else_=2,
    )

    base = Books.query.filter(
        func.lower(Books.title).ilike(pattern)
        | func.lower(Books.author).ilike(pattern)
        | func.lower(Books.description).ilike(pattern)
    )

    total = base.count()
    books = (
        base.order_by(priority, func.lower(Books.title))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    wl_ids = (
        {w.book_id for w in Wishlist.query.filter_by(user_id=uid)}
        if uid
        else set()
    )

    return jsonify(
        {
            "total": total,
            "books": [
                {
                    "id": b.book_id,
                    "title": b.title,
                    "author": b.author,
                    "coverUrl": b.cover_image_url,
                    "description": b.description,
                    "rating": float(b.rating or 0),
                    "inWishlist": b.book_id in wl_ids,
                }
                for b in books
            ],
        }
    ), 200

@api.route("/books/mark-read", methods=["POST", "DELETE"])
@jwt_required()
def mark_read():
    uid = get_jwt_identity()
    bid = request.get_json().get("book_id")

    if not Books.query.get(bid):
        return jsonify({"message": "Book not found"}), 404

    exists = ReadBooks.query.filter_by(user_id=uid, book_id=bid).first()

    if request.method == "POST":
        if exists:
            return jsonify({"message": "Already marked"}), 200
        db.session.add(ReadBooks(user_id=uid, book_id=bid))
        db.session.commit()
        return jsonify({"message": "Marked"}), 201

    # DELETE
    if not exists:
        return jsonify({"message": "Not marked"}), 404
    db.session.delete(exists)
    db.session.commit()
    return jsonify({"message": "Un-marked"}), 200

@api.route("/library/reviews", methods=["GET"])
@jwt_required()
def library_reviews():
    uid = get_jwt_identity()
    books = (
        db.session.query(Books)
        .join(Reviews, Reviews.book_id == Books.book_id)
        .filter(Reviews.user_id == uid)
        .all()
    )
    return jsonify([
        {
            "id": b.book_id,
            "title": b.title,
            "author": b.author,
            "coverUrl": b.cover_image_url,
            "description": b.description,
            "rating": float(b.rating or 0),
        } for b in books
    ]), 200
    
@api.route("/library/read", methods=["GET"])
@jwt_required()
def library_read():
    uid = get_jwt_identity()
    books = (
        db.session.query(Books)
        .join(ReadBooks, ReadBooks.book_id == Books.book_id)
        .filter(ReadBooks.user_id == uid)
        .all()
    )
    return jsonify([
        {
            "id": b.book_id,
            "title": b.title,
            "author": b.author,
            "coverUrl": b.cover_image_url,
            "description": b.description,
            "rating": float(b.rating or 0),
        } for b in books
    ]), 200
    
@api.route('/loans/offer', methods=['POST', 'DELETE'])
@jwt_required()
def loans_offer():
    uid = get_jwt_identity()
    bid = request.get_json().get('book_id')
    if not Books.query.get(bid): return jsonify({'message': 'Book not found'}), 404
    offer = Loans.query.filter_by(book_id=bid, lender_id=uid, borrower_id=None, loan_status='available').first()
    if request.method == 'POST':
        if offer: return jsonify({'message': 'Already offered'}), 200
        l = Loans(book_id=bid, lender_id=uid, loan_status='available')
        db.session.add(l); db.session.commit()
        return jsonify({'message': 'offer created'}), 201
    if not offer: return jsonify({'message': 'Not offered'}), 404
    db.session.delete(offer); db.session.commit()
    return jsonify({'message': 'offer removed'}), 200

@api.route('/books/<int:book_id>/loan-meta', methods=['GET'])
@jwt_required(optional=True)
def loan_meta(book_id):
    uid = get_jwt_identity()
    offers = Loans.query.filter_by(book_id=book_id, loan_status='available').all()
    user_offer = False
    if uid:
        user_offer = any(o.lender_id == int(uid) for o in offers)
    first_lender_id = offers[0].lender_id if offers else None
    return jsonify({
        'offers': len(offers),
        'user_offer': user_offer,
        'first_lender_id': first_lender_id
    }), 200
    
@api.route('/loans/request', methods=['POST'])
@jwt_required()
def loans_request():
    uid = int(get_jwt_identity())
    d = request.get_json()
    bid = d.get('book_id')
    lender_id = d.get('lender_id')
    offer = Loans.query.filter_by(book_id=bid, lender_id=lender_id, borrower_id=None, loan_status='available').first()
    if not offer: return jsonify({'message': 'offer gone'}), 404
    offer.borrower_id = uid
    offer.loan_status = 'pending'
    offer.loan_start_date = date.today()
    offer.loan_end_date = date.today() + timedelta(days=30)
    db.session.commit()
    return jsonify({'message': 'requested', 'loan_id': offer.loan_id}), 200

@api.route('/loans/<int:loan_id>/status', methods=['PATCH'])
@jwt_required()
def loans_status(loan_id):
    uid = int(get_jwt_identity())
    ln = Loans.query.get(loan_id)
    if not ln: return jsonify({'message': 'not found'}), 404
    if ln.lender_id != uid: return jsonify({'message': 'forbidden'}), 403
    new_status = request.get_json().get('status')
    if new_status not in ('active', 'returned', 'cancelled'): return jsonify({'message': 'bad'}), 400
    ln.loan_status = new_status
    db.session.commit()
    return jsonify({'message': 'updated'}), 200

@api.route('/loans/my', methods=['GET'])
@jwt_required()
def loans_my():
    uid = int(get_jwt_identity())
    rows = Loans.query.filter((Loans.lender_id == uid) | (Loans.borrower_id == uid)).all()
    def j(l):
        role = 'lender' if l.lender_id == uid else 'borrower'
        if role == 'lender':
            counterpart = l.borrower.username if l.borrower else ''
        else:
            counterpart = l.lender.username if l.lender else ''
        return {
            'id'        : l.loan_id,
            'book_id'   : l.book.book_id,
            'title'     : l.book.title,
            'author'    : l.book.author,
            'cover'     : l.book.cover_image_url,
            'role'      : role,
            'counterpart': counterpart,
            'start'     : l.loan_start_date.isoformat() if l.loan_start_date else '',
            'end'       : l.loan_end_date.isoformat() if l.loan_end_date else '',
            'status'    : l.loan_status
        }
    return jsonify([j(x) for x in rows]), 200

@api.route("/chat/<int:loan_id>", methods=["GET", "POST"])
@jwt_required()
def chat_for_loan(loan_id):
    uid  = int(get_jwt_identity())
    loan = Loans.query.get(loan_id)
    if not loan or uid not in (loan.lender_id, loan.borrower_id):
        return jsonify({"msg": "Forbidden"}), 403

    if request.method == "GET":
        msgs = (
            ChatMessage.query
            .filter_by(loan_id=loan_id)
            .order_by(ChatMessage.ts.asc())
            .all()
        )
        return jsonify([
            {
                "id": m.message_id,
                "sender": Users.query.get(m.sender_id).username,
                "sender_id": m.sender_id,
                "text": m.text,
                "ts": m.ts.isoformat()
            } for m in msgs
        ]), 200

    txt = (request.get_json() or {}).get("text", "").strip()
    if not txt:
        return jsonify({"msg": "Empty"}), 400

    m = ChatMessage(loan_id=loan_id, sender_id=uid, text=txt)
    db.session.add(m)
    db.session.commit()
    return jsonify({"id": m.message_id}), 201
