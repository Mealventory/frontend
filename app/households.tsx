import HouseholdScreen from "./index";

// A real route keeps the household manager open even when the user already
// has an active kitchen. It must not depend on an optional query parameter.
export default function ManageHouseholdsScreen() {
  return <HouseholdScreen forceManageHouseholds />;
}
