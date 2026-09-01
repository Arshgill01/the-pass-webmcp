import type { KitchenFixture } from "../domain/types";

export const canonicalFixture: KitchenFixture = {
  id: "friday-service-v1",
  restaurantName: "Barrow & Salt · Friday service",
  stateVersion: 1,
  stations: [
    { id: "expo", name: "Expo", status: "available" },
    { id: "grill", name: "Grill", status: "available" },
    { id: "fryer", name: "Fryer", status: "available" },
    { id: "cold-prep", name: "Cold prep", status: "available" },
  ],
  tickets: [
    {
      id: "ticket-184",
      displayNumber: "184",
      tableName: "Table 12",
      itemName: "Steak frites",
      stationId: "grill",
      ageMinutes: 11,
      status: "working",
      keepTogether: true,
      supportedStationIds: ["grill"],
      priority: "normal",
    },
    {
      id: "ticket-187",
      displayNumber: "187",
      tableName: "Table 7",
      itemName: "Chicken sandwich",
      stationId: "grill",
      ageMinutes: 7,
      status: "queued",
      keepTogether: false,
      supportedStationIds: ["grill"],
      priority: "normal",
    },
    {
      id: "ticket-181",
      displayNumber: "181",
      tableName: "Table 4",
      itemName: "Shoestring fries",
      stationId: "fryer",
      ageMinutes: 14,
      status: "working",
      keepTogether: true,
      supportedStationIds: ["fryer"],
      priority: "normal",
    },
    {
      id: "ticket-185",
      displayNumber: "185",
      tableName: "Table 12",
      itemName: "Crispy potatoes",
      stationId: "fryer",
      ageMinutes: 10,
      status: "queued",
      keepTogether: true,
      supportedStationIds: ["fryer", "grill"],
      priority: "normal",
    },
    {
      id: "ticket-188",
      displayNumber: "188",
      tableName: "Bar 3",
      itemName: "House salad",
      stationId: "cold-prep",
      ageMinutes: 5,
      status: "working",
      keepTogether: false,
      supportedStationIds: ["cold-prep"],
      priority: "normal",
    },
    {
      id: "ticket-190",
      displayNumber: "190",
      tableName: "Table 15",
      itemName: "Oyster plate",
      stationId: "cold-prep",
      ageMinutes: 2,
      status: "queued",
      keepTogether: true,
      supportedStationIds: ["cold-prep"],
      priority: "normal",
    },
  ],
};

export const TABLE_12 = "Table 12";
export const TICKET_FRIES = "ticket-181";
export const TICKET_POTATOES = "ticket-185";
export const TICKET_STEAK = "ticket-184";
export const TICKET_SANDWICH = "ticket-187";
