import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { FiChevronLeft, FiChevronRight, FiStar, FiSearch, FiLogOut } from "react-icons/fi"
import styles from "./Genre.module.css"

const API = "http://localhost:5000"
const LIMIT = 10

export default function Genre() {
  const { genre } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get("page") || "1", 10)

  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem("token"); navigate("/login") }

  const authHeader = useCallback(()=>{
    const t = localStorage.getItem("token")
    return t ? { Authorization:`Bearer ${t}` } : {}
  },[])

  useEffect(()=>{
    (async ()=>{
      const res = await axios.get(`${API}/api/books/genre`,{
        params:{name:genre,page,limit:LIMIT},
        headers:authHeader()
      })
      setBooks((res.data.books||[]).map(b=>({...b,inWishlist:Boolean(b.inWishlist)})))
      setTotal(res.data.total)
    })()
  },[genre,page])

  const totalPages = useMemo(()=>Math.max(1,Math.ceil(total/LIMIT)),[total])
  const goto = p => setSearchParams({page:p})

  const toggleWishlist = async (id,inWL)=>{
    if(!inWL) await axios.post(`${API}/api/wishlist/add`,{book_id:id},{headers:authHeader()})
    else      await axios.delete(`${API}/api/wishlist/remove`,{headers:authHeader(),data:{book_id:id}})
    setBooks(p=>p.map(b=>b.id===id?{...b,inWishlist:!inWL}:b))
  }

  const handleSearch = e=>{
    e.preventDefault()
    if(searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  const pageBtns = () => {
    if(totalPages<=5) return [...Array(totalPages)].map((_,i)=>
      <button key={i+1} className={i+1===page?styles.active:""} disabled={i+1===page} onClick={()=>goto(i+1)}>{i+1}</button>
    )
    const core=new Set([1,2,totalPages]); if(page>2&&page<totalPages) core.add(page)
    const nums=[...core].sort((a,b)=>a-b)
    const out=[]
    nums.forEach((n,idx)=>{
      out.push(<button key={n} className={n===page?styles.active:""} disabled={n===page} onClick={()=>goto(n)}>{n}</button>)
      if(idx<nums.length-1 && nums[idx+1]-n>1) out.push(<span key={"d"+n} className={styles.dots}>…</span>)
    })
    return out
  }

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <img src="/images/logo.svg" alt="OurBooks" className={styles.logo} onClick={()=>navigate("/home")}/>
        <nav className={styles.navlinks}>
          <button onClick={()=>navigate("/home")}>Home</button>
          <button onClick={()=>navigate("/wishlist")}>Library</button>
          <button onClick={()=>navigate("/loans")}>My&nbsp;Loans</button>
        </nav>
        <form className={styles.search} onSubmit={handleSearch}>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..."/>
          <button type="submit"><FiSearch/></button>
        </form>
        <div className={styles.profile} onClick={logout}><FiLogOut/></div>
      </header>

      <h1 className={styles.genreTitle}>{genre}</h1>

      <main className={styles.list}>
        {books.map(b=>{
          const stars = Array.from({length:5},(_,i)=><FiStar key={i} className={i<Math.round(b.rating||0)?styles.starFill:styles.star}/>)
          return(
            <div key={b.id} className={styles.card}>
              <div className={styles.cover} style={{backgroundImage:`url(${b.coverUrl})`}} onClick={()=>navigate(`/books/${b.id}`)}/>
              <div className={styles.info}>
                <h2 className={styles.bookTitle}  onClick={()=>navigate(`/books/${b.id}`)}>{b.title}</h2>
                <p  className={styles.bookAuthor} onClick={()=>navigate(`/books/${b.id}`)}>by {b.author}</p>
                <div className={styles.rating}>{stars}</div>
                <p className={styles.desc}>{b.description?.slice(0,260)}{b.description?.length>260?"…":""}</p>
                <button
                  className={b.inWishlist?styles.wishlistBtnRemove:styles.wishlistBtnAdd}
                  onClick={()=>toggleWishlist(b.id,b.inWishlist)}
                >{b.inWishlist?"Remove from wishlist":"Add to wishlist"}</button>
              </div>
            </div>
          )
        })}
      </main>

      <nav className={styles.pagination}>
        <button disabled={page<=1}          onClick={()=>goto(page-1)}><FiChevronLeft/></button>
        {pageBtns()}
        <button disabled={page>=totalPages} onClick={()=>goto(page+1)}><FiChevronRight/></button>
      </nav>
    </div>
  )
}
