import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Books

class _Recommender:
    def __init__(self):
        self._vectorizer = None
        self._matrix = None
        self._book_ids = []

    def _build(self):
        books = Books.query.all()
        docs = [(b.book_id, (b.description or "") + " " + (b.title or "")) for b in books]
        self._book_ids = [bid for bid, _ in docs]
        corpus = [text for _, text in docs]
        self._vectorizer = TfidfVectorizer(stop_words="english")
        self._matrix = self._vectorizer.fit_transform(corpus)

    def similar_books(self, seed_ids, topn=24, exclude_ids=None, weight_map=None):
        if self._matrix is None:
            self._build()

        id_to_idx = {bid: idx for idx, bid in enumerate(self._book_ids)}

        if weight_map:
            rows, wts = [], []
            for bid, wt in weight_map.items():
                idx = id_to_idx.get(bid)
                if idx is not None and wt:
                    rows.append(self._matrix[idx].toarray().ravel())
                    wts.append(wt)
            if not rows:
                return []
            seed_vec = sum(r * w for r, w in zip(rows, wts))
            total = sum(abs(w) for w in wts) or 1.0
            seed_vec = seed_vec / total
        else:
            indices = [id_to_idx[bid] for bid in seed_ids if bid in id_to_idx]
            if not indices:
                return []
            seed_vec = self._matrix[indices].mean(axis=0).A.ravel()

        sims = cosine_similarity([seed_vec], self._matrix).flatten()

        pairs = sorted(
            ((self._book_ids[i], sims_val) for i, sims_val in enumerate(sims)),
            key=lambda x: x[1],
            reverse=True
        )
        seen = set(exclude_ids or []) | set(seed_ids)
        rec_ids = [bid for bid, _ in pairs if bid not in seen][:topn]
        if not rec_ids:
            return []

        return Books.query.filter(Books.book_id.in_(rec_ids)).all()


recommender = _Recommender()
