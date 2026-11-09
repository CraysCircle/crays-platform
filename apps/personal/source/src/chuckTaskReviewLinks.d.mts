export type ChuckTaskReviewLink=Readonly<{taskId:string;href:string}>;
export function chuckTaskReviewLink(value:unknown,options?:{origin?:string}):ChuckTaskReviewLink|null;
export function chuckMessageUrl(value:unknown,options?:{origin?:string;attribute?:string}):string;
export function remarkChuckTaskReviewLinks(): (tree:any)=>void;
