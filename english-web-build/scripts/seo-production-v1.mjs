import { chromium, request } from "playwright";
import fs from "node:fs/promises";
const WEB=process.env.VISUAL_WEB_URL||"http://127.0.0.1:3000";
const routes=["tai-lieu-tieng-anh","hoc-tieng-anh","kiem-tra-trinh-do-tieng-anh","hoc-tu-vung-tieng-anh","ngu-phap-tieng-anh","luyen-nghe-tieng-anh","luyen-noi-tieng-anh","luyen-doc-tieng-anh","luyen-viet-tieng-anh"];
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
  if(slug!=="tai-lieu-tieng-anh" && !(await page.getByText("Học thử không cần đăng nhập",{exact:true}).isVisible())) throw new Error(slug+" guest preview missing");
  if(slug==="tai-lieu-tieng-anh" && await page.getByRole("link",{name:"Đọc tiếp miễn phí"}).count()<1) throw new Error("resource continuation gate missing");
  if(slug==="tai-lieu-tieng-anh"){
   const errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   const home=await context.newPage();
   const homeResponse=await home.goto(WEB+"/",{waitUntil:"networkidle",timeout:45000});
   if(!homeResponse||homeResponse.status()!==200) throw new Error(prefix+" home unavailable");
   const nav=prefix==="mobile"?home.getByRole("button",{name:"Mở điều hướng"}):home.getByRole("navigation",{name:"Điều hướng chính"});
   if(prefix==="mobile") await nav.click();
   const menu=prefix==="mobile"?home.getByRole("navigation",{name:"Điều hướng di động"}):nav;
   const resourceLink=menu.getByRole("link",{name:"Tài liệu",exact:true});
   if(!(await resourceLink.isVisible())) throw new Error(prefix+" Resource Library menu missing");
   await resourceLink.click();
   await home.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/tai-lieu-tieng-anh");
   if(!(await home.getByRole("heading",{name:/Học đúng tài liệu/}).isVisible())) throw new Error(prefix+" Resource Library navigation failed");
   await home.close();
   const search=page.getByPlaceholder(/Tìm: luyện nghe A2/);
   await search.fill("no-such-beaconvie-resource-xyz");
   if(!(await page.getByText("Chưa tìm thấy tài liệu phù hợp.").isVisible())) throw new Error(prefix+" search empty state missing");
   await page.getByRole("button",{name:"Xóa bộ lọc"}).click();
   if(await search.inputValue()!=="") throw new Error(prefix+" reset search failed");
   await page.getByRole("button",{name:"B2",exact:true}).click();
   const b2Count=await page.locator("article").count();
   if(b2Count<1) throw new Error(prefix+" B2 filter returned no articles");
   await page.getByRole("button",{name:"Tất cả",exact:true}).first().click();
   const allCount=await page.locator("article").count();
   if(allCount<b2Count) throw new Error(prefix+" CEFR reset lost articles");
   const first=page.locator('article a[href^="/tai-lieu-tieng-anh/"]').first();
   const href=await first.getAttribute("href");
   if(!href) throw new Error(prefix+" missing resource detail link");
   const detail=await context.newPage();
   const detailResponse=await detail.goto(WEB+href,{waitUntil:"networkidle",timeout:45000});
   if(!detailResponse||detailResponse.status()!==200) throw new Error(prefix+" resource detail link broken: "+href);
   if(!(await detail.getByRole("heading",{level:1}).isVisible())) throw new Error(prefix+" resource detail missing H1");
   await detail.close();
   if(errors.length) throw new Error(prefix+" Resource Library page errors: "+errors.join(" | "));
  }
  if(slug!=="tai-lieu-tieng-anh" && !(await page.getByRole("heading",{name:"Câu hỏi thường gặp"}).isVisible())) throw new Error(slug+" V2 FAQ missing");
  await page.screenshot({path:`artifacts/seo-production-v1/${prefix}-${slug}.png`,fullPage:true});
  await page.close();
 }
 await browser.close();
}
console.log("SEO Production V1: 8 routes + 16 screenshots PASS");
