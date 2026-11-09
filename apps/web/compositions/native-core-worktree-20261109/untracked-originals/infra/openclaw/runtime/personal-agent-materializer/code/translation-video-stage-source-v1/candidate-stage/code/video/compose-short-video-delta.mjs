/** Pure optional branch. Reads only an existing selected agent's explicit primary model.
 * No model/provider/auth/account changes. Native video model is preprocessing selection,
 * not a promise about later channel/session overrides. Native ImageAPI validates vision/auth.
 */
export function composeShortVideoDelta(cfg,{agentId}={}){
 const agent=typeof agentId==='string'?cfg?.agents?.entries?.[agentId]:undefined;
 if(!agent||typeof agent!=='object')return cfg;
 const value=typeof agent.model==='string'?agent.model:agent.model?.primary;
 // Alias/unqualified/foreign routes are deliberately not inferred or replaced.
 if(typeof value!=='string')return cfg;
 const match=/^openai\/([A-Za-z0-9][A-Za-z0-9._:-]{0,199})$/.exec(value);
 if(!match)return cfg;
 const provider='openai',model=match[1],media=cfg.tools?.media??{};
 if(media.models!==undefined&&!Array.isArray(media.models))return cfg;
 const models=media.models??[];
 const exact=models.filter(e=>e?.provider===provider&&e?.model===model&&e.type!=='cli'&&!e.command&&Array.isArray(e.capabilities)&&e.capabilities.includes('video'));
 // Do not turn a preconfigured alternative provider on as a side effect of this opt-in.
 if(media.video?.enabled!==true&&models.some(e=>e!==exact[0]&&(!Array.isArray(e?.capabilities)||e.capabilities.includes('video'))))return cfg;
 const shared=exact.length?models:[...models,{type:'provider',provider,model,capabilities:['video']}];
 // Preserve original rows (including scopes/request/profile fields) by reference; never fabricate an OAuth grant.
 if(shared===models&&media.video?.enabled===true)return cfg;
 return {...cfg,tools:{...cfg.tools,media:{...media,models:shared,video:{...media.video,enabled:true}}}};
}
