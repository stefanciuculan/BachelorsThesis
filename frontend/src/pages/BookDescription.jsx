import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { FiSearch, FiStar, FiUser, FiLogOut } from "react-icons/fi"
import styles from "./BookDescription.module.css"

const API = "http://localhost:5000"

export default function BookDescription() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [book,    setBook]    = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const [wl,   setWL]   = useState(false)
  const [read, setRead] = useState(false)

  const [loanMeta, setLoanMeta] = useState({ offers: 0, user_offer: false })

  const [search, setSearch] = useState("")

  const [rating, setRating] = useState(0)
  const [text,   setText]   = useState("")
  const [msg,    setMsg]    = useState("")

  const hdr = useCallback(() => {
    const t = localStorage.getItem("token")
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [])

  useEffect(() => {
    ;(async () => {
      const [b, r] = await Promise.all([
        axios.get(`${API}/api/books/${id}`),
        axios.get(`${API}/api/books/${id}/reviews`)
      ])
      setBook(b.data)
      setReviews(r.data)

      const meta = await axios.get(`${API}/api/books/${id}/loan-meta`, { headers: hdr() })
      setLoanMeta(meta.data)

      const [w, rd] = await Promise.all([
        axios.get(`${API}/api/wishlist`, { headers: hdr() }),
        axios.get(`${API}/api/library/read`, { headers: hdr() })
      ])
      setWL(!!w.data.find(x => x.id === b.data.id))
      setRead(!!rd.data.find(x => x.id === b.data.id))

      setLoading(false)
    })()
  }, [id])

  if (loading)  return <div className={styles.loader}>Loading…</div>
  if (!book)    return <div className={styles.error}>Book not found.</div>

  const stars = (val, full, empty) =>
    Array.from({ length: 5 }, (_, i) =>
      <FiStar key={i} className={i < val ? full : empty} />)

  const toggleWL = async () => {
    if (!wl)
      await axios.post(`${API}/api/wishlist/add`, { book_id: book.id }, { headers: hdr() })
    else
      await axios.delete(`${API}/api/wishlist/remove`, { headers: hdr(), data: { book_id: book.id } })
    setWL(!wl)
  }

  const toggleRead = async () => {
    if (!read)
      await axios.post(`${API}/api/books/mark-read`, { book_id: book.id }, { headers: hdr() })
    else
      await axios.delete(`${API}/api/books/mark-read`, { headers: hdr(), data: { book_id: book.id } })
    setRead(!read)
  }

  const toggleOffer = async () => {
    if (!loanMeta.user_offer)
      await axios.post(`${API}/api/loans/offer`, { book_id: book.id }, { headers: hdr() })
    else
      await axios.delete(`${API}/api/loans/offer`, { headers: hdr(), data: { book_id: book.id } })
    const m = await axios.get(`${API}/api/books/${id}/loan-meta`, { headers: hdr() })
    setLoanMeta(m.data)
  }

  const requestLoan = async () => {
    if (!loanMeta.offers || loanMeta.user_offer) return
    const meta = await axios.get(`${API}/api/books/${id}/loan-meta`, { headers: hdr() })
    if (!meta.data.offers) return
    const lender_id = meta.data.first_lender_id
    await axios.post(`${API}/api/loans/request`, { book_id: book.id, lender_id }, { headers: hdr() })
    setLoanMeta({ ...loanMeta, offers: loanMeta.offers - 1 })
  }

  const submitReview = async () => {
    if (!rating || !text.trim()) { setMsg("Choose rating and add the text."); return }
    try {
      await axios.post(`${API}/api/reviews/add`, {
        book_id: book.id,
        rating,
        review_text: text.trim()
      }, { headers: hdr() })
      const upd = await axios.get(`${API}/api/books/${id}/reviews`)
      setReviews(upd.data)
      setRating(0); setText(""); setMsg("Saved review ✓")
    } catch (err) {
      if (err.response?.status === 409)
        setMsg("You already added a review to this book.")
      else
        setMsg("Error! Try again.")
    }
  }

  const genres = (book.genre || "").split(/[,;]+/).map(g => g.trim()).filter(Boolean)

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <img src="/images/logo.svg" className={styles.logo} onClick={() => navigate("/home")} />
        <nav className={styles.links}>
          <button onClick={() => navigate("/home")}>Home</button>
          <button onClick={() => navigate("/wishlist")}>Library</button>
          <button onClick={() => navigate("/loans")}>My Loans</button>
        </nav>
        <form className={styles.search}
              onSubmit={e => { e.preventDefault(); search.trim() && navigate(`/search?q=${encodeURIComponent(search.trim())}`) }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
          <button type="submit"><FiSearch /></button>
        </form>
        <div className={styles.profile} onClick={() => { localStorage.removeItem("token"); navigate("/login") }}>
          <FiLogOut />
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.cover} style={{ backgroundImage: `url(${book.cover_image_url})` }} />
        <section className={styles.details}>
          <h1 className={styles.title}>{book.title}</h1>
          <h2 className={styles.author}>by {book.author}</h2>
          <div className={styles.rating}>
            <span className={styles.score}>{Number(book.rating || 0).toFixed(1)}</span>
            {stars(Math.round(book.rating || 0), styles.starFill, styles.star)}
          </div>
          <p className={styles.description}>{book.description}</p>

          <div className={styles.genres}>
            <span className={styles.genresLabel}>Genres</span>
            {genres.map(g => (
              <button key={g} className={styles.genreTag} onClick={() => navigate(`/genres/${encodeURIComponent(g)}`)}>
                {g}
              </button>
            ))}
          </div>

          <div className={styles.dropdownMenu}>
            <button className={styles.dropdownToggle}>Actions</button>
            <div className={styles.dropdownContent}>
              <button onClick={toggleWL}>{wl ? "Remove from wishlist" : "Add to wishlist"}</button>
              <button onClick={toggleRead}>{read ? "Mark as unread" : "Mark as read"}</button>
              <button onClick={toggleOffer}>
                {loanMeta.user_offer ? "Withdraw loan offer" : "Make available for loan"}
              </button>
              {loanMeta.offers > 0 && !loanMeta.user_offer && (
                <button onClick={requestLoan}>Request loan ({loanMeta.offers})</button>
              )}
            </div>
          </div>
        </section>
      </main>

      <section className={styles.writeReview}>
        <h3 className={styles.reviewFormHeading}>Write a review</h3>
        <div className={styles.reviewForm}>
          <div className={styles.ratingSelect}>
            {Array.from({ length: 5 }, (_, i) => (
              <FiStar
                key={i}
                className={i < rating ? styles.starFill : styles.star}
                onClick={() => setRating(i + 1)}
              />
            ))}
          </div>
          <textarea
            className={styles.reviewTextarea}
            placeholder="Your opinion..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button className={styles.submitReviewBtn} onClick={submitReview}>
            Submit review
          </button>
          {msg && <p className={styles.reviewMsg}>{msg}</p>}
        </div>
      </section>

      <section className={styles.reviews}>
        <h3 className={styles.reviewsHeading}>Ratings & Reviews</h3>
        {reviews.length === 0 && <p>No reviews yet.</p>}
        {reviews.map(r => (
          <article key={r.review_id} className={styles.reviewCard}>
            <div className={styles.reviewerAvatar}><FiUser /></div>
            <div className={styles.reviewBody}>
              <span className={styles.reviewerName}>{r.user}</span>
              <div className={styles.reviewRating}>
                {stars(r.rating, styles.starFillSm, styles.starSm)}
              </div>
              <p className={styles.reviewText}>{r.review_text}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
