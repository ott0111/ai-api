import {NextResponse} from "next/server";
import {createPost} from "@/lib/x/posts";
export async function POST(req:Request){
 try{
  const {text}=await req.json();
  if(!text)return NextResponse.json({error:"Post text is required"},{status:400});
  const result=await createPost(text);
  return NextResponse.json({success:true,result});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Posting failed"},{status:500});}
}