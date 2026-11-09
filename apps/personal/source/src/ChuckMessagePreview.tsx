import {memo,type ReactNode} from 'react';
import Markdown,{type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';

const inline=({children}:{children?:ReactNode})=><>{children}</>;
const block=({children}:{children?:ReactNode})=><>{children}{' '}</>;
const components:Components={
 p:block,h1:block,h2:block,h3:block,h4:block,h5:block,h6:block,
 ul:inline,ol:inline,li:block,blockquote:block,pre:block,code:inline,
 strong:inline,em:inline,del:inline,a:inline,br:()=><> </>,hr:()=><> </>,
 table:block,thead:inline,tbody:inline,tr:block,th:block,td:block,
 img:({alt})=><>{alt}</>,input:()=>null,
};
const elements=Object.keys(components);
const noUrl=()=>'';
// Display only: reuse the original renderer, with no links, media requests or HTML.
// The canonical body and the conversation search continue to use the original bytes.
export default memo(function ChuckMessagePreview({body}:{body:string}){
 return <Markdown skipHtml unwrapDisallowed allowedElements={elements}
  remarkPlugins={[remarkGfm]} components={components} urlTransform={noUrl}>{body}</Markdown>;
});
