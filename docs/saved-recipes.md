# Household saved recipes

Recipes saved from recommendations and recipes entered with **Create recipe** use the same household saved-recipe API and snapshot shape. Saved recipes are shared with all members of the selected household and appear in **Recipes → Saved** on their devices after refresh.

## Create a recipe

Open **Recipes → Saved → Create recipe**. Enter a name, at least one ingredient, and at least one cooking step. Description is optional. You can also edit the preparation time and tag, and choose Easy, Medium, or Hard difficulty. Blank ingredient and step rows are ignored, and whitespace is trimmed before saving. Use the step arrows to change cooking order; the resulting ordered text list is used by recipe details and Cooking Mode. Custom recipes have an Edit action in the collection and an edit icon in recipe details; both open the same form with saved values filled in.

Custom recipes use the existing recipe snapshot fields, with a small optional origin marker to distinguish them from generated recipes. New recipes start with a 30 minute estimate, Medium difficulty, a Custom tag, a plate emoji, and a 0% match; time and tag can be left at those defaults or edited. Match/readiness is calculated from the current household pantry when the saved recipe is displayed.

The backend identifies a saved recipe by its case-insensitive name and case-insensitive ingredient names, independent of ingredient order. Saving that identity more than once is idempotent. The form reports an existing match rather than silently replacing its saved description or steps. If a request fails, the form stays open with the entered content so the user can retry.

Saved recipes can be opened from the collection. To remove one, use the trash icon inside its card or the **Remove** button in recipe details. Both ask for confirmation before removing it from the household collection. They remain household-scoped; changing households loads that household's own saved collection.
