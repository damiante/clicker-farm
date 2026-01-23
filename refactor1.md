# Summary

This game project has been built over several iterations of using Claude Code. However, I believe these iterations have resulted in several disparate implementations of features. I want to perform a large refactor of the codebase so that behaviour can be consistent across several game systems that should behave similarly.

1. Information windows and styling
2. Progress indicators
3. Item slots
4. Item classes
5. CLAUDE.md reworking

# 1. Information windows and styling
All items which are present in the game world have an information window or panel which is drawn when the item is clicked. It displays basic information about the item and also has functional components allowing the player to click buttons to do actions like pick up or destroy the item, perform some other action (such as mining in the case of the Mine), or have item slots that other items may go into or come out of (or both).

The windows do not use a consistent button rendering scheme, as for example the "destroy" button on Crates' windows does not fit the window width like that of Furnaces.

I want you to refactor the code associated with settings window drawing so that all items in the overworld and in the inventory use a consistent window rendering scheme and styling for all buttons including mouseover events for those buttons, mouseup/down events for the buttons, etc. The styling should be referenced externally via config in the /styles directory and all windows drawn should respect it.

# 2. Progress indicators

Windows may also contain progress indicators. There are currently two different indicators, one used by barrels for fermentation and the other by furnaces for smelting. All progress indicators should use the same styling for shape, although the colour may differ by the specific item with the indicator. In particular I prefer the arrow implementation used on the Furnace but I want the line weight for the arrow to be a lot thicker. Ensure the styling used for the progress indicators is also defined in config in the /styles directory.

# 2. Item slots

There are various slots that items can go into; these are the Tool slots at the bottom of the screen, Inventory slots in the inventory menu, and contextual slots that certain items have, such as the input/output slots in items. Every time a slot appears in any window, in the Inventory, or in the tools menu, it should have the same styling and that styling should be configured using files in the /styles directory. Currently I am aware that the styles used by mines, furnaces, and crates are the same, but those are different to the styles for slots used by barrels and growable items like grape vines. I want all item slots to have the same styling.

I also want all item slots to have the same behaviour. In particular, when left clicked, the item slot's behaviour should behave as follows:
1. If an item slot is in the toolbar, selecting the item activates the tool and applies the "selected" styling. Clicking it again deactivates the tool. Clicking another tool should change the selection to that tool. This is the current behaviour for tools in the toolbar.
2. If an item slot is in the inventory, selecting the item activates it; from there, the item can be placed in the overworld or painted into input item slots of overworld items such as furnaces and barrels if the player has the gloves and the item is applicable for any input slot of the overworld item. Selecting another item slot in the inventory then deactivates the current selection and activates the next one. Again, this is effectively the current behaviour except that the painting of inventory items into overworld items is inconsistent; item slot painting works for barrels but not for furnaces. There should be a consistent implementation of overworld item input slot painting which can be applied generically to any overworld item with input slots.
3. Finally, if an item slot is in a window for an overworld item, then the slot is either an input slot, an output slot, or both. Clicking an input slot should launch a dropdown to allow the user to select a compatible item from the inventory to be put into the slot. Clicking an output slot should put all items from the output into the player's inventory. If a slot is both, the behaviour of the slot should be based on whether there is already an item in the slot. If an overworld item has a slot that is both input and output, then if the slot has an item, clicking it executes the "output slot" behaviour. If the slot doesn't have an item, clicking it executes the "input slot" behaviour.

# 4. Item classes

To determine whether items are compatible, I want all the item config to be refactored so that items can have classes or groups. For example, I want all items that can be directly placed into the overworld (like seeds, barrels, furnaces, mines, etc.) to have an indicator that these items can be placed in the overworld. Game logic to determine behaviour on selection can then look for this property to determine whether to run the "mouseover translucency" logic, item placement logic, and so on.

Similarly I want items with input slots to have classes for their input slots. For example, a barrel's input slot should have a "fermentable" class label. Then, when the input slot logic described previously is run, the barrel should filter items from the inventory based on whether they have the "fermentable" class label, such that only "fermentable" items appear in the barrel's dropdown. This logic should be applied to both of the input slots of a furnace, so that one is for "smeltable" items, and the other is for "combustible" items.

Dropdowns may also be agnostic of class or accept items of multiple classes; the slots in a Crate should accept items of any class, for example.

You are welcome to name this functionality differently if "class" would clash with reserved words in Javascript.

# 5. CLAUDE.md reworking

After refactoring the codebase in the above ways, I want you to rewrite the CLAUDE.md file from scratch. I want you to explain the new implementation so that future iterations can implement new capabilities using the generic stylings and functionalities you rewrote as part of this session. Ensure that it's clear that all future features should use these implementations rather than writing new implementations or styles for concepts like item slots, dropdowns, progress indicators, etc.