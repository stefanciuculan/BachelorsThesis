import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { FiSearch, FiLogOut, FiChevronLeft, FiChevronRight } from "react-icons/fi"
import { motion, AnimatePresence } from "framer-motion"
import styles from "./Home.module.css"

const API = "http://localhost:5000"
const CARD_W = 160
const GAP = 24

export default function Home() {
  const navigate = useNavigate()
  const [recommended, setRecommended] = useState([])
  const [authorBooks, setAuthorBooks] = useState([])
  const [genreBooks,  setGenreBooks]  = useState([])
  const [recPage,  setRecPage]  = useState(0)
  const [authPage, setAuthPage] = useState(0)
  const [genPage,  setGenPage]  = useState(0)
  const [recDir,  setRecDir]  = useState(1)
  const [authDir, setAuthDir] = useState(1)
  const [genDir,  setGenDir]  = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(
    Math.max(1, Math.floor((window.innerWidth - 48) / (CARD_W + GAP)))
  )
  const [search, setSearch] = useState("")
  const [authorTitle, setAuthorTitle] = useState("")
  const [genreTitle,  setGenreTitle]  = useState("")

  const logout = () => { localStorage.removeItem("token"); navigate("/login") }

  const header = useCallback(() => {
    const t = localStorage.getItem("token")
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [])

  useEffect(() => {
    const onResize = () =>
      setItemsPerPage(Math.max(1, Math.floor((window.innerWidth - 48) / (CARD_W + GAP))))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const unique = arr => Array.from(new Map(arr.map(b => [b.id, b])).values())

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/user/recommendations`, { headers: header() })
      const { books, secondary, author, genre, genre_books } = r.data
      setRecommended(unique(books))
      setAuthorBooks(unique(secondary))
      setGenreBooks(unique(genre_books))
      setAuthorTitle(author)
      setGenreTitle(genre)
    } catch (_) {}
    setRecPage(0); setAuthPage(0); setGenPage(0)
  }, [header])

  useEffect(() => { load() }, [load])

  const searchSubmit = e => {
    e.preventDefault()
    if (!search.trim()) return
    navigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  const BookCard = ({ b }) => (
    <div className={styles.card} onClick={() => navigate(`/books/${b.id}`)}>
      <div className={styles.cover} style={{ backgroundImage:`url(${b.coverUrl})` }} />
      <div className={styles.title}>{b.title}</div>
      <div className={styles.author}>{b.author}</div>
    </div>
  )

  const CarouselRow = ({ title, books, page, setPage, dir, setDir }) => {
    if (!books.length) return null
    const canScroll = books.length > itemsPerPage
    const start = canScroll ? (page * itemsPerPage) % books.length : 0
    const slice = canScroll
      ? (() => {
          const end = start + itemsPerPage
          return end <= books.length
            ? books.slice(start, end)
            : [...books.slice(start), ...books.slice(0, end - books.length)]
        })()
      : books
    const prev = () => { setDir(-1); setPage((page - 1 + Math.ceil(books.length / itemsPerPage)) % Math.ceil(books.length / itemsPerPage)) }
    const next = () => { setDir(1);  setPage((page + 1) % Math.ceil(books.length / itemsPerPage)) }

    return (
      <section className={styles.section}>
        <h2>{title}</h2>
        {canScroll && (
          <>
            <button className={styles.arrowLeft}  onClick={prev}><FiChevronLeft size={22}/></button>
            <button className={styles.arrowRight} onClick={next}><FiChevronRight size={22}/></button>
          </>
        )}
        <AnimatePresence custom={dir} initial={false}>
          <motion.div
            key={page}
            className={styles.row}
            custom={dir}
            variants={{
              enter: d => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center:     { x: 0, opacity: 1 },
              exit:  d => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration:.6, ease:"easeInOut" }}
          >
            {slice.map(b => <BookCard key={b.id} b={b}/> )}
          </motion.div>
        </AnimatePresence>
      </section>
    )
  }

  return (
    <div className={styles.home}>
      <header className={styles.navbar}>
        <img src="/images/logo.svg" className={styles.logo} onClick={() => navigate("/home")}/>
        <nav className={styles.navlinks}>
          <button onClick={() => navigate("/home")}>Home</button>
          <button onClick={() => navigate("/wishlist")}>Library</button>
          <button onClick={() => navigate("/loans")}>My Loans</button>
        </nav>
        <form className={styles.search} onSubmit={searchSubmit}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."/>
          <button type="submit"><FiSearch/></button>
        </form>
        <div className={styles.profile} onClick={logout}><FiLogOut/></div>
      </header>

      <main className={styles.content}>
        <CarouselRow
          title="Recommended for you"
          books={recommended}
          page={recPage} setPage={setRecPage}
          dir={recDir}   setDir={setRecDir}
        />
        <CarouselRow
          title={`More from ${authorTitle}`}
          books={authorBooks}
          page={authPage} setPage={setAuthPage}
          dir={authDir}   setDir={setAuthDir}
        />
        <CarouselRow
          title={`${genreTitle} Books`}
          books={genreBooks}
          page={genPage} setPage={setGenPage}
          dir={genDir}   setDir={setGenDir}
        />
      </main>
    </div>
  )
}
