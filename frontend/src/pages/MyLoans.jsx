import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { FiSearch, FiLogOut, FiCheck, FiX, FiMessageCircle } from "react-icons/fi";
import card from "./Genre.module.css"
import styles from "./Library.module.css"

const API = "http://localhost:5000"

export default function MyLoans() {
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")

  const logout = () => { localStorage.removeItem("token"); navigate("/login") }

  const hdr = useCallback(()=>{
    const t = localStorage.getItem("token")
    return t ? { Authorization:`Bearer ${t}` } : {}
  },[])

  useEffect(()=>{
    axios.get(`${API}/api/loans/my`,{headers:hdr()}).then(r=>setLoans(r.data))
  },[])

  const Tab = ({id,label}) => (
    <button className={`${styles.tabBtn} ${tab===id?styles.tabActive:""}`} onClick={()=>setTab(id)}>{label}</button>
  )

  const updateStatus = async (id,status)=>{
    await axios.patch(`${API}/api/loans/${id}/status`,{status},{headers:hdr()})
    setLoans(p=>p.map(x=>x.id===id?{...x,status}:x))
  }

  const filtered = loans.filter(l => tab==="all" || l.role===tab)

  return (
    <div className={card.page}>
      <header className={card.navbar}>
        <img src="/images/logo.svg" className={card.logo} onClick={()=>navigate("/home")}/>
        <nav className={card.navlinks}>
          <button onClick={()=>navigate("/home")}>Home</button>
          <button onClick={()=>navigate("/wishlist")}>Library</button>
          <button onClick={()=>navigate("/loans")}>My Loans</button>
        </nav>
        <form className={card.search} onSubmit={e=>{e.preventDefault(); if(search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`)}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."/>
          <button type="submit"><FiSearch/></button>
        </form>
        <div className={card.profile} onClick={logout}><FiLogOut/></div>
      </header>

      <div className={styles.tabs}>
        <Tab id="all"      label="All"      />
        <Tab id="lender"   label="Lent"     />
        <Tab id="borrower" label="Borrowed" />
      </div>

      <main className={card.list}>
          {filtered.map(l=>(
            <div key={l.id} className={card.card}>
              <div className={card.cover} style={{backgroundImage:`url(${l.cover})`}}
                  onClick={()=>navigate(`/books/${l.book_id}`)}/>
              <div className={card.info}>
                <h2 className={card.bookTitle}
                    onClick={()=>navigate(`/books/${l.book_id}`)}>{l.title}</h2>
                <p className={card.bookAuthor}
                  onClick={()=>navigate(`/books/${l.book_id}`)}>by {l.author}</p>
                <p className={styles.desc}>Status: {l.status}</p>
                <p className={styles.desc}>
                  {l.role==="lender" ? `Borrower: ${l.counterpart}` : `Lender: ${l.counterpart}`}
                </p>
                <p className={styles.desc}>Period: {l.start || "-"} → {l.end || "-"}</p>

                {/* buton chat */}
                {l.status==="active" && (
                  <button className={styles.actionBtn}
                          style={{background:"#ffe8c7",color:"#711919",marginTop:"10px",}}
                          onClick={()=>navigate(`/chat/${l.id}`)}>
                    <FiMessageCircle style={{marginRight:"6px"}}/> Chat
                  </button>
                )}

                {l.role==="lender" && l.status==="pending" && (
                  <div style={{display:"flex",gap:"16px",marginTop:"10px"}}>
                    <button className={`${styles.actionBtn} ${styles.acceptBtn}`}
                            onClick={()=>updateStatus(l.id,"active")}>
                      <FiCheck style={{marginRight:"6px"}}/> Accept
                    </button>
                    <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                            onClick={()=>updateStatus(l.id,"cancelled")}>
                      <FiX style={{marginRight:"6px"}}/> Reject
                    </button>
                  </div>
                )}
                {l.role==="lender" && l.status==="active" && (
                  <button className={`${styles.actionBtn} ${styles.returnBtn}`}
                          onClick={()=>updateStatus(l.id,"returned")}
                          style={{marginTop:"10px"}}>
                    <FiCheck style={{marginRight:"6px"}}/> Mark returned
                  </button>
                )}
              </div>
            </div>
          ))}
        {!filtered.length && <p className={styles.emptyMsg}>Nothing to see here.</p>}
      </main>
    </div>
  )
}
