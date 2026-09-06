export async function createPost(text:string){
 if(!process.env.X_ACCESS_TOKEN) throw new Error("X_ACCESS_TOKEN is missing");
 const response=await fetch("https://api.x.com/2/tweets",{method:"POST",headers:{Authorization:`Bearer ${process.env.X_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({text})});
 const data=await response.json();
 if(!response.ok) throw new Error(data?.detail||data?.title||"X API request failed");
 return data;
}