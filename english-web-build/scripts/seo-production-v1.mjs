import { chromium, request } from "playwright";
import fs from "node:fs/promises";
const WEB=process.env.VISUAL_WEB_URL||"http://127.0.0.1:3000";
const routes=["hoc-tieng-anh","kiem-tra-trinh-do-tieng-anh","hoc-tu-vung-tieng-anh","ngu-phap-tieng-anh","luyen-nghe-tieng-anh","luyen-noi-tieng-anh","luyen-doc-tieng-anh","luyen-viet-tieng-anh"];
await fs.mkdir("artifacts/seo-production-v1",{recursive:true});
const api=await request.newContext();
const sitemap=await (await api.get(WEB+"/sitemap.xml")).text();
const robots=await (await api.get(WEB+"/robots.txt")).text();
if(!sitemap.includes(WEB)) throw new Error("sitemap missing Home");
for(const slug of routes){if(!sitemap.includes("/"+slug)) throw new Error("sitemap missing "+slug); if(robots.includes("Disallow: /"+slug)) throw new Error("robots blocks "+slug);}
await api.dispose();
for(const [prefix,viewport] of [["desktop",{width:1536,height:1024}],["mobile",{width:390,height:844}]]){
 const browser=await chromium.launch();
 const context=await browser.newContext({viewport,reducedMotion:"reduce",colorScheme:"light"});
 for(const slug of routes){
  const page=await context.newPage();
  const response=await page.goto(WEB+"/"+slug,{waitUntil:"networkidle",timeout:45000});
  if(!response||response.status()!==200) throw new Error(slug+" expected 200");
  const title=await page.title(); if(!title.trim()) throw new Error(slug+" missing title");
  const description=await page.locator('meta[name="description"]').getAttribute("content"); if(!description) throw new Error(slug+" missing description");
  const canonical=await page.locator('link[rel="canonical"]').getAttribute("href"); if(!canonical||!canonical.includes("/"+slug)) throw new Error(slug+" bad canonical");
  if(await page.locator("h1").count()!==1) throw new Error(slug+" expected exactly one H1");
  if(await page.locator('script[type="application/ld+json"]').count()<1) throw new Error(slug+" missing JSON-LD");
  if(!(await page.getByText("Học thử không cần đăng nhập",{exact:true}).isVisible())) throw new Error(slug+" guest preview missing");
  await page.screenshot({path:`artifacts/seo-production-v1/${prefix}-${slug}.png`,fullPage:true});
  await page.close();
 }
 await browser.close();
}
console.log("SEO Production V1: 8 routes + 16 screenshots PASS");
