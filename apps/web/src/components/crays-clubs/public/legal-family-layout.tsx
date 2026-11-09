import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import styles from "./legal-family-layout.module.css";

export type LegalFamilySlug="legal"|"imprint"|"privacy-policy"|"terms-and-conditions"|"data-protection";
const documents=[
  {slug:"legal",label:"Legal",href:"/en/legal"},
  {slug:"imprint",label:"Imprint",href:"/en/legal/imprint"},
  {slug:"privacy-policy",label:"Privacy Policy",href:"/en/legal/privacy-policy"},
  {slug:"terms-and-conditions",label:"Terms and Conditions",href:"/en/legal/terms-and-conditions"},
  {slug:"data-protection",label:"Data Protection",href:"/en/legal/data-protection"},
] as const;
export function LegalFamilyNav({current}:{current:LegalFamilySlug}){
 return <nav className={styles.familyNav} aria-label="Legal documents"><div>{documents.map(item=><Link href={item.href} key={item.slug} aria-current={item.slug===current?"page":undefined}>{item.label}</Link>)}</div></nav>;
}
export function LegalReadingLayout({current,items,children}:{current:LegalFamilySlug;items:readonly {id:string;title:string}[];children:ReactNode}){
 const title=documents.find(item=>item.slug===current)?.label;
 return <div className={styles.readingOuter}>
   <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/en/legal"><ArrowLeft aria-hidden="true" size={16}/>Legal</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
   <div className={styles.readingGrid}>
     <aside className={styles.readingRail}><nav aria-label="Related legal documents"><h3>Legal documents</h3>{documents.map(item=><Link key={item.slug} href={item.href} aria-current={item.slug===current?"page":undefined}>{item.label}<ArrowRight aria-hidden="true" size={15}/></Link>)}</nav>
       <details className={styles.contents} open><summary>On this page</summary><nav aria-label="On this page">{items.map(item=><a key={item.id} href={`#${item.id}`}>{item.title}</a>)}</nav></details>
     </aside>
     <div className={styles.readingArticle}>{children}</div>
   </div>
 </div>;
}
