import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiSend, FiUser, FiLogOut } from "react-icons/fi";
import css from "./Chat.module.css";

const API = "http://localhost:5000";

export default function Chat() {
  const { loanId } = useParams();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt]   = useState("");
  const bottomRef       = useRef(null);

  const hdr = useCallback(()=>{
    const t = localStorage.getItem("token");
    return t ? { Authorization:`Bearer ${t}` } : {};
  },[]);

  const load = async () => {
    const r = await axios.get(`${API}/api/chat/${loanId}`, { headers: hdr() });
    setMsgs(r.data);
  };

  useEffect(()=>{
    load();
    const id = setInterval(load, 4000);
    return ()=> clearInterval(id);
  },[loanId]);

  const send = async () => {
    if(!txt.trim()) return;
    await axios.post(`${API}/api/chat/${loanId}`, { text: txt }, { headers: hdr() });
    setTxt("");
    await load();
  };

  useEffect(()=>{ bottomRef.current?.scrollIntoView(); },[msgs]);

  return (
    <div className={css.page}>
      <header className={css.bar}>
        <button onClick={()=>nav(-1)} className={css.back}>←</button>
        <span className={css.title}>Chat</span>
        <FiLogOut className={css.out} onClick={() => { localStorage.clear(); nav("/login"); }} />
      </header>

      <main className={css.chatBox}>
        {msgs.map(m=>(
          <div key={m.id}
               className={m.sender_id === parseInt(localStorage.getItem("uid")||"0",10) ? css.me : css.them}>
            <div className={css.avatar}><FiUser/></div>
            <div className={css.bubble}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </main>

      <form className={css.inputBar}
            onSubmit={e=>{e.preventDefault(); send();}}>
        <input value={txt}
               onChange={e=>setTxt(e.target.value)}
               placeholder="Message..." />
        <button type="submit"><FiSend/></button>
      </form>
    </div>
  );
}