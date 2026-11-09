export function createOriginalMemberHttpPool(env?: Record<string,string|undefined>): {
  query(sql:string,values:readonly unknown[]):Promise<{rowCount:number;rows:Record<string,unknown>[]}>
  end():Promise<void>
};
