import {NextResponse} from "next/server";
import {generateWithGemini} from "@/lib/ai/gemini";
import {POST_PROMPT} from "@/lib/ai/prompts";
export async function POST(req:Request){
 try{
  const {topic}=await req.json();
  if(!topic)return NextResponse.json({error:"Topic is required"},{status:400});
  const post=await generateWithGemini(POST_PROMPT.replace("{{topic}}",topic));
  return NextResponse.json({success:true,post:post.trim()});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Generation failed"},{status:500});}
}