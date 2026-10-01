import type { NewItem } from "@/src/lib/inventoryApi";

function dateOffset(days: number, now = new Date()): string {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function buildDevTestPantry(now = new Date()): NewItem[] {
  return [
    {
      name: "Chicken Breast",
      category: "Meat",
      quantity: 2,
      unit: "pieces",
      expiry_date: dateOffset(0, now),
      storage_zone: "fridge",
    },
    {
      name: "Pasta Penne",
      category: "Pantry",
      quantity: 1,
      unit: "box",
      expiry_date: dateOffset(45, now),
      storage_zone: "pantry",
    },
    {
      name: "Sharp Cheddar",
      category: "Dairy",
      quantity: 1,
      unit: "block",
      expiry_date: dateOffset(7, now),
      storage_zone: "fridge",
    },
    {
      name: "Whole Milk",
      category: "Dairy",
      quantity: 1,
      unit: "carton",
      expiry_date: dateOffset(3, now),
      storage_zone: "fridge",
    },
    {
      name: "Garlic",
      category: "Produce",
      quantity: 2,
      unit: "bulbs",
      expiry_date: dateOffset(14, now),
      storage_zone: "pantry",
    },
    {
      name: "Greek Yogurt",
      category: "Dairy",
      quantity: 1,
      unit: "tub",
      expiry_date: dateOffset(-2, now),
      storage_zone: "fridge",
    },
    {
      name: "Baby Spinach",
      category: "Produce",
      quantity: 1,
      unit: "bag",
      expiry_date: dateOffset(1, now),
      storage_zone: "fridge",
    },
    {
      name: "Frozen Peas",
      category: "Produce",
      quantity: 1,
      unit: "bag",
      expiry_date: null,
      storage_zone: "freezer",
    },
    {
      name: "Rolled Oats",
      category: "Pantry",
      quantity: 1,
      unit: "bag",
      expiry_date: dateOffset(120, now),
      storage_zone: "pantry",
    },
  ];
}

export function missingDevTestPantryItems(
  existingNames: Iterable<string>,
  now = new Date()
): NewItem[] {
  const existing = new Set(
    Array.from(existingNames, (name) => name.trim().toLocaleLowerCase())
  );
  return buildDevTestPantry(now).filter(
    (item) => !existing.has(item.name.trim().toLocaleLowerCase())
  );
}
