import type { ProductWorld, Entity } from "./productModel.ts";
// Fictional existing results for the lived-in clickdummy. No live AI, care provider or calendar call.
export const personalPlanExamples: Entity[] = [
  {
    id: "sample-movement-plan",
    owner: "thorben",
    kind: "personal-plan",
    planType: "movement",
    name: "Movement for a busy week",
    capabilityId: "B2C-CAP-054",
    sourceTaskId: "sample-movement-task",
    sourceFunction: "AL-293",
    source: "Fictional plan shared by your trainer",
    status: "saved",
    goal: "Keep three small spaces for movement in my week.",
    cover: "venue-gym.jpg",
    items: [
      {
        id: "move-mon",
        day: "Monday",
        name: "My strength session",
        note: "Use the exercises in my own trainer’s plan.",
        time: "18:00",
        duration: "35 min",
        done: false,
      },
      {
        id: "move-wed",
        day: "Wednesday",
        name: "A walk & a little fresh air",
        note: "A route I choose near home.",
        time: "12:30",
        duration: "25 min",
        done: false,
      },
      {
        id: "move-fri",
        day: "Friday",
        name: "My second training session",
        note: "Continue the plan I already follow.",
        time: "18:00",
        duration: "35 min",
        done: false,
      },
    ],
  },
  {
    id: "sample-meal-plan",
    owner: "thorben",
    kind: "personal-plan",
    planType: "meals",
    name: "Good food for the week",
    capabilityId: "B2C-CAP-043",
    sourceTaskId: "sample-meal-task",
    sourceFunction: "AL-293",
    source: "Fictional meal-planning result, editable by you",
    status: "saved",
    goal: "Simple meals for a busy week, with a short shopping list.",
    cover: "",
    servings: "2",
    items: [
      {
        id: "meal-mon",
        day: "Monday",
        name: "Roasted vegetables & rice",
        note: "Cook a little extra rice for tomorrow.",
        time: "Dinner",
        done: false,
      },
      {
        id: "meal-tue",
        day: "Tuesday",
        name: "A bowl from what’s left",
        note: "Rice, vegetables and the ingredients I choose.",
        time: "Dinner",
        done: false,
      },
      {
        id: "meal-wed",
        day: "Wednesday",
        name: "Pasta & a simple tomato sauce",
        note: "Keep the sauce for another meal.",
        time: "Dinner",
        done: false,
      },
      {
        id: "meal-thu",
        day: "Thursday",
        name: "My favourite easy soup",
        note: "Use the vegetables I already have.",
        time: "Dinner",
        done: false,
      },
      {
        id: "meal-fri",
        day: "Friday",
        name: "Something at my Spot",
        note: "Choose the actual menu and review an order separately.",
        time: "Dinner",
        done: false,
      },
    ],
    shopping: [
      { id: "shop-rice", name: "Rice", checked: false },
      { id: "shop-veg", name: "Vegetables I like", checked: false },
      { id: "shop-tomato", name: "Tomatoes", checked: false },
      { id: "shop-pasta", name: "Pasta", checked: false },
    ],
  },
];
export function withPersonalPlanExamples(input: ProductWorld) {
  if (input.owner !== "thorben" || input.settings.personalPlanExamples === "v1")
    return input;
  const w = structuredClone(input);
  for (const p of personalPlanExamples) {
    if (!w.objects.some((o) => o.id === p.id))
      w.objects.push(structuredClone(p));
    const taskId = String(p.sourceTaskId);
    if (!w.objects.some((o) => o.id === taskId))
      w.objects.push({
        id: taskId,
        owner: w.owner,
        kind: "agent-task",
        name: p.name,
        request: p.goal,
        status: "saved",
        capabilityId: p.capabilityId,
        sourceFunction: "AL-293",
        sourceChatId: "chuck",
        sourceMessageId: `message-${taskId}`,
        resultId: p.id,
        sourceContext: { objectId: p.id },
        synthetic: true,
      });
  }
  w.settings.personalPlanExamples = "v1";
  return w;
}
