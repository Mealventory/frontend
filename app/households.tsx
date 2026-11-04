import HouseholdScreen from "./index";

// Both the original sign-in flow and this route render the same component.
// A unique pathname avoids resolving "/" to the Pantry tab's own index route.
export default function HouseholdSelectionRoute() {
  return <HouseholdScreen forceManageHouseholds />;
}
