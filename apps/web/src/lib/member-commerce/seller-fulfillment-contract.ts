import {createHash} from "node:crypto";
import {verifyFrozenOrderSellerSnapshot,type FrozenOrderSellerSnapshot} from "./checkout-order-transition-contract";

export const SELLER_FULFILLMENT_VERSION = "ncrv2-135.v2" as const;
type Instruction=Readonly<{lineId:string;fulfillQuantity:number;cancelQuantity:number;reservationRef:string}>;
const digest=(value:object)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function createSellerFulfillmentPlan(input:Readonly<{
  orderSnapshotId:string;snapshot:FrozenOrderSellerSnapshot;instructions:readonly Instruction[];
  shipment?:Readonly<{carrierCode:string;trackingCode:string}>;
}>) {
  if(!input.orderSnapshotId.trim()) throw new Error("FULFILLMENT_ORDER_SNAPSHOT_ID_INVALID");
  const snapshot=verifyFrozenOrderSellerSnapshot(input.snapshot);
  const lines=snapshot.lines.filter((line)=>line.productType==="physical");
  if(lines.length<1||input.instructions.length<1) throw new Error("FULFILLMENT_LINES_REQUIRED");
  const consequences=lines.map(line=>{
    if(!Number.isSafeInteger(line.quantity)||line.quantity<1||!line.erpItemMappingId||
      !line.erpItemMappingVersion||!line.erpItemCode||!line.warehouseMappingId||
      !line.warehouseMappingVersion||!line.erpWarehouseId||
      !snapshot.erpWarehouseIds.includes(line.erpWarehouseId)) {
      throw new Error("FULFILLMENT_ORDER_LINE_MAPPING_INVALID");
    }
    const matching=input.instructions.filter((instruction)=>instruction.lineId===line.variantRef);
    if(matching.length!==1) throw new Error("FULFILLMENT_INSTRUCTION_UNRESOLVED");
    const instruction=matching[0];
    if(!instruction.reservationRef.trim()||!Number.isSafeInteger(instruction.fulfillQuantity)||
      !Number.isSafeInteger(instruction.cancelQuantity)||instruction.fulfillQuantity<0||
      instruction.cancelQuantity<0||instruction.fulfillQuantity+instruction.cancelQuantity>line.quantity) {
      throw new Error("FULFILLMENT_RESERVATION_BOUNDS_EXCEEDED");
    }
    return {
      lineId:line.variantRef,erpItemMappingId:line.erpItemMappingId,
      erpItemMappingVersion:line.erpItemMappingVersion,stockItemRef:line.erpItemCode,
      warehouseMappingId:line.warehouseMappingId,warehouseMappingVersion:line.warehouseMappingVersion,
      erpWarehouseId:line.erpWarehouseId,reservationRef:instruction.reservationRef,
      fulfilledQuantity:instruction.fulfillQuantity,canceledQuantity:instruction.cancelQuantity,
      remainingQuantity:line.quantity-instruction.fulfillQuantity-instruction.cancelQuantity,
      stockDelta:-instruction.fulfillQuantity,
      valuationConsequence:"ERP_RECALCULATE_FROM_STOCK_LEDGER" as const,
    };
  });
  if(input.instructions.some((instruction)=>!lines.some((line)=>line.variantRef===instruction.lineId))) {
    throw new Error("FULFILLMENT_FOREIGN_LINE_DENIED");
  }
  if(input.shipment&&(!/^[A-Z0-9_-]{2,32}$/.test(input.shipment.carrierCode)||
    !/^[A-Za-z0-9_-]{4,100}$/.test(input.shipment.trackingCode))) {
    throw new Error("SHIPMENT_TRACKING_INVALID");
  }
  const body={contractVersion:SELLER_FULFILLMENT_VERSION,snapshotId:input.orderSnapshotId,
    snapshotSha256:snapshot.snapshotSha256,orderId:snapshot.orderId,
    operatorLegalEntityId:snapshot.operatorLegalEntityId,storeId:snapshot.storeId,
    vendureSellerId:snapshot.vendureSellerId,vendureChannelId:snapshot.vendureChannelId,
    erpSiteId:snapshot.erpSiteId,erpCompanyId:snapshot.erpCompanyId,
    consequences,shipment:input.shipment??null};
  return Object.freeze({...body,consequenceSha256:digest(body)});
}
