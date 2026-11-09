import {z} from "zod";
// Input schemas copied from preserved original TRAIN routes. No new API fields.

// templates/route.ts
export const templateExercise=z.object({craysExerciseId:z.string().uuid(),setType:z.enum(["STRAIGHT","WARMUP","DROP","SUPERSET","GIANT_SET","AMRAP","EMOM","TIME"]),targetSets:z.number().int().min(1).max(20),targetRepsMin:z.number().int().positive().nullable(),targetRepsMax:z.number().int().positive().nullable(),targetDurationSeconds:z.number().int().positive().nullable(),targetDistanceMeters:z.number().positive().nullable(),restSeconds:z.number().int().min(0).max(3600).nullable(),notes:z.string().max(2000)}).strict().refine(x=>(x.targetRepsMin===null)===(x.targetRepsMax===null)&&x.targetRepsMin!==null?x.targetRepsMax!>=x.targetRepsMin:true,{message:"Invalid rep range"});
export const templateInput=z.object({templateId:z.string().uuid().nullable(),expectedVersion:z.number().int().positive().nullable(),name:z.string().trim().min(1).max(120),notes:z.string().max(2000),lifecycleState:z.enum(["DRAFT","ACTIVE","ARCHIVED"]),exercises:z.array(templateExercise).min(1).max(100)}).strict();

// programs/route.ts
export const programSlot=z.object({week:z.number().int().min(1).max(104),day:z.number().int().min(1).max(7),templateId:z.string().uuid(),templateVersion:z.number().int().positive()}).strict();export const programInput=z.object({name:z.string().trim().min(1).max(120),goal:z.string().trim().min(1).max(200),weeks:z.number().int().min(1).max(104),schedule:z.array(programSlot).min(1).max(728),changeReason:z.string().trim().min(1).max(500)}).strict();

// calendar/route.ts
export const calendarInput=z.object({programId:z.string().uuid().nullable(),programVersion:z.number().int().positive().nullable(),templateId:z.string().uuid().nullable(),templateVersion:z.number().int().positive().nullable(),localDate:z.string().date(),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),timezone:z.string().min(1).max(100)}).strict().refine(x=>(x.programId!==null)===(x.programVersion!==null)&&(x.templateId!==null)===(x.templateVersion!==null)&&(x.programId!==null||x.templateId!==null));

// calendar/[eventId]/route.ts
export const calendarDecisionInput=z.object({action:z.enum(["MOVE","SKIP","COMPLETE","CANCEL"]),expectedVersion:z.number().int().positive(),localDate:z.string().date().optional(),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),timezone:z.string().min(1).max(100).optional(),reason:z.string().trim().min(1).max(500)}).strict().refine(x=>x.action!=="MOVE"||(x.localDate&&x.timezone));

// programs/[programId]/state/route.ts
export const programStateInput=z.object({action:z.enum(["ACTIVATE","PAUSE","COMPLETE","ARCHIVE"]),expectedVersion:z.number().int().positive()}).strict();

// substitutions/route.ts
export const substitutionInput=z.object({originalExerciseId:z.string().uuid(),reasonCodes:z.array(z.enum(["EQUIPMENT_UNAVAILABLE","VOLUNTARY_LIMITATION","PREFERENCE","VARIETY"])).min(1).max(4)}).strict();

// recommendations/[recommendationId]/route.ts
export const proposalDecisionInput=z.object({action:z.enum(["ACCEPT","REJECT"])}).strict();

// sessions/route.ts
export const sessionStartInput=z.object({idempotencyKey:z.string().min(8).max(160),sourceKind:z.enum(["PLAN","TEMPLATE","FREE"]),sourceId:z.string().uuid().nullable(),sourceVersion:z.number().int().positive().nullable(),timezone:z.string().min(1).max(100),readinessSnapshotId:z.string().uuid().nullable(),notes:z.string().max(2000).default("")}).strict();
