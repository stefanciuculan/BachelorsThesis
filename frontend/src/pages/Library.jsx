import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { FiSearch, FiLogOut } from "react-icons/fi"
import card from "./Genre.module.css"
import lib  from "./Library.module.css"

const API = "http://localhost:5000"

export default function Library() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("reviews")
  const [books, setBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState("")

  const logout = () => { localStorage.removeItem("token"); navigate("/login") }

  const auth = useCallback(() => {
    const t = localStorage.getItem("token")
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [])

  useEffect(() => {
    ;(async () => {
      const url =
        tab === "wishlist"
          ? `${API}/api/wishlist`
          : `${API}/api/library/${tab}`
      const res = await axios.get(url, { headers: auth() })
      setBooks(res.data || [])
    })()
  }, [tab, auth])

  const toggleWishlist = async (bookId) => {
    await axios.delete(`${API}/api/wishlist/remove`, {
      headers: auth(), data: { book_id: bookId }
    })
    setBooks(p => p.filter(b => b.id !== bookId))
  }

  const toggleRead = async (bookId) => {
    await axios.delete(`${API}/api/books/mark-read`, {
      headers: auth(), data: { book_id: bookId }
    })
    setBooks(p => p.filter(b => b.id !== bookId))
  }

  const handleSearch = e => {
    e.preventDefault()
    if (searchQuery.trim())
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  const Tab = ({ id, label }) => (
    <button
      className={`${lib.tabBtn} ${tab === id ? lib.tabActive : ""}`}
      onClick={() => setTab(id)}
    >{label}</button>
  )

  return (
    <div className={card.page}>
      <header className={card.navbar}>
        <img src="/images/logo.svg" className={card.logo} onClick={() => navigate("/home")}/>
        <nav className={card.navlinks}>
          <button onClick={() => navigate("/home")}>Home</button>
          <button onClick={() => navigate("/wishlist")}>Library</button>
          <button onClick={() => navigate("/loans")}>My Loans</button>
        </nav>
        <form className={card.search} onSubmit={handleSearch}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
          />
          <button type="submit"><FiSearch/></button>
        </form>
        <div className={card.profile} onClick={logout}><FiLogOut/></div>
      </header>

      <div className={lib.tabs}>
        <Tab id="reviews"  label="Reviews"   />
        <Tab id="wishlist" label="Wishlist"  />
        <Tab id="read"     label="Read Books"/>
      </div>

      <main className={card.list}>
        {books.map(b => (
          <div key={b.id} className={card.card}>
            <div
              className={card.cover}
              style={{ backgroundImage:`url(${b.coverUrl})` }}
              onClick={() => navigate(`/books/${b.id}`)}
            />
            <div className={card.info}>
              <h2 className={card.bookTitle} onClick={() => navigate(`/books/${b.id}`)}>{b.title}</h2>
              <p  className={card.bookAuthor} onClick={() => navigate(`/books/${b.id}`)}>by {b.author}</p>
              <p  className={card.desc}>{(b.description || "").slice(0,260)}{(b.description||"").length>260?"…":""}</p>
              {tab==="wishlist" && (
                <button className={card.wishlistBtnRemove} onClick={() => toggleWishlist(b.id)}>Remove from wishlist</button>
              )}
              {tab==="read" && (
                <button className={card.wishlistBtnRemove} onClick={() => toggleRead(b.id)}>Mark as unread</button>
              )}
            </div>
          </div>
        ))}
        {!books.length && <p className={lib.emptyMsg}>Nothing to see here.</p>}
      </main>
    </div>
  )
}
