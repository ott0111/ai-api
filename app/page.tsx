 "use client";
import {useState} from "react";
export default function Home(){
 const [topic,setTopic]=useState("");
 const [post,setPost]=useState("");
 const [loading,setLoading]=useState(false);
 async function generate(){
  setLoading(true);
  const r=await fetch("/api/ai/generate-post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic})});
  const d=await r.json(); setPost(d.post||d.error||""); setLoading(false);
 }
 async function publish(){
  if(!post)return;
  const r=await fetch("/api/x/post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:post})});
  const d=await r.json(); alert(d.success?"Posted to X.":d.error||"Failed.");
 }
 return <main className="wrap">
  <span className="badge">X AUTOPILOT</span>
  <h1>AI Post Generator</h1>
  <p className="muted">Generate an X post with Gemini, review it, then publish it.</p>
  <section className="card">
   <label>Topic</label>
   <input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. building a SaaS at 17"/>
   <div className="row" style={{marginTop:12}}>
    <button className="btn" onClick={generate} disabled={loading||!topic}>{loading?"Generating...":"Generate post"}</button>
   </div>
  </section>
  <section className="card">
   <h2>Draft</h2>
   <textarea className="textarea" value={post} onChange={e=>setPost(e.target.value)} placeholder="Your generated post will appear here."/>
   <div className="row" style={{marginTop:12}}>
    <button className="btn" onClick={publish} disabled={!post}>Publish to X</button>
   </div>
  </section>
 </main>
}