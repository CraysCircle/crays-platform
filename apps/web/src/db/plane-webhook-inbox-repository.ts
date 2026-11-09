import "server-only";import {getCorePgPool} from "@/db/client";import * as repository from "@/lib/member-commerce/plane-webhook-inbox-repository";
export const persistCorePlaneWebhookInbox=(value:Parameters<typeof repository.persistPlaneWebhookInbox>[1])=>repository.persistPlaneWebhookInbox(getCorePgPool() as unknown as repository.PlaneInboxPool,value);
